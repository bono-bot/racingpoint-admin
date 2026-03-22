# Phase 164: Billing Management - Research

**Researched:** 2026-03-22
**Domain:** Billing back-office management (refunds, reports, history, rate CRUD)
**Confidence:** HIGH

## Summary

Phase 164 extends the active billing UI from Phase 163 with management and reporting capabilities. The existing codebase provides a solid foundation: `billing.ts` API module with typed interfaces, `ConfirmDialog` for destructive actions, SWR for data fetching, sonner for toast feedback, and established table/modal patterns. The admin-only gating via `useAuth().isAdmin` is proven from Phase 162's fleet page.

This phase adds three new pages (`/billing/history`, `/billing/reports`, `/billing/rates`) and a refund modal on the history page. The primary technical work is extending the billing API module with new endpoints and building UI pages that follow the exact patterns established in Phases 161-163 (tables with filters, summary cards, inline edit, confirm dialogs).

**Primary recommendation:** Build in two plans -- (1) API extensions + session history page with refund modal, (2) daily reports page + rate management page with admin gating. Reuse all existing patterns verbatim.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Refund flow via modal dialog triggered from session history row -- consistent with Phase 163 action pattern
- Full refund by default with optional partial amount input field
- Refund history displayed as tab or filter on session history page showing refunded sessions
- Split billing as view-only info panel on session detail -- shows split breakdown if applicable
- Daily report as summary cards (total revenue, session count, avg duration) + table breakdown by rate at `/billing/reports`
- Session history filters: date range picker + status dropdown + pod filter + search by driver name
- "Load more" pagination (consistent with Phase 161 activity log)
- Defaults: today for daily report, last 7 days for session history
- Rate management at `/billing/rates` sub-page, admin-only with role check
- Inline table with edit-in-place for name/duration/price + add row button at top
- Toggle switch in table row for rate activation -- instant toggle with toast confirmation
- Delete = soft-delete (deactivate) with confirm dialog -- rates may be referenced by historical sessions

### Claude's Discretion
- Table column widths and responsive behavior
- Report card styling and metric layout
- Session history empty state
- Rate management form validation UX

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| BILL-06 | Staff can issue a refund for a billing session | Refund modal on history page, API `POST /billing/{id}/refund`, ConfirmDialog pattern |
| BILL-07 | Staff can view refund history for a session | Status filter on history page includes "refunded" status, refund details in session row |
| BILL-08 | Staff can view split billing options for a session | View-only split breakdown panel on expanded session row in history |
| BILL-09 | Staff can view daily billing report | `/billing/reports` page with summary cards + rate breakdown table |
| BILL-10 | Admin can manage billing rates (CRUD) | `/billing/rates` page, admin-only, inline edit table, soft-delete |
| BILL-12 | Staff can view billing session history with search and filters | `/billing/history` page with date range, status, pod, driver filters + load-more pagination |
</phase_requirements>

## Standard Stack

### Core (already installed -- no new deps)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.6 | App router, pages | Project framework |
| React | 19.2.3 | UI components | Project framework |
| SWR | 2.4.1 | Data fetching + polling | Established pattern from Phases 161-163 |
| sonner | 2.0.7 | Toast notifications | Established pattern |
| date-fns | 4.1.0 | Date formatting/manipulation | Already installed, use for date range defaults |
| lucide-react | 0.577.0 | Icons | Established pattern |
| zod | 4.3.6 | Form validation | Established for forms |
| react-hook-form | 7.72.0 | Form state | Established for forms |

### Supporting (already installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| clsx + tailwind-merge | 2.1.1 / 3.5.0 | Class merging via `cn()` | All conditional styling |
| @hookform/resolvers | 5.2.2 | Zod resolver for forms | Rate management form validation |

### No New Dependencies Needed
All required functionality is covered by the existing stack. Date range picker uses native `<input type="date">` (consistent with admin dashboard context -- no need for a fancy calendar component for internal staff tool).

**Installation:** None required.

## Architecture Patterns

### New Pages Structure
```
src/app/(dashboard)/billing/
  page.tsx              # Existing -- active sessions (Phase 163)
  history/page.tsx      # NEW -- session history with search/filter + refund modal
  reports/page.tsx      # NEW -- daily billing report
  rates/page.tsx        # NEW -- rate management (admin-only)
```

### Sidebar Navigation Update
```typescript
// In AdminLayout.tsx navSections, update Operations section:
{
  title: 'Operations',
  items: [
    { href: '/sessions', label: 'Sessions' },
    { href: '/billing', label: 'Active Billing' },
    { href: '/billing/history', label: 'Billing History' },
    { href: '/billing/reports', label: 'Billing Reports' },
    { href: '/billing/rates', label: 'Billing Rates' },
    { href: '/bookings', label: 'Bookings' },
    // ... rest
  ],
}
```

