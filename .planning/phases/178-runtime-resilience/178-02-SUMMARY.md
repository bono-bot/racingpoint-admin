---
phase: 178-runtime-resilience
plan: 02
subsystem: ui
tags: [react-context, swr, circuit-breaker, connection-status, graceful-degradation]

requires:
  - phase: 178-runtime-resilience plan 01
    provides: CircuitBreaker singleton with state change callback
provides:
  - ConnectionContext with real-time connection status derived from circuit breaker
  - ConnectionIndicator pill component (hidden/yellow/red/green states)
  - SWRProvider with keepPreviousData and circuit-breaker-aware retry
  - Dashboard layout wired with all resilience providers
affects: [179-monitoring-alerting, dashboard-pages]

tech-stack:
  added: []
  patterns: [circuit-breaker-to-ui-context, swr-global-error-config, connection-indicator-overlay]

key-files:
  created:
    - src/contexts/ConnectionContext.tsx
    - src/components/ConnectionIndicator.tsx
    - src/app/providers.tsx
  modified:
    - src/lib/api/circuit-breaker.ts
    - src/app/(dashboard)/layout.tsx

key-decisions:
  - "Added setOnStateChange public setter to CircuitBreaker (minimal API surface for React subscription)"
  - "SWR keepPreviousData=true ensures pages show cached data on failed revalidation"
  - "SWR retry stops completely when circuit is open, slow-polls otherwise"
  - "ConnectionIndicator placed outside AdminLayout but inside ConnectionProvider for fixed overlay"

patterns-established:
  - "useConnection() hook for any component needing connection status awareness"
  - "SWRProvider wraps all dashboard pages for consistent error/retry behavior"

requirements-completed: [RUNTIME-04, RUNTIME-05]

duration: 2min
completed: 2026-03-24
---

# Phase 178 Plan 02: Connection Status UI Summary

**React context + indicator pill wired to circuit breaker, SWR global config with keepPreviousData for graceful degradation when backend is down**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-24T04:00:01Z
- **Completed:** 2026-03-24T04:02:01Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- ConnectionContext derives real-time connection status from circuit breaker state changes
- ConnectionIndicator shows bottom-right pill: hidden when connected, yellow "Connection unstable" when degraded, red "Backend offline" when offline, green "Back online" auto-dismissing after 3s
- SWR global config with keepPreviousData=true so pages show cached data instead of crashing when backend fails
- SWR retry disabled when circuit breaker is open (no request flood), slow-polls in half-open/closed
- All dashboard pages wrapped in ConnectionProvider + SWRProvider via layout

## Task Commits

Each task was committed atomically:

1. **Task 1: Create ConnectionContext and ConnectionIndicator** - `1757249` (feat)
2. **Task 2: Wire providers into dashboard layout and add SWR global config** - `b7e7891` (feat)

## Files Created/Modified
- `src/contexts/ConnectionContext.tsx` - React context exposing connection state from circuit breaker
- `src/components/ConnectionIndicator.tsx` - Fixed bottom-right pill showing connection status
- `src/app/providers.tsx` - SWR global config with circuit-breaker-aware error handling
- `src/lib/api/circuit-breaker.ts` - Added setOnStateChange public setter
- `src/app/(dashboard)/layout.tsx` - Wrapped with SWRProvider, ConnectionProvider, ConnectionIndicator

## Decisions Made
- Added `setOnStateChange()` public setter to CircuitBreaker class rather than exposing the property directly (cleaner API boundary)
- SWR `keepPreviousData: true` is the key to graceful degradation (RUNTIME-05): failed revalidation keeps showing previous data
- SWR retry completely stopped when circuit is open (prevents request flood); slow-polls at 5s intervals otherwise
- ConnectionIndicator placed outside AdminLayout but inside ConnectionProvider so it renders as fixed overlay on all dashboard pages

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added setOnStateChange method to CircuitBreaker**
- **Found during:** Task 1 (ConnectionContext creation)
- **Issue:** CircuitBreaker had onStateChange as private field set only via constructor. React context needed to subscribe dynamically.
- **Fix:** Added `setOnStateChange(callback)` public method to CircuitBreaker class
- **Files modified:** src/lib/api/circuit-breaker.ts
- **Verification:** TypeScript compiles cleanly
- **Committed in:** 1757249 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Essential for React context to subscribe to circuit breaker. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All runtime resilience UI is in place
- Phase 179 (monitoring/alerting) can build on connection status awareness
- Dashboard pages automatically get graceful degradation via SWR keepPreviousData

---
*Phase: 178-runtime-resilience*
*Completed: 2026-03-24*
