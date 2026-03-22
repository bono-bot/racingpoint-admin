# Architecture

**Analysis Date:** 2026-03-22

## Pattern Overview

**Overall:** Next.js 16 Full-Stack with Island Architecture + Multi-Gateway Integration

**Key Characteristics:**
- Server Components and Client Components in co-located folder structure
- API Routes as middleware layer proxying to multiple backend services
- Hybrid database: SQLite for local state + external Gateway API + RaceControl Core API
- Real-time updates via fetch polling with SWR client library
- Modular feature-based page organization with shared components and utilities

## Layers

**Frontend (Client-Side):**
- Purpose: Interactive dashboard UI with state management and real-time data fetching
- Location: `src/app/*/page.tsx` (all pages marked with 'use client')
- Contains: React components, client-side hooks, forms, filters, tables, charts
- Depends on: `@/lib/api` (typed API client), `@/components/*` (shared UI), `@/lib/utils` (formatting)
- Used by: Browser via Next.js runtime

**API Layer (Server-Side Routes):**
- Purpose: Request routing, data validation, proxying, and orchestration between frontends and backends
- Location: `src/app/api/*/route.ts`
- Contains: GET/POST/PUT/DELETE handlers, error handling, external API calls
- Depends on: `@/lib/db` (SQLite access), `@/lib/api` (internal helper functions), external services
- Used by: Frontend pages and CLI/tooling

**Data Layer (SQLite Local):**
- Purpose: Persistent local storage for cafe menu, inventory, sales, purchases, employees, HR, finance
- Location: `data/admin.db` (generated on first run, WAL mode)
- Contains: 12 tables with relationships (menu_items, inventory, sales, employees, attendance, etc.)
- Depends on: `better-sqlite3` (native Rust bindings)
- Used by: API routes via `@/lib/db.getDb()`

**API Client Library:**
- Purpose: Centralized typed interface to all backend services
- Location: `src/lib/api.ts`
- Contains: Functions for Gateway API, RaceControl Core API, internal DB queries
- Depends on: Environment variables (GATEWAY_URL, RC_URL, API keys)
- Used by: All client pages and API routes

**Shared Utilities & Components:**
- Purpose: Cross-cutting concerns and reusable UI
- Location: `src/lib/utils.ts` (formatDate, formatTime, cn), `src/components/*` (AdminLayout, Toast, Skeleton)
- Contains: Formatting, classname merging, layout shell, toast notifications, loading states
- Depends on: React, Next.js hooks
- Used by: All pages and components

## Data Flow

**Read Flow (Dashboard Overview):**

1. User loads `/` (page.tsx)
2. `OverviewPage` component (use client) executes `useEffect`
3. Makes parallel requests via `api.getBookings()`, `api.getCustomers()`, `fetch('/api/health')`
4. `api.getBookings()` → `apiFetch('/api/bookings')` → `fetch(${GATEWAY_URL}/api/bookings, headers: x-api-key)`
5. Gateway returns paginated bookings data
6. Component sets state and re-renders
7. UI displays stat cards with loading skeletons during fetch

**Write Flow (Create Tournament):**

1. User fills form on `/tournaments` and clicks Create
2. `handleCreate()` calls `api.createTournament(data)`
3. `api.createTournament()` → `rcFetch('/tournaments', {method: 'POST', body: JSON.stringify(data)})`
4. `rcFetch()` → `fetch('/api/rc/tournaments', {method: 'POST', body})`
5. Next.js API route `/api/rc/[...path]/route.ts` handles request
6. Route proxies to `${RC_URL}/api/v1/tournaments` with forwarded body
7. RaceControl Core validates and creates tournament, returns response
8. API route passes response back to client
9. Client calls `load()` to refresh tournament list

**Hybrid Database Read (Cafe Menu):**

1. User loads `/cafe` (page.tsx)
2. `CafePage` component calls `api.getCafeMenu()` (if exists) or `fetch('/api/cafe/menu')`
3. API route `/api/cafe/menu/route.ts` executes: `db.prepare('SELECT * FROM menu_items').all()`
4. SQLite returns menu data from local database
5. Component renders table with menu items (category, name, price, availability)

**State Management:**

- **Client State:** React `useState()` for filters, search, selected items, form inputs, loading state
- **Server State:** SQLite database (cafe, inventory, HR, finance) and external APIs (bookings, customers, tournaments)
- **Real-time:** Polling via manual refetch in `useEffect` hooks (not WebSocket/subscriptions)

