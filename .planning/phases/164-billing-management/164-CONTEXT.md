# Phase 164: Billing Management - Context

**Gathered:** 2026-03-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Billing back-office management — refund processing, split billing visibility, daily revenue reports, session history with search/filter, and admin-only rate configuration. Extends the active billing UI from Phase 163 with management and reporting capabilities.

</domain>

<decisions>
## Implementation Decisions

### Refund & Split Billing UX
- Refund flow via modal dialog triggered from session history row — consistent with Phase 163 action pattern
- Full refund by default with optional partial amount input field
- Refund history displayed as tab or filter on session history page showing refunded sessions
- Split billing as view-only info panel on session detail — shows split breakdown if applicable

### Reports & Session History
- Daily report as summary cards (total revenue, session count, avg duration) + table breakdown by rate at `/billing/reports`
- Session history filters: date range picker + status dropdown + pod filter + search by driver name
- "Load more" pagination (consistent with Phase 161 activity log)
- Defaults: today for daily report, last 7 days for session history

### Rate Management (Admin)
- Rate management at `/billing/rates` sub-page, admin-only with role check
- Inline table with edit-in-place for name/duration/price + add row button at top
- Toggle switch in table row for rate activation — instant toggle with toast confirmation
- Delete = soft-delete (deactivate) with confirm dialog — rates may be referenced by historical sessions

### Claude's Discretion
- Table column widths and responsive behavior
- Report card styling and metric layout
- Session history empty state
- Rate management form validation UX

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/api/billing.ts` — Billing API module with ActiveSession, SessionEvent, BillingRate types
- `src/components/ConfirmDialog.tsx` — Reusable confirm dialog (Phase 162)
- Sonner toast for action feedback
- SWR for polling and data fetching
- `billingApi.getRates()` already defined

### Established Patterns
- Table: full-width, bg-rp-card, hover states, sortable columns
- Action buttons: inline with confirm for destructive actions
- Modal: centered overlay with form
- "Load more" pagination pattern from Phase 161 activity log
- Admin-only gating from Phase 162 (useAuth + role check)

### Integration Points
- New pages: `/billing/reports`, `/billing/rates`, `/billing/history`
- Extend `billing.ts` with refund, history, report API functions
- Sidebar: add sub-items under Billing section

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

*Phase: 164-billing-management*
*Context gathered: 2026-03-22*
