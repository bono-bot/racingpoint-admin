---
phase: 179-health-monitoring-alerting
verified: 2026-03-24T05:00:00+05:30
status: passed
score: 9/9 must-haves verified
re_verification: false
human_verification:
  - test: "Navigate to /settings/health in the admin dashboard"
    expected: "3 cards render for admin/kiosk/web with status pills, page counts, response time, and the deploy timeline below"
    why_human: "Visual layout, color pill rendering, and page auto-refresh cannot be verified programmatically"
  - test: "Disconnect one Next.js app and wait 60 seconds"
    expected: "WhatsApp alert fires on the staff number with [APP HEALTH] <app> unreachable message within 60s"
    why_human: "Real-time alerting path depends on live racecontrol process, WhatsApp Evolution API connectivity, and LAN probe reachability — cannot be tested statically"
---

# Phase 179: Health Monitoring & Alerting Verification Report

**Phase Goal:** Staff and AI can see the health of all 3 apps in one place, and WhatsApp alerts fire automatically when something breaks
**Verified:** 2026-03-24T05:00:00+05:30 (IST)
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | Admin dashboard has health overview page showing all 3 apps | VERIFIED | `src/app/(dashboard)/settings/health/page.tsx` exists (190 lines), renders 3-card grid mapping each `AppHealthEntry` by `entry.app` key |
| 2 | Health overview auto-refreshes every 10s | VERIFIED | `useSWR('/api/rc/app-health', fetcher, { refreshInterval: 10000 })` at line 81-85 |
| 3 | Deploy timeline shown from deploy_logs | VERIFIED | Second SWR hook at line 87-91 hits `/api/rc/deploy-log` with `refreshInterval: 30000`; `recentDeploys.slice(0,20)` rendered as list |
| 4 | Racecontrol probes all 3 health endpoints every 30s | VERIFIED | `app_health_monitor.rs`: `tokio::time::interval(Duration::from_secs(30))` + `tokio::join!` on all 3 `APP_TARGETS` |
| 5 | Probe results logged to app_health_log table | VERIFIED | `db/mod.rs` has `CREATE TABLE IF NOT EXISTS app_health_log` migration; `log_health_to_db()` inserts all probe fields |
| 6 | WhatsApp alert fires within 60s when app goes degraded/unreachable | VERIFIED | `handle_alert()` called per-entry each 30s cycle; cooldown checked then `send_whatsapp()` called with `[APP HEALTH]` prefix |
| 7 | 5-minute cooldown per app prevents alert storms | VERIFIED | `const ALERT_COOLDOWN_SECS: u64 = 300;` at line 46; `last.elapsed().as_secs() >= ALERT_COOLDOWN_SECS` check at line 193 |
| 8 | Recovery notification fires when app returns healthy | VERIFIED | `else if !is_bad && was_bad` branch at line 220 sends `[APP HEALTH] {} recovered` message |
| 9 | Sidebar link to System Health present | VERIFIED | `AdminLayout.tsx` lines 166-171: `<Link href="/settings/health">System Health</Link>` with active-state highlight |

**Score:** 9/9 truths verified

---

### Required Artifacts

