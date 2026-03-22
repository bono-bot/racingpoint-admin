# Phase 160: Shared Infrastructure - Context

**Gathered:** 2026-03-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Install shared dependencies (zod, react-hook-form, @hookform/resolvers, sonner, lucide-react, clsx, tailwind-merge, date-fns) and refactor the monolithic API client into domain-specific modules. Create reusable form infrastructure, toast notification system, icon system, and proper Tailwind class merging utility. This is pure plumbing — every subsequent feature phase depends on these patterns.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase. Key deliverables from requirements:
- INFRA-01: Split `src/lib/api.ts` into domain modules (fleet, billing, drivers, events, games, ops)
- INFRA-02: zod + react-hook-form for validated forms with inline error messages
- INFRA-03: Replace existing Toast component with sonner for richer notifications
- INFRA-04: lucide-react icon system integrated across existing and new pages
- INFRA-05: Upgrade `cn()` utility in `src/lib/utils.ts` to use clsx + tailwind-merge

</decisions>

<canonical_refs>
## Canonical References

### Existing Code
- `src/lib/api.ts` — Current monolithic API client with apiFetch() and rcFetch()
- `src/lib/utils.ts` — Current cn() utility
- `src/components/Toast.tsx` — Current toast implementation to replace
- `.planning/research/STACK.md` — Library versions and rationale

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apiFetch()` / `rcFetch()` in api.ts — split into domain modules but keep these as base functions
- `cn()` in utils.ts — upgrade to clsx + tailwind-merge

### Established Patterns
- All pages use 'use client' with useEffect for data fetching
- SWR already installed (v2.4.1) — can use for data fetching in domain modules
- Tailwind CSS 4 with @theme inline in globals.css

### Integration Points
- Every existing page imports from `@/lib/api` — domain modules must re-export for backward compatibility
- Toast.tsx is used via useToast() hook — sonner replacement needs same pattern or migration
- utils.ts cn() is used across all components — must be drop-in replacement

</code_context>

<specifics>
## Specific Ideas

No specific requirements — infrastructure phase.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 160-shared-infrastructure*
*Context gathered: 2026-03-22*
