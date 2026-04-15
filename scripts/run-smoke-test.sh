#!/usr/bin/env bash
# run-smoke-test.sh — Run 46-page smoke test as deploy gate
#
# Usage:
#   ./scripts/run-smoke-test.sh              Run against localhost:3200
#   ADMIN_SMOKE_BASE=http://host:3201 ./scripts/run-smoke-test.sh   Run against custom host
#   ADMIN_CONTRACT_PIN=5678 ./scripts/run-smoke-test.sh             Use custom PIN
#
# Exit codes:
#   0 = all pages pass
#   1 = one or more pages broken (deploy should NOT proceed)
#
# Integration with admin-deploy.sh:
#   Add to Step 9 (post-restart verify): bash scripts/run-smoke-test.sh
#
# v47.0 Phase 350-03.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$SCRIPT_DIR"

echo "[smoke-test] Running 46-page admin smoke test..."
echo "[smoke-test] Base: ${ADMIN_SMOKE_BASE:-http://localhost:3200}"

# Run only the smoke test (not contract tests which modify data)
npx playwright test tests/e2e/contract/smoke-all-pages.spec.ts \
  --reporter=list \
  --timeout=120000 \
  2>&1

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  echo "[smoke-test] PASS — all pages healthy"
else
  echo "[smoke-test] FAIL — broken pages detected (exit code $EXIT_CODE)"
  echo "[smoke-test] Deploy should NOT proceed until pages are fixed"
fi

exit $EXIT_CODE
