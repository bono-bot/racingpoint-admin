# Roadmap: API Hardening (v20.1)

## Overview

Eliminate recurring stale/broken Next.js deployments across all 3 apps (admin, kiosk, web) and add runtime resilience for backend failures. The journey starts with self-verifying health endpoints (so apps know when they're broken), then automates the deploy pipeline with verification gates and rollback, then hardens the runtime API layer with circuit breakers and graceful degradation, and finally adds monitoring and alerting so problems are caught before staff notice.

Cross-project milestone: touches racingpoint-admin, racecontrol/kiosk, racecontrol/web, and racecontrol Rust backend.

## Phases

**Phase Numbering:**
- Continues global numbering: v20.0 = 159-169, v21.0 = 170-175, v20.1 = 176-179
- Decimal phases (176.1, 176.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 176: Self-Verifying Health Endpoints** - Each Next.js app reports its own page manifest and flags missing pages as degraded (completed 2026-03-24)
- [x] **Phase 177: Deploy Automation & Verification** - Unified deploy script with build, upload, verify, audit log, and auto-rollback (completed 2026-03-24)
- [x] **Phase 178: Runtime Resilience** - Circuit breaker, retry with backoff, connection indicator, and graceful degradation (completed 2026-03-24)
- [x] **Phase 179: Health Monitoring & Alerting** - Admin health dashboard, racecontrol probes, WhatsApp alerts on degradation (completed 2026-03-24)

## Phase Details

### Phase 176: Self-Verifying Health Endpoints
**Goal**: Every Next.js app can report exactly which pages it has and which are missing, so deploys are verifiable
**Depends on**: Nothing (first phase)
**Requirements**: DEPLOY-01, DEPLOY-02
**Success Criteria** (what must be TRUE):
  1. Hitting `/api/health` on admin, kiosk, or web returns a JSON manifest listing all expected pages and which are available
  2. If any expected page is missing from the build, `/api/health` returns HTTP 503 with status "degraded" and lists the missing pages
  3. A fully deployed app with all pages present returns HTTP 200 with status "healthy"
**Plans**: 2 plans

Plans:
- [x] 176-01-PLAN.md — Update admin health endpoint EXPECTED_PAGES to match actual app pages
- [x] 176-02-PLAN.md — Create kiosk and web self-verifying health endpoints

### Phase 177: Deploy Automation & Verification
**Goal**: Deploying any Next.js app is a single command that builds, packages, uploads, verifies, logs the result, and auto-rolls-back on failure
**Depends on**: Phase 176
**Requirements**: DEPLOY-03, DEPLOY-04, DEPLOY-05, DEPLOY-06
**Success Criteria** (what must be TRUE):
  1. Running the deploy script for any app builds standalone output, packages it with .next/static, uploads to server, extracts, and restarts the service
  2. After deploy, the script hits `/api/health` and refuses to mark the deploy as successful if any pages are missing
  3. Every deploy attempt (success or fail) is logged to racecontrol with app name, timestamp, page count before/after, deployer, and result
  4. If post-deploy health returns degraded, the script automatically restores the previous working deploy without manual intervention
**Plans**: 2 plans

Plans:
- [x] 177-01-PLAN.md — Racecontrol deploy-log endpoint (POST/GET /api/v1/deploy-log)
- [x] 177-02-PLAN.md — Complete deploy script with backup, rollback, health gate, and audit logging

### Phase 178: Runtime Resilience
**Goal**: When the backend goes down, Next.js apps degrade gracefully instead of showing errors or crashing
**Depends on**: Phase 176
**Requirements**: RUNTIME-01, RUNTIME-02, RUNTIME-03, RUNTIME-04, RUNTIME-05
**Success Criteria** (what must be TRUE):
  1. When the backend is unreachable, the API client stops sending requests after 3 consecutive failures (circuit breaker opens)
  2. After a cooldown period, the circuit breaker sends a single probe request and re-opens the circuit if it succeeds
  3. Transient API failures are retried up to 3 times with exponential backoff (1s/2s/4s) before surfacing the error
  4. A persistent connection status indicator is visible on every page showing backend state (connected/degraded/offline)
  5. Pages continue to function with cached or stale data when the backend is down, showing an "offline" state rather than crashing
**Plans**: 2 plans

Plans:
- [x] 178-01-PLAN.md — Circuit breaker module, retry with backoff, integrate into apiFetch/rcFetch
- [x] 178-02-PLAN.md — Connection context, status indicator, SWR global config, graceful degradation

### Phase 179: Health Monitoring & Alerting
**Goal**: Staff and AI can see the health of all 3 apps in one place, and WhatsApp alerts fire automatically when something breaks
**Depends on**: Phase 176, Phase 177
**Requirements**: MON-01, MON-02, MON-03, MON-04, MON-05
**Success Criteria** (what must be TRUE):
  1. Admin dashboard has a health overview page showing all 3 apps with their status, page counts, and last deploy timestamp
  2. The health overview auto-refreshes and shows a historical timeline of deploys and health status changes
  3. A WhatsApp alert fires within 60 seconds when any app's health endpoint returns degraded or becomes unreachable
  4. Racecontrol periodically probes all 3 app health endpoints and logs the results (connection status, page counts)
**Plans**: 2 plans

Plans:
- [x] 179-01-PLAN.md — Racecontrol health probe task, WhatsApp alerting, GET /api/v1/app-health endpoint
- [x] 179-02-PLAN.md — Admin dashboard System Health page with 3-card grid and deploy timeline

## Progress

**Execution Order:**
Phases execute in numeric order: 176 -> 177 -> 178 -> 179
(Note: Phase 178 depends on 176 only, so 177 and 178 could theoretically run in parallel)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 176. Self-Verifying Health Endpoints | 2/2 | Complete    | 2026-03-24 |
| 177. Deploy Automation & Verification | 2/2 | Complete    | 2026-03-24 |
| 178. Runtime Resilience | 2/2 | Complete    | 2026-03-24 |
| 179. Health Monitoring & Alerting | 2/2 | Complete    | 2026-03-24 |

---

## Backlog

### Phase 999.1: Drift-proof deploy-audit — auto-derive pages_expected from filesystem walker (BACKLOG)

**Goal:** [Captured for future planning]
**Requirements:** TBD
**Plans:** 0 plans

**Motivation:** The current `/api/health` endpoint compares a hardcoded `pages_expected` array against a runtime page count and returns `healthy: true` when `pages_available >= pages_expected`. The "expected" list has drifted out of sync with the actual filesystem on all three Next.js apps (admin, web, kiosk), so the audit is cosmetic — it reports `healthy: true` with fewer expected pages than actual pages, hiding new-page additions entirely and giving no signal on accidental deletions.

**Evidence (CLD 2026-04-11, live probes from James .27 → server .23):**

| App | Endpoint | pages_expected | pages_available | Delta | healthy |
|---|---|---|---|---|---|
| Admin | http://192.168.31.23:3201/api/health | 32 | 52 | +20 | true |
| Web | http://192.168.31.23:3200/api/health | 25 | 49 | +22 | true |
| Kiosk | http://192.168.31.23:3300/kiosk/api/health | 9 | 16 | +5 | true |

Examples of extra (unlisted-but-present) pages:
- Admin: `/customers/[id]`, `/mesh-intelligence`, `/staff`, `/drivers/[id]`, `/sessions/[id]`
- Web: `/customers`, `/drivers/[id]`, `/billing/[id]`
- Kiosk: `/session/[id]`, `/results/[id]`

**Scope:**
1. **Filesystem walker** — At build-time (preferred) or first-request time, walk `src/app/**/page.tsx` (App Router) and derive the authoritative `pages_expected` list from the filesystem. Mirror the Next.js route-resolution rules (group routes `(...)`, dynamic segments `[id]`, catch-alls `[...slug]`, route handlers vs pages).
2. **Hash + count** — Hash the sorted page list. Emit `pages_expected_hash` alongside `pages_expected_count` in the health response so the runtime can verify "the build I'm running matches the build the walker saw."
3. **Drift detection as an error, not a success** — `pages_available != pages_expected_count` must flip `healthy: false` with a `drift_detected` reason. Healthy ≠ "more is fine" — it means "matches manifest." Adds should go through code review, not silent health-passes.
4. **Consumer in deploy-audit** — `scripts/deploy/deploy-audit.sh` (lives in racecontrol repo) should read the hash/count from each of the 3 Next.js apps and fail the post-deploy gate on any drift. This closes the Deploy Manifest Protocol loop for frontends.

**Cross-repo note:** The walker implementation lives in this repo (`racingpoint-admin`) as the reference. An identical pattern must be ported to `racecontrol/web/` and `racecontrol/kiosk/` — those are separate commits in the racecontrol repo. If the add-backlog skill can't span repos, split into:
- **(A1) admin** — this entry: walker + drift-as-error in racingpoint-admin.
- **(A2) racecontrol web+kiosk** — sibling backlog in racecontrol repo: port walker to web/ and kiosk/, update deploy-audit.sh to consume the hash.

**Out of scope:**
- Fixing the specific 47 missing entries by hand (band-aid, not the fix).
- API route health (separate concern from page inventory).
- Backend/Rust health endpoints.

**Permanence:** Source-code change (Next.js API route + deploy script consumer). Survives redeploy. No manual state.

**Priority:** Medium-High — `healthy:true` is currently lying on 3 out of 3 Next.js apps. Any future "health OK" claim is unreliable until fixed. Blocks DMP's frontend gate from ever being trustworthy.

Plans:
- [ ] TBD (promote with /gsd:review-backlog when ready)
