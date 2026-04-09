#!/usr/bin/env node
/*
 * server-bootstrap.js — env loader wrapper for .next/standalone/server.js
 *
 * Why: Next.js 15 standalone mode does NOT auto-load .env.local or .env.production.local.
 * This wrapper:
 *   1. Loads env vars from .env.production.local (sibling file) into process.env
 *      (unless already set by the runner — runner wins)
 *   2. Asserts required env vars are present, exits 1 with clear error if any missing
 *   3. Requires ./server.js (the Next.js standalone entrypoint)
 *
 * Run from inside .next/standalone/ — this file is copied there by admin-deploy.sh.
 * Platform-agnostic: works on venue Windows (start-admin.bat) + cloud Linux (pm2).
 *
 * v47.0 Phase 344-01.
 */

"use strict";

const fs = require("fs");
const path = require("path");

const REQUIRED_ENV = [
  "RC_URL",
  "RC_JWT_SECRET",
  "NEXT_PUBLIC_API_URL",
  "NEXT_PUBLIC_GATEWAY_URL",
];

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return 0;
  const content = fs.readFileSync(filePath, "utf8");
  let loaded = 0;
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    // Strip surrounding quotes
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    // Runner wins — never clobber existing process.env
    if (!(key in process.env)) {
      process.env[key] = val;
      loaded += 1;
    }
  }
  return loaded;
}

function main() {
  const herePath = __dirname;
  const envFile = path.join(herePath, ".env.production.local");
  const loaded = loadDotEnv(envFile);
  if (loaded > 0) {
    console.log(`[bootstrap] loaded ${loaded} env vars from .env.production.local`);
  } else if (!fs.existsSync(envFile)) {
    console.log(`[bootstrap] no .env.production.local found — expecting runner env`);
  }

  const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error(
      `[bootstrap] FATAL: missing required env vars: ${missing.join(", ")}`
    );
    console.error(
      `[bootstrap] set them in .env.production.local or export before starting Node`
    );
    process.exit(1);
  }

  // Set PORT default if not provided
  if (!process.env.PORT) process.env.PORT = "3201";

  // Set HOSTNAME default (Next.js standalone expects it)
  if (!process.env.HOSTNAME) process.env.HOSTNAME = "0.0.0.0";

  console.log(
    `[bootstrap] starting Next.js standalone on ${process.env.HOSTNAME}:${process.env.PORT}`
  );

  // Hand off to Next.js standalone server
  require("./server.js");
}

main();
