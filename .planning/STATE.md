---
gsd_state_version: 1.0
milestone: v20.1
milestone_name: milestone
status: in_progress
stopped_at: Completed 178-02-PLAN.md
last_updated: "2026-03-24T04:02:30Z"
last_activity: 2026-03-24 — Phase 178 Plan 02 complete (connection status UI + SWR provider)
progress:
  total_phases: 4
  completed_phases: 3
  total_plans: 6
  completed_plans: 6
  percent: 100
---

# Project State: API Hardening (v20.1)

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-23)

**Core value:** No Next.js app deploy goes live with missing pages, and runtime backend failures degrade gracefully instead of crashing
**Current focus:** Phase 178 - Runtime Resilience

## Current Position

Phase: 3 of 4 (Runtime Resilience)
Plan: 2 of 2 in current phase (COMPLETE)
Status: Phase 178 complete
Last activity: 2026-03-24 — Phase 178 Plan 02 complete (connection status UI + SWR provider)

Progress: [██████████] 100%

## Performance Metrics

**Velocity:**
- Total plans completed: 3
- Average duration: 3min
- Total execution time: 0.13 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| Phase 176 P01 | 2min | 1 tasks | 1 files |
| Phase 176 P02 | 2min | 2 tasks | 2 files |
| Phase 177 P01 | 4min | 1 tasks | 2 files |

**Recent Trend:**
- Last 5 plans: 176-01 (2min), 176-02 (2min), 177-01 (4min)
- Trend: Steady

*Updated after each plan completion*
| Phase 177 P02 | 4min | 1 tasks | 1 files |
| Phase 178 P01 | 2min | 2 tasks | 3 files |
| Phase 178 P02 | 2min | 2 tasks | 5 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Self-verifying health endpoints chosen over external monitoring (LAN-only apps)
- Unified deploy script replaces manual 3-step process that kept being done wrong
- Admin health endpoint partially started (src/app/api/health/route.ts has route scanning)
- Deploy script drafted (deploy-staging/deploy-nextjs.sh)
- Racecontrol existing WhatsApp alerter infrastructure reused for MON-02/MON-05
- [Phase 176]: Alphabetically sorted EXPECTED_PAGES for readability and diff-friendliness
- [Phase 176]: Removed /login exclusion from extra filter in kiosk and web (unnecessary)
- [Phase 177]: Deploy-log routes in service_routes() with no auth (LAN-only deploy script)
- [Phase 177]: Fire-and-forget tokio::spawn for deploy log DB insert (activity_log.rs pattern)
- [Phase 177]: SCP upload replaces python http.server for deploy (simpler, no background process)
- [Phase 177]: Deploy logging is best-effort (non-fatal if racecontrol unreachable)
- [Phase 178]: Singleton circuit breaker shared across apiFetch/rcFetch (single backend = single circuit)
- [Phase 178]: CB wraps retry so all 3 retries fail = 1 circuit failure count
- [Phase 178]: Kept implicit return types to preserve caller compat (17+ callers)
- [Phase 178]: Added setOnStateChange public setter to CircuitBreaker for React subscription
- [Phase 178]: SWR keepPreviousData=true for graceful degradation (pages show cached data on failure)
- [Phase 178]: SWR retry stops when circuit open, slow-polls otherwise (no request flood)

### Pending Todos

None yet.

### Blockers/Concerns

- Cross-project: health endpoints needed in 3 apps (admin, kiosk, web) -- coordinate deploys
- Racecontrol backend changes needed for MON-04/MON-05 (health probes)

## Session Continuity

Last session: 2026-03-24T04:02:30Z
Stopped at: Completed 178-02-PLAN.md
Resume file: None
