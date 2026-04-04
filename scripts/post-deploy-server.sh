#!/usr/bin/env bash
# post-deploy-server.sh — Run on server after deploying admin standalone build
# Fixes: better-sqlite3 native module compiled for wrong Node.js version
# The build machine (James) runs Node v22, server runs Node v24.
# The standalone bundle includes a Node v22 binary that crashes at runtime.

set -e

ADMIN_DIR="C:/RacingPoint/admin"
SQLITE_MOD="$ADMIN_DIR/node_modules/better-sqlite3"

echo "[post-deploy] Rebuilding better-sqlite3 for $(node -v)..."

cd "$SQLITE_MOD"
npx --yes prebuild-install 2>/dev/null || {
  echo "[post-deploy] prebuild-install failed, trying npm rebuild..."
  cd "$ADMIN_DIR"
  npm rebuild better-sqlite3
}

# Also fix the .next bundled copy if it exists
NEXT_SQLITE=$(find "$ADMIN_DIR/.next" -name "better_sqlite3.node" -type f 2>/dev/null | head -1)
if [ -n "$NEXT_SQLITE" ]; then
  SRC_SQLITE="$SQLITE_MOD/build/Release/better_sqlite3.node"
  if [ -f "$SRC_SQLITE" ]; then
    cp "$SRC_SQLITE" "$NEXT_SQLITE"
    echo "[post-deploy] Copied rebuilt binary to .next bundle"
  fi
fi

echo "[post-deploy] better-sqlite3 rebuild complete"
