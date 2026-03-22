# Technology Stack: RaceControl Integration

**Project:** Racing Point Admin Dashboard - RaceControl Integration
**Researched:** 2026-03-22
**Overall Confidence:** HIGH

## Existing Stack (Keep As-Is)

| Technology | Version | Purpose | Status |
|------------|---------|---------|--------|
| Next.js | 16.1.6 | App framework, App Router, API routes | Keep |
| React | 19.2.3 | UI rendering | Keep |
| TypeScript | 5.x | Type safety | Keep |
| Tailwind CSS | 4.x | Styling | Keep |
| SWR | 2.4.1 | Data fetching + cache + polling | Keep - critical for real-time |
| Recharts | 3.7.0 | Data visualization | Keep |
| Playwright | 1.58.2 | E2E testing | Keep |
| better-sqlite3 | 12.6.2 | Local data (being migrated away) | Keep until migration complete |

## New Dependencies to Add

### Authentication & Session Management

| Library | Version | Purpose | Confidence |
|---------|---------|---------|------------|
| jose | ^6.2.2 | JWT signing, verification, Edge Runtime compatible | HIGH |

**Why jose:** RaceControl's `/auth/admin-login` returns a token. We need to: (1) verify it in Next.js middleware for route protection, (2) sign our own httpOnly session cookie. `jose` is the only JWT library that works in both Node.js and Edge Runtime (middleware runs on Edge). Zero dependencies, tree-shakeable ESM, 6KB. The architecture pattern is: call RC login -> receive RC token -> create our own signed JWT cookie containing the RC token + role + user info -> verify that cookie in middleware on every request -> forward the RC token to the proxy for backend calls.

**Why NOT iron-session:** iron-session encrypts arbitrary data into cookies, which is useful when you need to store session state. But we are storing a JWT (the RC token) -- it is already signed/verifiable. iron-session also does not work in Edge middleware (uses Node.js `crypto`), so we would need `jose` anyway for the middleware verification step. Using both is redundant. Using only `jose` is simpler and more aligned with the JWT-based auth the architecture specifies.

**Why NOT Auth.js / NextAuth v5:** Wrong abstraction. Designed for OAuth providers with its own session model. Would fight against the existing `rcFetch` pattern. Adds ~50KB+ and significant boilerplate for what is essentially "set a cookie after calling an API." Still has frequent breaking changes in v5.

**Why NOT Clerk / Lucia / third-party auth:** RC already has auth. Adding a third-party auth provider creates a second auth system to maintain, sync, and pay for.

### Form Handling & Validation

| Library | Version | Purpose | Confidence |
|---------|---------|---------|------------|
| zod | ^4.3.6 | Schema validation + TypeScript type inference | HIGH |
| react-hook-form | ^7.71.2 | Client-side form state management | HIGH |
| @hookform/resolvers | latest | Zod resolver for react-hook-form | HIGH |

**Why Zod:** TypeScript-first schema validation. Define a schema once, get both runtime validation and static types. Use for: API response parsing (validate RC returns expected shape), form input validation, route parameter parsing. 82M weekly npm downloads -- the de facto standard. v4 released recently with performance improvements.

**Why react-hook-form:** The dashboard will have complex CRUD forms across 7+ domains (billing, drivers, events, championships, wallets, games, scheduling). react-hook-form uses uncontrolled components for performance (no re-render on every keystroke), handles dirty tracking, field arrays (e.g., championship rounds), and validation modes. Pairs with Zod via `@hookform/resolvers` for type-safe form validation.

**Why NOT just Server Actions + useActionState:** Some forms are purely client-side (search filters, quick actions on fleet dashboard, inline edits). react-hook-form handles both patterns. Server Actions alone cannot do optimistic field-level validation or complex multi-step forms.

**Why NOT Formik:** Older, heavier, causes more re-renders. react-hook-form is the current standard with better TypeScript support and smaller bundle.

### UI Utilities

| Library | Version | Purpose | Confidence |
|---------|---------|---------|------------|
| clsx | ^2.1.1 | Conditional class name joining | HIGH |
| tailwind-merge | ^3.5.0 | Merge conflicting Tailwind classes (supports TW v4) | HIGH |
| sonner | ^2.0.7 | Toast notifications | HIGH |
| lucide-react | ^0.577.0 | Icon library (tree-shakable SVG icons) | MEDIUM |

**Why clsx + tailwind-merge:** The existing `cn()` in `src/lib/utils.ts` is a naive `filter(Boolean).join(' ')` -- it cannot resolve Tailwind class conflicts (e.g., `bg-red-500` + `bg-blue-500` keeps both). This breaks when building reusable components with variant overrides. The standard `cn()` pattern (`twMerge(clsx(...))`) resolves conflicts correctly. tailwind-merge v3.5.0 explicitly supports Tailwind CSS v4.

**Why sonner:** Fleet actions (wake pod, shutdown, deploy) and financial operations (top-up, refund) need immediate user feedback. Sonner is 5KB, works with App Router, has a promise-based API for async operations (`toast.promise(wakeAllPods())`), and supports action toasts (undo button). Used by shadcn/ui ecosystem.

