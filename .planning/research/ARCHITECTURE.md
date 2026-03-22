# Architecture Patterns

**Domain:** Operations admin dashboard (sim racing venue) -- real-time fleet monitoring + auth + multi-domain CRUD
**Researched:** 2026-03-22

## Current Architecture (Baseline)

The existing app is a Next.js 16 App Router application with:
- All pages as `'use client'` components using `useState` + `useEffect` for data fetching
- Two API client functions: `apiFetch()` (Gateway :3100) and `rcFetch()` (RC proxy via `/api/rc/*`)
- A catch-all RC proxy route (`/api/rc/[...path]/route.ts`) forwarding to `RC_URL/api/v1/*`
- Local SQLite via `better-sqlite3` for cafe/HR/finance data
- No authentication -- open on local network
- No real-time polling -- one-shot fetches on mount
- 4 shared components: AdminLayout, Toast, ConfirmDialog, Skeleton

This architecture works for static CRUD pages but will not scale to real-time fleet monitoring, authenticated sessions, or the 8+ new feature domains planned.

## Recommended Architecture

### Layered Integration Model

Do NOT rearchitect the entire app. Instead, layer three new cross-cutting concerns onto the existing structure:

```
                    +------------------+
                    |   middleware.ts   |  Auth gate (Edge Runtime)
                    +--------+---------+
                             |
              +--------------+--------------+
              |                             |
    +---------v---------+      +------------v-----------+
    |  AuthProvider      |      |  Root Layout           |
    |  (React Context)   |      |  (AdminLayout + Toast) |
    +--------+-----------+      +------------+-----------+
             |                               |
    +--------v-------------------------------v---------+
    |              Page Components ('use client')       |
    |                                                   |
    |  +------------+  +------------+  +-------------+  |
    |  | useSWR     |  | useSWR     |  | useState    |  |
    |  | (polling)  |  | (on-demand)|  | (forms)     |  |
    |  +------------+  +------------+  +-------------+  |
    +--------------------------------------------------+
             |                    |
    +--------v---------+  +------v-----------+
    |  /api/rc/[...path] |  |  /api/auth/*    |
    |  (existing proxy)  |  |  (new: login,   |
    |                    |  |   session, me)   |
    +--------+-----------+  +------+-----------+
             |                     |
    +--------v---------------------v---------+
    |  RaceControl (Rust/Axum :8080)          |
    |  /api/v1/* (200+ routes)                |
    +----------------------------------------+
```

### Component Boundaries

