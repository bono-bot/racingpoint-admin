---
phase: 159
slug: authentication-session-security
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-22
---

# Phase 159 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright 1.58.2 (E2E) |
| **Config file** | `playwright.config.ts` |
| **Quick run command** | `npx playwright test --grep "@auth"` |
| **Full suite command** | `npx playwright test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx playwright test --grep "@auth"`
- **After every plan wave:** Run `npx playwright test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 159-01-01 | 01 | 1 | AUTH-01 | E2E | `npx playwright test --grep "admin login"` | ❌ W0 | ⬜ pending |
| 159-01-02 | 01 | 1 | AUTH-02 | E2E | `npx playwright test --grep "session persist"` | ❌ W0 | ⬜ pending |
| 159-02-01 | 02 | 1 | AUTH-03 | E2E | `npx playwright test --grep "redirect unauthenticated"` | ❌ W0 | ⬜ pending |
| 159-02-02 | 02 | 1 | AUTH-04 | E2E | `npx playwright test --grep "proxy reject"` | ❌ W0 | ⬜ pending |
| 159-03-01 | 03 | 1 | AUTH-05 | E2E | `npx playwright test --grep "role badge"` | ❌ W0 | ⬜ pending |
| 159-03-02 | 03 | 1 | AUTH-06 | E2E | `npx playwright test --grep "logout"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/e2e/10-auth.spec.ts` — auth test stubs for AUTH-01 through AUTH-06
- [ ] Playwright test helpers for login/logout flows

*Existing Playwright infrastructure covers framework setup.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| PIN pad UX feel | AUTH-01 | Visual/tactile quality | Open /login, verify PIN pad renders, tap numbers, verify shake on error |
| Session expiry toast | AUTH-02 | Requires waiting near expiry | Set short JWT expiry (5min test), wait for toast appearance |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
