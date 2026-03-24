# Phase 179: Health Monitoring & Alerting - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Admin dashboard health overview page + racecontrol health probe task + WhatsApp alerting on degradation. Staff and AI see all 3 apps' health in one place.

</domain>

<decisions>
## Implementation Decisions

### Health Overview Page
- Located under Settings section as "System Health" in sidebar
- 3-card grid layout (admin/kiosk/web), each card showing: status pill (green/yellow/red), page count (expected vs available), last deploy timestamp
- Deploy timeline below cards — simple list from deploy_logs table: timestamp, app, result, page count delta
- Auto-refreshes via SWR polling (reuse existing pattern)

### Racecontrol Health Probes
- 30-second probe interval (matches cloud sync interval, within 60s alert SLA)
- New `app_health_monitor` spawned tokio task — parallel to existing scheduler/pod_monitor
- Probes all 3 health endpoints: admin :3200/api/health, kiosk :3300/api/health, web :3200/api/health
- Logs results to a new `app_health_log` table (timestamp, app, status, pages_expected, pages_available)

### WhatsApp Alerting
- 5-minute cooldown between alerts for the same app (prevent storms during extended outages)
- Alert fires when any app returns degraded OR becomes unreachable
- Uses existing WhatsApp alerter infrastructure in racecontrol
- Alert message: "[APP] health degraded: N/M pages missing" or "[APP] unreachable"

### Claude's Discretion
- Health page route path within settings
- Card styling details
- Log retention policy for app_health_log
- Whether to show probe history on the health page

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- Phase 176 health endpoints: admin/kiosk/web all return `{status, service, version, deploy: {pages_expected, pages_available, pages_missing, healthy}}`
- Phase 177 deploy_logs table + POST/GET /api/v1/deploy-log endpoints
- Racecontrol WhatsApp alerter (existing infrastructure for email/WhatsApp notifications)
- SWR polling pattern used throughout admin dashboard
- Existing racecontrol spawned tasks: scheduler, pod_monitor, cloud_sync

### Established Patterns
- Admin pages in `src/app/(dashboard)/` with Tailwind styling
- API proxy at `/api/rc/[...path]/route.ts` for racecontrol calls
- SWR with auto-refresh intervals for live data
- Racecontrol spawned tasks use `tokio::spawn` with loop + sleep

### Integration Points
- New admin page: `src/app/(dashboard)/settings/health/page.tsx`
- New racecontrol module: `crates/racecontrol/src/app_health_monitor.rs`
- WhatsApp alerter integration in racecontrol
- Deploy log GET endpoint for timeline data
- Sidebar nav update to add System Health link

</code_context>

<specifics>
## Specific Ideas

No specific requirements beyond what's decided above.

</specifics>

<deferred>
## Deferred Ideas

- Probe history visualization (charts showing uptime over time)
- Email alerts in addition to WhatsApp
- Health probe for Gateway :3100

</deferred>
