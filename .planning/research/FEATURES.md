# Feature Landscape

**Domain:** Sim racing venue operations admin dashboard
**Researched:** 2026-03-22
**Confidence:** HIGH (based on existing PROJECT.md requirements, competitive analysis, and domain research)

## Table Stakes

Features staff/admin expect from an operations dashboard. Missing any of these means the dashboard feels incomplete and staff fall back to direct API calls or manual processes.

### Authentication & Access Control

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Admin login via RaceControl auth | Every operations tool requires auth; currently open on LAN which is a security gap | Low | RC already has `/auth/admin-login` -- just integrate it |
| Session persistence (JWT/cookie) | Staff should not re-login on every page refresh | Low | Store token in httpOnly cookie or localStorage with refresh |
| Protected routes with redirect | Standard web app pattern; unauthenticated users must not see ops data | Low | Next.js middleware handles this cleanly |
| Role-based access (admin vs staff) | Prevent staff from accessing destructive actions (fleet shutdown, refunds, finance) | Medium | RC likely already has role info in the token -- verify |

### Real-Time Fleet / Pod Control

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Fleet health overview (all 8 pods) | Core value prop -- sim racing VMS competitors (SimRacing VMS, Multitap, GGLeap) all have this | Medium | Poll RC fleet endpoints, show status/version/uptime grid |
| Individual pod actions (wake/shutdown/restart) | Staff need to troubleshoot individual pods without SSH | Low | Thin UI over existing RC API endpoints |
| Bulk fleet actions (wake-all, shutdown-all) | Common pattern in fleet dashboards; saves time during open/close | Low | Single button calling bulk RC endpoints |
| Pod status indicators (online/offline/in-session/maintenance) | Visual at-a-glance status is table stakes for any fleet management | Low | Color-coded cards or grid |
| Pod maintenance mode toggle | Take pod out of rotation for repairs without shutting down | Low | RC already supports this |

### Billing & Session Management

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Active sessions list with real-time status | Staff must see who is racing, on which pod, time remaining | Medium | Poll billing endpoints, auto-refresh |
| Start/stop billing from dashboard | Core revenue operation; cannot require CLI or kiosk-only | Low | API calls to RC billing endpoints |
| Pause/resume sessions | Customer asks for break, staff needs one-click action | Low | RC supports this |
| Extend active sessions | Very common request; "can I get 10 more minutes?" | Low | Simple duration extension API call |
| Session event timeline | Debugging disputes ("I was paused for 5 minutes, why charged?") | Medium | Display billing events chronologically |
| Daily billing report | End-of-day revenue reconciliation is basic ops | Medium | Aggregate from billing history |
| Refund management | Must handle customer complaints; audit trail required | Medium | Issue refunds + view refund history |

### Driver & Customer Management

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Driver listing with search | Staff need to look up customers quickly (phone, name) | Low | Already have customers page -- extend with RC driver data |
| Driver profiles (stats, laps, sessions) | Staff answering "what was my best lap?" or looking up history | Medium | Aggregate from RC driver endpoints |
| Wallet balance view and top-up | Wallet is a revenue channel; staff must manage it | Medium | RC wallet endpoints |
| Wallet transaction history | Debugging "where did my balance go?" | Low | List from RC wallet history |

### Event & Competition Management

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Event creation and management | Tournaments page exists but events are separate concept in RC | Medium | CRUD over RC events API |
| Tournament management (existing, enhance) | Already built; may need auth integration | Low | Existing page, minor updates |
| Championship creation with rounds/standings | SimRacing VMS and Multitap both have this; expected for serious venues | High | Multi-step wizard, standings calculation |
| Time trial management | Common engagement feature; leaderboard already exists | Medium | CRUD + link to leaderboard |