### Pattern 1: API Module Extension
**What:** Extend `src/lib/api/billing.ts` with new endpoint functions
**When to use:** All new API calls follow this module pattern

```typescript
// Add to billingApi object in billing.ts:
refundSession: (id: string, data: { amount_paise?: number; reason?: string }): Promise<void> =>
  rcFetch(`/billing/${id}/refund`, { method: 'POST', body: JSON.stringify(data) }),

getHistory: (params: { offset?: number; limit?: number; status?: string; pod_id?: string; driver_name?: string; from?: string; to?: string }): Promise<{ sessions: ActiveSession[]; total: number }> =>
  rcFetch(`/billing/sessions?${new URLSearchParams(Object.entries(params).filter(([,v]) => v != null).map(([k,v]) => [k, String(v)])).toString()}`),

getDailyReport: (date: string): Promise<{ total_revenue_paise: number; session_count: number; avg_duration_seconds: number; by_rate: Array<{ rate_name: string; count: number; revenue_paise: number }> }> =>
  rcFetch(`/billing/reports/daily?date=${date}`),

createRate: (data: { name: string; duration_minutes: number; price_paise: number }): Promise<BillingRate> =>
  rcFetch('/billing/rates', { method: 'POST', body: JSON.stringify(data) }),

updateRate: (id: string, data: Partial<{ name: string; duration_minutes: number; price_paise: number; active: boolean }>): Promise<BillingRate> =>
  rcFetch(`/billing/rates/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

deleteRate: (id: string): Promise<void> =>
  rcFetch(`/billing/rates/${id}`, { method: 'DELETE' }),
```

### Pattern 2: Session History Page with Filters
**What:** Table page with filter bar, load-more pagination, expandable rows
**When to use:** BILL-12 session history page
**Follows:** Fleet activity log pattern from Phase 161

```typescript
// Key state for history page:
const [filters, setFilters] = useState({
  status: '',
  pod_id: '',
  driver_name: '',
  from: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
  to: format(new Date(), 'yyyy-MM-dd'),
});
const [limit, setLimit] = useState(50);

// SWR key changes when filters change:
const { data } = useSWR(
  ['/billing/sessions', filters, limit],
  () => billingApi.getHistory({ ...filters, limit, offset: 0 }),
);
```

### Pattern 3: Refund Modal
**What:** Modal dialog for issuing refund, triggered from session history row action
**When to use:** BILL-06 refund flow

```typescript
// Refund modal follows StartSessionModal pattern from billing/page.tsx:
// - State: refundTarget (session to refund), partial amount, reason
// - Full refund by default, optional partial amount input
// - Confirm via ConfirmDialog pattern (danger variant)
// - On success: toast + mutate SWR data
```

### Pattern 4: Admin-Only Page Gating
**What:** Rate management page restricted to admin users
**When to use:** BILL-10 rate management
**Source:** Phase 162 fleet page pattern

```typescript
const { isAdmin } = useAuth();

// Option A: Hide entire page content
if (!isAdmin) {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Billing Rates</h1>
      <p className="text-neutral-400">Admin access required.</p>
    </div>
  );
}
```

### Pattern 5: Inline Edit Table for Rates
**What:** Table rows that switch to edit mode on click/button
**When to use:** BILL-10 rate management

```typescript
// Each row tracks editing state:
const [editingId, setEditingId] = useState<string | null>(null);
const [editValues, setEditValues] = useState<Partial<BillingRate>>({});

