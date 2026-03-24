# Phase 176: Self-Verifying Health Endpoints - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Each of the 3 Next.js apps (admin, kiosk, web) gets a `/api/health` endpoint that scans `.next/server/app` at runtime to report which pages exist vs which are expected. Returns 200 "healthy" when complete, 503 "degraded" when pages are missing.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/app/api/health/route.ts` (admin) — COMPLETE implementation with route scanning, expected page manifest, missing/extra detection, static asset check. Returns 200/503 with full deploy manifest.
- `racecontrol/web/src/app/api/health/route.ts` — STUB only, returns static `{status: "ok"}` with no route scanning.
- Kiosk has NO health endpoint at all.

### Established Patterns
- Admin health uses `fs.readdirSync` to scan `.next/server/app/` directory
- Skips route groups `(auth)`, `(dashboard)` — just descends into them
- Detects `.html` files as page indicators
- Hardcoded `EXPECTED_PAGES` array as the deploy contract
- Returns structured JSON: `{status, service, version, deploy: {pages_expected, pages_available, pages_missing, pages_extra, static_assets, healthy}}`

### Integration Points
- Admin: 33 pages + 3 API routes in manifest, 51 total routes on disk
- Kiosk: 9 pages (/, /book, /control, /debug, /fleet, /pod/[number], /settings, /spectator, /staff)
- Web: ~25 pages (includes dynamic routes like /ac-sessions/[id], /results/[id])
- All 3 apps use Next.js standalone output mode

</code_context>

<specifics>
## Specific Ideas

No specific requirements — infrastructure phase.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>
