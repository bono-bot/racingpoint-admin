# Domain Pitfalls

**Domain:** Admin dashboard expansion (Next.js 16, sim racing venue ops)
**Researched:** 2026-03-22
**Confidence:** HIGH (based on codebase analysis + established Next.js patterns)

---

## Critical Pitfalls

Mistakes that cause rewrites or major operational incidents.

### Pitfall 1: Open RC Proxy Becomes a Privilege Escalation Vector

**What goes wrong:** The existing `/api/rc/[...path]/route.ts` blindly proxies every HTTP method to every RaceControl endpoint. When auth is added, developers protect page routes but forget the proxy still forwards requests like `DELETE /api/rc/pods/POD1` or `POST /api/rc/billing/refund` without checking the user's role. A staff user with "view-only" intent can call any admin-level RC endpoint through the browser console.

**Why it happens:** Auth is typically bolted on at the page/middleware level. The catch-all proxy predates auth and sits outside the permission model. It feels "internal" so nobody audits it.

**Consequences:** Staff can issue refunds, shut down pods, modify pricing, or access financial data they should not see. One disgruntled employee can cause significant damage.

**Prevention:**
- Replace the single catch-all proxy with explicit route handlers per RC domain (pods, billing, drivers, etc.)
- Each handler checks the user's role against an allowlist of permitted RC endpoints
- Alternatively, add middleware that maps RC path prefixes to required roles before proxying
- Log every proxied mutation (POST/PUT/DELETE) with the authenticated user

**Detection:** Audit the proxy route early. If `/api/rc/[...path]` still exists after auth ships, this pitfall is active.

**Phase:** Must be addressed in the Auth phase, not deferred. Auth without proxy lockdown is security theater.

---

### Pitfall 2: Auth Token Stored Client-Side Without Refresh Strategy

**What goes wrong:** The RC `/auth/admin-login` endpoint returns a token. Developers store it in localStorage or a cookie and call it done. Six hours later the token expires, the user is mid-session managing a billing dispute, and the dashboard silently starts returning 401s. The user loses unsaved work and has to log in again.

**Why it happens:** Token refresh is boring plumbing. The happy path (login, use for 30 minutes, close tab) works fine in dev. Expiry only surfaces in production during long shifts.

**Consequences:** Staff lose trust in the dashboard. They start keeping backup spreadsheets. The "single pane of glass" value proposition collapses.

**Prevention:**
- Store token in an httpOnly cookie (not localStorage) to prevent XSS theft
- Implement a `/api/auth/refresh` server-side route that refreshes the RC token before expiry
- Add an Axios/fetch interceptor that detects 401 responses and triggers silent refresh
- If refresh fails, redirect to login with a "session expired" message and preserve the current URL for redirect-back
- Test with a 60-second token TTL during development to force expiry handling

**Detection:** If the auth implementation has no mention of "refresh" or "token expiry," this pitfall is active.

**Phase:** Auth phase. Must be in the initial implementation, not a follow-up.

---

### Pitfall 3: SQLite-to-API Migration Loses Data or Creates Dual-Write Period

**What goes wrong:** Migration is treated as a one-shot script: dump SQLite, POST to RC API, delete SQLite routes. But the cafe is open during migration. New sales happen after the dump but before the switchover. Those records exist in neither system. Alternatively, developers try a "dual-write" period where both SQLite and RC receive writes, but forget to handle one system being down, creating divergent datasets.

**Why it happens:** Data migration in a 24/7 venue cannot have downtime. The "just run it at night" approach fails because the cafe closes at midnight but RC pod sessions run until 2 AM.

**Consequences:** Missing financial records. Inventory counts wrong. Audit trail gaps. Uday gets incorrect revenue numbers.

**Prevention:**
- Migrate one domain at a time (menu first, then inventory, then HR, then finance) over separate phases
- For each domain: (1) build RC API integration, (2) add read-from-RC path, (3) run both in parallel with RC as primary and SQLite as fallback-read-only, (4) verify data matches, (5) remove SQLite path
- Never dual-write. Use RC as the single write target from the moment you switch
- Build a migration verification script that compares record counts and checksums between SQLite and RC
- Keep SQLite as read-only backup for 2 weeks after each domain migrates

**Detection:** If the migration plan has a single "migration phase" for all four domains (menu, inventory, HR, finance), this pitfall is active.

**Phase:** Data Migration phase. Must be broken into sub-phases per domain. Finance should migrate last (highest risk).

---

### Pitfall 4: Polling-Based Real-Time Creates Request Storm

**What goes wrong:** The fleet dashboard polls 8 pod status endpoints + active sessions + system health every 2 seconds. That is 10+ API calls every 2 seconds. Multiply by 2-3 browser tabs open (common in venue ops). RaceControl starts dropping requests under the sustained load. The dashboard shows stale data, which is worse than showing no data because staff trust it.

**Why it happens:** The project constraint says "polling-based, no WebSocket for v1." Developers implement naive `setInterval` polling without considering aggregate load.