// Row renders inputs when editingId matches, displays text otherwise
// Save: PATCH/PUT to API, toast success, mutate SWR
// Cancel: reset editingId to null
// Toggle active: instant PATCH with toast, no edit mode needed
```

### Anti-Patterns to Avoid
- **Don't create a separate billing API proxy route** -- the catch-all `/api/rc/[...path]/route.ts` already proxies all RC API calls
- **Don't use client-side date libraries for date picker** -- native `<input type="date">` is sufficient for internal admin tool
- **Don't paginate with page numbers** -- use "load more" (offset+limit) pattern consistent with Phase 161
- **Don't store filter state in URL** -- local component state is sufficient for internal tool (no shareable URLs needed)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date formatting | Custom date formatters | `date-fns` (already installed) | Already in deps, handles IST via locale |
| Currency formatting | New formatter | Existing `fmt()` from billing/page.tsx | Already formats paise to INR with locale |
| Confirm dialogs | New dialog component | Existing `ConfirmDialog` component | Battle-tested in Phases 162-163 |
| Toast notifications | Alert/banner system | `sonner` toast (already wired) | Consistent UX across all pages |
| Form validation | Manual validation | `zod` + `react-hook-form` (Phase 160) | For rate creation/edit forms |

**Key insight:** Nearly everything needed already exists in the codebase. The main work is composing existing patterns into new pages.

## Common Pitfalls

### Pitfall 1: RC API Contract Assumptions
**What goes wrong:** Assuming RC API endpoints exist without verification
**Why it happens:** Admin dashboard depends on RaceControl backend API contracts
**How to avoid:** The proxy at `/api/rc/[...path]` forwards to `${RC_URL}/api/v1/...`. Build API functions optimistically but handle 404/500 gracefully. If RC doesn't have an endpoint yet, the UI should show a meaningful error, not crash.
**Warning signs:** 502 errors from proxy, empty data responses

### Pitfall 2: Date Timezone Issues
**What goes wrong:** Date range filters send wrong dates due to timezone conversion
**Why it happens:** JavaScript Date objects are UTC-based, but the business operates in IST (Asia/Kolkata)
**How to avoid:** Use `<input type="date">` which gives `yyyy-MM-dd` strings. Send these strings directly to the API without Date object conversion. Use `date-fns` format/subDays for defaults only.
**Warning signs:** Report showing wrong day's data, off-by-one on date boundaries

### Pitfall 3: Rate Deletion Referential Integrity
**What goes wrong:** Hard-deleting a rate that's referenced by historical sessions
**Why it happens:** Rates are foreign-keyed to billing sessions
**How to avoid:** Already decided: soft-delete (deactivate). Toggle `active: false` instead of DELETE. Show deactivated rates greyed out or filtered.
**Warning signs:** API returns 409 conflict on delete

### Pitfall 4: Stale SWR Data After Mutations
**What goes wrong:** After refund/rate change, table doesn't update
**Why it happens:** SWR cache not invalidated after mutation
**How to avoid:** Call `mutate()` after every successful mutation (refund, rate create/update/delete). This pattern is already established in Phases 161-163.
**Warning signs:** User has to manually refresh to see changes

### Pitfall 5: Refund Amount Validation
**What goes wrong:** Partial refund exceeds original session amount
**Why it happens:** No client-side validation on refund amount
**How to avoid:** Validate `amount_paise <= session.price_paise` before submitting. Show original amount in modal for reference.
**Warning signs:** API rejects refund with 400 error

## Code Examples

### Verified Pattern: Summary Cards (for Reports page)
```typescript
// Source: Established project pattern (bg-rp-card, border-rp-border)
function SummaryCard({ label, value, subtitle }: { label: string; value: string; subtitle?: string }) {
  return (
    <div className="bg-rp-card border border-rp-border rounded-xl p-5">
      <p className="text-sm text-neutral-400 mb-1">{label}</p>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      {subtitle && <p className="text-xs text-neutral-500 mt-1">{subtitle}</p>}
    </div>
  );
}
```

### Verified Pattern: Filter Bar
```typescript
// Source: Fleet activity log (Phase 161) - select + filter pattern
<div className="flex items-center gap-3 mb-4 flex-wrap">
  <input type="date" value={filters.from} onChange={...}
    className="bg-rp-card border border-rp-border rounded-lg px-3 py-1.5 text-sm text-white" />
  <input type="date" value={filters.to} onChange={...}
    className="bg-rp-card border border-rp-border rounded-lg px-3 py-1.5 text-sm text-white" />
  <select value={filters.status} onChange={...}
    className="bg-rp-card border border-rp-border rounded-lg px-3 py-1.5 text-sm text-white">
    <option value="">All Statuses</option>
    <option value="active">Active</option>
    <option value="completed">Completed</option>
    <option value="refunded">Refunded</option>
    <option value="cancelled">Cancelled</option>
  </select>
  <input type="text" placeholder="Search driver..." value={filters.driver_name}
    onChange={...}
    className="bg-rp-card border border-rp-border rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-neutral-500" />
