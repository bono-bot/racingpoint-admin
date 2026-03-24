---
phase: 177-deploy-automation-verification
plan: 02
subsystem: infra
tags: [bash, deploy, rollback, health-check, scp, ssh]

requires:
  - phase: 177-01
    provides: "POST /api/v1/deploy-log endpoint on racecontrol"
  - phase: 176
    provides: "GET /api/health endpoints on all 3 Next.js apps"
provides:
  - "Universal deploy-nextjs.sh with backup, rollback, health gate, audit logging"
  - "8-step deploy pipeline for admin, kiosk, and web apps"
affects: [deploy-staging, racecontrol, racingpoint-admin, kiosk, web]

tech-stack:
  added: []
  patterns: ["8-step deploy pipeline", "pre-deploy health snapshot", "auto-rollback from backup zip", "deploy audit logging via POST"]

key-files:
  created: []
  modified:
    - "deploy-staging/deploy-nextjs.sh"

key-decisions:
  - "SCP upload replaces python http.server (simpler, no background process cleanup)"
  - "JSON payloads written to tmpfile before curl (Git Bash standing rule)"
  - "Health check retries 3 times with 5s waits before declaring failure"
  - "Deploy logging is best-effort (non-fatal if racecontrol unreachable)"

patterns-established:
  - "Deploy pipeline: build -> verify -> package -> pre-health -> upload -> health-gate -> log -> rollback"
  - "Backup before extract, rollback on degraded health"

requirements-completed: [DEPLOY-03, DEPLOY-04, DEPLOY-05, DEPLOY-06]

duration: 4min
completed: 2026-03-24
---

# Phase 177 Plan 02: Deploy Script Summary

**Production-grade deploy-nextjs.sh with 8-step pipeline: build, verify, package, pre-health snapshot, SCP upload with backup, health gate refusing degraded deploys, audit logging to racecontrol, and auto-rollback**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-24T03:42:19Z
- **Completed:** 2026-03-24T03:46:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Rewrote deploy-nextjs.sh from 5-step draft to 8-step production pipeline
- Auto-backup of current app before deploy, auto-rollback on health failure (DEPLOY-06)
- Health gate refuses degraded deploys — checks status:"ok" AND healthy:true (DEPLOY-04)
- Every deploy attempt logged to POST /api/v1/deploy-log with pages_before/after, duration, build hash (DEPLOY-05)
- Replaced python http.server upload with SCP (simpler, no background process management)
- Extracted reusable helpers: log_deploy(), start_node_on_server(), stop_node_on_port(), check_health()

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite deploy-nextjs.sh with backup, rollback, health gate, and deploy logging** - `cdc4c16` (feat)

## Files Created/Modified
- `deploy-staging/deploy-nextjs.sh` - Universal Next.js deploy script (8-step pipeline with backup/rollback/health gate/logging)

## Decisions Made
- SCP upload instead of python http.server — eliminates background process cleanup, simpler error handling
- JSON written to tmpfile for curl (standing rule: Git Bash mangles inline JSON backslashes)
- Health check retries 3x with 5s waits — apps need startup time
- Deploy logging is best-effort: warns but does not fail the deploy if racecontrol is unreachable
- Rollback logs separately with result="rollback" for audit trail clarity

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Deploy pipeline ready for production use across all 3 apps
- Phase 178/179 can build on this for monitoring and alerting
- First real deploy will test the full pipeline end-to-end

## Self-Check: PASSED

- deploy-staging/deploy-nextjs.sh: FOUND
- Commit cdc4c16: FOUND

---
*Phase: 177-deploy-automation-verification*
*Completed: 2026-03-24*
