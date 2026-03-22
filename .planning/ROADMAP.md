# Roadmap: Racing Point Admin Dashboard

## Overview

Transform the existing 27-page Next.js admin dashboard from an open, partial-coverage tool into a fully authenticated, full-coverage operations center for Racing Point eSports. The journey starts with locking down access (auth), laying shared infrastructure (forms, toasts, icons), then building out each operational domain in order of daily-use value: fleet control, billing, drivers, events, games, ops tools, and finally the composite control room view that ties everything together.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Authentication & Session Security** - Lock down the dashboard with RC admin login, JWT sessions, and protected routes
- [ ] **Phase 2: Shared Infrastructure** - Form validation, toast notifications, icon system, and API client refactor
- [ ] **Phase 3: Fleet Monitoring** - Real-time fleet health dashboard showing all 8 pods with status and activity
- [ ] **Phase 4: Fleet Actions & Deployment** - Pod control actions, bulk operations, maintenance mode, rolling deploy
- [ ] **Phase 5: Billing & Active Sessions** - Live billing sessions with start/stop/pause/extend and real-time timers
- [ ] **Phase 6: Billing Management** - Refunds, split billing, daily reports, session history, rate management
- [ ] **Phase 7: Drivers & Wallets** - Driver profiles, search, wallet operations, memberships, badges
- [ ] **Phase 8: Events & Championships** - Event CRUD, championship management, time trials
- [ ] **Phase 9: Game Management** - Launch/stop/relaunch games on pods, game history, AC content browser
- [ ] **Phase 10: Operations & System Health** - Scheduler, ops stats, audit log, system health monitoring
- [ ] **Phase 11: Control Room Overview** - Composite mission control view with quick actions and alerts

## Phase Details

### Phase 1: Authentication & Session Security
**Goal**: Staff must log in before accessing any dashboard functionality; unauthenticated users see only the login page
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06
**Success Criteria** (what must be TRUE):
  1. Staff can log in with admin credentials and see the dashboard
  2. Closing and reopening the browser preserves the logged-in session
  3. Opening any dashboard URL while logged out redirects to the login page
  4. API proxy routes reject requests without a valid session token
  5. Admin users see management options that staff users do not
**Plans**: TBD

Plans:
- [ ] 01-01: TBD
- [ ] 01-02: TBD

### Phase 2: Shared Infrastructure
**Goal**: Common UI and data patterns are in place so feature phases can build CRUD views and mutation flows without reinventing plumbing
**Depends on**: Phase 1
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05
**Success Criteria** (what must be TRUE):
  1. API calls are organized by domain module (fleet, billing, drivers, etc.) not a single monolith
  2. A form with validation errors shows inline messages and prevents submission
  3. Successful mutations display a toast notification confirming the action
  4. Icons render consistently across all existing and new pages
  5. Tailwind utility classes merge correctly without style conflicts
**Plans**: TBD

Plans:
- [ ] 02-01: TBD
- [ ] 02-02: TBD

### Phase 3: Fleet Monitoring
**Goal**: Staff can see the live status of all 8 racing pods at a glance and review recent pod activity
**Depends on**: Phase 2
**Requirements**: FLEET-01, FLEET-10
**Success Criteria** (what must be TRUE):
  1. Staff can view a dashboard showing all 8 pods with their status, version, uptime, and connection state
  2. Pod data refreshes automatically via polling without manual page reload
  3. Staff can view a chronological activity log for pod events
**Plans**: TBD

Plans:
- [ ] 03-01: TBD
- [ ] 03-02: TBD

### Phase 4: Fleet Actions & Deployment
**Goal**: Staff can control pods individually and in bulk, set maintenance mode, and admins can deploy updates across the fleet
**Depends on**: Phase 3
**Requirements**: FLEET-02, FLEET-03, FLEET-04, FLEET-05, FLEET-06, FLEET-07, FLEET-08, FLEET-09
**Success Criteria** (what must be TRUE):
  1. Staff can wake, shutdown, or restart any individual pod from the fleet dashboard
  2. Staff can lockdown/unlock and enable/disable individual pods
  3. Staff can execute bulk actions (wake-all, shutdown-all, restart-all, lockdown-all) affecting the entire fleet
  4. Staff can toggle maintenance mode on a pod and see the mode reflected in the UI
  5. Admin can trigger a rolling deploy, view its progress, and see completion status
**Plans**: TBD

Plans:
- [ ] 04-01: TBD
- [ ] 04-02: TBD

### Phase 5: Billing & Active Sessions
**Goal**: Staff can monitor all active billing sessions in real time and perform core session lifecycle actions
**Depends on**: Phase 2
**Requirements**: BILL-01, BILL-02, BILL-03, BILL-04, BILL-05, BILL-11
**Success Criteria** (what must be TRUE):
  1. Staff can see all active billing sessions with live countdown timers and status
  2. Staff can start a new billing session from the dashboard
  3. Staff can stop, pause, resume, and extend an active billing session
  4. Staff can view the event timeline for any individual session
