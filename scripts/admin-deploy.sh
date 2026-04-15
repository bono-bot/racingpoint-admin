#!/usr/bin/env bash
# admin-deploy.sh — Unified admin dashboard deploy for venue (Windows Git Bash) + cloud (Linux bash)
#
# Usage:
#   ./scripts/admin-deploy.sh                Normal deploy (build + verify + restart)
#   ./scripts/admin-deploy.sh --rollback     Revert to previous build
#   ./scripts/admin-deploy.sh --dry-run      Build + verify without restart
#
# Environment:
#   ADMIN_RESTART_CMD   Shell command to restart admin after deploy (platform-specific)
#                       Venue:  'schtasks /F /End /TN StartAdminSvc; schtasks /Run /TN StartAdminSvc'
#                       Cloud:  'pm2 restart racingpoint-admin --update-env'
#   ADMIN_TEST_PIN      PIN for post-deploy login round-trip test (optional but recommended)
#
# v47.0 Phase 344-01.

set -euo pipefail

MODE="${1:-deploy}"

# ---- Sanity ----

if [ ! -f "package.json" ]; then
  echo "[admin-deploy] FATAL: run from racingpoint-admin/ root (no package.json here)"
  exit 1
fi

# ---- Rollback mode ----

if [ "$MODE" = "--rollback" ]; then
  echo "[admin-deploy] ROLLBACK mode"
  if [ ! -d ".next/prev-standalone" ]; then
    echo "[admin-deploy] FATAL: no .next/prev-standalone to roll back to"
    exit 1
  fi
  rm -rf .next/standalone
  mv .next/prev-standalone .next/standalone
  if [ -n "${ADMIN_RESTART_CMD:-}" ]; then
    echo "[admin-deploy] restarting via: $ADMIN_RESTART_CMD"
    eval "$ADMIN_RESTART_CMD"
    # Wait for listener
    for i in $(seq 1 30); do
      if curl -sf http://localhost:3201/api/health >/dev/null 2>&1; then
        break
      fi
      sleep 1
    done
    node scripts/verify-deploy.js
  else
    echo "[admin-deploy] WARN: no ADMIN_RESTART_CMD — manual restart required"
  fi
  echo "[admin-deploy] ROLLBACK OK"
  exit 0
fi

# ---- Normal deploy ----

NODE_VER="$(node -v)"
echo "[admin-deploy] Node version: $NODE_VER"
case "$NODE_VER" in
  v22.*) ;;
  *)
    echo "[admin-deploy] FATAL: need Node 22.x, got $NODE_VER"
    echo "[admin-deploy] Fix: install Node 22 LTS and re-run (see .nvmrc)"
    exit 1
    ;;
esac

# Step 1: Archive previous build
echo "[admin-deploy] Step 1/10: archive previous build"
if [ -d ".next/standalone" ]; then
  rm -rf .next/prev-standalone
  mv .next/standalone .next/prev-standalone
  echo "[admin-deploy]   prev build preserved at .next/prev-standalone"
fi

# Step 2: Clean install
echo "[admin-deploy] Step 2/10: npm ci"
npm ci --no-audit --no-fund

# Step 3: Next.js build
echo "[admin-deploy] Step 3/10: next build"
npx next build

# Step 4: Copy static assets into standalone tree (Next known gap)
echo "[admin-deploy] Step 4/10: copy static assets into standalone tree"
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public

# Step 5: Rebuild native bindings against runtime Node
echo "[admin-deploy] Step 5/10: rebuild better-sqlite3 against $NODE_VER"
( cd .next/standalone && npm rebuild better-sqlite3 )

# Step 6: Copy bootstrap + env file
echo "[admin-deploy] Step 6/10: copy bootstrap + env file"
cp scripts/server-bootstrap.js .next/standalone/server-bootstrap.js
if [ -f ".env.production.local" ]; then
  cp .env.production.local .next/standalone/.env.production.local
  echo "[admin-deploy]   .env.production.local copied"
else
  echo "[admin-deploy]   WARN: no .env.production.local — relying on runner env"
fi

# Step 7: Pre-start verify (static checks only)
echo "[admin-deploy] Step 7/10: pre-start verify (static)"
node scripts/verify-deploy.js --skip-live

if [ "$MODE" = "--dry-run" ]; then
  echo "[admin-deploy] DRY RUN — skipping restart + live verify"
  echo "[admin-deploy] BUILD OK"
  exit 0
fi

# Step 8: Restart
echo "[admin-deploy] Step 8/10: restart service"
if [ -z "${ADMIN_RESTART_CMD:-}" ]; then
  echo "[admin-deploy]   WARN: no ADMIN_RESTART_CMD — restart the admin manually and re-run verify-deploy.js"
  echo "[admin-deploy]   venue example: ADMIN_RESTART_CMD='schtasks //F //End //TN StartAdminSvc; schtasks //Run //TN StartAdminSvc'"
  echo "[admin-deploy]   cloud example: ADMIN_RESTART_CMD='pm2 restart racingpoint-admin --update-env'"
  exit 0
fi
echo "[admin-deploy]   running: $ADMIN_RESTART_CMD"
eval "$ADMIN_RESTART_CMD"

# Wait for listener (30s budget)
echo "[admin-deploy]   waiting for :3201 /api/health"
for i in $(seq 1 30); do
  if curl -sf http://localhost:3201/api/health >/dev/null 2>&1; then
    echo "[admin-deploy]   listener up after ${i}s"
    break
  fi
  sleep 1
done

# Step 9: Full verify (live checks)
echo "[admin-deploy] Step 9/10: post-restart verify (live)"
node scripts/verify-deploy.js

# Step 10: Smoke test (all pages load, no hydration errors)
echo "[admin-deploy] Step 10/10: 46-page smoke test"
if command -v npx &>/dev/null && [ -f "tests/e2e/contract/smoke-all-pages.spec.ts" ]; then
  bash scripts/run-smoke-test.sh || {
    echo "[admin-deploy] WARN: smoke test failed — pages have errors"
    echo "[admin-deploy] Deploy completed but smoke test gate FAILED"
    exit 1
  }
else
  echo "[admin-deploy]   SKIP: Playwright not available or test file missing"
fi

echo "[admin-deploy] DEPLOY OK"