**Why lucide-react:** Dashboard needs icons for pod status indicators, action buttons, navigation items, and system health. Lucide is tree-shakable (each icon ~200 bytes, only ships what you import), actively maintained (v0.577.0 published 10 days ago), with 1500+ icons. Avoid `react-icons` -- it ships entire icon packs, inflating bundle size.

### Date Handling

| Library | Version | Purpose | Confidence |
|---------|---------|---------|------------|
| date-fns | ^4.1.0 | Date formatting, relative time, durations | MEDIUM |

**Why date-fns:** The dashboard needs relative time ("3 minutes ago" for activity logs), duration formatting (billing session elapsed time), date range comparisons (event scheduling), and locale-aware formatting (en-IN for IST). date-fns is tree-shakable (import only `formatDistanceToNow`, `differenceInMinutes`, etc.), functional style (matches existing code), and TypeScript-first.

**Why NOT dayjs:** dayjs is 2KB base but requires plugins for relative time, custom formats, and timezone support. With plugins loaded, the size advantage over tree-shaken date-fns disappears.

**Why NOT manual date handling:** The existing `formatDate()` and `formatTime()` in utils.ts work for simple display but will not scale to: relative time, duration formatting, interval checking, or timezone handling. Reimplementing these is reinventing date-fns.

## Alternatives NOT Recommended

| Library | Category | Why Not |
|---------|----------|---------|
| iron-session | Auth | Redundant with jose. We store a JWT, not arbitrary session data. jose handles both middleware verification and cookie creation. |
| Auth.js / NextAuth v5 | Auth | Wrong abstraction for custom backend auth. |
| @tanstack/react-table | Tables | Premature. Custom table components + SWR are sufficient for v1. Add later if virtual scroll or column resize becomes necessary. |
| shadcn/ui | Components | Copy-paste component library. Would restructure existing component architecture. Consider for future design system pass, not this milestone. |
| Socket.io / Pusher | Real-time | Project constraint: polling-based for v1. SWR `refreshInterval` is sufficient for 8 pods. |
| Moment.js | Dates | Deprecated by its own maintainers. 67KB minified. |
| Axios | HTTP | `fetch` is built into Next.js with automatic caching/revalidation. Axios adds nothing here. |
| Redux / Zustand | State | SWR handles server state. No complex client-only state justifies a state manager for this app. |
| jsonwebtoken | Auth | Does not work in Edge Runtime (uses Node.js `crypto`). jose is the Edge-compatible alternative. |

## Installation

```bash
# Auth (JWT handling)
npm install jose

# Form handling & validation
npm install zod react-hook-form @hookform/resolvers

# UI utilities
npm install clsx tailwind-merge sonner lucide-react

# Date handling
npm install date-fns
```

**Total: 8 new runtime dependencies.** All are well-maintained, tree-shakable, and commonly used together in Next.js App Router projects.

## Key Patterns

### Updated cn() Utility

Replace the naive `cn()` in `src/lib/utils.ts`:

```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### Auth Cookie Pattern (jose)

```typescript
// src/lib/auth.ts
import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.AUTH_SECRET);

export async function createSessionToken(payload: {
  admin_id: string;
  username: string;
  role: "admin" | "staff";
  rc_token: string; // The token from RaceControl
}) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("24h")
    .setIssuedAt()
    .sign(secret);
}

export async function verifySessionToken(token: string) {
  const { payload } = await jwtVerify(token, secret);
  return payload as {
    admin_id: string;
    username: string;
    role: "admin" | "staff";
    rc_token: string;
  };
}
```

### SWR Polling Pattern (Already Established)

No new library needed. SWR's `refreshInterval` provides "real-time enough" updates:

```typescript
const { data: fleet } = useSWR("/api/rc/pods", fetcher, {
  refreshInterval: 5000,     // poll every 5s
  revalidateOnFocus: true,   // refresh when tab regains focus
  refreshWhenHidden: false,  // stop when tab is hidden (saves resources)
});
```

## Environment Variables to Add

```bash
# .env.local additions
AUTH_SECRET=<32+ character random string for JWT signing>
```

## Sources

- [jose npm](https://www.npmjs.com/package/jose) - v6.2.2, published 3 days ago
- [jose GitHub](https://github.com/panva/jose) - Edge Runtime compatible JWT
- [Next.js Authentication Guide](https://nextjs.org/docs/app/guides/authentication) - official cookie/JWT pattern
- [Zod npm](https://www.npmjs.com/package/zod) - v4.3.6
- [react-hook-form npm](https://www.npmjs.com/package/react-hook-form) - v7.71.2
- [sonner npm](https://www.npmjs.com/package/sonner) - v2.0.7
- [lucide-react npm](https://www.npmjs.com/package/lucide-react) - v0.577.0
- [tailwind-merge npm](https://www.npmjs.com/package/tailwind-merge) - v3.5.0 (Tailwind v4 support confirmed)
- [clsx npm](https://www.npmjs.com/package/clsx) - v2.1.1
- [date-fns npm](https://www.npmjs.com/package/date-fns) - v4.1.0

---

*Stack research: 2026-03-22*
