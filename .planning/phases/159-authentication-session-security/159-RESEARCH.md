# Phase 159: Authentication & Session Security - Research

**Researched:** 2026-03-22
**Domain:** JWT authentication, Next.js Edge middleware, httpOnly cookie sessions
**Confidence:** HIGH

## Summary

This phase locks down the admin dashboard with PIN-based authentication backed by RaceControl's existing `/auth/admin-login` endpoint. RC already handles PIN verification (argon2id), JWT creation (HMAC-SHA256, 12h expiry), and rate limiting (5 req/60s per IP). The dashboard's job is: (1) build a PIN pad login UI, (2) store the RC-issued JWT in an httpOnly cookie, (3) verify that cookie in Edge middleware on every request, (4) forward the JWT to RC via the proxy's Authorization header, and (5) handle session expiry gracefully.

The critical architectural insight is that the dashboard does NOT need to create its own JWT. RC issues a staff JWT with `{sub: "admin", role: "staff", exp, iat}` signed with HMAC-SHA256 using the `jwt_secret` from `racecontrol.toml`. The dashboard needs the SAME secret to verify tokens in middleware. This is a single shared secret (`RC_JWT_SECRET` env var), not a separate auth system.

**Primary recommendation:** Use `jose` for Edge-compatible JWT verification in middleware. Store the RC-issued token directly in an httpOnly cookie named `rp-admin-token`. Verify in middleware, forward via Authorization header in the proxy. No wrapper JWT, no separate session store.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- PIN pad interface (numeric keypad, like phone lock screen) -- not a text field
- Branded login page: Racing Point logo + tagline + background gradient
- Wrong PIN shows inline error message ("Invalid PIN") below the pad -- stays until retry
- After successful login, always redirect to dashboard home (`/`)
- RC rate-limits the admin-login endpoint already -- no need for client-side lockout
- JWT stored in httpOnly cookie (not localStorage) for security
- Shared session across browser tabs (cookie-based, standard)
- 12h token from RC -- show "Session expiring in 5 min" toast warning before expiry
- On expiry: redirect to login page
- Show role badge ("Admin") in the sidebar to indicate logged-in state
- Single role for now -- everyone with the admin PIN is "admin" (full access)
- Scaffold role-checking infrastructure so staff roles can be added later without refactoring
- AUTH-05 (role-based access) is structurally prepared but only enforces "admin" in v1
- RC's JWT has `role: "staff"` and `sub: "admin"` -- dashboard treats this as admin access
- Defense in depth: Next.js middleware validates JWT + proxy forwards JWT to RC via Authorization header
- Allow all RC endpoints through proxy -- RC's own `require_staff_jwt` middleware handles fine-grained access
- No endpoint allowlist/blocklist needed -- RC is the source of truth for what staff can access

### Claude's Discretion
- Whether to protect Gateway-only pages (bookings, customers, calendar) -- security research should inform this
- JWT verification library choice (jose recommended by research, but Claude can evaluate)
- Exact cookie configuration (SameSite, Secure, Path, MaxAge)
- Loading state during login PIN verification
- Logout flow implementation details

### Deferred Ideas (OUT OF SCOPE)
- Named admin accounts (multiple PINs for different people) -- needs RC changes
- Staff-level role with restricted access -- needs RC to support separate staff PIN flow
- Audit log of login attempts -- Phase 10 (OPS-05)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-01 | Admin can log in via RaceControl `/auth/admin-login` with credentials | RC endpoint verified: POST `/api/v1/auth/admin-login` accepts `{pin: string}`, returns `{token: string, expires_in: 43200}`. Rate-limited 5 req/60s. PIN verified against argon2id hash. |
| AUTH-02 | User session persists across browser refresh via JWT in httpOnly cookie | Store RC JWT in httpOnly cookie `rp-admin-token`. Cookie persists across refreshes/tabs. MaxAge matches token expiry (43200s). |
| AUTH-03 | Unauthenticated users are redirected to login page | Edge middleware checks cookie, verifies JWT with `jose`, redirects to `/login` if missing/invalid/expired. |
| AUTH-04 | RC proxy routes are protected -- only authenticated requests forwarded | Proxy reads JWT from cookie, adds `Authorization: Bearer {token}` header to RC requests. RC's `require_staff_jwt` middleware validates. Defense in depth. |
| AUTH-05 | Role-based access control distinguishes admin vs staff permissions | Scaffold `AuthProvider` with role from JWT claims. RC JWT has `role: "staff"` -- dashboard maps this to admin. Role-checking hooks ready for future staff role. |
| AUTH-06 | User can log out and session is invalidated | Delete `rp-admin-token` cookie. Redirect to `/login`. JWT is stateless so no server-side invalidation needed (RC has no revocation). |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| jose | 6.2.2 | JWT verification in Edge Runtime middleware | Only JWT library that works in both Node.js and Edge Runtime. Zero dependencies, 6KB. `jsonwebtoken` uses Node.js `crypto` -- fails in Edge. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| next (existing) | 16.1.6 | middleware.ts, API routes, App Router | Already installed |
| react (existing) | 19.2.3 | AuthProvider context, PIN pad UI | Already installed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| jose | jsonwebtoken | Does NOT work in Edge Runtime. Would need Node.js middleware config which loses Edge performance. |
| Custom auth | NextAuth/Auth.js v5 | Overkill -- designed for OAuth providers. RC already has its own auth endpoint. Adds ~50KB and boilerplate for what is "call API, set cookie." |
| Custom auth | iron-session | Encrypts arbitrary session data. We have a JWT (already signed). Redundant. Also does not work in Edge middleware. |
| httpOnly cookie | localStorage | XSS vulnerability. Any injected script can steal the token. |