## Key Abstractions

**API Client (`src/lib/api.ts`):**
- Purpose: Typed wrapper over raw fetch calls with authentication and URL management
- Examples: `api.getBookings()`, `api.createTournament()`, `api.transcribe()`
- Pattern: Each method constructs URL, adds headers, calls `apiFetch()` or `rcFetch()`, returns typed promise
- Error handling: Throws on non-OK status, caller catches and handles

**Database Layer (`src/lib/db.ts`):**
- Purpose: Singleton SQLite connection with schema initialization
- Examples: `getDb()` returns Database instance, auto-creates tables on first run
- Pattern: Lazy-load singleton, pragma for WAL and FK constraints, auto-seed menu
- Error handling: Throws on SQL errors, API route catches

**Component Shell (`src/components/AdminLayout.tsx`):**
- Purpose: Global navigation, search, sidebar toggle
- Examples: 8 nav sections (Dashboard, Operations, Racing, Marketing, Cafe, Finance, HR, AI)
- Pattern: `navSections` array with grouped links, pathname-based active state, Cmd+K search modal
- Reusable by: All pages wrapped via `src/app/layout.tsx`

**Toast System (`src/components/Toast.tsx`):**
- Purpose: Global notifications with auto-dismiss
- Examples: `useToast()` hook for `toast('message', 'success'|'error'|'info')`
- Pattern: Context provider, auto-remove after 3.5s, fixed bottom-right positioning
- Used by: Any page needing user feedback

## Entry Points

**Web Application:**
- Location: `src/app/layout.tsx` (root layout, wraps all pages with ToastProvider and AdminLayout)
- Triggers: Accessing http://localhost:3000 (or deployed URL)
- Responsibilities: Set metadata, load fonts (Montserrat), render global providers, configure dark mode

**API Entry Point (Gateway Proxy):**
- Location: `src/app/api/health/route.ts`
- Triggers: `GET /api/health`
- Responsibilities: Forward request to Gateway, catch offline, return health status

**API Entry Point (RaceControl Proxy):**
- Location: `src/app/api/rc/[...path]/route.ts`
- Triggers: Any request to `/api/rc/*` (matches GET/POST/PUT/DELETE)
- Responsibilities: Proxy all methods to RC_URL, forward body and query string, return response or error

**API Entry Point (Local SQLite):**
- Location: `src/app/api/cafe/menu/route.ts`, `src/app/api/cafe/inventory/route.ts`, etc.
- Triggers: `GET/POST/PUT /api/cafe/menu`, `/api/cafe/inventory`, etc.
- Responsibilities: Query/mutate local SQLite, validate input, return JSON or error

## Error Handling

**Strategy:** Try-catch in API routes with NextResponse.json error responses. Client catches and displays toast or alert.

**Patterns:**

- **API Route Missing Fields:** `NextResponse.json({ error: 'field required' }, { status: 400 })`
- **Gateway Offline:** `catch { return NextResponse.json({ status: 'offline' }, { status: 503 }) }`
- **RC Core Unreachable:** `catch { return NextResponse.json({ error: 'rc-core unreachable' }, { status: 502 }) }`
- **Client Error Display:** `catch (err) { alert('Failed to load X'); console.error(err) }`

## Cross-Cutting Concerns

**Logging:** Console.error() for failures, no centralized logger. Example: `console.error('Failed to load bookings', err)`

**Validation:**
- Input validation in API routes before DB/external API calls
- Type checking via TypeScript interfaces (Booking, Customer, TranscribeResponse, etc.)
- Client-side: Form inputs with required attributes and onChange handlers

**Authentication:**
- API Key via `x-api-key` header to Gateway (`NEXT_PUBLIC_GATEWAY_API_KEY`)
- No user authentication for admin dashboard (assumes secure deployment)
- RC_URL proxied without auth headers (internal network)

**Environment Variables:**
- `NEXT_PUBLIC_GATEWAY_URL` (default: http://localhost:3100)
- `NEXT_PUBLIC_GATEWAY_API_KEY` (default: 'rp-gateway-2026-secure-key')
- `GATEWAY_URL`, `GATEWAY_API_KEY` (server-only versions)
- `RC_URL` (default: http://localhost:8080, used in `/api/rc` proxy)

---

*Architecture analysis: 2026-03-22*
