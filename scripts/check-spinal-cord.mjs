#!/usr/bin/env node
// check-spinal-cord.mjs — prebuild structural guard for the admin spinal-cord contract.
//
// Purpose: prevent admin UI code from bypassing its own gateway (/api/rc/*) and
// calling RaceControl directly. Enforces the Uday 2026-04-23 doctrine
// ("admin panel = bidirectional spinal cord") inside this repo.
//
// Rules:
//  - `src/` must not reference NEXT_PUBLIC_API_URL, hardcoded RaceControl IPs,
//    or direct :8080 / :7777 backend ports. Clients call relative /api/rc/*.
//  - The gateway route itself (src/app/api/rc/[...path]/route.ts) and the
//    admin-gateway meta routes may reference RC_URL / RC_CLOUD_URL — these are
//    server-side env vars, not NEXT_PUBLIC_* browser bundles.
//  - Tests and mock servers may contain direct-URL strings for fixture purposes.
//
// Exit 0 = clean. Exit 1 = offenders found, prints file:line + matched pattern.

import { readFile, readdir } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SRC = join(ROOT, 'src');

const SCAN_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs']);

const FORBIDDEN = [
  { pattern: /NEXT_PUBLIC_API_URL/, label: 'NEXT_PUBLIC_API_URL (direct-to-RC bypass)' },
  { pattern: /192\.168\.31\.23:8080/, label: 'hardcoded RaceControl IP:port' },
  { pattern: /\blocalhost:8080\b/, label: 'hardcoded localhost:8080 (RC port)' },
  { pattern: /\blocalhost:7777\b/, label: 'hardcoded localhost:7777' },
];

// Exempt paths — relative to repo root, forward slashes.
// Each exemption must have a comment stating WHY it is exempt.
const EXEMPT = [
  // Gateway proxy itself — reads server-side RC_URL by design.
  'src/app/api/rc/[...path]/route.ts',
  // Gateway meta endpoints (health, metrics) — same class as the proxy.
  'src/app/api/admin-gateway/',
  // Gateway in-memory state store — internal plumbing, no RC call.
  'src/lib/admin-gateway-state.ts',
  // Next.js middleware — auth/routing only, no RC call.
  'src/middleware.ts',
  // Server-side one-off proxies pending Wave B consolidation into /api/rc/*.
  // These are server-to-server localhost calls (not NEXT_PUBLIC_* browser bundles).
  // Tracked in the PACT B-proposal for admin-internal route consolidation.
  'src/app/api/hr/employees/route.ts',
  'src/app/api/waivers/route.ts',
  'src/app/api/waivers/[driverId]/signature/route.ts',
  // UX placeholder text in agent-config modal — visual hint only, not a runtime URL.
  'src/components/ConfigEditorModal.tsx',
];

function isExempt(relPath) {
  const norm = relPath.split(sep).join('/');
  return EXEMPT.some(prefix => norm === prefix || norm.startsWith(prefix));
}

async function walk(dir, acc) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (err) {
    if (err.code === 'ENOENT') return acc;
    throw err;
  }
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === '.next' || e.name === '__tests__') continue;
      await walk(full, acc);
    } else if (e.isFile()) {
      const dot = e.name.lastIndexOf('.');
      const ext = dot === -1 ? '' : e.name.slice(dot);
      if (SCAN_EXTENSIONS.has(ext)) acc.push(full);
    }
  }
  return acc;
}

async function scan() {
  const files = await walk(SRC, []);
  const offenders = [];

  for (const file of files) {
    const rel = relative(ROOT, file);
    if (isExempt(rel)) continue;
    const text = await readFile(file, 'utf8');
    const lines = text.split(/\r?\n/);
    lines.forEach((line, idx) => {
      for (const rule of FORBIDDEN) {
        if (rule.pattern.test(line)) {
          offenders.push({
            file: rel.split(sep).join('/'),
            line: idx + 1,
            label: rule.label,
            snippet: line.trim().slice(0, 160),
          });
        }
      }
    });
  }

  if (offenders.length === 0) {
    console.log(`[check-spinal-cord] OK — scanned ${files.length} file(s), zero bypass patterns`);
    return 0;
  }

  console.error(`[check-spinal-cord] FAIL — ${offenders.length} spinal-cord bypass(es) in admin src/:\n`);
  for (const o of offenders) {
    console.error(`  ${o.file}:${o.line}  [${o.label}]`);
    console.error(`    ${o.snippet}`);
  }
  console.error(`\nAdmin UI must route through its own gateway. Use relative /api/rc/<path>.`);
  console.error(`The gateway (src/app/api/rc/[...path]/route.ts) reads server-side RC_URL.`);
  console.error(`If a legitimate exemption is needed, add the path to EXEMPT in scripts/check-spinal-cord.mjs`);
  console.error(`with a comment explaining why.`);
  return 1;
}

const code = await scan();
process.exit(code);
