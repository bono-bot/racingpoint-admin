# Phase 161: Fleet Monitoring - Context

**Gathered:** 2026-03-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Real-time fleet health dashboard showing all 8 racing pods with status, version, uptime, and connection state. Includes a global activity log for pod events. Read-only monitoring — pod actions (wake/shutdown/etc.) are Phase 162.

</domain>

<decisions>
## Implementation Decisions

### Fleet Dashboard Layout
- 4x2 grid of pod cards — each shows pod number, status dot, version, uptime
- Color-coded status: green dot = online, red = offline, yellow = maintenance + text label
- 5-second polling interval via SWR refreshInterval
- New "Fleet" section in sidebar navigation under Operations

### Activity Log
- Global fleet log (all pods combined) with filter-by-pod dropdown
- Reverse chronological table: timestamp, pod #, event type, details
- Show last 100 events with "Load more" button
- Real-time updates — new events prepended at top via same 5s polling

### Claude's Discretion
- Card styling and hover states
- Responsive breakpoints for the pod grid
- Activity log column widths and truncation
- Empty state when no activity

</decisions>

<canonical_refs>
## Canonical References

### RaceControl Fleet API
- `C:/Users/bono/racingpoint/racecontrol/crates/racecontrol/src/api/routes.rs` — `/fleet/health` endpoint (GET, returns array of PodFleetStatus)
- `C:/Users/bono/racingpoint/racecontrol/CLAUDE.md` — Fleet endpoint docs: fields are pod_number, ws_connected, http_reachable, version, build_id, uptime_secs, last_seen

### Dashboard Infrastructure
- `src/lib/api/fleet.ts` — Fleet API module (created in Phase 160)
- `src/lib/api/base.ts` — Base fetch functions (rcFetch)
- `src/components/AdminLayout.tsx` — Sidebar navigation (add Fleet section)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/api/fleet.ts` — Fleet domain API module ready for fleet health calls
- SWR (v2.4.1) — Use useSWR with refreshInterval: 5000 for polling
- AdminLayout navSections array — add Fleet section

### Established Patterns
- All pages use 'use client' + useEffect or useSWR for data fetching
- Card pattern: bg-rp-card border border-rp-border rounded-lg
- Table pattern: full-width with rp-card background, hover states

### Integration Points
- `src/app/(dashboard)/fleet/page.tsx` — New fleet dashboard page
- AdminLayout.tsx navSections — add Fleet link
- RC proxy: `/api/rc/fleet/health` and `/api/rc/pods/{pod_id}/activity`

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 161-fleet-monitoring*
*Context gathered: 2026-03-22*
