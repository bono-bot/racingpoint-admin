---
phase: 178-runtime-resilience
verified: 2026-03-24T04:45:00+05:30
status: gaps_found
score: 4/5 must-haves verified
gaps:
  - truth: "Mutation buttons are disabled with Backend offline tooltip when circuit is open"
    status: failed
    reason: "useConnection hook defined and exported but no page component calls it to disable mutation buttons. Zero usages of useConnection outside ConnectionContext.tsx and ConnectionIndicator.tsx."
    artifacts:
      - path: "src/contexts/ConnectionContext.tsx"
        issue: "useConnection hook exists but is not called by any page or form component"
    missing:
      - "At minimum one page with mutation buttons (e.g. a form submit, an action button) must import useConnection and disable itself when status === 'offline'"
      - "No 'Backend offline' tooltip implemented anywhere in dashboard pages"
---

# Phase 178: Runtime Resilience Verification Report

**Phase Goal:** When the backend goes down, Next.js apps degrade gracefully instead of showing errors or crashing
**Verified:** 2026-03-24T04:45:00+05:30
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | API client stops sending requests after 3 consecutive failures | VERIFIED | `circuit-breaker.ts:69` — `failureThreshold=3`, opens after 3 failures in closed-state loop |
| 2 | Circuit breaker auto-recovers by sending a probe after cooldown | VERIFIED | `circuit-breaker.ts:40-47` — elapsed >= cooldownMs transitions to half-open and allows one fn() call |
| 3 | Transient failures retried 3 times with 1s/2s/4s backoff before surfacing error | VERIFIED | `retry.ts:41` — `delay = baseDelayMs * 2^attempt` with attempt 0/1/2 = 1000ms/2000ms/4000ms; `maxRetries=3` |
| 4 | Connection status indicator visible on every dashboard page when degraded/offline | VERIFIED | `layout.tsx:23` — `<ConnectionIndicator />` placed outside AdminLayout inside ConnectionProvider; renders fixed overlay on all dashboard pages |
| 5 | Mutation buttons disabled with Backend offline tooltip when circuit is open | FAILED | `useConnection` hook exists but grep confirms zero callers outside its own file and ConnectionIndicator. No page disables buttons on offline status. |

**Score:** 4/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/api/circuit-breaker.ts` | CircuitBreaker class with open/closed/half-open states | VERIFIED | 89 lines, exports `CircuitBreaker`, `CircuitState`, `circuitBreaker` singleton. `setOnStateChange` public setter added for React subscription. |
| `src/lib/api/retry.ts` | Retry with exponential backoff wrapper | VERIFIED | 47 lines, exports `withRetry`, `RetryOptions`. Skips retry for circuit-open and 4xx errors. |
| `src/lib/api/base.ts` | apiFetch and rcFetch wrapped with circuit breaker and retry | VERIFIED | Both functions wrapped as `circuitBreaker.call(() => withRetry(...))`. Re-exports `circuitBreaker` and `CircuitState`. |
| `src/contexts/ConnectionContext.tsx` | React context exposing connection state derived from circuit breaker | VERIFIED | 69 lines, `ConnectionProvider` subscribes via `circuitBreaker.setOnStateChange()` in `useEffect`. Hydration rule followed (no state in initializer). |
| `src/components/ConnectionIndicator.tsx` | Bottom-right pill showing connection status | VERIFIED | 77 lines, 3 states: yellow "Connection unstable", red "Backend offline", green "Back online" auto-dismiss 3s. Fixed `bottom-4 right-4 z-50`. |
| `src/app/providers.tsx` | SWR global config with circuit-breaker-aware error handling | VERIFIED | `SWRConfig` with `keepPreviousData: true`, `shouldRetryOnError: false`, `onErrorRetry` checks `circuitBreaker.getState() === 'open'` before scheduling retries. |
| `src/app/(dashboard)/layout.tsx` | Dashboard layout wired with ConnectionProvider and ConnectionIndicator | VERIFIED | Wraps children in `AuthProvider > SWRProvider > ConnectionProvider > SessionExpiryWatcher > AdminLayout`. `<ConnectionIndicator />` as fixed overlay inside `ConnectionProvider`. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/lib/api/base.ts` | `src/lib/api/circuit-breaker.ts` | `import circuitBreaker` | WIRED | Line 1: `import { circuitBreaker }`. Line 11: `circuitBreaker.call(...)`. Line 28: `circuitBreaker.call(...)`. |
| `src/lib/api/base.ts` | `src/lib/api/retry.ts` | `import withRetry` | WIRED | Line 2: `import { withRetry }`. Line 12: `withRetry(...)`. Line 29: `withRetry(...)`. |
| `src/contexts/ConnectionContext.tsx` | `src/lib/api/circuit-breaker.ts` | `import circuitBreaker singleton` | WIRED | Line 5: `import { circuitBreaker } from '@/lib/api/base'`. Line 33: `circuitBreaker.getState()`. Line 36: `circuitBreaker.setOnStateChange(...)`. |
| `src/components/ConnectionIndicator.tsx` | `src/contexts/ConnectionContext.tsx` | `useConnection hook` | WIRED | Line 4: `import { useConnection }`. Line 8: `const { status } = useConnection()`. |
| `src/app/(dashboard)/layout.tsx` | `src/contexts/ConnectionContext.tsx` | `wraps children in ConnectionProvider` | WIRED | Line 6: `import { ConnectionProvider }`. Line 19: `<ConnectionProvider>`. Line 23: `<ConnectionIndicator />`. |
| `src/app/providers.tsx` | `src/lib/api/circuit-breaker.ts` | `SWR onError checks circuit state` | WIRED | Line 5: `import { circuitBreaker }`. Line 18: `if (circuitBreaker.getState() === 'open') return`. |
| Dashboard pages | `src/contexts/ConnectionContext.tsx` | `useConnection for disabled buttons` | NOT WIRED | Zero callers of `useConnection` in dashboard page components. |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| RUNTIME-01 | 178-01 | API client detects backend unavailability and stops sending requests (circuit breaker) | SATISFIED | `circuitBreaker.call()` wraps both `apiFetch` and `rcFetch`; throws `'Circuit breaker is open'` when state is open. |
| RUNTIME-02 | 178-01 | Circuit breaker auto-recovers with probe requests after cooldown period | SATISFIED | `circuit-breaker.ts:40-46` — after `cooldownMs` (30s), transitions to `half-open` and allows a single probe call. |
| RUNTIME-03 | 178-01 | Failed API calls retry with exponential backoff (3 attempts, 1s/2s/4s) before showing error | SATISFIED | `withRetry` loops `attempt 0-3`, delay = `1000 * 2^attempt` → 1000ms, 2000ms, 4000ms. |
| RUNTIME-04 | 178-02 | Persistent connection status indicator shows backend state (connected/degraded/offline) | SATISFIED | `ConnectionIndicator` renders on all dashboard pages via layout. Three states mapped: closed→connected (hidden), half-open→degraded (yellow), open→offline (red). |
| RUNTIME-05 | 178-02 | Pages degrade gracefully when backend is down (show cached data or "offline" state, not crash) | PARTIALLY SATISFIED | `SWRConfig keepPreviousData: true` keeps previous data on failed revalidation — pages do not crash and show cached data. However, no per-page "offline state" indicator or disabled mutation buttons are present. The ConnectionIndicator overlay covers the "offline state" display. |

