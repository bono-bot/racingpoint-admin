# Codebase Concerns

**Analysis Date:** 2026-03-22

## Tech Debt

**Database Connection Lifecycle Management:**
- Issue: Global singleton pattern for SQLite database may cause connection issues in concurrent environments. `getDb()` in `src/lib/db.ts` maintains a single module-level connection that is never explicitly closed.
- Files: `src/lib/db.ts`, all files in `src/app/api/**/*.ts`
- Impact: Memory leaks possible in long-running processes; potential WAL file accumulation over time
- Fix approach: Implement connection pooling or per-request connection management; add graceful shutdown handlers

**Hardcoded Default Credentials:**
- Issue: API keys and URLs hardcoded with fallback defaults: `NEXT_PUBLIC_GATEWAY_API_KEY = 'rp-gateway-2026-secure-key'`, `GATEWAY_URL = 'http://localhost:3100'`, `RC_URL = 'http://localhost:8080'`
- Files: `src/lib/api.ts` (lines 1-2), `src/app/api/health/route.ts` (lines 3-4), `src/app/api/rc/[...path]/route.ts` (line 3), `src/app/api/scan/receipt/route.ts` (lines 4-5), `src/app/api/scan/bank-statement/route.ts` (lines 5-6), multiple API routes
- Impact: Secrets exposed in version control; running dev code in production uses hardcoded keys
- Fix approach: Remove all fallback defaults; require environment variables to be explicitly set; add validation on startup to fail fast if missing

**Missing Error Context in API Routes:**
- Issue: Empty catch blocks that don't log errors: `catch { return NextResponse.json({ status: 'offline' }, { status: 503 }); }` in `src/app/api/health/route.ts` and similar patterns
- Files: `src/app/api/health/route.ts` (line 14), `src/app/api/rc/[...path]/route.ts` (line 20), `src/app/api/scan/receipt/route.ts` (line 80), `src/app/api/scan/bank-statement/route.ts` (line 124)
- Impact: Silent failures make debugging production issues extremely difficult; no audit trail of API errors
- Fix approach: Implement structured logging service; log all errors with request context (method, path, timestamp); use server-side logging that cannot be bypassed

**Missing React Hook Dependencies:**
- Issue: `useEffect(() => { ... }, [])` in multiple page components has no dependencies, but makes external API calls that may need to be refetched based on route changes
- Files: `src/app/page.tsx` (line 47), `src/app/finance/page.tsx` (line 64), likely others
- Impact: Page data not refreshing on navigation; stale data shown to users if they navigate away and return
- Fix approach: Add route change tracking via `useRouter` hook; implement refetch mechanism for dependent data

**Toast Context Missing Error Handling:**
- Issue: `useToast()` hook called in components without comprehensive error boundary protection
- Files: `src/app/purchases/page.tsx`, `src/app/finance/page.tsx`, `src/app/chat/page.tsx`
- Impact: If Toast component unmounts unexpectedly, error toasts will fail silently
- Fix approach: Add try-catch around toast calls; implement fallback console logging

---

## Known Bugs

**Database Locking on Concurrent Transactions:**
- Symptoms: Requests timeout or fail with "database is locked" error under load
- Files: `src/lib/db.ts` (line 13 - WAL mode configured), all POST/PUT API routes in `src/app/api/**/*.ts`
- Trigger: Simultaneous writes from multiple API requests (e.g., multiple purchase POSTs, leave requests)
- Workaround: Retry failed requests with exponential backoff; temporary single-threaded deployment (workers: 1)
- Root cause: SQLite WAL mode without proper transaction queueing and single-connection bottleneck

**Incomplete Error Response in Finance API:**
- Symptoms: Bank statement parsing returns 500 with generic "Parse failed" message; original error details lost
- Files: `src/app/api/scan/bank-statement/route.ts` (lines 124-127)
- Trigger: Ollama service unavailable or network timeout
- Workaround: Check Ollama service status independently; upload CSV instead of image
- Root cause: Error caught but message swallowed; no logging of upstream service failures

