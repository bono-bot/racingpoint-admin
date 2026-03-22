# Requirements: Racing Point Admin Dashboard

**Defined:** 2026-03-22
**Core Value:** Staff can manage every aspect of Racing Point operations from a single authenticated dashboard

## v1 Requirements

### Authentication

- [x] **AUTH-01**: Admin can log in via RaceControl `/auth/admin-login` with credentials
- [x] **AUTH-02**: User session persists across browser refresh via JWT in httpOnly cookie
- [x] **AUTH-03**: Unauthenticated users are redirected to login page
- [x] **AUTH-04**: RC proxy routes are protected — only authenticated requests forwarded
- [ ] **AUTH-05**: Role-based access control distinguishes admin vs staff permissions
- [x] **AUTH-06**: User can log out and session is invalidated

### Fleet Control

- [ ] **FLEET-01**: Staff can view real-time fleet health (all 8 pods: status, version, uptime, connection)
- [ ] **FLEET-02**: Staff can wake, shutdown, or restart individual pods
- [ ] **FLEET-03**: Staff can lockdown or unlock individual pods
- [ ] **FLEET-04**: Staff can enable or disable individual pods
- [ ] **FLEET-05**: Staff can perform bulk fleet actions (wake-all, shutdown-all, restart-all, lockdown-all)
- [ ] **FLEET-06**: Staff can set or clear maintenance mode on a pod
- [ ] **FLEET-07**: Admin can trigger rolling deploy to fleet
- [ ] **FLEET-08**: Admin can view deploy status
- [ ] **FLEET-09**: Admin can execute remote commands on individual pods
- [ ] **FLEET-10**: Staff can view pod activity log

### Billing & Sessions

- [ ] **BILL-01**: Staff can view all active billing sessions with real-time status and timers
- [ ] **BILL-02**: Staff can start a new billing session from the dashboard
- [ ] **BILL-03**: Staff can stop an active billing session
- [ ] **BILL-04**: Staff can pause and resume an active billing session
- [ ] **BILL-05**: Staff can extend an active billing session
- [ ] **BILL-06**: Staff can issue a refund for a billing session
- [ ] **BILL-07**: Staff can view refund history for a session
- [ ] **BILL-08**: Staff can view split billing options for a session
- [ ] **BILL-09**: Staff can view daily billing report
- [ ] **BILL-10**: Admin can manage billing rates (CRUD)
- [ ] **BILL-11**: Staff can view session event timeline (per session)
- [ ] **BILL-12**: Staff can view billing session history with search and filters

### Drivers & Wallets

- [ ] **DRIV-01**: Staff can search and list all drivers
- [ ] **DRIV-02**: Staff can view full driver profile (stats, laps, sessions, badges)
- [ ] **DRIV-03**: Staff can view a driver's wallet balance
- [ ] **DRIV-04**: Staff can top-up a driver's wallet
- [ ] **DRIV-05**: Staff can debit from a driver's wallet
- [ ] **DRIV-06**: Staff can issue a wallet refund to a driver
- [ ] **DRIV-07**: Staff can view wallet transaction history per driver
- [ ] **DRIV-08**: Admin can configure wallet bonus tiers
- [ ] **DRIV-09**: Staff can view driver membership status
- [ ] **DRIV-10**: Staff can view driver badges and streaks

### Events & Championships

- [ ] **EVNT-01**: Staff can create a new event
- [ ] **EVNT-02**: Staff can edit an existing event
- [ ] **EVNT-03**: Staff can link racing sessions to events
- [ ] **EVNT-04**: Staff can create a new championship
- [ ] **EVNT-05**: Staff can manage championship rounds
- [ ] **EVNT-06**: Staff can view championship standings
- [ ] **EVNT-07**: Staff can create and manage time trials

### Game Management

- [ ] **GAME-01**: Staff can launch a game on a specific pod
- [ ] **GAME-02**: Staff can stop a running game on a pod
- [ ] **GAME-03**: Staff can relaunch a game on a pod
- [ ] **GAME-04**: Staff can view currently active games across all pods
- [ ] **GAME-05**: Staff can view game history
- [ ] **GAME-06**: Staff can browse available AC content (cars, tracks)
- [ ] **GAME-07**: Staff can view and manage AC presets

### Operations & Control Room

- [ ] **OPS-01**: Staff can view a control room overview (fleet status + active sessions + system health)
- [ ] **OPS-02**: Control room has quick action buttons for common operations
- [ ] **OPS-03**: Staff can view scheduler status and settings
- [ ] **OPS-04**: Staff can view ops stats dashboard
- [ ] **OPS-05**: Staff can view activity/audit log
- [ ] **OPS-06**: Staff can view system health (RC + Gateway + fleet connectivity)

### Infrastructure

- [x] **INFRA-01**: API client refactored into domain-specific modules
- [ ] **INFRA-02**: Proper form infrastructure with validation (zod + react-hook-form)
- [x] **INFRA-03**: Toast notification system for action feedback (sonner)
- [ ] **INFRA-04**: Consistent icon system (lucide-react)
- [x] **INFRA-05**: Proper Tailwind class merging (clsx + tailwind-merge)

