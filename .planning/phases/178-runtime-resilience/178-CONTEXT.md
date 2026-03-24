# Phase 178: Runtime Resilience - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Add circuit breaker, retry with backoff, connection status indicator, and graceful degradation to the admin dashboard's API client layer. When backend goes down, pages show stale cached data instead of crashing.

</domain>

<decisions>
## Implementation Decisions

### Connection Status Indicator
- Bottom-right toast/pill — non-intrusive, visible on all pages
- 3 states: connected (hidden), degraded (yellow), offline (red) — only visible when something is wrong
- Auto-dismiss after 3s on reconnect with brief "Back online" message

### Graceful Degradation
- Show last cached data + "Data may be stale" banner when backend is down (SWR keeps previous data)
- Disable mutation buttons (Start, Launch, End) with tooltip "Backend offline" when circuit is open
- Admin dashboard only — kiosk/web have their own patterns, tackle separately

### Claude's Discretion
- Circuit breaker implementation details (threshold count, cooldown duration, probe logic)
- Retry backoff implementation (interceptor vs wrapper)
- Where to place the provider in the component tree
- SWR error handling configuration

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/api/base.ts` — `apiFetch()` (Gateway :3100) and `rcFetch()` (RaceControl via /api/rc proxy). Both throw on non-200. No retry, no circuit breaker.
- SWR is already a dependency (`swr: ^2.4.1` in package.json)
- `sonner: ^2.0.7` — toast library already in use

### Established Patterns
- All API calls go through `apiFetch` or `rcFetch`
- Pages use SWR hooks for data fetching (SWR auto-caches and revalidates)
- Next.js App Router with `(dashboard)` layout group
- Tailwind CSS 4 for styling

### Integration Points
- Circuit breaker wraps `apiFetch` and `rcFetch` — all callers get it automatically
- Connection indicator goes in `(dashboard)/layout.tsx` — visible on all dashboard pages
- SWR global config in a provider for error retry behavior

</code_context>

<specifics>
## Specific Ideas

No specific requirements — standard circuit breaker + SWR error handling patterns.

</specifics>

<deferred>
## Deferred Ideas

- Apply circuit breaker to kiosk and web dashboard (separate phase)
- WebSocket-based connection monitoring (overkill for polling-based architecture)

</deferred>