**Consequences:** RC performance degrades for all consumers (kiosk, web dashboard, admin dashboard). Pod commands take longer. Billing operations slow down.

**Prevention:**
- Use a single aggregated endpoint on RC (e.g., `/api/v1/fleet/status`) that returns all pod statuses in one call, not 8 individual calls
- Poll at 5-second intervals minimum, not 2 seconds. Pod status does not change sub-second.
- Implement visibility-based polling: stop polling when the tab is not visible (`document.hidden`)
- Use `stale-while-revalidate` pattern: show cached data immediately, update in background
- Add a server-side BFF (Backend-for-Frontend) route that aggregates fleet + sessions + health into one payload
- If RC already has a bulk fleet endpoint, use it. If not, build one before the dashboard consumes individual endpoints

**Detection:** If the fleet dashboard implementation has more than 2 `setInterval` or `useEffect` polling hooks, this pitfall is active.

**Phase:** Pod & Fleet Control phase. Must design the polling architecture before building individual pod cards.

---

## Moderate Pitfalls

### Pitfall 5: AdminLayout Becomes an Auth-Aware God Component

**What goes wrong:** Auth gets bolted into `AdminLayout.tsx` (currently 200+ lines of nav sections). It starts checking roles to show/hide nav items, then adds user context, then adds notification badges, then adds health status indicators. The component balloons to 600+ lines and every change risks breaking navigation for all 27+ pages.

**Prevention:**
- Keep AdminLayout as a pure layout component (sidebar + content area)
- Create a separate `AuthProvider` context that wraps at the `layout.tsx` level
- Create a separate `NavItems` component that reads auth context to filter visible items
- Use Next.js middleware (`middleware.ts`) for route protection, not component-level checks
- Role-based nav visibility should be data-driven (a config map of `route -> required_role`), not if/else chains

**Phase:** Auth phase. The architectural decision of where auth lives must happen before any auth code is written.

---

### Pitfall 6: Wallet Operations Without Idempotency

**What goes wrong:** Staff clicks "Top-up Rs 500" on a driver's wallet. The request is slow (network hiccup). Staff clicks again. Driver gets Rs 1000. Or: a refund is issued, the response times out, staff retries, driver gets double refund.

**Why it happens:** Financial operations through a web UI have no built-in idempotency. The RC API may or may not support idempotency keys.

**Prevention:**
- Disable the action button immediately on click (optimistic disable)
- Generate a client-side idempotency key (UUID) and send it with every financial mutation
- Verify RC's wallet endpoints support idempotency keys. If not, add request deduplication at the BFF layer
- Show a confirmation dialog for all financial operations (top-up, debit, refund) with amount and driver name
- Add a "recent actions" sidebar that shows the last 5 operations with timestamps, so staff can see if their action went through

**Phase:** Billing & Wallet phase. Must be designed before implementing any financial mutation UI.

---

### Pitfall 7: `apiFetch` and `rcFetch` Used Inconsistently After Auth

**What goes wrong:** The existing `api.ts` has two fetch wrappers: `apiFetch` (Gateway, uses API key) and `rcFetch` (RC, proxied through Next.js). When auth is added, the auth token needs to be sent with RC requests. Some developers modify `rcFetch` to include the token. Others create a new `authedRcFetch`. Others pass the token manually. Three months later, there are 4 different ways to call RC, some of which bypass auth.

**Why it happens:** The `api.ts` module was built pre-auth. There is no clear pattern for how auth tokens flow through the fetch layer.

**Prevention:**
- Refactor `api.ts` before adding auth. Create a single `createApiClient(token)` factory that returns typed methods
- All RC calls go through server-side API routes (where the token is validated from the cookie), never directly from the browser
- Remove `NEXT_PUBLIC_GATEWAY_API_KEY` from browser exposure (already flagged in CONCERNS.md) as part of this refactor
- Establish the pattern in a single PR and document it. Every subsequent feature follows the same pattern

**Phase:** Auth phase. The fetch layer refactor is a prerequisite, not a follow-up.

---

### Pitfall 8: No Graceful Degradation When RC Is Down

**What goes wrong:** After migration, 100% of dashboard functionality depends on RaceControl being reachable. RC restarts (deploys, crashes, updates) take 5-30 seconds. During that window, every page shows "rc-core unreachable" errors. Staff panic. They call Uday.

**Why it happens:** The current proxy returns a bare `{ error: 'rc-core unreachable' }` with a 502. No page handles this gracefully. No retry. No cached fallback.

**Prevention:**
- Add a global error boundary that shows "RaceControl is restarting, retrying in 5s..." instead of broken pages
- Cache the last successful response for read-only pages (fleet status, leaderboard, driver list) and show stale data with a "last updated X seconds ago" badge
- Implement automatic retry with exponential backoff (3 attempts, 1s/2s/4s) in the fetch wrapper
- Add a health check indicator in the header bar (green/yellow/red dot) so staff know system status at a glance
- Never show raw error JSON to staff