| Component | Responsibility | Communicates With | New/Existing |
|-----------|---------------|-------------------|--------------|
| `middleware.ts` | Route protection, token validation, redirect to /login | Reads auth cookie, redirects | **NEW** |
| `AuthProvider` | Auth context (user, role, logout), wraps app | middleware.ts (indirectly), /api/auth/* | **NEW** |
| `/api/auth/*` routes | Login, logout, session refresh, /me endpoint | RaceControl `/auth/admin-login` | **NEW** |
| `src/lib/api.ts` | API client for all backend calls | Gateway :3100, RC proxy /api/rc/* | **EXTEND** (add auth header forwarding) |
| `src/hooks/useFleet.ts` | SWR-based fleet polling hook | `/api/rc/pods`, `/api/rc/pods/health` | **NEW** |
| `src/hooks/useBilling.ts` | SWR-based active sessions polling | `/api/rc/billing/sessions` | **NEW** |
| `/api/rc/[...path]` proxy | Pass-through to RaceControl | RC :8080 (all methods) | **EXISTING** (add auth token forwarding) |
| `AdminLayout` | Navigation, sidebar, global shell | AuthProvider (user info, logout) | **EXTEND** |
| Domain pages | Feature-specific UI (fleet, billing, drivers, etc.) | Domain hooks, api.ts | **NEW pages** |

### Data Flow

**Authentication Flow:**

```
1. User visits any route
2. middleware.ts checks for `rp-admin-token` httpOnly cookie
3. Missing? → redirect to /login
4. Present? → verify token validity (decode JWT, check expiry)
5. Valid? → allow request, set x-user-role header
6. /login page: POST /api/auth/login → RC /auth/admin-login → set httpOnly cookie → redirect to /
7. Refresh: middleware detects near-expiry → calls /api/auth/refresh → extends cookie
```

**Real-Time Fleet Monitoring Flow:**

```
1. /fleet page mounts
2. useFleet() hook calls useSWR('/api/rc/pods', fetcher, { refreshInterval: 3000 })
3. SWR polls /api/rc/pods every 3 seconds
4. RC proxy forwards to RC :8080 /api/v1/pods
5. RaceControl returns pod status (online/offline, game running, CPU/RAM, uptime)
6. SWR deduplicates concurrent requests from multiple components
7. UI re-renders only changed pods (React reconciliation)
8. Tab hidden? refreshWhenHidden: false stops polling to save resources
9. Tab visible again? SWR revalidates immediately on focus
```

**CRUD Flow (unchanged pattern, extended):**

```
1. User opens /drivers page
2. Page calls api.getDrivers() → rcFetch('/drivers') → /api/rc/drivers → RC :8080
3. User edits driver → api.updateDriver(id, data) → rcFetch PUT
4. On success: mutate SWR cache OR call load() to refresh (existing pattern)
5. Toast notification on success/error
```

**Billing Session Flow (hybrid real-time + actions):**

```
1. /billing page: useBilling() polls active sessions every 5s
2. Staff clicks "Start Session" → POST /api/rc/billing/start → RC creates session
3. SWR cache invalidated → immediate re-fetch shows new session
4. Timer ticks client-side (cosmetic), server is source of truth
5. Staff clicks "Stop" → POST /api/rc/billing/stop → session ends
6. SWR re-fetches, session disappears from active list
```

## Patterns to Follow

### Pattern 1: Domain Hook with SWR Polling

Use SWR for any data that changes frequently. Create one hook per domain.

```typescript
// src/hooks/useFleet.ts
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function useFleet() {
  const { data, error, isLoading, mutate } = useSWR(
    '/api/rc/pods',
    fetcher,
    {
      refreshInterval: 3000,        // poll every 3s for fleet
      revalidateOnFocus: true,       // refresh when tab regains focus
      refreshWhenHidden: false,      // stop when tab is hidden
      dedupingInterval: 2000,        // deduplicate within 2s window
      onErrorRetry: (err, key, config, revalidate, { retryCount }) => {
        if (retryCount >= 5) return;  // give up after 5 retries
        setTimeout(() => revalidate({ retryCount }), 5000);
      },
    }
  );

  return {
    pods: data?.pods ?? [],
    isLoading,
    isError: !!error,
    refresh: mutate,
  };
}
```

**When to use:** Fleet status, active billing sessions, system health -- anything polled.
**When NOT to use:** Static CRUD lists (drivers, events, packages) -- use one-shot fetch + manual refresh.

### Pattern 2: Auth via httpOnly Cookie + Edge Middleware

Do NOT use NextAuth/Auth.js -- overkill for a single-backend admin login. Use custom auth with `jose` for Edge-compatible JWT verification.

```typescript
// middleware.ts (Edge Runtime)
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const PUBLIC_PATHS = ['/login', '/api/auth/login'];
const secret = new TextEncoder().encode(process.env.AUTH_SECRET);

export async function middleware(req: NextRequest) {
  if (PUBLIC_PATHS.some(p => req.nextUrl.pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = req.cookies.get('rp-admin-token')?.value;
  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  try {
    const { payload } = await jwtVerify(token, secret);
    const res = NextResponse.next();
    res.headers.set('x-user-role', payload.role as string);
    return res;
  } catch {
    return NextResponse.redirect(new URL('/login', req.url));
  }
}

export const config = { matcher: ['/((?!_next|favicon.ico).*)'] };
```

**Why custom over NextAuth:** RaceControl already has `/auth/admin-login`. We just need to store the token in a cookie and verify it at the edge. NextAuth adds OAuth complexity we do not need.

**Security note:** Do NOT rely solely on middleware for auth (CVE-2025-29927). Also verify the token in sensitive API routes as defense-in-depth.

### Pattern 3: RC Proxy with Auth Token Forwarding

Extend the existing catch-all proxy to forward the admin token to RaceControl.

```typescript
// src/app/api/rc/[...path]/route.ts (extended)
async function proxy(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const token = req.cookies.get('rp-admin-token')?.value;
  const rcPath = `/api/v1/${path.join('/')}`;
  const url = `${RC_URL}${rcPath}${req.nextUrl.search}`;

  try {
    const res = await fetch(url, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' ? await req.text() : undefined,
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'rc-core unreachable' }, { status: 502 });
  }
}
```

### Pattern 4: Domain API Module Organization

As the api.ts file grows, split into domain modules instead of one monolith.

```
src/lib/api/
  index.ts       -- re-exports all domains
  client.ts      -- apiFetch(), rcFetch() base functions
  types.ts       -- shared interfaces
  fleet.ts       -- pod/fleet API functions
  billing.ts     -- billing session API functions
  drivers.ts     -- driver/wallet API functions
  events.ts      -- events/championships API functions
  games.ts       -- game management API functions
```

Each domain module exports typed functions. The index re-exports them as a unified `api` object for backward compatibility.

### Pattern 5: Control Room Composition

The control room (home page) should compose multiple polling hooks, not make its own massive fetch.

```typescript
// src/app/page.tsx (Control Room)
'use client';
import { useFleet } from '@/hooks/useFleet';
import { useBilling } from '@/hooks/useBilling';
import { useSystemHealth } from '@/hooks/useSystemHealth';

export default function ControlRoom() {
  const { pods, isLoading: fleetLoading } = useFleet();
  const { sessions, isLoading: billingLoading } = useBilling();
  const { health, isLoading: healthLoading } = useSystemHealth();

  return (
    <div className="grid grid-cols-3 gap-4">
      <FleetPanel pods={pods} loading={fleetLoading} />
      <BillingPanel sessions={sessions} loading={billingLoading} />
      <HealthPanel health={health} loading={healthLoading} />
    </div>
  );
}
```

Each panel polls independently at its own interval. SWR deduplicates across pages -- if you navigate from Control Room to /fleet, the fleet data is already cached.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Server Components for Real-Time Data
**What:** Using RSC (server-side fetch) for fleet status or billing sessions.
**Why bad:** RSC data is stale on delivery. You need client-side polling for real-time. The existing `'use client'` pattern is actually correct for this use case.
**Instead:** Keep pages as client components with SWR polling hooks. Use server components only for truly static content (settings pages, help text).

### Anti-Pattern 2: WebSocket Layer in v1
**What:** Adding a WebSocket server to Next.js for real-time push updates.
**Why bad:** Next.js has poor WebSocket support in production (no native WS server in App Router). Would require a separate WS server process. Polling at 3-5s intervals is sufficient for 8 pods.
**Instead:** SWR polling. Reassess if fleet grows beyond 50 pods or latency requirements tighten to sub-second.

### Anti-Pattern 3: Monolithic API Client
**What:** Keeping all 200+ API functions in a single `api.ts` file.
**Why bad:** File becomes unmaintainable at ~80+ functions. No tree-shaking. Hard to find functions.
**Instead:** Split into domain modules (Pattern 4 above). Do this when api.ts exceeds ~200 lines.

### Anti-Pattern 4: Auth Token in localStorage
**What:** Storing admin JWT in localStorage and sending via Authorization header from client.
**Why bad:** XSS vulnerability. Any injected script can steal the token. Client-side token handling is error-prone.
**Instead:** httpOnly cookie set by server. Browser sends automatically. Cannot be read by JavaScript.

### Anti-Pattern 5: Separate Database for Auth Sessions
**What:** Creating a local SQLite table for admin sessions.
**Why bad:** Contradicts the "migrate away from SQLite" direction. Adds another data store to manage.
**Instead:** Stateless JWT in httpOnly cookie. Session state lives in the token itself. RaceControl is the auth authority.

## Scalability Considerations

| Concern | Current (8 pods) | At 20 pods | At 50+ pods |
|---------|------------------|------------|-------------|
| Fleet polling | 3s interval, fine | 3s interval, still fine | Consider SSE from RC or reduce to 5s |
| API proxy load | Negligible | Negligible | Add response caching in proxy |
| Auth | No auth | JWT + middleware | Same pattern, add role granularity |
| Data volume | ~200 routes | Same | Same -- RC handles scale |
| Page count | ~27 pages | ~40 pages | Split into route groups |

## Suggested Build Order (Dependencies)

The new features have clear dependency chains. Build in this order:

### Phase 1: Auth Foundation
**Build:** middleware.ts, /login page, /api/auth/* routes, AuthProvider context
**Depends on:** Nothing -- standalone cross-cutting concern
**Unlocks:** All subsequent phases (everything needs auth)
**Why first:** Every other feature needs protected routes. Without auth, nothing else ships safely.

### Phase 2: API Infrastructure + SWR Setup
**Build:** Install SWR, create base hooks pattern, split api.ts into domain modules, extend RC proxy with auth forwarding
**Depends on:** Phase 1 (auth token forwarding)
**Unlocks:** All domain feature pages
**Why second:** Every domain page needs the hook pattern and typed API client.

### Phase 3: Fleet Monitoring (Control Room Core)
**Build:** useFleet hook, /fleet page, fleet panel on control room, pod actions (wake/shutdown/restart)
**Depends on:** Phase 2 (SWR hooks, API modules)
**Unlocks:** Control room overview, game management (needs pod awareness)
**Why third:** Highest operational value. Staff need fleet visibility daily.

### Phase 4: Billing & Sessions
**Build:** useBilling hook, /billing page, start/stop/pause/extend session, billing panel on control room
**Depends on:** Phase 2 (SWR hooks), Phase 3 (pod awareness for "which pod is this session on")
**Unlocks:** Daily billing reports, revenue tracking
**Why fourth:** Second highest daily operational need after fleet.

### Phase 5: Drivers & Wallets
**Build:** Driver listing, profiles, wallet management, membership view
**Depends on:** Phase 2 (API modules)
**Unlocks:** Events (needs driver records)
**Why fifth:** Standard CRUD, no real-time needs. Straightforward build.

### Phase 6: Events & Game Management
**Build:** Events, championships, time trials, game launch/stop, AC content browser
**Depends on:** Phase 3 (pod awareness), Phase 5 (driver records for registrations)
**Unlocks:** Full operational coverage
**Why sixth:** Less frequent operations, more complex UI (brackets, standings).

### Phase 7: Data Migration (SQLite to RC)
**Build:** Migrate cafe/inventory/HR/finance data to RaceControl API, remove SQLite dependency
**Depends on:** RC API endpoints for these domains (may need RC-side work)
**Unlocks:** Single data source, simplified deployment
**Why last:** Existing SQLite pages work fine. Migration is high-risk, low-urgency.

## Key Technology Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Real-time strategy | SWR polling (3-5s) | Matches existing codebase, sufficient for 8 pods, no WS complexity |
| Auth library | jose (JWT) + custom middleware | Edge Runtime compatible, no external auth provider needed |
| Auth storage | httpOnly cookie | XSS-safe, automatic sending, no client-side token handling |
| Auth provider | None (custom) | RaceControl already has admin-login endpoint |
| State management | SWR cache + React useState | No Redux/Zustand needed -- SWR handles server state, useState handles UI state |
| API client structure | Domain modules in src/lib/api/ | Keeps code organized as surface area grows to 200+ functions |
| Component library | Keep existing (Tailwind + custom) | No need for Shadcn/Radix -- existing components are sufficient |

## Sources

- [SWR Documentation - Vercel](https://swr.vercel.app/)
- [SWR API Reference (refreshInterval)](https://swr.vercel.app/docs/api)
- [Next.js Authentication Guide](https://nextjs.org/docs/app/building-your-application/authentication)
- [Next.js App Router Authentication Guide 2026 - WorkOS](https://workos.com/blog/nextjs-app-router-authentication-guide-2026)
- [JWT Authentication in Next.js App Router 2026 - Authgear](https://www.authgear.com/post/nextjs-jwt-authentication)
- [Next.js Middleware Authentication - HashBuilds](https://www.hashbuilds.com/articles/next-js-middleware-authentication-protecting-routes-in-2025)
- [Authentication in Next.js (JWT, Cookies, Middleware) - Medium](https://medium.com/@chandansingh73718/authentication-in-next-js-jwt-cookies-middleware-secure-architecture-2fca8052fadb)
- [Next.js App Router Patterns 2026 - DEV Community](https://dev.to/teguh_coding/nextjs-app-router-the-patterns-that-actually-matter-in-2026-146)

---

*Architecture analysis: 2026-03-22*