## v2 Requirements

### Data Migration

- **MIG-01**: Migrate cafe/menu data from SQLite to RaceControl API
- **MIG-02**: Migrate inventory data from SQLite to RaceControl API
- **MIG-03**: Migrate HR/employee data from SQLite to RaceControl API
- **MIG-04**: Migrate finance data from SQLite to RaceControl API
- **MIG-05**: Remove better-sqlite3 dependency after migration complete

### Advanced Features

- **ADV-01**: WebSocket-based real-time updates (replace polling)
- **ADV-02**: Push notifications for incidents and alerts
- **ADV-03**: Multi-venue dashboard support
- **ADV-04**: Custom dashboard widgets / layout customization

## Out of Scope

| Feature | Reason |
|---------|--------|
| Customer-facing features (booking flow, customer login) | Handled by kiosk and web dashboard |
| WhatsApp/Discord bot management | Separate projects with own repos |
| Camera/NVR management | Handled by rc-sentry-ai / camera dashboard |
| Comms-link AI coordination | Separate infrastructure (James/Bono) |
| Cloud platform management | Handled by cloud racecontrol on Bono VPS |
| Mobile native app | Web-first, responsive design sufficient |
| Customer self-service (profiles, friends, game requests) | Kiosk handles these |
| Real-time chat/WebSocket in v1 | Polling sufficient for 8 pods, defer to v2 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 159 | Complete |
| AUTH-02 | Phase 159 | Complete |
| AUTH-03 | Phase 159 | Complete |
| AUTH-04 | Phase 159 | Complete |
| AUTH-05 | Phase 159 | Pending |
| AUTH-06 | Phase 159 | Complete |
| INFRA-01 | Phase 160 | Complete |
| INFRA-02 | Phase 160 | Pending |
| INFRA-03 | Phase 160 | Complete |
| INFRA-04 | Phase 160 | Pending |
| INFRA-05 | Phase 160 | Complete |
| FLEET-01 | Phase 161 | Pending |
| FLEET-10 | Phase 161 | Pending |
| FLEET-02 | Phase 162 | Pending |
| FLEET-03 | Phase 162 | Pending |
| FLEET-04 | Phase 162 | Pending |
| FLEET-05 | Phase 162 | Pending |
| FLEET-06 | Phase 162 | Pending |
| FLEET-07 | Phase 162 | Pending |
| FLEET-08 | Phase 162 | Pending |
| FLEET-09 | Phase 162 | Pending |
| BILL-01 | Phase 163 | Pending |
| BILL-02 | Phase 163 | Pending |
| BILL-03 | Phase 163 | Pending |
| BILL-04 | Phase 163 | Pending |
| BILL-05 | Phase 163 | Pending |
| BILL-11 | Phase 163 | Pending |
| BILL-06 | Phase 164 | Pending |
| BILL-07 | Phase 164 | Pending |
| BILL-08 | Phase 164 | Pending |
| BILL-09 | Phase 164 | Pending |
| BILL-10 | Phase 164 | Pending |
| BILL-12 | Phase 164 | Pending |
| DRIV-01 | Phase 165 | Pending |
| DRIV-02 | Phase 165 | Pending |
| DRIV-03 | Phase 165 | Pending |
| DRIV-04 | Phase 165 | Pending |
| DRIV-05 | Phase 165 | Pending |
| DRIV-06 | Phase 165 | Pending |
| DRIV-07 | Phase 165 | Pending |
| DRIV-08 | Phase 165 | Pending |
| DRIV-09 | Phase 165 | Pending |
| DRIV-10 | Phase 165 | Pending |
| EVNT-01 | Phase 166 | Pending |
| EVNT-02 | Phase 166 | Pending |
| EVNT-03 | Phase 166 | Pending |
| EVNT-04 | Phase 166 | Pending |
| EVNT-05 | Phase 166 | Pending |
| EVNT-06 | Phase 166 | Pending |
| EVNT-07 | Phase 166 | Pending |
| GAME-01 | Phase 167 | Pending |
| GAME-02 | Phase 167 | Pending |
| GAME-03 | Phase 167 | Pending |
| GAME-04 | Phase 167 | Pending |
| GAME-05 | Phase 167 | Pending |
| GAME-06 | Phase 167 | Pending |
| GAME-07 | Phase 167 | Pending |
| OPS-03 | Phase 168 | Pending |
| OPS-04 | Phase 168 | Pending |
| OPS-05 | Phase 168 | Pending |
| OPS-06 | Phase 168 | Pending |
| OPS-01 | Phase 169 | Pending |
| OPS-02 | Phase 169 | Pending |

**Coverage:**
- v1 requirements: 63 total
- Mapped to phases: 63
- Unmapped: 0

---
*Requirements defined: 2026-03-22*
*Last updated: 2026-03-22 after roadmap creation -- traceability populated*