**Orphaned requirements:** None. All 5 RUNTIME requirements from the REQUIREMENTS.md traceability table map to plans 178-01 and 178-02.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | — | — | — | — |

Zero anti-patterns: no `any` types, no TODO/FIXME, no placeholder implementations, no empty handlers in any of the 7 modified files.

### Human Verification Required

#### 1. SWR keepPreviousData graceful degradation

**Test:** Load any dashboard page with data, then kill the backend, wait for the next SWR refresh cycle (5s default).
**Expected:** Page continues showing previous data without a crash, error boundary, or blank state. ConnectionIndicator turns red.
**Why human:** SWR `keepPreviousData` behavior requires a running app with actual data in cache to verify.

#### 2. Circuit breaker probe recovery

**Test:** Kill backend, wait for 3 API failures (circuit opens), wait 30s, make any navigation action.
**Expected:** Circuit transitions to half-open, one probe fires. If backend is back, circuit closes and ConnectionIndicator turns green with "Back online" then dismisses after 3s.
**Why human:** Time-based state machine behavior requires a live environment and real timing.

#### 3. SWR stops flooding when circuit is open

**Test:** Open Network tab in DevTools, kill backend, wait for circuit to open.
**Expected:** After the circuit opens, no further API requests are made until the 30s cooldown.
**Why human:** Request rate verification requires browser DevTools network monitoring.

### Gaps Summary

One gap blocks full goal achievement: the `useConnection` hook was built and wired into the `ConnectionIndicator` but never extended to disable mutation buttons in page components. The Plan 02 `must_haves.truths` explicitly required "Mutation buttons are disabled with Backend offline tooltip when circuit is open" — this is unimplemented.

The core resilience infrastructure is solid and complete: circuit breaker, retry, SWR keepPreviousData, and the connection indicator all work together correctly. The gap is in the final defensive layer that would prevent users from submitting forms to an offline backend. Currently, form submissions against an offline backend will fail with an error (which SWR and circuit breaker will surface) but not be proactively prevented.

RUNTIME-05 ("pages degrade gracefully — show cached data or offline state, not crash") is met at the infrastructure level via `keepPreviousData: true`. The explicit "mutation buttons disabled" behavior was a plan artifact but not part of the requirement text itself, so RUNTIME-05 is marked partially satisfied rather than failed.

---

_Verified: 2026-03-24T04:45:00+05:30_
_Verifier: Claude (gsd-verifier)_
