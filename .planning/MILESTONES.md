# Milestones

## v20.0 Admin Dashboard (Shipped: 2026-03-24)

**Phases completed:** 6 phases (159-164), 14 plans

**Key accomplishments:**
- PIN pad authentication with JWT sessions, Edge middleware, protected routes
- Modular API client (6 domain modules), sonner toasts, zod forms, lucide icons
- Real-time fleet health dashboard with pod cards, activity log, SWR polling
- Pod control: wake/shutdown/restart/lockdown, bulk actions, remote exec, deploy UI
- Active billing sessions with live countdown, lifecycle actions, event timeline
- Billing history with filters, refund modal, daily reports, rate management
- 37 pages, 20 API routes, 8 components — full build passes

**Deferred:** AUTH-05 (RBAC gating), Drivers/Wallets, Events, Games, Data Migration, Control Room

---

## v20.1 API Hardening (Shipped: 2026-03-24)

**Phases completed:** 4 phases (176-179), 8 plans

**Key accomplishments:**
- Self-verifying health endpoints for all 3 Next.js apps
- Unified deploy script with build, verify, rollback, audit logging
- Circuit breaker + retry with exponential backoff
- Connection status indicator + SWR graceful degradation
- System Health dashboard + WhatsApp alerting

---

