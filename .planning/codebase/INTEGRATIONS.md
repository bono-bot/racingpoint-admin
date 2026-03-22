# External Integrations

**Analysis Date:** 2026-03-22

## APIs & External Services

**Gateway (AI/Transcription/Ollama):**
- Groq Whisper Audio/Video Transcription - Converts audio/video to text
  - SDK/Client: Native fetch (multipart FormData)
  - Auth: `x-api-key` header with `GATEWAY_API_KEY`
  - Used in: `src/lib/api.ts` (api.transcribe), `src/app/api/scan/receipt/route.ts`, `src/app/api/scan/bank-statement/route.ts`
  - Endpoint: `{GATEWAY_URL}/api/transcribe`

- Ollama Chat (LLM) - Structured data extraction from OCR/images
  - SDK/Client: Native fetch
  - Auth: `x-api-key` header
  - Used in: Receipt and bank statement scanning for JSON extraction
  - Endpoint: `{GATEWAY_URL}/api/ollama/chat`

- Bookings API - Retrieve customer booking data
  - SDK/Client: Native fetch via `apiFetch()`
  - Auth: `x-api-key` header
  - Used in: Analytics, dashboard
  - Endpoint: `{GATEWAY_URL}/api/bookings`

- Customers API - Retrieve customer data
  - SDK/Client: Native fetch via `apiFetch()`
  - Auth: `x-api-key` header
  - Endpoint: `{GATEWAY_URL}/api/customers`

- Calendar API - Fetch calendar events
  - SDK/Client: Native fetch
  - Auth: `x-api-key` header
  - Used in: `src/app/api/calendar/route.ts`
  - Endpoint: `{GATEWAY_URL}/api/calendar`

- Health Check - Monitor gateway availability
  - SDK/Client: Native fetch
  - Auth: `x-api-key` header
  - Used in: `src/app/api/health/route.ts`, dashboard status
  - Endpoint: `{GATEWAY_URL}/api/health`

**RaceControl Core:**
- Marketing APIs (coupons, pricing, packages) - Manage promotions and packages
  - SDK/Client: Via `rcFetch()` proxy to `/api/rc/*`
  - Auth: Proxied through Next.js middleware
  - Used in: `src/lib/api.ts` (getCoupons, createCoupon, getPricingRules, getPackages)
  - Endpoint: `{RC_URL}/api/v1/*`

- Tournaments API - Manage racing tournaments
  - SDK/Client: Via `rcFetch()` proxy
  - Used in: Tournament creation, bracket generation, match recording
  - Endpoints: `{RC_URL}/api/v1/tournaments/*`

- Time Trials API - Manage timed racing events
  - SDK/Client: Via `rcFetch()` proxy
  - Used in: Time trial creation and retrieval
  - Endpoints: `{RC_URL}/api/v1/time-trials`

- Pods API - Control racing pod display screens
  - SDK/Client: Via `rcFetch()` proxy
  - Used in: Pod management, screen blanking
  - Endpoints: `{RC_URL}/api/v1/pods/*`

- Kiosk API - Self-service kiosk experience management
  - SDK/Client: Via `rcFetch()` proxy
  - Used in: Kiosk settings, experience creation/updates
  - Endpoints: `{RC_URL}/api/v1/kiosk/*`

- Waivers API - Driver waiver management
  - SDK/Client: Direct fetch to `{RACECONTROL_URL}/api/v1/waivers`
  - Used in: `src/app/api/waivers/route.ts`, `src/app/api/waivers/[driverId]/signature/route.ts`
  - Endpoints: Waiver checks, retrieval, signature validation

- AI Chat - Conversational AI interface
  - SDK/Client: Via `rcFetch()` proxy to `/ai/chat`
  - Used in: Chat page for user interactions
  - Endpoint: Proxied through `/api/rc/ai/chat`

**Hiring Bot:**
- Candidate Management - Retrieve job applicants
  - SDK/Client: Native fetch
  - Auth: None (local service)
  - Used in: `src/app/api/hr/hiring/route.ts`
  - Endpoint: `http://localhost:3050/api/candidates`

## Data Storage