**Tesseract OCR Timeout Handling Missing:**
- Symptoms: Receipt/bank statement file upload hangs or returns generic error
- Files: `src/app/api/scan/receipt/route.ts` (line 20), `src/app/api/scan/bank-statement/route.ts` (line 27)
- Trigger: Large image files (>5MB) or CPU-intensive OCR; Tesseract.js can hang process
- Workaround: Upload small (<2MB) high-contrast images; use CSV format for bank statements
- Root cause: No timeout configured on Tesseract.recognize(); blocking async operation

---

## Security Considerations

**Open RaceControl Proxy Without Authentication:**
- Risk: `/api/rc/[...path]/route.ts` proxies all requests to RC_URL without validating user permissions; any authenticated user can call any RC endpoint
- Files: `src/app/api/rc/[...path]/route.ts` (lines 5-28)
- Current mitigation: None explicit in code; relies on Next.js auth at page level
- Recommendations: Add middleware to validate request scope; implement role-based access control; audit which RC endpoints should be exposed

**AI Injection Through Receipt/Statement Parsing:**
- Risk: User-supplied OCR text sent directly to Ollama without sanitization; malicious prompts in receipt images could manipulate JSON extraction
- Files: `src/app/api/scan/receipt/route.ts` (line 50, uses OCR text directly in prompt), `src/app/api/scan/bank-statement/route.ts` (line 44, slices text but doesn't sanitize)
- Current mitigation: Response is re-validated as JSON (line 62 in receipt route); Ollama is internal-only
- Recommendations: Implement prompt injection filter; limit OCR text length more strictly (current: 3000 chars is arbitrary); add request signing

**API Key Exposure in Browser:**
- Risk: `NEXT_PUBLIC_GATEWAY_API_KEY` is sent to browser; any malicious script can steal it
- Files: `src/lib/api.ts` (line 2), used in browser context
- Current mitigation: Marked NEXT_PUBLIC but still world-readable
- Recommendations: Move API calls through Next.js API routes only; do not expose keys to frontend; use server-side proxies

**Chat Response Rendering Without Sanitization:**
- Risk: AI chat responses rendered in UI without validation; if Ollama is compromised or returns malicious content, XSS is possible
- Files: `src/app/chat/page.tsx` (likely renders AI responses to users)
- Current mitigation: React default XSS protection active; responses stored in component state
- Recommendations: Add response format validation; implement markdown sanitization if using rich text rendering; add CSP headers

---

## Performance Bottlenecks

**Full Table Scan in Analytics Queries:**
- Problem: Analytics API queries (sales by hour, daily revenue) do full table scans without indexes
- Files: `src/app/api/analytics/route.ts` (lines 10-100)
- Cause: No indexes on `sales` table columns (created_at, sale_date, payment_method); strftime() on unindexed columns
- Improvement path: Add indexes on `created_at`, `sale_date`, `payment_method` in `sales` table; consider materialized views for 30-day/12-month aggregations

**Inefficient Transaction Matching in Bank Statement Parser:**
- Problem: O(n²) matching algorithm: for each of N transactions, searches through all M purchases/sales
- Files: `src/app/api/scan/bank-statement/route.ts` (lines 100-116)
- Cause: `.find()` in loop without indexed lookup
- Improvement path: Build Map<amount, List<purchases>> for O(1) lookup; pre-filter by date range before amount matching

**Unoptimized Booking/Customer Aggregation:**
- Problem: Analytics dashboard fetches full booking list (limit=1000, no pagination) just to count by source
- Files: `src/app/api/analytics/route.ts` (lines 81-93)
- Cause: No database-side aggregation; filtering happens in JavaScript
- Improvement path: Add `SELECT source, COUNT(*) FROM bookings GROUP BY source` query to gateway; fetch only summary

**OCR Processing Blocks Entire Request:**
- Problem: Tesseract runs synchronously, blocking event loop; file size validation doesn't prevent large uploads from being processed
- Files: `src/app/api/scan/receipt/route.ts`, `src/app/api/scan/bank-statement/route.ts`
- Cause: `await Tesseract.recognize()` is CPU-intensive; no worker thread pool
- Improvement path: Implement request queue; offload OCR to background worker (Bull queue + Redis); return job ID to frontend for polling

---

## Fragile Areas

**Database Initialization on First Request:**
- Files: `src/lib/db.ts` (lines 8-17)
- Why fragile: Table creation and seeding run on every server start; if startup is interrupted mid-init, database is corrupted
- Safe modification: Split init into separate migration script; validate table schema on startup without recreating; use database version tracking
- Test coverage: No tests for concurrent requests during initialization; no recovery tests for corrupted database

**Unvalidated AI-Extracted Data:**
- Files: `src/app/api/scan/receipt/route.ts` (lines 61-66), `src/app/api/scan/bank-statement/route.ts` (lines 78-85)
- Why fragile: AI model can return structurally valid JSON but semantically invalid values (negative amounts, future dates, null vendor)
- Safe modification: Implement strict schema validation with zod or similar after JSON parsing; reject extractions that violate business rules
- Test coverage: No tests for malformed AI responses; no fuzzing tests

**Hardcoded Menu Seed Data:**
- Files: `src/lib/db.ts` (lines 167-221)
- Why fragile: Menu items are hardcoded as array of arrays (lines 216-219); changes require code modification; no way to override at deployment time
- Safe modification: Load seed data from JSON file or environment; version seed data separately from code
- Test coverage: No tests validating menu structure; assumes price format is always [category, name, price, veg]

**Mixed Responsibilities in API Routes:**
- Files: Most API routes (e.g., `src/app/api/purchases/route.ts`)
- Why fragile: Business logic, database access, and HTTP response handling in single function; hard to test logic in isolation
- Safe modification: Extract business logic to services (`src/services/purchases.ts`); use dependency injection; test services independently
- Test coverage: No unit tests for business logic; only E2E tests

---

## Scaling Limits

**Single SQLite Database:**
- Current capacity: SQLite can handle ~10,000 concurrent readers; Write queue bottleneck
- Limit: More than 2-3 simultaneous write operations (POST/PUT) will experience lock contention
- Scaling path: Migrate to PostgreSQL or similar for real database; implement read replicas; add query caching layer

**In-Memory Database Singleton:**
- Current capacity: Entire database file (admin.db, currently ~4MB) held in memory via WAL mode
- Limit: As data grows past 100MB, memory usage and startup time become problematic
- Scaling path: Implement lazy loading; use database connection pooling; consider sharding by business unit

**Tesseract.js Processing Power:**
- Current capacity: ~1 concurrent OCR operation per server; Tesseract uses significant CPU
- Limit: Queue backlog starts immediately if >1 file uploaded simultaneously
- Scaling path: Move OCR to background worker queue (Bull + Redis); implement job prioritization; use multi-instance deployment with load balancer

**Ollama Service Dependency:**
- Current capacity: Ollama API gateway rate limits not documented; unknown concurrent request limit
- Limit: Chat, receipt parsing, and bank statement parsing all share same Ollama endpoint; under load, requests fail
- Scaling path: Implement request queue with backpressure; add circuit breaker pattern; implement fallback models

---

## Dependencies at Risk

**better-sqlite3 (v12.6.2):**
- Risk: Native binding to SQLite3; platform-specific compilation required; breaking changes in future major versions
- Impact: Deployment failures on new platforms; upgrade friction
- Migration plan: Already committed to SQLite; alternative: switch to sql.js for portability (but slower)

**tesseract.js (v7.0.0):**
- Risk: Large package (~10MB after install); runs Tesseract model inference on server; language models updated infrequently
- Impact: Slow deployments; outdated OCR quality; storage usage
- Migration plan: Move to cloud-based vision API (Google Vision, AWS Textract) with fallback to Tesseract; implement caching of recognized text

**Recharts (v3.7.0):**
- Risk: Chart library with unknown React 19 compatibility; bundle size impact on page load
- Impact: CSS conflicts in styling; chart performance degradation with large datasets (>1000 points)
- Migration plan: For analytics dashboard, consider server-side SVG generation or lightweight chart library (visx, nivo)

**better-sqlite3 Type Definitions (v7.6.13):**
- Risk: Type definitions may lag behind library changes; `.all()` returns `unknown[]` without proper typing
- Impact: Runtime errors when accessing properties; type assertions needed everywhere (e.g., `as { hour: number; count: number; revenue: number }[]`)
- Migration plan: Implement query result validation layer; use TypeORM or Drizzle for type-safe queries

---

## Missing Critical Features

**Database Backups:**
- Problem: No backup strategy documented; database file at `data/admin.db` is unprotected; loss results in permanent data loss
- Blocks: Disaster recovery; data retention compliance
- Gaps: No automated backup, no export functionality, no point-in-time recovery

**Audit Logging:**
- Problem: No tracking of who changed what data or when; critical for HR (leave approvals) and finance (transaction matches)
- Blocks: Compliance; investigations; accountability
- Gaps: No audit trail for purchases, sales, attendance changes

**Rate Limiting:**
- Problem: No rate limits on public API endpoints; OCR endpoint can be abused to consume CPU; financial calculations can be spammed
- Blocks: DDoS protection; cost control
- Gaps: No middleware for rate limiting; no IP-based throttling

**Data Validation Layer:**
- Problem: Minimal validation of inputs; SQL prepared statements provide some protection, but business rules not enforced
- Blocks: Data integrity; analytics accuracy
- Gaps: No validation for inventory quantities (negative), employee hire dates (future), transaction amounts (precision)

**Authentication & Authorization:**
- Problem: Code assumes authentication exists but no mechanism visible in codebase; no role-based access control
- Blocks: Multi-user deployments; secure API access
- Gaps: No JWT validation; no permission checks in API routes; entire RaceControl API exposed to all users

---

## Test Coverage Gaps

**API Route Error Handling:**
- What's not tested: 404 responses, timeout behavior, malformed request bodies, concurrent request handling
- Files: `src/app/api/**/*.ts`
- Risk: Silent failures; error responses untested; no validation of HTTP status codes
- Priority: **High**

**Database Transaction Atomicity:**
- What's not tested: Rollback on error, concurrent write behavior, WAL file cleanup
- Files: `src/lib/db.ts`, all routes using transactions (purchases, sales, leaves)
- Risk: Data corruption under load; orphaned records in related tables
- Priority: **High**

**OCR Result Validation:**
- What's not tested: Invalid JSON from Tesseract, timeout behavior, corrupted image handling
- Files: `src/app/api/scan/receipt/route.ts`, `src/app/api/scan/bank-statement/route.ts`
- Risk: Crash due to unhandled Promise rejection; silent fallback to empty data
- Priority: **High**

**UI Form Submissions:**
- What's not tested: Duplicate submission (rapid button clicks), network timeout recovery, validation error display
- Files: `src/app/purchases/page.tsx` (lines 71-91), `src/app/sales/page.tsx`, `src/app/cafe/page.tsx`
- Risk: Double-create records; stuck UI; no visual feedback on error
- Priority: **Medium**

**External API Fallbacks:**
- What's not tested: Gateway unavailable, RaceControl timeout, Ollama service down
- Files: `src/lib/api.ts`, all rcFetch and apiFetch calls
- Risk: Cascading failures; partial data rendering
- Priority: **Medium**

**Component Rendering Edge Cases:**
- What's not tested: Empty datasets, null/undefined values in maps, skeleton component timing
- Files: `src/components/Skeleton.tsx`, page components displaying lists
- Risk: React keys warning; layout shifts; invisible errors
- Priority: **Low**

---

*Concerns audit: 2026-03-22*