### Game Management

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Launch games on pods | Core operation -- start a race on a specific pod | Medium | RC game launch API; need car/track/preset selection |
| Stop/relaunch games | Recovery from crashes or session changes | Low | Simple API calls |
| Active games overview | Which pod is running which game/track/car | Low | Poll RC active games |
| AC content browser (cars, tracks, presets) | Staff need to see available content for customer requests | Medium | Browseable list from RC content endpoints |

### Control Room / Mission Control

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Combined overview: fleet + sessions + health | The "home screen" that staff look at all day | High | Composite dashboard pulling from multiple API domains |
| Quick action buttons | Common tasks (wake all, start session, check in driver) accessible in 1 click | Medium | Action bar/palette on overview page |
| System health indicators (RC, Gateway, fleet) | Staff need to know if backend services are up | Low | Health check polling, already partially built |

### Data Migration (SQLite to RaceControl)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Migrate cafe/menu data to RC | Eliminates dual-database complexity; single source of truth | High | Write migration script, update all cafe pages to use RC API |
| Migrate inventory data to RC | Same rationale | High | Depends on RC having inventory endpoints |
| Migrate HR/employee data to RC | Same rationale | High | Depends on RC having employee endpoints |
| Migrate finance data to RC | Same rationale | High | Depends on RC having finance endpoints |
| Remove SQLite dependency | End state; no more local DB | Low | Delete db.ts and related code after migration verified |

## Differentiators

Features that set Racing Point apart from venues using off-the-shelf VMS. Not expected by staff, but create operational excellence.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| AI-powered ops assistant (chat) | Already built; unique to Racing Point. Staff ask natural language questions about operations | Already exists | Enhance with auth context so AI knows who is asking |
| Receipt/bank statement OCR scanning | Automates finance data entry; no competitor VMS has this | Already exists | Already built with Groq/Ollama |
| Integrated cafe + racing ops | Single dashboard for both business lines; competitors are racing-only | Already exists | Unique hybrid venue advantage |
| Keyboard shortcut / command palette | Power users (Uday, experienced staff) can navigate and act faster | Medium | Cmd+K style palette with common actions |
| Bulk session operations | Start/extend/stop multiple sessions at once (group bookings) | Medium | Useful for events and group visits |
| Pod performance analytics | Historical uptime, crash frequency, maintenance trends per pod | Medium | Aggregate from pod activity logs over time |
| Driver engagement automation | "You've been beaten" notifications, streak alerts (Multitap has this) | High | Requires notification infrastructure; defer to later |
| Audit trail / activity log | Who did what, when; compliance and dispute resolution | Medium | Log all admin actions with user + timestamp |
| Offline-capable critical actions | Network issues should not prevent billing stop or pod shutdown | High | Service worker + queue; complex but valuable for reliability |

## Anti-Features

Features to explicitly NOT build in the admin dashboard.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Customer-facing booking flow | Mixing staff and customer UX creates confusion; different mental models | Keep in kiosk (:3300) and web dashboard (:3200) |
| Customer self-registration | Customers should use kiosk or web app, not ask staff to register them via admin | Kiosk handles this with waiver flow |
| WhatsApp/Discord bot management | Separate concern with its own deploy cycle; admin dashboard should not become a god-app | Keep as separate projects (racingpoint-whatsapp-bot, discord) |
| Camera/NVR management | Already built as rc-sentry-ai with dedicated dashboard | Keep camera dashboard separate (:8096/cameras/live) |
| Mobile-native app | Web-first responsive design is sufficient for staff tablets/phones; native app adds build complexity for no gain | Use responsive CSS; PWA if needed later |
| Complex reporting/BI | Building pivot tables and custom report builders is a rabbit hole | Export data to CSV; use external tools for deep analysis |
| Multi-venue/multi-location support | Racing Point is one venue; multi-tenant adds massive complexity | If expansion happens, fork or add later; do not architect for it now |
| Custom theme/white-labeling | No external customers use this dashboard; only Racing Point staff | Hardcode Racing Point branding |
| Payment gateway integration | Payments happen at kiosk or counter via Razorpay/UPI; admin just views transactions | Keep payment processing in kiosk/web dashboard |
| Inventory auto-ordering | Predictive purchasing based on stock levels sounds nice but requires supplier integrations and trust calibration | Manual reorder alerts with threshold warnings are sufficient |

