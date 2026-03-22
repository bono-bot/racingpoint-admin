---
phase: 159-authentication-session-security
plan: 01
subsystem: auth
tags: [jwt, jose, cookies, nextjs-api-routes, httponly]

requires:
  - phase: none
    provides: first phase
provides:
  - jose JWT verification library (verifyToken, decodeToken)
  - auth config constants (COOKIE_NAME, PUBLIC_PATHS, COOKIE_OPTIONS)
  - login API route proxying to RC /auth/admin-login
  - logout API route clearing auth cookie
  - me API route returning verified JWT claims
affects: [159-02-middleware, 159-03-auth-provider, 159-04-login-page]

tech-stack:
  added: [jose]
  patterns: [httpOnly cookie auth, RC proxy pattern for auth, HS256 JWT verification]

key-files:
  created:
    - src/lib/auth.ts
    - src/lib/auth-config.ts
    - src/app/api/auth/login/route.ts
    - src/app/api/auth/logout/route.ts
    - src/app/api/auth/me/route.ts
  modified:
    - package.json
    - package-lock.json

key-decisions:
  - "jose for JWT verification -- ESM-native, Edge-compatible, lightweight"
  - "secure: false in cookie options -- LAN-only dashboard has no HTTPS"
  - "RC_URL fails fast if missing -- no localhost fallback to prevent silent misconfiguration"

patterns-established:
  - "Auth cookie pattern: httpOnly cookie named rp-admin-token with 12h maxAge"
  - "RC auth proxy: login route forwards PIN to RC, receives JWT, sets cookie"
  - "Token verification: TextEncoder.encode(secret) for HS256 HMAC key"

requirements-completed: [AUTH-01, AUTH-02, AUTH-06]

duration: 2min
completed: 2026-03-22
---

# Phase 159 Plan 01: Auth Foundation Summary

**jose JWT auth with httpOnly cookie flow: login proxies to RC, me verifies token, logout clears cookie**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-22T11:41:53Z
- **Completed:** 2026-03-22T11:43:44Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Installed jose and created JWT verification library with HS256 + TextEncoder encoding
- Created auth-config with cookie constants, public paths, and role mapping
- Built three API routes: login (RC proxy + cookie set), logout (cookie delete), me (JWT verify + claims)

## Task Commits

Each task was committed atomically:

1. **Task 1: Install jose and create auth library + config** - `2628163` (feat)
2. **Task 2: Create login, logout, and me API routes** - `3d4cb45` (feat)

## Files Created/Modified
- `src/lib/auth.ts` - JWT verification (verifyToken, decodeToken) using jose with HS256
- `src/lib/auth-config.ts` - Cookie name, public paths, cookie options, isAdmin helper
- `src/app/api/auth/login/route.ts` - POST handler proxying PIN to RC, sets httpOnly cookie
- `src/app/api/auth/logout/route.ts` - POST handler deleting auth cookie
- `src/app/api/auth/me/route.ts` - GET handler verifying JWT and returning claims
- `package.json` - Added jose dependency
- `.env.local` - RC_URL and RC_JWT_SECRET (gitignored)

## Decisions Made
- Used jose for JWT verification (ESM-native, Edge-compatible, no native deps)
- Set secure: false in cookie options since dashboard is LAN-only without HTTPS
- RC_URL throws if missing rather than falling back to localhost

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - .env.local created with correct values, gitignored by default.

## Next Phase Readiness
- Auth library and API routes ready for middleware (Plan 02) to protect routes
- Auth config exports ready for AuthProvider (Plan 03) to use cookie name and public paths
- Login page (Plan 04) can call /api/auth/login endpoint

---
*Phase: 159-authentication-session-security*
*Completed: 2026-03-22*