**Databases:**
- SQLite (better-sqlite3) - Local embedded database
  - Location: `data/admin.db` (created on first run if missing)
  - Client: better-sqlite3 v12.6.2
  - Mode: WAL (Write-Ahead Logging) for concurrent access
  - Foreign keys: Enabled
  - Initialization: Auto-init on first connection in `src/lib/db.ts`

**Tables:**
- `menu_items` - Cafe menu products with pricing
- `inventory` - Inventory tracking with stock levels and thresholds
- `stock_movements` - Inventory change log (in/out/adjustments)
- `purchases` - Vendor purchases and expenses
- `purchase_items` - Line items for purchases
- `sales` - Customer sales/bills
- `sale_items` - Line items for sales
- `employees` - Staff information with auth (PIN hash)
- `attendance` - Employee check-in/check-out with GPS
- `leave_requests` - Leave applications with approval workflow
- `leave_balances` - Employee leave entitlements
- `bank_transactions` - Bank statement entries with matching to purchases/sales

**File Storage:**
- Local filesystem only - No cloud storage integration
- Receipt/bank statement images: Temporary (processed via OCR, not persisted)

**Caching:**
- None - No Redis or memcached configured
- SWR (client-side): In-memory cache for API requests (revalidation on window focus)

## Authentication & Identity

**Auth Provider:**
- Custom API Key authentication (development)
  - Implementation: `x-api-key` header validation
  - Used for: Gateway, RaceControl, Hiring Bot APIs
  - Default: `rp-gateway-2026-secure-key` (development only)

- Employee PIN-based auth (internal)
  - Implementation: PIN hash stored in `employees.pin_hash` (SQLite)
  - Used for: Employee attendance check-in
  - Storage: bcrypt/argon2 hashes (not plaintext)

**No OAuth/OIDC configured**

## Monitoring & Observability

**Error Tracking:**
- None detected - Standard error logging only

**Logs:**
- Browser console (frontend)
- Server logs (Next.js stdout/stderr)
- Application logs: Custom error handling with try/catch and error messages

**Health Monitoring:**
- Health check endpoint: `/api/health` proxies to gateway
- Used in: Dashboard status indicator (`src/app/page.tsx`)

## CI/CD & Deployment

**Hosting:**
- Next.js compatible environments (Vercel, self-hosted Docker, Node.js servers)
- Production build: Standalone output (no external server required)

**CI Pipeline:**
- None detected - No GitHub Actions, Jenkins, or GitLab CI configuration

**Database Migration:**
- Manual - Schema created on first application startup
- Seeding: Cafe menu auto-seeded if empty (30 default items)

## Environment Configuration

**Required env vars:**

**Frontend (NEXT_PUBLIC prefix accessible to browser):**
- `NEXT_PUBLIC_GATEWAY_URL` - Gateway service URL (e.g., http://localhost:3100)
- `NEXT_PUBLIC_GATEWAY_API_KEY` - API key for gateway (development: rp-gateway-2026-secure-key)

**Backend (server-side only):**
- `GATEWAY_URL` - Gateway URL (for server routes)
- `GATEWAY_API_KEY` - Gateway API key
- `RC_URL` - RaceControl Core URL (default: http://localhost:8080)
- `RACECONTROL_URL` - Alternative RaceControl URL

**Secrets location:**
- `.env.local` (development) - Git ignored, not in repo
- Environment variables (production) - Set via deployment platform

## Webhooks & Callbacks

**Incoming:**
- None detected - No webhook receivers implemented

**Outgoing:**
- None detected - No outbound webhooks to external services

## Service Dependencies Summary

| Service | Location | Purpose | Required |
|---------|----------|---------|----------|
| Gateway (Groq/Ollama) | :3100 | AI transcription, chat, LLM extraction | Yes for transcribe/scan pages |
| RaceControl Core | :8080 | Marketing, tournaments, kiosks, waivers | Yes for most admin pages |
| Hiring Bot | :3050 | Candidate retrieval | Optional (defaults to empty) |
| SQLite Database | ./data/admin.db | Local data (menu, inventory, employees, finance) | Yes |

---

*Integration audit: 2026-03-22*
