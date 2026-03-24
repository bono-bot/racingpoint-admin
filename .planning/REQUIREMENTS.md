# Requirements: API Hardening (v20.1)

**Defined:** 2026-03-23
**Core Value:** No Next.js app deploy goes live with missing pages, and runtime backend failures degrade gracefully instead of crashing

## v20.1 Requirements

### Deploy Hardening

- [x] **DEPLOY-01**: Each Next.js app's `/api/health` reports all expected pages vs available pages at runtime
- [x] **DEPLOY-02**: Health endpoint returns `503 "degraded"` when any expected page is missing
- [ ] **DEPLOY-03**: Unified deploy script builds, packages (with .next/static), uploads, extracts, and verifies all routes
- [ ] **DEPLOY-04**: Deploy script refuses to complete if post-deploy health check shows missing pages
- [x] **DEPLOY-05**: Every deploy is logged to racecontrol (app, timestamp, page count before/after, deployer, success/fail)
- [ ] **DEPLOY-06**: AI auto-rollback: if post-deploy health returns degraded, automatically restore previous working deploy

### Runtime Resilience

- [ ] **RUNTIME-01**: API client detects backend unavailability and stops sending requests (circuit breaker)
- [ ] **RUNTIME-02**: Circuit breaker auto-recovers with probe requests after cooldown period
- [ ] **RUNTIME-03**: Failed API calls retry with exponential backoff (3 attempts, 1s/2s/4s) before showing error
- [ ] **RUNTIME-04**: Persistent connection status indicator shows backend state (connected/degraded/offline)
- [ ] **RUNTIME-05**: Pages degrade gracefully when backend is down (show cached data or "offline" state, not crash)

### Monitoring

- [ ] **MON-01**: Admin dashboard has a health overview page showing all 3 apps' status, page counts, last deploy
- [ ] **MON-02**: WhatsApp alert fires when any app's health returns degraded (via racecontrol alerter)
- [ ] **MON-03**: Health overview auto-refreshes and shows historical deploy timeline
- [ ] **MON-04**: Racecontrol periodically probes all 3 Next.js app health endpoints and logs connection status
- [ ] **MON-05**: Racecontrol fires WhatsApp alert when any app health probe fails or returns degraded

## Future Requirements

### Extended Hardening

- **EXT-01**: Env var safety — verify all NEXT_PUBLIC_ vars are set at build time, fail build if missing
- **EXT-02**: Deploy diff — show which pages were added/removed between deploys
- **EXT-03**: Canary deploy — deploy to one instance, verify, then promote to all

## Out of Scope

| Feature | Reason |
|---------|--------|
| WebSocket-based real-time health | Polling sufficient for 3-app monitoring; WS adds complexity |
| Per-page response time monitoring | APM-level monitoring is overkill for venue LAN |
| Third-party uptime services (Pingdom, etc.) | LAN-only apps, external monitoring can't reach them |
| Database health checks | RaceControl already monitors SQLite; this milestone focuses on Next.js layer |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DEPLOY-01 | Phase 176 | Complete |
| DEPLOY-02 | Phase 176 | Complete |
| DEPLOY-03 | Phase 177 | Pending |
| DEPLOY-04 | Phase 177 | Pending |
| DEPLOY-05 | Phase 177 | Complete |
| DEPLOY-06 | Phase 177 | Pending |
| RUNTIME-01 | Phase 178 | Pending |
| RUNTIME-02 | Phase 178 | Pending |
| RUNTIME-03 | Phase 178 | Pending |
| RUNTIME-04 | Phase 178 | Pending |
| RUNTIME-05 | Phase 178 | Pending |
| MON-01 | Phase 179 | Pending |
| MON-02 | Phase 179 | Pending |
| MON-03 | Phase 179 | Pending |
| MON-04 | Phase 179 | Pending |
| MON-05 | Phase 179 | Pending |

**Coverage:**
- v20.1 requirements: 16 total
- Mapped to phases: 16
- Unmapped: 0

---
*Requirements defined: 2026-03-23*
*Last updated: 2026-03-23 after roadmap creation (phases 176-179)*
