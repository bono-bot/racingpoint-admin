# Codebase Structure

**Analysis Date:** 2026-03-22

## Directory Layout

```
racingpoint-admin/
├── src/
│   ├── app/                          # Next.js App Router (Pages + API Routes)
│   │   ├── layout.tsx                # Root layout with providers
│   │   ├── page.tsx                  # Dashboard overview (/)
│   │   ├── globals.css               # Global styles
│   │   │
│   │   ├── api/                      # API routes (server)
│   │   │   ├── health/route.ts       # Gateway health check
│   │   │   ├── rc/[...path]/route.ts # RaceControl Core proxy
│   │   │   ├── cafe/
│   │   │   │   ├── menu/route.ts     # Menu CRUD (SQLite)
│   │   │   │   └── inventory/route.ts# Inventory CRUD (SQLite)
│   │   │   ├── hr/
│   │   │   │   ├── employees/route.ts# Employee CRUD (SQLite)
│   │   │   │   ├── attendance/route.ts
│   │   │   │   ├── hiring/route.ts
│   │   │   │   └── leaves/route.ts
│   │   │   ├── scan/
│   │   │   │   ├── receipt/route.ts  # OCR + Ollama extraction
│   │   │   │   └── bank-statement/route.ts
│   │   │   ├── analytics/route.ts    # Dashboard analytics (SQLite)
│   │   │   ├── calendar/route.ts
│   │   │   ├── finance/route.ts
│   │   │   ├── purchases/route.ts    # Purchases CRUD (SQLite)
│   │   │   ├── sales/route.ts        # Sales CRUD (SQLite)
│   │   │   ├── waivers/route.ts      # Waiver proxy/CRUD
│   │   │   └── waivers/[driverId]/signature/route.ts
│   │   │
│   │   ├── analytics/page.tsx        # Analytics dashboard
│   │   ├── bookings/page.tsx         # Bookings management
│   │   ├── calendar/page.tsx
│   │   ├── chat/page.tsx             # AI assistant (rc-core /ai/chat)
│   │   ├── coupons/page.tsx          # Marketing (rc-core)
│   │   ├── customers/page.tsx        # Customer list (Gateway)
│   │   ├── cafe/
│   │   │   ├── page.tsx              # Menu management
│   │   │   └── inventory/page.tsx    # Inventory management
│   │   ├── finance/page.tsx          # Finance dashboard
│   │   ├── hr/
│   │   │   ├── page.tsx              # Employees list
│   │   │   ├── attendance/page.tsx
│   │   │   ├── hiring/page.tsx
│   │   │   └── leaves/page.tsx
│   │   ├── kiosk/page.tsx            # Kiosk screen control (rc-core)
│   │   ├── leaderboard/page.tsx      # Racing leaderboard (rc-core)
│   │   ├── memberships/page.tsx      # Marketing (rc-core)
│   │   ├── packages/page.tsx         # Customer packages (rc-core)
│   │   ├── pricing/page.tsx          # Pricing rules (rc-core)
│   │   ├── purchases/page.tsx        # Purchase history
│   │   ├── sales/page.tsx            # Sales history
│   │   ├── sessions/page.tsx         # Racing sessions
│   │   ├── settings/page.tsx
│   │   ├── tournaments/page.tsx      # Tournament management (rc-core)
│   │   ├── transcribe/page.tsx       # Audio transcription
│   │   ├── waivers/page.tsx          # Waivers management
│   │   ├── wallet-transactions/page.tsx
│   │   └── favicon.ico
│   │
│   ├── components/                   # Shared React components
│   │   ├── AdminLayout.tsx           # Sidebar + nav + header
│   │   ├── ConfirmDialog.tsx         # Modal dialogs
│   │   ├── Skeleton.tsx              # Loading placeholders
│   │   └── Toast.tsx                 # Toast notifications
│   │
│   └── lib/                          # Utility functions and clients
│       ├── api.ts                    # Typed API client (Gateway, RC, DB)
│       ├── db.ts                     # SQLite singleton + schema + seed
│       └── utils.ts                  # formatDate, formatTime, cn()
│
├── data/                             # SQLite database (generated)
│   └── admin.db (+ admin.db-shm, admin.db-wal)
│
├── public/                           # Static assets
│   ├── file.svg
│   ├── globe.svg
│   ├── next.svg
│   ├── vercel.svg
│   └── window.svg
│
├── tests/                            # E2E tests (Playwright)
│   └── (test files)
│
├── next.config.ts                    # Next.js config (standalone output, turbopack)
├── tsconfig.json                     # TypeScript config (@ alias for src/)
├── tailwind.config.ts                # Tailwind CSS (if present)
├── postcss.config.mjs                # PostCSS config
├── eslint.config.mjs                 # ESLint config
├── playwright.config.ts              # E2E test config
├── package.json                      # Dependencies: next, react, better-sqlite3, recharts, tesseract.js
├── package-lock.json
├── README.md
├── Dockerfile
├── .dockerignore
├── .gitignore
└── .env* (not committed)
```

## Directory Purposes

**`src/app`:**
- Purpose: Next.js 16 App Router - contains all pages and API routes
- Contains: `.tsx` files for pages (UI routes), `route.ts` files for API endpoints
- Key files: `layout.tsx` (root), `page.tsx` (homepage)