## Feature Dependencies

```
Authentication ─────────────┬──> Protected Routes ──> All other features
                            └──> Role-based access ──> Destructive actions (refunds, pod shutdown, fleet ops)

Fleet Health Overview ──────┬──> Pod Actions (wake/shutdown/restart)
                            ├──> Bulk Fleet Actions
                            ├──> Pod Maintenance Mode
                            └──> Game Launch (requires knowing pod status)

Driver Listing ─────────────┬──> Driver Profiles
                            ├──> Wallet Management
                            └──> Session History (per driver)

Billing Sessions ───────────┬──> Start/Stop/Pause/Resume
                            ├──> Extend Session
                            ├──> Refund Management
                            └──> Daily Billing Report

Game Launch ────────────────┬──> AC Content Browser (need to pick car/track)
                            └──> Active Games Overview

Events ─────────────────────┬──> Championships (events are building blocks)
                            └──> Time Trials

Data Migration ─────────────┬──> Menu migration (independent)
(can be parallelized)       ├──> Inventory migration (independent)
                            ├──> HR migration (independent, depends on RC endpoints existing)
                            ├──> Finance migration (independent, depends on RC endpoints existing)
                            └──> Remove SQLite (depends on ALL migrations complete)

Control Room Overview ──────┬──> Fleet Health (component)
(composite, build last)     ├──> Active Sessions (component)
                            ├──> System Health (component)
                            └──> Quick Actions (component)
```

## MVP Recommendation

**Phase 1: Authentication (foundation for everything)**
1. Admin login via RC auth
2. Session persistence
3. Protected routes
4. Role-based access

**Phase 2: Fleet + Billing (core daily operations)**
5. Fleet health overview with pod status
6. Pod actions (wake/shutdown/restart/maintenance)
7. Active billing sessions with start/stop/pause/extend
8. Refund management

**Phase 3: Drivers + Games (customer-facing ops)**
9. Driver profiles with search
10. Wallet management (view/top-up/history)
11. Game launch and management
12. AC content browser

**Phase 4: Events + Scheduling**
13. Event creation and management
14. Championship management
15. Time trial management
16. Scheduler status and ops stats

**Phase 5: Control Room + Migration**
17. Mission control overview (composite of fleet + sessions + health)
18. Quick actions and command palette
19. Data migration (SQLite to RC) -- only if RC endpoints exist
20. Audit trail

**Defer:**
- Driver engagement automation: requires notification infrastructure not yet built
- Offline-capable actions: high complexity, low frequency of network failures on LAN
- Pod performance analytics: nice but not blocking daily operations

## Sources

- [SimRacing VMS V5.0 Features](https://www.simracing.co.uk/features.html) -- comprehensive sim racing venue management feature set
- [Multitap Sim Racing Center Software](https://multitap.space/) -- competitor with marketing automation and Discord integration
- [GGLeap Esports Venue Management](https://www.ggcircuit.com/ggleap) -- esports-focused venue management
- [SENET Cyber Cafe Management](https://senet.cloud/en/) -- esports venue management with fleet/PC control
- [Fleet Management Dashboard Best Practices (PCS Software)](https://pcssoft.com/blog/fleet-management-dashboard/) -- fleet dashboard UX patterns
- [12 Essential Dashboards for Tour & Attraction Operators (RocketRez)](https://www.rocketrez.com/blog/essential-dashboards-tour-attraction-growth) -- entertainment venue dashboard patterns
- [AI in Venue Management 2025 (Prism.fm)](https://prism.fm/blog/events/how-ai-is-changing-venue-management-in-2025/) -- emerging trends
- Racing Point PROJECT.md and INTEGRATIONS.md -- existing system analysis