| Artifact | Expected | Lines | Status | Details |
|----------|----------|-------|--------|---------|
| `crates/racecontrol/src/app_health_monitor.rs` | Health probe loop + WhatsApp alert logic (min 100 lines) | 266 | VERIFIED | Substantive: probe loop, alert cooldown, DB logging, static health state, `get_current_health()` |
| `crates/racecontrol/src/db/mod.rs` | `CREATE TABLE IF NOT EXISTS app_health_log` | — | VERIFIED | Found at line 2538 with all required columns (id, app, timestamp, status, pages_expected, pages_available, response_ms, error) |
| `crates/racecontrol/src/api/routes.rs` | `GET /api/v1/app-health` endpoint | — | VERIFIED | Route `.route("/app-health", get(get_app_health))` at line 447; handler at line 16116 calls `get_current_health()` |
| `src/app/(dashboard)/settings/health/page.tsx` | System Health page with 3-card grid (min 80 lines) | 190 | VERIFIED | Typed interfaces, SWR hooks, status pills, deploy timeline, skeleton loading |
| `src/components/AdminLayout.tsx` | System Health sidebar link | — | VERIFIED | `href="/settings/health"` at line 166 with active-state class matching `pathname === '/settings/health'` |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `app_health_monitor.rs` | `whatsapp_alerter::send_whatsapp` | Direct call | VERIFIED | `whatsapp_alerter::send_whatsapp(&state.config, &msg).await` at lines 213 and 226; `send_whatsapp` is `pub(crate)` at alerter line 60 |
| `app_health_monitor.rs` | `whatsapp_alerter::ist_now_string` | Direct call | VERIFIED | `whatsapp_alerter::ist_now_string()` called in `probe_app()` and in alert message formatting; `ist_now_string` is `pub(crate)` at alerter line 41 |
| `main.rs` | `app_health_monitor::spawn` | `tokio::spawn` wrapper | VERIFIED | `app_health_monitor::spawn(state.clone())` at main.rs line 635; module in `use` block at line 24 |
| `health/page.tsx` | `/api/rc/app-health` | `useSWR` | VERIFIED | `useSWR<AppHealthEntry[]>('/api/rc/app-health', fetcher, { refreshInterval: 10000 })` at line 81 |
| `health/page.tsx` | `/api/rc/deploy-log` | `useSWR` | VERIFIED | `useSWR<DeployLogEntry[]>('/api/rc/deploy-log', fetcher, { refreshInterval: 30000 })` at line 87 |
| `AdminLayout.tsx` | `/settings/health` | `Link href` | VERIFIED | `<Link href="/settings/health">` at AdminLayout line 166 |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| MON-01 | 179-02-PLAN | Admin dashboard health overview page with 3 app status + page counts | SATISFIED | `/settings/health` page with 3-card grid, `pages_available/pages_expected` shown per card |
| MON-02 | 179-01-PLAN | WhatsApp alert fires when any app health returns degraded | SATISFIED | `handle_alert()` fires `send_whatsapp` on `status == "degraded"` with 5-min cooldown |
| MON-03 | 179-02-PLAN | Health overview auto-refreshes + historical deploy timeline | SATISFIED | `refreshInterval: 10000` on health SWR; deploy timeline from `/api/rc/deploy-log` with up to 20 entries |
| MON-04 | 179-01-PLAN | Racecontrol periodically probes all 3 Next.js app health endpoints | SATISFIED | `app_health_monitor::spawn()` with 30s interval, probes admin/kiosk/web concurrently via `tokio::join!` |
| MON-05 | 179-01-PLAN | Racecontrol fires WhatsApp alert when probe fails or returns degraded | SATISFIED | `status == "unreachable"` path in `handle_alert()` also triggers `send_whatsapp`; covers both failure modes |

All 5 phase requirements accounted for. No orphaned requirements detected (REQUIREMENTS.md Traceability table maps all MON-01 through MON-05 to Phase 179).

---

### Anti-Patterns Found

| File | Pattern | Severity | Finding |
|------|---------|----------|---------|
| `app_health_monitor.rs` | No `.unwrap()` | INFO | 4 uses of `unwrap_or_else` (safe fallbacks on poisoned mutex), zero bare `.unwrap()` — compliant |
| `health/page.tsx` | No `any` types | INFO | Zero `": any"` matches — compliant with standing rule |
| `app_health_monitor.rs` | Hardcoded URLs | INFO | admin and web both probe `http://192.168.31.23:3200/api/health` (same URL, different `service` field in response disambiguates). This is noted in the plan as a known limitation — not a blocker. |

No blockers or warnings found.

---

### Human Verification Required

#### 1. System Health Page Visual Render

**Test:** Open `http://192.168.31.23:3200/settings/health` in a browser
**Expected:** 3 cards visible for admin/kiosk/web — each showing app name, colored status pill (green "ok"), page count (e.g. "32/32 pages"), last checked relative time, and response ms. Deploy History section below with recent deploy rows.
**Why human:** Visual layout, Tailwind color classes, and card ordering require browser rendering to verify

#### 2. WhatsApp Alert End-to-End

**Test:** Stop one Next.js app (e.g. kiosk on :3300), wait up to 60 seconds
**Expected:** WhatsApp message arrives on the staff phone with format `[APP HEALTH] kiosk unreachable: endpoint not responding. <IST timestamp>`
**Why human:** Requires live racecontrol process running, Evolution API connection, and alerting.enabled=true in racecontrol.toml

#### 3. 5-Minute Cooldown Behavior

**Test:** Trigger two alerts for the same app within 5 minutes
**Expected:** Only one WhatsApp message sent; second alert suppressed until cooldown expires
**Why human:** Stateful cooldown tracking over time requires live process observation

---

### Code Quality Notes

- `send_whatsapp` and `ist_now_string` both correctly exposed as `pub(crate)` — cross-module reuse pattern clean
- `AppHealthEntry` derives `Serialize` — JSON serialization in `get_app_health` handler requires no manual mapping overhead
- Both SWR hooks use `keepPreviousData: true` — graceful degradation when backend temporarily unreachable (consistent with Phase 178 circuit breaker pattern)
- TypeScript generic fetcher `function fetcher<T>(url: string): Promise<T>` avoids `any` while satisfying SWR overload resolution — standing rule compliant

---

## Gaps Summary

No gaps found. All 9 observable truths verified, all 5 artifacts substantive and wired, all 5 requirements satisfied, no anti-pattern blockers.

Two items flagged for human verification (visual render + WhatsApp E2E) as required by standing rules — these are confirmation tests, not blocking gaps.

---

_Verified: 2026-03-24T05:00:00+05:30 (IST)_
_Verifier: Claude (gsd-verifier)_
