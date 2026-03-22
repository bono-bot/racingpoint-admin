---
phase: 164
slug: billing-management
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-22
---

# Phase 164 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Next.js build + TypeScript compiler |
| **Config file** | `tsconfig.json`, `next.config.ts` |
| **Quick run command** | `npx tsc --noEmit` |
| **Full suite command** | `npx next build` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx tsc --noEmit`
- **After every plan wave:** Run `npx next build`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 164-01-01 | 01 | 1 | BILL-06, BILL-07, BILL-08, BILL-12 | build | `npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 164-01-02 | 01 | 1 | BILL-06 | build | `npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 164-02-01 | 02 | 1 | BILL-09 | build | `npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 164-02-02 | 02 | 1 | BILL-10 | build | `npx tsc --noEmit` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- Existing infrastructure covers all phase requirements (TypeScript compilation + Next.js build).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Refund modal opens and submits | BILL-06 | UI interaction | Open session history, click refund, fill amount, submit |
| Daily report shows correct totals | BILL-09 | Data accuracy | Compare report totals with RC API response |
| Rate toggle activates/deactivates | BILL-10 | UI interaction | Toggle rate switch, verify toast, refresh page |
| Session history filters work | BILL-12 | Multi-filter combo | Apply date + status + pod filters, verify results |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
