# Phase 1: Authentication & Session Security - Context

**Gathered:** 2026-03-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Lock down the admin dashboard with RaceControl admin login, JWT-based sessions, protected routes, and proxy security. After this phase, unauthenticated users see only the login page. All RC proxy requests require a valid session.

</domain>

<decisions>
## Implementation Decisions

### Login experience
- PIN pad interface (numeric keypad, like phone lock screen) — not a text field
- Branded login page: Racing Point logo + tagline + background gradient
- Wrong PIN shows inline error message ("Invalid PIN") below the pad — stays until retry
- After successful login, always redirect to dashboard home (`/`)
- RC rate-limits the admin-login endpoint already — no need for client-side lockout

### Session behavior
- JWT stored in httpOnly cookie (not localStorage) for security
- Shared session across browser tabs (cookie-based, standard)
- 12h token from RC — show "Session expiring in 5 min" toast warning before expiry
- On expiry: redirect to login page
- Show role badge ("Admin") in the sidebar to indicate logged-in state

### Role permissions
- Single role for now — everyone with the admin PIN is "admin" (full access)
- Scaffold role-checking infrastructure so staff roles can be added later without refactoring
- AUTH-05 (role-based access) is structurally prepared but only enforces "admin" in v1
- RC's JWT has `role: "staff"` and `sub: "admin"` — dashboard treats this as admin access

### Proxy lockdown
- Defense in depth: Next.js middleware validates JWT + proxy forwards JWT to RC via Authorization header
- Allow all RC endpoints through proxy — RC's own `require_staff_jwt` middleware handles fine-grained access
- No endpoint allowlist/blocklist needed — RC is the source of truth for what staff can access

### Claude's Discretion
- Whether to protect Gateway-only pages (bookings, customers, calendar) — security research should inform this
- JWT verification library choice (jose recommended by research, but Claude can evaluate)
- Exact cookie configuration (SameSite, Secure, Path, MaxAge)
- Loading state during login PIN verification
- Logout flow implementation details

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### RaceControl Auth Implementation
- `C:/Users/bono/racingpoint/racecontrol/crates/racecontrol/src/auth/admin.rs` — Admin login handler: accepts PIN, verifies against argon2id hash, returns 12h staff JWT with `{sub: "admin", role: "staff", exp, iat}`
- `C:/Users/bono/racingpoint/racecontrol/crates/racecontrol/src/auth/middleware.rs` — `StaffClaims` struct definition, `require_staff_jwt` middleware, JWT verification using `jsonwebtoken` crate with HMAC secret
- `C:/Users/bono/racingpoint/racecontrol/crates/racecontrol/src/auth/mod.rs` — Auth module exports

### Existing Dashboard Code
- `src/app/api/rc/[...path]/route.ts` — Current RC proxy (wide open, no auth) — must be secured
- `src/lib/api.ts` — Current API client with `apiFetch()` and `rcFetch()` — needs auth token forwarding
- `src/components/AdminLayout.tsx` — Layout shell wrapping all pages — role badge goes here

### Research Findings
- `.planning/research/ARCHITECTURE.md` — JWT + jose + Edge middleware pattern recommendation
- `.planning/research/PITFALLS.md` — Open proxy risk, CVE-2025-29927 middleware bypass warning

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `AdminLayout.tsx`: Sidebar navigation shell — add role badge and logout button here
- `Toast.tsx` + `useToast()`: Existing toast system — use for session expiry warning
- `apiFetch()` / `rcFetch()`: Existing API client — extend to attach JWT from cookie

### Established Patterns
- All pages use `'use client'` with `useEffect` for data fetching — auth check fits this pattern
- API routes use `NextRequest`/`NextResponse` — middleware can intercept before routes
- No existing middleware.ts — this will be created fresh

### Integration Points
- `src/app/layout.tsx`: Root layout — wrap with auth provider/context
- `src/app/api/rc/[...path]/route.ts`: RC proxy — add JWT forwarding
- `src/components/AdminLayout.tsx`: Navigation — add role badge + logout
- New: `src/app/login/page.tsx` — login page with PIN pad
- New: `src/middleware.ts` — Edge middleware for route protection

</code_context>

<specifics>
## Specific Ideas

- PIN pad should feel like a phone lock screen — quick tap entry, not typing
- Branded with Racing Point identity (logo, colors, tagline)
- Session expiry warning is important — staff shouldn't lose unsaved work without notice

</specifics>

<deferred>
## Deferred Ideas

- Named admin accounts (multiple PINs for different people) — needs RC changes
- Staff-level role with restricted access — needs RC to support separate staff PIN flow
- Audit log of login attempts — Phase 10 (OPS-05)

</deferred>

---

*Phase: 01-authentication-session-security*
*Context gathered: 2026-03-22*
