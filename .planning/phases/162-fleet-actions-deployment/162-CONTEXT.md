# Phase 162: Fleet Actions & Deployment - Context

**Gathered:** 2026-03-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Add pod control actions (wake, shutdown, restart, lockdown, enable/disable), bulk fleet actions, maintenance mode toggle, rolling deploy, and remote exec to the fleet dashboard built in Phase 161. All mutation capabilities for the pod fleet.

</domain>

<decisions>
## Implementation Decisions

### Pod Action Controls
- Action buttons directly on each pod card in the fleet grid (not a separate page)
- Confirm dialog for destructive actions (shutdown, restart, lockdown); instant for wake, enable
- Bulk action bar above the pod grid: Wake All, Shutdown All, Restart All, Lockdown All buttons
- Toast notification for action feedback + pod card status updates via polling

### Deploy & Maintenance
- Rolling deploy button in fleet toolbar, progress shown as pod-by-pod status updates
- Maintenance mode toggle switch on each pod card, yellow highlight when active
- Remote exec: admin-only text input in expandable section on each pod card
- Deploy and remote exec restricted to isAdmin check (scaffolded in Phase 159)

### Claude's Discretion
- Pod card expanded state UI for remote exec
- Confirm dialog styling
- Bulk action button icons and layout
- Deploy progress visualization details

</decisions>

<canonical_refs>
## Canonical References

### RaceControl Pod API
- RC API routes: `/pods/{id}/wake`, `/pods/{id}/shutdown`, `/pods/{id}/restart`, `/pods/{id}/lockdown`, `/pods/{id}/enable`, `/pods/{id}/disable`, `/pods/{id}/clear-maintenance`, `/pods/{id}/exec`
- Bulk: `/pods/wake-all`, `/pods/shutdown-all`, `/pods/restart-all`, `/pods/lockdown-all`
- Deploy: `/deploy/rolling`, `/deploy/status`, `/deploy/{pod_id}`
- Pod maintenance: `/pods/{id}/clear-maintenance` (maintenance set via lockdown)

### Dashboard Code
- `src/app/(dashboard)/fleet/page.tsx` — Fleet dashboard (Phase 161, ~223 LOC)
- `src/lib/api/fleet.ts` — Fleet API module with getHealth(), getActivity()
- `src/hooks/useAuth.ts` — useAuth hook for isAdmin check
- `src/components/Toast.tsx` — Sonner toast shim

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Fleet page with pod grid and activity log (Phase 161)
- Fleet API module with base functions
- Sonner toast for action feedback
- useAuth hook with isAdmin for gating admin features

### Established Patterns
- SWR polling at 5s for fleet data
- Pod card: bg-rp-card border border-rp-border rounded-lg
- rcFetch for RC API calls via proxy

### Integration Points
- Extend fleet/page.tsx with action buttons on pod cards
- Extend fleet.ts with action API functions
- Add bulk action bar above pod grid

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

*Phase: 162-fleet-actions-deployment*
*Context gathered: 2026-03-22*