**Installation:**
```bash
npm install jose
```

**Version verification:** `npm view jose version` returned `6.2.2` (confirmed 2026-03-22).

## Architecture Patterns

### Recommended Project Structure (New Files Only)
```
src/
  middleware.ts                          # Edge middleware -- route protection + JWT verification
  app/
    login/
      page.tsx                           # PIN pad login page (public)
    api/
      auth/
        login/route.ts                   # POST: call RC, set cookie, return success
        logout/route.ts                  # POST: delete cookie
        me/route.ts                      # GET: return current user info from JWT
    layout.tsx                           # MODIFY: conditionally wrap with AuthProvider
    api/rc/[...path]/route.ts            # MODIFY: add JWT forwarding from cookie
  lib/
    auth.ts                              # JWT verification/decoding helpers (jose)
    auth-config.ts                       # Cookie name, public paths, role mappings
  components/
    AuthProvider.tsx                      # React context: user, role, isAuthenticated, logout
    PinPad.tsx                           # Numeric keypad component (phone lock screen style)
  hooks/
    useAuth.ts                           # Hook to consume AuthProvider context
    useSessionExpiry.ts                  # Hook for "session expiring" toast warning
```

### Pattern 1: Direct RC Token in Cookie (No Wrapper JWT)
**What:** Store the RC-issued JWT directly in the httpOnly cookie. Do NOT create a separate "session JWT" wrapping the RC token.
**When to use:** When the backend (RC) issues its own JWT and the dashboard just needs to verify + forward it.
**Why:** Simpler. One secret. One token. No token-in-token nesting. The RC JWT already contains `sub`, `role`, `exp`, `iat` -- everything the dashboard needs.

