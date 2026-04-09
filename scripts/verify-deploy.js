#!/usr/bin/env node
/*
 * verify-deploy.js — Post-deploy verification gate for admin dashboard
 *
 * Runs 5 checks, exits 1 on ANY failure. Called by admin-deploy.sh:
 *   - `node scripts/verify-deploy.js --skip-live` before restarting (static checks only)
 *   - `node scripts/verify-deploy.js` after restart (includes live HTTP + login round-trip)
 *
 * Checks:
 *   1. .next/standalone/.next/static/ exists and has files
 *   2. better-sqlite3 loads without ABI error
 *   3. Required env vars present in .env.production.local OR process.env
 *   4. HTTP listener responds on :3201 (live only)
 *   5. POST /api/auth/login with ADMIN_TEST_PIN returns 200 with Set-Cookie (live only)
 *
 * v47.0 Phase 344-01.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const http = require("http");

const skipLive = process.argv.includes("--skip-live");
const verbose = process.argv.includes("--verbose");

const REQUIRED_ENV = [
  "RC_URL",
  "RC_JWT_SECRET",
  "NEXT_PUBLIC_API_URL",
  "NEXT_PUBLIC_GATEWAY_URL",
];

const results = [];
let failed = 0;

function check(name, fn) {
  try {
    const detail = fn();
    results.push({ name, ok: true, detail: detail || "ok" });
  } catch (err) {
    results.push({ name, ok: false, detail: err.message || String(err) });
    failed += 1;
  }
}

async function checkAsync(name, fn) {
  try {
    const detail = await fn();
    results.push({ name, ok: true, detail: detail || "ok" });
  } catch (err) {
    results.push({ name, ok: false, detail: err.message || String(err) });
    failed += 1;
  }
}

// Resolve project root (assume we're run from racingpoint-admin/)
const root = process.cwd();
const standaloneDir = path.join(root, ".next", "standalone");
const staticDir = path.join(standaloneDir, ".next", "static");
const envFile = path.join(root, ".env.production.local");

// ---- Static checks ----

check("1. Static assets (.next/standalone/.next/static)", () => {
  if (!fs.existsSync(standaloneDir)) {
    throw new Error(`.next/standalone/ missing — run 'next build' first`);
  }
  if (!fs.existsSync(staticDir)) {
    throw new Error(
      `.next/standalone/.next/static/ missing — admin-deploy.sh must copy it`
    );
  }
  const entries = fs.readdirSync(staticDir);
  if (entries.length === 0) {
    throw new Error(`.next/standalone/.next/static/ is empty`);
  }
  return `${entries.length} entries`;
});

check("2. better-sqlite3 loads", () => {
  try {
    const Db = require("better-sqlite3");
    const db = new Db(":memory:");
    db.pragma("journal_mode = WAL");
    db.close();
    return "ABI ok";
  } catch (err) {
    throw new Error(
      `better-sqlite3 load failed: ${err.message}. Run 'npm rebuild better-sqlite3' against ${process.version}.`
    );
  }
});

check("3. Required env vars present", () => {
  // Load .env.production.local if not already in process.env
  if (fs.existsSync(envFile)) {
    const content = fs.readFileSync(envFile, "utf8");
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq < 0) continue;
      const key = line.slice(0, eq).trim();
      let val = line.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = val;
    }
  }
  const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(`missing: ${missing.join(", ")}`);
  }
  return `${REQUIRED_ENV.length}/${REQUIRED_ENV.length} present`;
});

// ---- Live checks ----

function httpRequest(method, url, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = {
      hostname: u.hostname,
      port: u.port || 80,
      path: u.pathname + u.search,
      method,
      headers: body
        ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) }
        : {},
      timeout: 5000,
    };
    const req = http.request(opts, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () =>
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data,
        })
      );
    });
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("timeout after 5s"));
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

async function main() {
  if (!skipLive) {
    await checkAsync("4. HTTP listener /api/health", async () => {
      const res = await httpRequest("GET", "http://localhost:3201/api/health");
      if (res.status !== 200) {
        throw new Error(`/api/health returned ${res.status}: ${res.body.slice(0, 200)}`);
      }
      return `HTTP 200`;
    });

    const testPin = process.env.ADMIN_TEST_PIN;
    if (testPin) {
      await checkAsync("5. Login round-trip", async () => {
        const res = await httpRequest(
          "POST",
          "http://localhost:3201/api/auth/login",
          JSON.stringify({ pin: testPin })
        );
        if (res.status !== 200) {
          throw new Error(
            `/api/auth/login returned ${res.status}: ${res.body.slice(0, 200)}`
          );
        }
        const cookie = res.headers["set-cookie"];
        if (!cookie || !cookie.some((c) => c.includes("rp-admin-token"))) {
          throw new Error(`no rp-admin-token cookie in Set-Cookie header`);
        }
        return `HTTP 200 + cookie`;
      });
    } else {
      results.push({
        name: "5. Login round-trip",
        ok: true,
        detail: "SKIPPED (no ADMIN_TEST_PIN env)",
      });
    }
  }

  // Print results
  for (const r of results) {
    const mark = r.ok ? "PASS" : "FAIL";
    console.log(`[${mark}] ${r.name}: ${r.detail}`);
  }
  if (failed > 0) {
    console.error(`\n[verify-deploy] FAILED (${failed} check${failed > 1 ? "s" : ""})`);
    process.exit(1);
  }
  console.log(`\n[verify-deploy] OK`);
  process.exit(0);
}

main().catch((err) => {
  console.error(`[verify-deploy] unhandled error: ${err.message}`);
  process.exit(2);
});