**`src/app/api`:**
- Purpose: Server-side API endpoints
- Contains: Route handlers that proxy to Gateway, RaceControl Core, or query SQLite
- Pattern: Feature-based structure mirrors frontend pages (e.g., `/api/cafe/menu` for `/cafe` page)

**`src/components`:**
- Purpose: Shared React components used across multiple pages
- Contains: Layout shell (AdminLayout), UI widgets (Toast, Skeleton, ConfirmDialog)
- Key file: `AdminLayout.tsx` wraps all pages with sidebar navigation and search modal

**`src/lib`:**
- Purpose: Core business logic and utilities
- Contains: Typed API client, database abstraction, formatting helpers
- Key files: `api.ts` (centralized API interface), `db.ts` (SQLite setup), `utils.ts` (helpers)

**`data/`:**
- Purpose: SQLite database file storage
- Generated on first run by `src/lib/db.ts`
- Files: `admin.db` (main), `admin.db-shm`, `admin.db-wal` (Write-Ahead Log for concurrent access)
- Committed: No (in .gitignore)

**`public/`:**
- Purpose: Static assets served at /public/* URL
- Contains: SVG icons, default Next.js graphics
- Committed: Yes

**`tests/`:**
- Purpose: E2E tests using Playwright
- Contains: Test files for critical user flows
- Config: `playwright.config.ts` in root

## Key File Locations

**Entry Points:**

- `src/app/layout.tsx`: Root layout, loads ToastProvider and AdminLayout
- `src/app/page.tsx`: Dashboard home page (/)
- `src/app/api/health/route.ts`: Gateway health check endpoint

**Configuration:**

- `next.config.ts`: Output mode (standalone), Turbopack settings
- `tsconfig.json`: Path alias `@/*` → `src/*`, target ES2017
- `playwright.config.ts`: E2E test runner config

**Core Logic:**

- `src/lib/api.ts`: All external API calls (Gateway, RC-Core) and DB query wrappers (153 lines)
- `src/lib/db.ts`: SQLite schema init, 12 tables, seed menu data (223 lines)
- `src/components/AdminLayout.tsx`: Global navigation with 8 sections and Cmd+K search (213 lines)

**Testing:**

- `tests/`: E2E tests for critical flows
- `playwright.config.ts`: Configuration

## Naming Conventions

**Files:**

- Pages: `[feature]/page.tsx` (e.g., `bookings/page.tsx`, `hr/attendance/page.tsx`)
- API routes: `api/[domain]/[entity]/route.ts` (e.g., `api/cafe/menu/route.ts`)
- Components: PascalCase.tsx (e.g., `AdminLayout.tsx`)
- Utilities: camelCase.ts (e.g., `api.ts`, `db.ts`, `utils.ts`)

**Directories:**

- Feature domains: kebab-case (e.g., `cafe/`, `wallet-transactions/`)
- Nested routes: use Next.js folder structure (e.g., `hr/attendance/`, `api/hr/attendance/`)
- Shared: `components/`, `lib/` (lowercase plural)

**TypeScript Interfaces:**

- Exported from `src/lib/api.ts`: Booking, Customer, Tournament, Match, TranscribeResponse
- Naming: PascalCase, suffix with Request/Response if applicable
- Colocation: Define at top of module where first used

## Where to Add New Code

**New Feature Page (e.g., new dashboard):**
- Primary code: `src/app/[feature-name]/page.tsx` (use 'use client' for interactivity)
- Styles: Use Tailwind classes directly (no separate CSS files)
- Data fetching: Use `useEffect` with `useState` for loading/data/error state
- API calls: Via `import { api } from '@/lib/api'`

**New API Endpoint (e.g., new CRUD):**
- Implementation: `src/app/api/[domain]/[entity]/route.ts`
- Pattern: Export `GET`, `POST`, `PUT`, `DELETE` functions
- Database: Use `import { getDb } from '@/lib/db'` for SQLite queries
- External API: Create function in `src/lib/api.ts` and call from route

**New Component (e.g., reusable widget):**
- Implementation: `src/components/[ComponentName].tsx`
- Pattern: Export default React component marked with 'use client' if using hooks
- Usage: Import in pages via `import [ComponentName] from '@/components/[ComponentName]'`

**New Utility Function:**
- Formatting helpers: Add to `src/lib/utils.ts`
- API methods: Add to `src/lib/api.ts` export object
- Database queries: Add to `src/lib/db.ts` or as route handler

**New Database Table:**
- Schema: Add `CREATE TABLE IF NOT EXISTS` to `initTables()` in `src/lib/db.ts`
- Seed data: Add to `seedMenu()` or similar function if needed
- Access: Use `getDb().prepare('...')` in API routes

## Special Directories

**`.next/`:**
- Purpose: Build output and Next.js internal files
- Generated: Yes (on `npm run build`)
- Committed: No (in .gitignore)
- Contents: Compiled JS, source maps, static optimization metadata

**`.planning/`:**
- Purpose: GSD project documentation and codebase analysis (this file)
- Generated: No (manually created)
- Committed: Yes
- Contents: ARCHITECTURE.md, STRUCTURE.md, CONCERNS.md, etc.

**`node_modules/`:**
- Purpose: Installed npm packages
- Generated: Yes (on `npm install`)
- Committed: No (in .gitignore)

**`data/`:**
- Purpose: Runtime-generated SQLite database
- Generated: Yes (on first API call to DB)
- Committed: No (in .gitignore)

---

*Structure analysis: 2026-03-22*