**Plans**: TBD

Plans:
- [ ] 05-01: TBD
- [ ] 05-02: TBD

### Phase 6: Billing Management
**Goal**: Staff can handle refunds, view reports and history, and admins can manage billing rates
**Depends on**: Phase 5
**Requirements**: BILL-06, BILL-07, BILL-08, BILL-09, BILL-10, BILL-12
**Success Criteria** (what must be TRUE):
  1. Staff can issue a refund for a billing session and view refund history
  2. Staff can view split billing options for a session
  3. Staff can view a daily billing report summarizing revenue and session counts
  4. Staff can search and filter through billing session history
  5. Admin can create, edit, and delete billing rates
**Plans**: TBD

Plans:
- [ ] 06-01: TBD
- [ ] 06-02: TBD

### Phase 7: Drivers & Wallets
**Goal**: Staff can look up any driver, view their full profile, and perform wallet operations
**Depends on**: Phase 2
**Requirements**: DRIV-01, DRIV-02, DRIV-03, DRIV-04, DRIV-05, DRIV-06, DRIV-07, DRIV-08, DRIV-09, DRIV-10
**Success Criteria** (what must be TRUE):
  1. Staff can search for drivers by name and view a paginated driver listing
  2. Staff can open a driver profile showing stats, laps, sessions, and badges
  3. Staff can view a driver's wallet balance and top-up, debit, or refund the wallet
  4. Staff can view the full wallet transaction history for any driver
  5. Admin can configure wallet bonus tiers; staff can view membership status and badge/streak details
**Plans**: TBD

Plans:
- [ ] 07-01: TBD
- [ ] 07-02: TBD

### Phase 8: Events & Championships
**Goal**: Staff can create and manage events, championships, and time trials
**Depends on**: Phase 2
**Requirements**: EVNT-01, EVNT-02, EVNT-03, EVNT-04, EVNT-05, EVNT-06, EVNT-07
**Success Criteria** (what must be TRUE):
  1. Staff can create a new event and edit an existing event
  2. Staff can link racing sessions to events
  3. Staff can create a championship, manage its rounds, and view standings
  4. Staff can create and manage time trials
**Plans**: TBD

Plans:
- [ ] 08-01: TBD
- [ ] 08-02: TBD

### Phase 9: Game Management
**Goal**: Staff can launch, stop, and manage games on pods, and browse available AC content
**Depends on**: Phase 4
**Requirements**: GAME-01, GAME-02, GAME-03, GAME-04, GAME-05, GAME-06, GAME-07
**Success Criteria** (what must be TRUE):
  1. Staff can launch a game on a specific pod and stop or relaunch it
  2. Staff can see which games are currently running across all pods
  3. Staff can view game history showing past sessions
  4. Staff can browse available Assetto Corsa content (cars, tracks) and manage presets
**Plans**: TBD

Plans:
- [ ] 09-01: TBD
- [ ] 09-02: TBD

### Phase 10: Operations & System Health
**Goal**: Staff have visibility into system operations, scheduling, and health across all services
**Depends on**: Phase 2
**Requirements**: OPS-03, OPS-04, OPS-05, OPS-06
**Success Criteria** (what must be TRUE):
  1. Staff can view scheduler status and settings
  2. Staff can view an ops stats dashboard with operational metrics
  3. Staff can view an activity/audit log of system events
  4. Staff can check system health for RaceControl, Gateway, and fleet connectivity
**Plans**: TBD

Plans:
- [ ] 10-01: TBD
- [ ] 10-02: TBD

### Phase 11: Control Room Overview
**Goal**: Staff have a single mission-control view combining fleet, sessions, and health with quick action shortcuts
**Depends on**: Phase 4, Phase 5, Phase 10
**Requirements**: OPS-01, OPS-02, OPS-03 (reference only -- built in Phase 10)
**Success Criteria** (what must be TRUE):
  1. Staff can view a unified control room showing fleet status, active sessions, and system health in one screen
  2. Staff can perform common operations (wake pod, start session, etc.) via quick action buttons without navigating away
  3. The control room auto-refreshes all panels via polling
**Plans**: TBD

Plans:
- [ ] 11-01: TBD
- [ ] 11-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9 -> 10 -> 11

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Authentication & Session Security | 0/TBD | Not started | - |
| 2. Shared Infrastructure | 0/TBD | Not started | - |
| 3. Fleet Monitoring | 0/TBD | Not started | - |
| 4. Fleet Actions & Deployment | 0/TBD | Not started | - |
| 5. Billing & Active Sessions | 0/TBD | Not started | - |
| 6. Billing Management | 0/TBD | Not started | - |
| 7. Drivers & Wallets | 0/TBD | Not started | - |
| 8. Events & Championships | 0/TBD | Not started | - |
| 9. Game Management | 0/TBD | Not started | - |
| 10. Operations & System Health | 0/TBD | Not started | - |
| 11. Control Room Overview | 0/TBD | Not started | - |
