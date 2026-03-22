# Research Summary: RaceControl Admin Integration

**Domain:** Operations admin dashboard for sim racing venue
**Researched:** 2026-03-22
**Overall confidence:** HIGH

## Executive Summary

The Racing Point Admin Dashboard already has a solid Next.js 16 + TypeScript + Tailwind CSS 4 foundation with 27 existing pages. The expansion to full RaceControl integration is primarily an API integration project, not a technology selection problem. The existing stack (SWR for data fetching, `rcFetch` for backend calls, Recharts for visualization) is well-chosen and should be extended, not replaced.

The critical gaps are: (1) authentication -- the dashboard is currently open on the local network with no login, (2) form infrastructure -- complex CRUD operations for billing, drivers, events, and championships need validation and state management, (3) UI feedback -- fleet actions and mutations need toast notifications, and (4) date handling -- session timers, activity logs, and billing periods need proper date utilities.

The recommended additions are minimal and targeted: `jose` for JWT-based auth with Edge middleware compatibility, zod + react-hook-form for forms, sonner for toasts, clsx + tailwind-merge for proper Tailwind class merging, lucide-react for icons, and date-fns for dates. Total new dependencies: 8 packages. No architecture changes needed -- the existing App Router + API route proxy + SWR pattern scales to all new features.

The biggest risk is not technology but scope: ~200+ RC API routes to integrate across 7 feature domains. The phasing strategy should prioritize auth (gate everything else), then fleet monitoring (highest daily-use value), then billing (revenue-critical), then everything else.

## Key Findings

**Stack:** Add jose, zod, react-hook-form, @hookform/resolvers, sonner, lucide-react, clsx, tailwind-merge, date-fns. No framework changes.
**Architecture:** Extend existing API route proxy pattern. Add JWT middleware layer. Keep SWR polling for real-time.
**Critical pitfall:** Open RC proxy becomes privilege escalation vector -- must lock down proxy endpoints when auth ships, not after.

## Implications for Roadmap

Based on research, suggested phase structure:

1. **Auth & Session Foundation** - Must come first; gates all other features
   - Addresses: admin login, role-based access, protected routes, proxy lockdown
   - Avoids: building features that anyone on the network can access

2. **Fleet Monitoring & Control** - Highest daily operational value
   - Addresses: pod status, wake/shutdown, health dashboard, bulk actions
   - Avoids: building CRUD before the real-time mission control that staff need most

3. **Billing & Session Management** - Revenue-critical
   - Addresses: active sessions, start/stop billing, pause/extend, refunds
   - Avoids: financial operations without proper idempotency and audit trail

4. **Driver & Wallet Management** - Customer data management
   - Addresses: driver profiles, wallet operations, memberships, badges
   - Avoids: wallet mutations without proper validation and double-submit prevention

5. **Events & Championships** - Growth features
   - Addresses: event creation, championship management, time trials
   - Avoids: complex multi-step forms without form infrastructure (built in phases 3-4)

6. **Game Management & Operations** - Secondary features
   - Addresses: game launch, scheduler, activity logs, control room composite view
   - Avoids: overscoping early phases

7. **Data Migration & SQLite Removal** - Final cleanup
   - Addresses: migrate cafe/HR/finance data to RC, remove better-sqlite3
   - Avoids: premature migration before RC APIs are battle-tested

**Phase ordering rationale:**
- Auth must be phase 1 -- every other feature depends on authenticated sessions and the proxy must be locked down first
- Fleet monitoring before billing -- staff use pod control 50x/day; billing management less frequently
- Events/championships after billing -- they reuse form patterns and driver lookup built in phases 3-4
- Data migration last -- removing SQLite dependency should only happen after RC API integration is proven stable

**Research flags for phases:**
- Phase 1 (Auth): Standard patterns, LOW research risk. jose + RC `/auth/admin-login` is straightforward. Must investigate whether RC returns JWT or opaque token.
- Phase 2 (Fleet): May need deeper research on RC fleet API contract (wake/shutdown/deploy endpoints, bulk vs individual).
- Phase 3 (Billing): Needs RC billing API contract review -- real-time session state, refund idempotency.
- Phase 7 (Migration): HIGH research risk -- data mapping from SQLite schema to RC API models needs careful analysis per domain.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All libraries verified on npm with current versions (March 2026). Well-established ecosystem. |
| Features | HIGH | Feature list from PROJECT.md validated requirements + competitive analysis. |
| Architecture | HIGH | Extending existing patterns, not introducing new ones. JWT + middleware is standard Next.js. |
| Pitfalls | MEDIUM | Proxy security and migration pitfalls are real; mitigations are standard but require discipline. |

## Gaps to Address

- RC API contract details for fleet, billing, driver, and event endpoints (need API docs or exploration)
- Whether RC's `/auth/admin-login` returns a JWT or opaque token (affects jose usage pattern)
- Exact SQLite schema for data migration planning (phase 7 research)
- Role-based access specifics -- what can "staff" vs "admin" do? (needs business requirements from Uday)
- Whether RC has bulk fleet endpoints or only individual pod endpoints (affects polling architecture)

---

*Research summary: 2026-03-22*
