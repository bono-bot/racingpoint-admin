---
phase: 160-shared-infrastructure
plan: 02
subsystem: api
tags: [typescript, modular-api, barrel-file, refactor]

# Dependency graph
requires:
  - phase: 159-authentication-session-security
    provides: authenticated proxy and session management
provides:
  - Domain-organized API modules (fleet, billing, drivers, events, games, ops)
  - Barrel file with backward-compatible unified api object
  - Base fetcher utilities (apiFetch, rcFetch) as reusable exports
affects: [fleet-monitoring, billing, drivers, events, games, ops]

# Tech tracking
tech-stack:
  added: []
  patterns: [domain-module-api-split, barrel-re-export, backward-compat-shim]

key-files:
  created:
    - src/lib/api/base.ts
    - src/lib/api/fleet.ts
    - src/lib/api/billing.ts
    - src/lib/api/drivers.ts
    - src/lib/api/events.ts
    - src/lib/api/games.ts
    - src/lib/api/ops.ts
    - src/lib/api/index.ts
  modified:
    - src/lib/api.ts

key-decisions:
  - "Kept unified api object via spread in index.ts for zero-change backward compatibility"
  - "Duplicated GATEWAY_URL/API_KEY constants in ops.ts for transcribe's raw fetch (no apiFetch)"

patterns-established:
  - "Domain API module pattern: each domain gets its own file under src/lib/api/"
  - "Barrel re-export pattern: index.ts re-exports all domains, api.ts re-exports index"

requirements-completed: [INFRA-01]

# Metrics
duration: 2min
completed: 2026-03-22
---

# Phase 160 Plan 02: API Client Modularization Summary

**Refactored 152-line monolithic api.ts into 7 domain modules with barrel file and backward-compatible re-export shim**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-22T13:39:54Z
- **Completed:** 2026-03-22T13:42:22Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Split monolithic API into 7 domain-specific modules (base, fleet, billing, drivers, events, games, ops)
- Created barrel index.ts that reconstructs unified api object via spread for backward compatibility
- Converted original api.ts to 3-line re-export shim -- all 12 consumer pages work unchanged
- TypeScript compilation and production build both pass cleanly

## Task Commits

Each task was committed atomically:

1. **Task 1: Create domain API modules and barrel file** - `f28dbfd` (feat)
2. **Task 2: Convert old api.ts to re-export shim** - `5b669d5` (refactor)

## Files Created/Modified
- `src/lib/api/base.ts` - Exported apiFetch and rcFetch base fetcher functions
- `src/lib/api/fleet.ts` - Fleet domain (listPods, setPodScreen)
- `src/lib/api/billing.ts` - Billing placeholder for Phase 163
- `src/lib/api/drivers.ts` - Drivers domain (getCustomers) with Customer types
- `src/lib/api/events.ts` - Events domain (bookings, tournaments, time trials) with Booking types
- `src/lib/api/games.ts` - Games domain (kiosk, coupons, pricing, packages)
- `src/lib/api/ops.ts` - Ops domain (health, chat, transcribe) with Transcribe types
- `src/lib/api/index.ts` - Barrel file with all re-exports and unified api object
- `src/lib/api.ts` - Reduced to 3-line re-export shim

## Decisions Made
- Kept unified api object via spread in index.ts for zero-change backward compatibility
- Duplicated GATEWAY_URL/API_KEY constants in ops.ts for transcribe's raw fetch (doesn't use apiFetch)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Stale .next build cache caused a false ToastProvider error; resolved by clearing .next directory

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Domain API modules ready for feature phases to import directly (e.g., `import { fleetApi } from '@/lib/api/fleet'`)
- Billing module is a placeholder ready for Phase 163 endpoints
- All existing pages continue working via backward-compatible shim

## Self-Check: PASSED

- All 8 created files verified present
- Commits f28dbfd and 5b669d5 verified in git log

---
*Phase: 160-shared-infrastructure*
*Completed: 2026-03-22*
