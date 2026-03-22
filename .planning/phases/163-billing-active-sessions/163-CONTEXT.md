# Phase 163: Billing & Active Sessions - Context

**Gathered:** 2026-03-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Real-time active billing session management — view all active sessions with live countdown timers, start new sessions, stop/pause/resume/extend existing sessions, and view session event timelines. This is the core daily billing operations page.

</domain>

<decisions>
## Implementation Decisions

### Active Sessions Display
- Table layout with live countdown timers per row, sortable by pod, customer, time remaining
- Countdown color-coded: green >30min, yellow <30min, red <5min
- 5-second SWR polling interval (consistent with fleet)
- Start session via modal form: select pod, select customer (optional), choose rate/duration

### Session Controls
- Inline row buttons: Pause/Resume, Extend, Stop — confirm dialog for Stop
- Quick-extend dropdown on the row (15min, 30min, 1hr options)
- Expandable row showing session event timeline (start, pause, resume, extend) chronologically
- Disable button during request + optimistic UI update for idempotency

### Claude's Discretion
- Table column widths and responsive behavior
- Start session modal layout
- Event timeline styling within expandable row
- Empty state when no active sessions

</decisions>

<canonical_refs>
## Canonical References

### RaceControl Billing API
- `/billing/active` — GET active sessions
- `/billing/start` — POST start billing
- `/billing/sessions/{id}` — GET session details
- `/billing/{id}/stop` — POST stop session
- `/billing/{id}/pause` — POST pause
- `/billing/{id}/resume` — POST resume
- `/billing/{id}/extend` — POST extend
- `/billing/sessions/{id}/events` — GET session events

### Dashboard Code
- `src/lib/api/billing.ts` — Billing API module (created Phase 160)
- `src/app/(dashboard)/sessions/page.tsx` — Existing sessions page (may need replacement or enhancement)
- `src/components/ConfirmDialog.tsx` — Reusable confirm dialog (Phase 162)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- ConfirmDialog component (Phase 162)
- Sonner toast for action feedback
- SWR for polling
- Billing API module with base functions

### Established Patterns
- Table: full-width, bg-rp-card, hover states, sortable columns
- Action buttons: inline with confirm for destructive
- Modal: centered overlay with form

### Integration Points
- New or enhanced billing page at `src/app/(dashboard)/billing/page.tsx`
- Extend billing.ts with active session API functions
- Sidebar: add Billing section or enhance existing

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

*Phase: 163-billing-active-sessions*
*Context gathered: 2026-03-22*
