---
phase: 179-health-monitoring-alerting
plan: 01
subsystem: monitoring
tags: [rust, axum, health-check, whatsapp, sqlite, reqwest]

requires:
  - phase: 176-health-endpoints
    provides: "Next.js health endpoints on admin/kiosk/web"
  - phase: 177-deploy-audit-trail
    provides: "deploy_logs table pattern, service_routes pattern"
provides:
  - "App health monitor background task (30s probe loop)"
  - "app_health_log SQLite table"
  - "GET /api/v1/app-health endpoint"
  - "WhatsApp alerting on app degradation with 5-min cooldown"
  - "pub(crate) send_whatsapp for cross-module reuse"
affects: [179-02-admin-dashboard-health-panel, whatsapp-alerter, deploy-monitoring]

tech-stack:
  added: []
  patterns: ["Static LazyLock<RwLock<Vec<T>>> for in-memory probe state", "Fire-and-forget DB logging via tokio::spawn"]

key-files:
  created:
    - "crates/racecontrol/src/app_health_monitor.rs"
  modified:
    - "crates/racecontrol/src/whatsapp_alerter.rs"
    - "crates/racecontrol/src/db/mod.rs"
    - "crates/racecontrol/src/lib.rs"
    - "crates/racecontrol/src/main.rs"
    - "crates/racecontrol/src/api/routes.rs"

key-decisions:
  - "Reused existing send_whatsapp by making it pub(crate) rather than duplicating"
  - "Static LazyLock for health state (no AppState changes needed)"
  - "5-min per-app cooldown on alerts, no cooldown on recovery notifications"

patterns-established:
  - "App health probe pattern: static state + fire-and-forget DB logging"
  - "Cross-module WhatsApp alerting via pub(crate) send_whatsapp"

requirements-completed: [MON-02, MON-04, MON-05]

duration: 3min
completed: 2026-03-24
---

# Phase 179 Plan 01: Backend Health Monitoring Summary

**App health monitor probing admin/kiosk/web every 30s with WhatsApp alerts (5-min cooldown) and SQLite logging via GET /api/v1/app-health endpoint**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-24T04:15:51Z
- **Completed:** 2026-03-24T04:19:08Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Created app_health_monitor.rs with 30s probe loop hitting all 3 Next.js health endpoints concurrently
- WhatsApp alerting fires on degraded/unreachable with 5-minute per-app cooldown, plus recovery notifications
- GET /api/v1/app-health endpoint returns current status array for dashboard consumption
- app_health_log table stores all probe results for historical analysis

## Task Commits

Each task was committed atomically:

1. **Task 1: Create app_health_monitor module** - `c2532d40` (feat)
2. **Task 2: Add GET /api/v1/app-health endpoint** - `cd79dc2d` (feat)

## Files Created/Modified
- `crates/racecontrol/src/app_health_monitor.rs` - Health probe loop, WhatsApp alerting, DB logging, static health state
- `crates/racecontrol/src/whatsapp_alerter.rs` - Made send_whatsapp and ist_now_string pub(crate)
- `crates/racecontrol/src/db/mod.rs` - Added app_health_log table migration
- `crates/racecontrol/src/lib.rs` - Registered app_health_monitor module
- `crates/racecontrol/src/main.rs` - Added app_health_monitor::spawn after fleet_health
- `crates/racecontrol/src/api/routes.rs` - Added GET /api/v1/app-health route and handler

## Decisions Made
- Reused existing send_whatsapp by making it pub(crate) rather than duplicating the Evolution API logic
- Used static LazyLock<RwLock<Vec<AppHealthEntry>>> for in-memory health state to avoid modifying AppState struct
- 5-minute per-app cooldown on degradation alerts; no cooldown on recovery notifications (important to know ASAP)
- Fire-and-forget DB logging pattern (matches activity_log.rs and deploy.rs patterns)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- GET /api/v1/app-health endpoint ready for Plan 02 (admin dashboard health panel)
- Health data accumulating in app_health_log table for historical views
- Requires racecontrol deploy to server .23 to activate

---
*Phase: 179-health-monitoring-alerting*
*Completed: 2026-03-24*