```typescript
// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';

const RC_URL = process.env.RC_URL;

export async function POST(req: NextRequest) {
  const { pin } = await req.json();

  // Call RC admin-login
  const rcRes = await fetch(`${RC_URL}/api/v1/auth/admin-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin }),
  });

  if (!rcRes.ok) {
    const status = rcRes.status; // 401 = wrong PIN, 503 = no hash configured, 429 = rate limited
    return NextResponse.json(
      { error: status === 401 ? 'Invalid PIN' : 'Login failed' },
      { status }
    );
  }

  const { token, expires_in } = await rcRes.json();

  // Set httpOnly cookie with the RC JWT
  const res = NextResponse.json({ success: true });
  res.cookies.set('rp-admin-token', token, {
    httpOnly: true,
    secure: false,        // LAN-only dashboard, no HTTPS
    sameSite: 'lax',
    path: '/',
    maxAge: expires_in,   // 43200 seconds (12h)
  });

  return res;
}
```

### Pattern 2: Edge Middleware with jose
**What:** Verify JWT in middleware.ts using `jose.jwtVerify()` with the shared RC JWT secret.
**When to use:** Every request except public paths (login page, auth API, static assets).

**CRITICAL: RC uses HMAC-SHA256 (`HS256`) with a base64url-encoded secret string. The `jsonwebtoken` Rust crate uses the secret bytes directly (`from_secret(secret.as_bytes())`). jose's `jwtVerify` needs the same bytes.**

```typescript
// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const PUBLIC_PATHS = ['/login', '/api/auth/login'];
const secret = new TextEncoder().encode(process.env.RC_JWT_SECRET);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths and static assets
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p)) ||
      pathname.startsWith('/_next') ||
      pathname.startsWith('/favicon')) {
    return NextResponse.next();
  }

  const token = req.cookies.get('rp-admin-token')?.value;
  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  try {
    const { payload } = await jwtVerify(token, secret);
    // Inject role into request headers for downstream use
    const res = NextResponse.next();
    res.headers.set('x-user-role', (payload.role as string) || 'unknown');
    res.headers.set('x-user-sub', (payload.sub as string) || 'unknown');
    return res;
  } catch {
    // Token expired or invalid -- clear cookie and redirect
    const res = NextResponse.redirect(new URL('/login', req.url));
    res.cookies.delete('rp-admin-token');
    return res;
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

### Pattern 3: RC Proxy with JWT Forwarding
**What:** Read JWT from cookie and forward as Authorization header to RC.

```typescript
// src/app/api/rc/[...path]/route.ts (modified)
import { NextRequest, NextResponse } from 'next/server';

const RC_URL = process.env.RC_URL;
if (!RC_URL) throw new Error('RC_URL environment variable is required');

async function proxy(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const token = req.cookies.get('rp-admin-token')?.value;

  // Defense in depth: reject if no token (middleware should catch this, but belt-and-suspenders)
  if (!token) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const rcPath = `/api/v1/${path.join('/')}`;
  const url = `${RC_URL}${rcPath}${req.nextUrl.search}`;

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };

    const res = await fetch(url, {
      method: req.method,
      headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? await req.text() : undefined,
      cache: 'no-store',
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'rc-core unreachable' }, { status: 502 });
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const DELETE = proxy;
```

### Pattern 4: AuthProvider Context
**What:** React context providing user info, role, and logout to all components.

```typescript
// src/components/AuthProvider.tsx
'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface AuthUser {
  sub: string;
  role: string;
  exp: number;  // UNIX timestamp
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isAuthenticated: false,
  isAdmin: false,
  logout: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const router = useRouter();

  // Fetch user info from /api/auth/me on mount
  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => data ? setUser(data) : null)
      .catch(() => null);
  }, []);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isAdmin: user?.role === 'staff' && user?.sub === 'admin', // RC convention
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
```

### Pattern 5: Session Expiry Warning
**What:** Check JWT expiry periodically, show toast 5 minutes before expiry.

```typescript
// src/hooks/useSessionExpiry.ts
'use client';
import { useEffect, useRef } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useToast } from '@/components/Toast';

export function useSessionExpiry() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const warnedRef = useRef(false);

  useEffect(() => {
    if (!user?.exp) return;

    const check = () => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = user.exp - now;

      if (remaining <= 0) {
        logout();
      } else if (remaining <= 300 && !warnedRef.current) {
        // 5 minutes = 300 seconds
        warnedRef.current = true;
        toast('Session expiring in 5 minutes. Save your work.', 'info');
      }
    };

    const interval = setInterval(check, 30000); // Check every 30s
    check(); // Immediate check

    return () => clearInterval(interval);
  }, [user?.exp, logout, toast]);
}
```

### Anti-Patterns to Avoid
- **Creating a wrapper JWT:** Do NOT create a dashboard-signed JWT that wraps the RC token. Store the RC token directly. One token, one secret.
- **Relying only on middleware for auth (CVE-2025-29927):** Middleware can be bypassed via `x-middleware-subrequest` header in affected Next.js versions. Always also check auth in sensitive API routes (defense in depth).
- **Storing token in localStorage:** XSS vulnerability. httpOnly cookies cannot be read by JavaScript.
- **Hardcoding RC_URL fallback:** Current proxy has `process.env.RC_URL || 'http://localhost:8080'`. Remove the fallback -- fail fast if not configured.
- **Verifying JWT with wrong algorithm:** RC uses HS256 (HMAC-SHA256). If jose defaults to a different algorithm, verification silently fails. Explicitly set `algorithms: ['HS256']` in verification options.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT verification | Manual base64 decode + signature check | `jose.jwtVerify()` | Constant-time comparison, algorithm validation, expiry checking -- all handled correctly |
| Cookie serialization | Manual `Set-Cookie` header string | `NextResponse.cookies.set()` | Handles encoding, escaping, attribute formatting |
| Route protection | Per-page `useEffect` auth checks | `middleware.ts` + backup API route checks | Centralized, runs before page renders, no flash of unauthenticated content |
| PIN pad keyboard | Custom key event handling | HTML button grid with onClick | Mobile-friendly, no keyboard focus issues, consistent across devices |

**Key insight:** JWT verification has subtle security requirements (timing-safe comparison, algorithm confusion attacks, clock skew handling). `jose` handles all of these. Hand-rolling is a security risk.

## Common Pitfalls

### Pitfall 1: Wrong JWT Secret Encoding
**What goes wrong:** RC's `jsonwebtoken` Rust crate uses `EncodingKey::from_secret(secret.as_bytes())` which treats the secret as raw bytes. If jose's `jwtVerify` treats the secret differently (e.g., base64-decoding it), verification fails silently for all tokens.
**Why it happens:** The RC secret in `racecontrol.toml` is `"UKLvoxSUMRPsKckeN17vJ-ORNgkTpfVO2MvS_JA5TMo"` -- this looks like base64url but is treated as raw UTF-8 bytes by the Rust crate.
**How to avoid:** Use `new TextEncoder().encode(process.env.RC_JWT_SECRET)` -- this converts the string to UTF-8 bytes, matching the Rust behavior exactly.
**Warning signs:** All token verifications fail with "signature verification failed" even with correct tokens.

### Pitfall 2: Cookie Not Sent to API Routes
**What goes wrong:** The cookie is set but API routes do not receive it. API calls return 401.
**Why it happens:** `SameSite: 'strict'` can block cookies on cross-origin redirects. Or the cookie `path` does not cover API routes.
**How to avoid:** Use `sameSite: 'lax'` (not strict) and `path: '/'` to cover all routes including `/api/*`.
**Warning signs:** Login succeeds but subsequent API calls return 401.

### Pitfall 3: Middleware Runs on Static Assets
**What goes wrong:** Middleware redirects requests for `/_next/static/*`, CSS, JS bundles, and images to `/login`, breaking the login page itself.
**Why it happens:** Default middleware matcher catches everything.
**How to avoid:** Use the matcher config to exclude `_next/static`, `_next/image`, `favicon.ico`. The login page itself must also be excluded.
**Warning signs:** Login page fails to load (infinite redirect or missing assets).

### Pitfall 4: Flash of Dashboard Before Redirect
**What goes wrong:** User opens `/` while logged out. The dashboard page briefly renders before middleware redirects to `/login`.
**Why it happens:** In development mode with Turbopack, middleware may not intercept as quickly. Or if using client-side auth checks instead of middleware.
**How to avoid:** Use Edge middleware (runs before page render). Do NOT rely on `useEffect` auth checks in page components for route protection.
**Warning signs:** Brief flash of sidebar/content before redirect.

### Pitfall 5: Login Page Shows Inside AdminLayout
**What goes wrong:** The login page renders inside the sidebar+header AdminLayout shell, looking wrong.
**Why it happens:** Current `layout.tsx` wraps ALL pages with `AdminLayout`. The login page needs a different layout (full-screen, no sidebar).
**How to avoid:** Use Next.js route groups: `(dashboard)` group with AdminLayout, `(auth)` group without. Or conditionally render AdminLayout based on pathname.
**Warning signs:** Login page has a sidebar visible.

### Pitfall 6: Session Expiry Toast Never Shows
**What goes wrong:** The 12h token expires and the user gets abruptly redirected to login without warning.
**Why it happens:** The expiry check relies on the decoded JWT `exp` claim. If the `/api/auth/me` endpoint does not return `exp`, the hook has nothing to check.
**How to avoid:** The `/api/auth/me` route must decode the JWT and return `exp` in the response. The `useSessionExpiry` hook reads this value.
**Warning signs:** No toast appears before session expires.

## Code Examples

### RC Admin Login -- Verified Request/Response Contract

Source: `racecontrol/crates/racecontrol/src/auth/admin.rs`

**Request:**
```
POST /api/v1/auth/admin-login
Content-Type: application/json
{"pin": "1234"}
```

**Responses:**
- `200 OK` -- `{"token": "eyJ...", "expires_in": 43200}`
- `401 Unauthorized` -- wrong PIN (no body)
- `503 Service Unavailable` -- no admin_pin_hash configured
- `429 Too Many Requests` -- rate limited (5 req/60s per IP)

### RC JWT Claims Structure

Source: `racecontrol/crates/racecontrol/src/auth/middleware.rs`

```rust
pub struct StaffClaims {
    pub sub: String,   // "admin"
    pub role: String,  // "staff" (middleware rejects anything else)
    pub exp: usize,    // UNIX timestamp (12h from issuance)
    pub iat: usize,    // UNIX timestamp (issuance time)
}
```

The dashboard must map `{sub: "admin", role: "staff"}` to "admin access." Future staff roles would have different `sub` values.

### RC JWT Secret Configuration

Source: `racecontrol.toml` line 54

The secret is a string treated as raw UTF-8 bytes by the `jsonwebtoken` Rust crate. The dashboard needs the same secret as `RC_JWT_SECRET` env var. **This is NOT the same as `AUTH_SECRET`** -- there is no separate auth secret. The dashboard verifies RC-issued tokens using RC's secret.

### Root Layout Restructuring

The current `src/app/layout.tsx` wraps everything in `AdminLayout`. After auth, the login page must NOT be wrapped. Two approaches:

**Approach A: Route Groups (Recommended)**
```
src/app/
  (auth)/
    login/page.tsx        # No AdminLayout
    layout.tsx            # Minimal layout (just body)
  (dashboard)/
    layout.tsx            # AdminLayout + AuthProvider
    page.tsx              # Dashboard home
    sessions/page.tsx     # etc.
  layout.tsx              # Root: html, body, fonts, ToastProvider only
  api/                    # API routes (not wrapped in any layout)
```

**Approach B: Conditional Layout**
```typescript
// layout.tsx
const pathname = headers().get('x-pathname'); // NOT available in layout
// This approach is fragile -- route groups are cleaner
```

Route groups (Approach A) are the standard Next.js pattern for different layouts per section.

### Cookie Configuration

```typescript
{
  httpOnly: true,        // Cannot be read by JS -- XSS protection
  secure: false,         // LAN-only dashboard has no HTTPS cert
  sameSite: 'lax',       // Sent on same-site requests + top-level navigations
  path: '/',             // Covers all routes including /api/*
  maxAge: 43200,         // 12 hours (matches RC token expiry)
}
```

**Why `secure: false`:** The dashboard runs on the LAN at `http://192.168.31.23:3200`. Setting `secure: true` would prevent the cookie from being sent over HTTP, breaking auth entirely. When HTTPS is added, flip to `true`.

**Why `sameSite: 'lax'` not `'strict'`:** `strict` prevents cookies from being sent on any cross-origin navigation (e.g., clicking a link from another page). `lax` allows it for top-level navigations (GET requests) which is the standard for session cookies.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| NextAuth v4 (pages router) | Custom auth with jose + middleware (App Router) | Next.js 13+ (2023) | Simpler for single-backend auth, Edge-compatible |
| localStorage token | httpOnly cookie | Always best practice | XSS protection |
| Client-side route guards (useEffect) | Edge middleware.ts | Next.js 12+ (2022) | No flash of unauthenticated content |
| jsonwebtoken npm package | jose npm package | Edge Runtime adoption | jose works everywhere (Edge, Node, browser) |
| `require_staff_jwt` strict | `require_staff_jwt_permissive` (current RC default) | RC expand-migrate-contract | Permissive mode allows unauthenticated requests while dashboard adds auth. Switch to strict after dashboard ships. |

**Note on permissive mode:** RC currently uses `require_staff_jwt_permissive` which logs warnings but allows unauthenticated requests through. This is intentional for the migration period. After the dashboard ships auth, RC should switch to `require_staff_jwt` (strict). This is not a Phase 159 task but should be noted.

## Open Questions

1. **Gateway-only pages (bookings, customers, calendar) -- protect or leave open?**
   - What we know: These pages use `apiFetch()` to Gateway :3100, not `rcFetch()` to RC. Gateway has its own API key (`NEXT_PUBLIC_GATEWAY_API_KEY`).
   - Recommendation: **Protect all pages behind middleware.** Even Gateway pages should require login. The middleware gate applies to the URL, not the API backend. Any page at a dashboard URL should require authentication. Gateway API calls still use their own API key -- auth does not change how Gateway calls work.

2. **RC_URL environment variable**
   - What we know: Currently has fallback `|| 'http://localhost:8080'`. No `.env.local` file exists.
   - Recommendation: Remove fallback. Create `.env.local` with `RC_URL=http://192.168.31.23:8080` and `RC_JWT_SECRET=<value from racecontrol.toml>`. Fail fast on missing vars.

3. **Token refresh**
   - What we know: RC has no `/auth/refresh` endpoint. The token is 12h and cannot be refreshed.
   - Recommendation: Do not attempt silent refresh. Show the "5 minutes remaining" toast, then redirect to login on expiry. Staff re-enters the PIN. This is acceptable for a 12h session in a venue setting.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Playwright 1.58.2 |
| Config file | needs creation (Wave 0) |
| Quick run command | `npx playwright test tests/auth --reporter=line` |
| Full suite command | `npx playwright test --reporter=line` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | PIN pad login calls RC, success sets cookie | integration | `npx playwright test tests/auth/login.spec.ts -x` | Wave 0 |
| AUTH-02 | Session persists across refresh | integration | `npx playwright test tests/auth/session.spec.ts -x` | Wave 0 |
| AUTH-03 | Unauthenticated redirect to /login | integration | `npx playwright test tests/auth/redirect.spec.ts -x` | Wave 0 |
| AUTH-04 | Proxy rejects without token | unit (API route test) | `npx playwright test tests/auth/proxy.spec.ts -x` | Wave 0 |
| AUTH-05 | Role badge shows in sidebar | integration | `npx playwright test tests/auth/role.spec.ts -x` | Wave 0 |
| AUTH-06 | Logout clears cookie, redirects | integration | `npx playwright test tests/auth/logout.spec.ts -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx playwright test tests/auth --reporter=line`
- **Per wave merge:** `npx playwright test --reporter=line`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `playwright.config.ts` -- test configuration for the project
- [ ] `tests/auth/login.spec.ts` -- login flow tests
- [ ] `tests/auth/session.spec.ts` -- session persistence
- [ ] `tests/auth/redirect.spec.ts` -- unauthenticated redirect
- [ ] `tests/auth/proxy.spec.ts` -- proxy auth enforcement
- [ ] `tests/auth/role.spec.ts` -- role badge display
- [ ] `tests/auth/logout.spec.ts` -- logout flow
- [ ] `.env.local` -- RC_URL and RC_JWT_SECRET must be set for tests

## Sources

### Primary (HIGH confidence)
- `racecontrol/crates/racecontrol/src/auth/admin.rs` -- AdminLoginRequest/Response types, handler logic, argon2id verification, 12h JWT creation, 503/401/200 responses
- `racecontrol/crates/racecontrol/src/auth/middleware.rs` -- StaffClaims struct (`sub`, `role`, `exp`, `iat`), `require_staff_jwt` middleware, `create_staff_jwt` function, HMAC-SHA256 via `jsonwebtoken` crate
- `racecontrol/crates/racecontrol/src/auth/rate_limit.rs` -- Rate limiting: 5 requests per 60 seconds per IP on auth endpoints
- `racecontrol.toml` line 54 -- JWT secret value (HMAC key treated as raw UTF-8 bytes)
- `npm view jose version` -- 6.2.2 confirmed
- `racingpoint-admin/package.json` -- Current dependencies (Next.js 16.1.6, React 19.2.3, no jose yet)
- `racingpoint-admin/src/app/api/rc/[...path]/route.ts` -- Current open proxy (no auth, no Authorization header)
- `racingpoint-admin/src/lib/api.ts` -- Current API client (apiFetch + rcFetch, no auth token handling)
- `racingpoint-admin/src/components/AdminLayout.tsx` -- Current layout (210 lines, sidebar navigation, Cmd+K search)
- `racingpoint-admin/src/app/layout.tsx` -- Root layout wraps everything in ToastProvider + AdminLayout
- `racingpoint-admin/src/components/Toast.tsx` -- Existing toast system with `useToast()` hook

### Secondary (MEDIUM confidence)
- `.planning/research/ARCHITECTURE.md` -- Auth flow diagram, middleware pattern, proxy forwarding pattern
- `.planning/research/STACK.md` -- jose library analysis, iron-session/NextAuth rejection rationale
- `.planning/research/PITFALLS.md` -- Open proxy risk (Pitfall 1), token expiry (Pitfall 2), AdminLayout bloat (Pitfall 5)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- jose is the only Edge-compatible JWT library; RC auth endpoint is verified from source
- Architecture: HIGH -- RC source code confirms exact request/response contract, JWT claims structure, and signing method
- Pitfalls: HIGH -- identified from codebase analysis (open proxy, missing .env, layout structure)
- Cookie config: MEDIUM -- secure=false is correct for LAN but should be documented as intentional

**Research date:** 2026-03-22
**Valid until:** 2026-04-22 (stable -- RC auth is unlikely to change soon)
