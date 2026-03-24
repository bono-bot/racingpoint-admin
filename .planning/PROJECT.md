# Racing Point Admin Dashboard

## What This Is

A unified operations dashboard for Racing Point eSports & Cafe that integrates with the full RaceControl API surface (~200+ routes). It serves as the staff/admin management interface — complementing (not replacing) the customer-facing kiosk and web dashboard. Built on Next.js 16 with TypeScript, it provides a mission-control overview for daily ops plus drill-down back-office views for every operational domain.

## Core Value

Staff can manage every aspect of Racing Point operations — pods, billing, drivers, events, cafe, HR, finance — from a single authenticated dashboard without needing direct API access or multiple tools.

## Requirements

### Validated

- Menu management (CRUD) — existing, SQLite
- Inventory tracking with stock movements — existing, SQLite
- Sales and purchase management — existing, SQLite
- Employee management, attendance, leaves — existing, SQLite
- Finance/bank transactions — existing, SQLite
- Hiring/candidate management — existing, via hiring bot
- Bookings view — existing, via Gateway
- Customer listing — existing, via Gateway
- Tournament management — existing, via RC
- Coupon management — existing, via RC
- Pricing rules management — existing, via RC
- Package management — existing, via RC
- Kiosk settings/experiences — existing, via RC
- Waiver management — existing, via RC
- Leaderboard view — existing, via RC
- Session history — existing, via RC
- Analytics/overview dashboard — existing
- Calendar integration — existing, via Gateway
- AI chat interface — existing, via RC
- Audio/video transcription — existing, via Gateway

### Active

**Authentication & Authorization**
- [ ] Admin login via RaceControl `/auth/admin-login`
- [ ] Role-based access control (admin vs staff)
- [ ] Session persistence across browser refresh
- [ ] Protected routes — redirect unauthenticated users

**Pod & Fleet Control**
- [ ] Real-time fleet health dashboard (all 8 pods status, version, uptime)
- [ ] Pod actions: wake, shutdown, restart, lockdown, enable/disable, screen control
- [ ] Bulk fleet actions: wake-all, shutdown-all, restart-all, lockdown-all
- [ ] Pod maintenance mode (set/clear)
- [ ] Remote exec on individual pods
- [ ] Rolling deploy to fleet
- [ ] Deploy status tracking
- [ ] Pod activity log

**Billing & Sessions**
- [ ] Active billing sessions with real-time status
- [ ] Start/stop billing from dashboard
- [ ] Pause/resume billing sessions
- [ ] Extend active sessions
- [ ] Refund management (issue and view refunds)
- [ ] Split billing options
- [ ] Daily billing report
- [ ] Session event timeline (per session)
- [ ] Billing rates management

**Drivers & Wallets**
- [ ] Driver listing with search and profiles
- [ ] Full driver profiles (stats, laps, sessions, badges)
- [ ] Wallet management: view balance, top-up, debit, refund
- [ ] Wallet transaction history per driver
- [ ] Wallet bonus tiers configuration
- [ ] Membership management (view/subscribe)
- [ ] Badge system view (psychology badges, streaks)

**Events & Championships**
- [ ] Event creation and management
- [ ] Link sessions to events
- [ ] Championship creation and management
- [ ] Championship rounds and standings
- [ ] Time trial management

**Game Management**
- [ ] Launch games on pods
- [ ] Stop/relaunch games
- [ ] Active games overview
- [ ] Game history
- [ ] AC content browser (cars, tracks, presets)

**Scheduling & Operations**
- [ ] Scheduler status, settings, analytics
- [ ] Ops stats dashboard
- [ ] Activity log / audit trail
- [ ] System health monitoring (RC + Gateway + fleet)

**Data Migration**
- [ ] Migrate cafe/menu data from local SQLite to RaceControl API
- [ ] Migrate inventory data to RaceControl
- [ ] Migrate HR/employee data to RaceControl
- [ ] Migrate finance/accounting data to RaceControl
- [ ] Remove local SQLite dependency after migration

**Control Room Overview**
- [ ] Real-time mission control: fleet status + active sessions + system health
- [ ] Quick action buttons for common operations
- [ ] Alert/notification system for incidents

### Out of Scope

- Customer-facing features (booking flow, customer login, customer app) — handled by kiosk and web dashboard
- WhatsApp bot management — separate racingpoint-whatsapp-bot project
- Discord bot management — separate racingpoint-discord-bot project
- Camera/NVR management — handled by rc-sentry-ai / camera dashboard
- Comms-link (James/Bono AI coordination) — separate infrastructure
- Cloud platform management — handled by cloud racecontrol on Bono VPS
- Mobile app — web-first, responsive design sufficient for now
- Customer self-service features (profiles, friends, game requests) — kiosk handles these

## Context

- Racing Point eSports is a sim racing venue with 8 racing pods, a cafe, and staff
- RaceControl is the Rust/Axum backend (port 8080) managing all racing operations
- Gateway (port 3100) handles AI services, bookings, customers, calendar
- The admin dashboard (this project) is a Next.js 16 app currently at ~27 pages
- Existing pages are functional but only cover ~30% of RaceControl's API surface
- Business data (cafe, HR, finance) currently in local SQLite — planned migration to RC
- No user auth currently — dashboard is open on the local network
- Server runs at 192.168.31.23, pods at .28-.91, James (AI) at .27
- Boss (Uday) wants full automation so he can focus on his daughter

## Constraints

- **Tech stack**: Next.js 16 + TypeScript + Tailwind CSS 4 — keep existing stack, no framework changes
- **Backend**: All new features must use RaceControl API — no new local SQLite tables
- **Network**: Dashboard runs on local network (192.168.31.x), RaceControl at :8080, Gateway at :3100
- **Compatibility**: Must work alongside existing kiosk (:3300) and web dashboard (:3200) without conflicts
- **Auth**: Use RaceControl's existing admin auth system, not a separate auth provider
- **Real-time**: Polling-based updates (existing pattern), no WebSocket requirement for v1
- **Deployment**: Standalone Next.js build, deployable via Docker or direct Node.js

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Complement kiosk/web dashboard, not replace | Each app serves different audience (staff vs customers vs public) | -- Pending |
| Admin login via RC auth | Leverage existing auth system, no new auth infrastructure needed | -- Pending |
| Migrate SQLite data to RaceControl | Single source of truth, eliminates dual-database complexity | -- Pending |
| Control room + back office hybrid UX | Daily ops need real-time overview; management needs CRUD depth | -- Pending |
| Keep polling for real-time updates | Matches existing codebase pattern, avoids WebSocket complexity in v1 | -- Pending |
| Self-verifying health endpoints | Stale deploys caused 404s on 24/33 pages across 3 apps — health must report missing routes | ✓ Good — v20.1 |
| Unified deploy script | Manual 3-step Next.js standalone deploy keeps being done wrong — automate with verification | ✓ Good — v20.1 |
| Circuit breaker + graceful degradation | Backend outages crashed all pages — need cached data fallback | ✓ Good — v20.1 |
| Health monitoring dashboard | No single view of all app health — staff discover issues from customers | ✓ Good — v20.1 |

## Shipped: v20.1 API Hardening (2026-03-24)

**Delivered:** Self-verifying health endpoints (all 3 apps), unified deploy script with rollback, circuit breaker + retry, connection status indicator, System Health dashboard, WhatsApp alerting on degradation.

**4 phases, 8 plans, 16 requirements — all satisfied.**

See `.planning/milestones/v20.1-ROADMAP.md` for full details.

---
*Last updated: 2026-03-24 after v20.1 API Hardening milestone shipped*
