# Phase 177: Deploy Automation & Verification - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Unified deploy script that builds, packages, uploads, verifies, logs, and auto-rollbacks any of the 3 Next.js apps (admin, kiosk, web). Plus a racecontrol deploy log endpoint for audit trail.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `deploy-staging/deploy-web.ps1` — existing PowerShell deploy script for web dashboard. Kills node, extracts zip, verifies server.js + .next/static, starts on :3200. No health check, no rollback, no logging.
- `deploy-staging/deploy-kiosk-server.ps1` — similar for kiosk on :3300.
- `racecontrol/crates/racecontrol/src/deploy.rs` — Rust deploy executor for rc-agent binaries. Has self-swap pattern, rollback with rc-agent-prev.exe, verify delays. Could be reference for rollback pattern.
- Phase 176 health endpoints: admin (:3200/api/health), kiosk (:3300/api/health), web (:3200/api/health) — all return 200/503 with page manifest.

### Established Patterns
- Server: 192.168.31.23, user ADMIN
- Deploy scripts live in `C:/Users/bono/racingpoint/deploy-staging/`
- Apps run as background node processes, started by schtasks or Start-Process
- Kiosk at :3300, web dashboard at :3200, admin at :3200 (separate Next.js instances)
- Standing rule: smallest reversible fix first, have rollback plan before deploying
- Standing rule: .bat files need clean ASCII + CRLF, no parentheses in if/else
- SSH to server: `ssh ADMIN@192.168.31.23`, schtasks for persistent starts

### Integration Points
- Racecontrol API at :8080 — needs new deploy log endpoint (POST /api/v1/deploy-log)
- Health endpoints from Phase 176 used for post-deploy verification
- Deploy script runs from James machine (.27), deploys to server (.23)
- Git Bash on James — use bash scripts, not PowerShell (Write JSON to file, curl -d @file)

</code_context>

<specifics>
## Specific Ideas

No specific requirements — infrastructure phase.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>