**Phase:** Should be addressed early, in the Auth/infrastructure phase, as a cross-cutting concern.

---

## Minor Pitfalls

### Pitfall 9: Billing Session Timer Drift

**What goes wrong:** The dashboard shows a live timer for active billing sessions calculated as `now - session_start_time`. But if the client clock is wrong (common on venue PCs) or the server clock drifts, the displayed duration does not match what RC is actually billing. Staff tell a customer "you have 10 minutes left" but RC bills them for 15.

**Prevention:**
- Always calculate elapsed time from server timestamps, not client `Date.now()`
- Include `server_time` in polling responses so the client can calculate drift
- Display the RC-calculated duration/cost, not a client-side approximation

**Phase:** Billing & Sessions phase.

---

### Pitfall 10: Navigation Bloat After 40+ Pages

**What goes wrong:** The sidebar currently has 5 sections with ~20 items. Adding fleet control, billing, drivers, wallets, events, games, and scheduling pushes it to 35+ items. The sidebar becomes unusable. Staff cannot find anything.

**Prevention:**
- Group new features under collapsible sections (already partially done with NavSection pattern)
- Add a keyboard shortcut / command palette (Cmd+K) for quick navigation
- Pin the most-used pages (fleet status, active sessions, billing) to the top
- Consider role-based nav: staff see operations, admin sees everything

**Phase:** Should be considered during the Control Room phase when the nav structure is being redesigned.

---

### Pitfall 11: Missing Loading States for Destructive Actions

**What goes wrong:** Pod shutdown, billing stop, and refund buttons have no loading state. Staff clicks "Shutdown Pod 3," nothing visually happens for 2 seconds, staff clicks again, second request goes through to a pod that is already shutting down, RC returns an error, staff sees an error toast and thinks the shutdown failed.

**Prevention:**
- Every button that triggers a mutation must: (1) disable on click, (2) show a spinner, (3) re-enable on success/failure
- Use an `ActionButton` component that encapsulates this pattern
- For destructive actions (shutdown, refund, delete), require a confirmation dialog

**Phase:** Should be established as a component pattern in the first feature phase (Fleet Control) and reused everywhere.

---

### Pitfall 12: Hardcoded RC URL Breaks Multi-Environment

**What goes wrong:** `RC_URL` defaults to `http://localhost:8080`. Works on the venue server. Breaks when a developer runs the dashboard on their laptop and forgets to set the env var. Also breaks if RC moves to a different port or host (e.g., Docker deployment).

**Prevention:**
- Remove all fallback defaults (already flagged in CONCERNS.md)
- Fail fast on startup if `RC_URL` is not set: add a startup validation script
- Add a `.env.example` file with all required variables documented
- Consider a `src/lib/config.ts` that validates all env vars at import time and throws descriptive errors

**Phase:** Infrastructure/Auth phase. Should be the very first commit.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Auth & Authorization | Open RC proxy bypass (Pitfall 1) | Lock down proxy before or during auth rollout |
| Auth & Authorization | Token expiry not handled (Pitfall 2) | Implement refresh flow from day one |
| Auth & Authorization | Fetch layer fragmentation (Pitfall 7) | Refactor api.ts before adding auth |
| Auth & Authorization | Env var defaults in production (Pitfall 12) | Add startup config validation |
| Fleet Control | Polling request storm (Pitfall 4) | Design aggregated endpoint + BFF first |
| Fleet Control | Missing loading states (Pitfall 11) | Build ActionButton component pattern |
| Billing & Sessions | Timer drift (Pitfall 9) | Use server-calculated durations |
| Billing & Sessions | Double-submit financial ops (Pitfall 6) | Idempotency keys + optimistic disable |
| Wallet Operations | Double-submit (Pitfall 6) | Same as billing |
| Data Migration | Data loss during cutover (Pitfall 3) | One domain at a time, never dual-write |
| Control Room | Nav bloat (Pitfall 10) | Command palette + collapsible sections |
| Cross-cutting | RC downtime breaks everything (Pitfall 8) | Global error boundary + retry + cache |
| Cross-cutting | AdminLayout god component (Pitfall 5) | Separate auth, nav, and layout concerns |

---

## Sources

- Codebase analysis: `src/app/api/rc/[...path]/route.ts` (open proxy pattern)
- Codebase analysis: `src/lib/api.ts` (dual fetch pattern, exposed API key)
- Codebase analysis: `src/components/AdminLayout.tsx` (nav structure)
- Codebase analysis: `src/lib/db.ts` (SQLite singleton, migration source)
- `.planning/codebase/CONCERNS.md` (known security and tech debt issues)
- `.planning/PROJECT.md` (requirements, constraints, key decisions)
- Next.js 16 middleware patterns (HIGH confidence, well-established)
- Polling architecture anti-patterns (HIGH confidence, common in real-time dashboards)
- Financial operation idempotency (HIGH confidence, standard practice)

---

*Pitfalls audit: 2026-03-22*