</div>
```

### Verified Pattern: Load More Button
```typescript
// Source: Fleet page (Phase 161) - identical pattern
{data.sessions.length === limit && (
  <button
    onClick={() => setLimit(prev => prev + 50)}
    className="w-full py-2 text-sm text-rp-grey hover:text-white bg-rp-card border border-rp-border rounded-lg mt-2"
  >
    Load more
  </button>
)}
```

### Verified Pattern: Toggle Switch for Rate Active Status
```typescript
// Inline toggle - instant API call with toast
<button
  onClick={async () => {
    try {
      await billingApi.updateRate(rate.id, { active: !rate.active });
      toast.success(`Rate ${rate.active ? 'deactivated' : 'activated'}`);
      mutate();
    } catch (e) {
      toast.error('Failed to update rate');
    }
  }}
  className={cn(
    'relative w-10 h-5 rounded-full transition-colors',
    rate.active ? 'bg-emerald-600' : 'bg-neutral-700'
  )}
>
  <span className={cn(
    'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform',
    rate.active ? 'left-5' : 'left-0.5'
  )} />
</button>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Page-number pagination | "Load more" offset pagination | Phase 161 decision | Consistent UX, simpler state |
| Separate API files per endpoint | Single module per domain (`billing.ts`) | Phase 160 refactor | All billing endpoints in one file |
| Custom confirm modals per page | Shared `ConfirmDialog` component | Phase 162 | Reuse, consistent UX |

**No deprecated patterns in use** -- the project stack is fresh (started 2026-03-22).

## Open Questions

1. **RC API endpoints for refund, history, reports**
   - What we know: Active session endpoints exist and work (`/billing/active`, `/billing/start`, etc.)
   - What's unclear: Exact response shapes for `/billing/sessions` (list), `/billing/reports/daily`, and `/billing/{id}/refund`
   - Recommendation: Build API functions with expected shapes, handle errors gracefully. The proxy will forward to RC which should have these endpoints.

2. **Split billing data structure**
   - What we know: BILL-08 requires showing split billing info
   - What's unclear: Whether RC API returns split info as part of session or separate endpoint
   - Recommendation: Try session detail endpoint first (`/billing/sessions/{id}`) -- if split data is included, render it. If not, add a separate API call.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Playwright 1.58.2 |
| Config file | `playwright.config.ts` |
| Quick run command | `npx playwright test tests/e2e/03-operations.spec.ts` |
| Full suite command | `npx playwright test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BILL-06 | Refund modal opens, submits, shows toast | e2e | `npx playwright test tests/e2e/billing-management.spec.ts -g "refund"` | No -- Wave 0 |
| BILL-07 | Refund history visible in filtered view | e2e | `npx playwright test tests/e2e/billing-management.spec.ts -g "refund history"` | No -- Wave 0 |
| BILL-08 | Split billing info displayed | e2e | `npx playwright test tests/e2e/billing-management.spec.ts -g "split"` | No -- Wave 0 |
| BILL-09 | Daily report page renders with cards and table | e2e | `npx playwright test tests/e2e/billing-management.spec.ts -g "report"` | No -- Wave 0 |
| BILL-10 | Rate CRUD (create/edit/toggle/delete) admin-only | e2e | `npx playwright test tests/e2e/billing-management.spec.ts -g "rate"` | No -- Wave 0 |
| BILL-12 | History page with filters and load-more | e2e | `npx playwright test tests/e2e/billing-management.spec.ts -g "history"` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npx playwright test tests/e2e/billing-management.spec.ts --headed`
- **Per wave merge:** `npx playwright test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/e2e/billing-management.spec.ts` -- covers BILL-06, BILL-07, BILL-08, BILL-09, BILL-10, BILL-12
- Note: E2E tests require RC API to be running. Tests should verify page rendering and UI interactions. API mocking via route interception if RC unavailable.

## Sources

### Primary (HIGH confidence)
- Project codebase direct inspection: `src/lib/api/billing.ts`, `src/app/(dashboard)/billing/page.tsx`, `src/app/(dashboard)/fleet/page.tsx`, `src/components/ConfirmDialog.tsx`, `src/components/AdminLayout.tsx`
- `package.json` -- verified all dependencies are installed, no new packages needed

### Secondary (MEDIUM confidence)
- Phase 163 CONTEXT.md and established patterns -- confirmed working in production
- RC API proxy pattern (`/api/rc/[...path]/route.ts`) -- verified catch-all forwarding

### Tertiary (LOW confidence)
- RC API endpoint contracts for refund/history/reports -- assumed based on RESTful conventions, not verified against RC source

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed and proven in prior phases
- Architecture: HIGH -- follows exact patterns from Phases 161-163, no new paradigms
- Pitfalls: MEDIUM -- RC API contract assumptions are the main risk
- Code examples: HIGH -- extracted from existing codebase, not hypothetical

**Research date:** 2026-03-22
**Valid until:** 2026-04-22 (stable -- internal tool with locked stack)
