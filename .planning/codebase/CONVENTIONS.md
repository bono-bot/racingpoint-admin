# Coding Conventions

**Analysis Date:** 2026-03-22

## Naming Patterns

**Files:**
- Page components: `[name]/page.tsx` (Next.js App Router convention) — e.g., `src/app/analytics/page.tsx`
- API routes: `api/[endpoint]/route.ts` — e.g., `src/app/api/health/route.ts`
- Helper modules: lowercase with hyphen separators — e.g., `lib/api.ts`, `lib/utils.ts`
- Test files: `[description].spec.ts` — e.g., `tests/e2e/01-navigation.spec.ts`

**Functions:**
- camelCase for all functions: `getDb()`, `formatDate()`, `loadBookings()`
- Handler functions: prefixed with `handle` — e.g., `handleCancel()` in `src/app/bookings/page.tsx`
- Async API functions: no special prefix, use `async` keyword — e.g., `async function loadBookings()`
- Component functions: PascalCase, default export for page components — e.g., `export default function AnalyticsPage()`
- Helper functions: lowercase function declarations in utility modules — e.g., `export function formatDate()`

**Variables:**
- camelCase for all variables: `bookings`, `setLoading`, `sourceFilter`
- State variables: `state` and `setState` pattern in React hooks
- Constants: SCREAMING_SNAKE_CASE when defined module-wide — e.g., `const GATEWAY_URL`, `const COLORS`
- Boolean variables: descriptive prefix — `loading`, `visible`, `available` (not `isLoading`)

**Types & Interfaces:**
- PascalCase for interfaces and types — e.g., `interface AnalyticsData`, `interface Booking`
- Type suffix for type aliases when needed — e.g., `BookingsResponse`, `TranscribeSegment`
- Inline object types for simple props — e.g., `{ label: string; value: string; sub?: string }`

## Code Style

**Formatting:**
- Handled by ESLint with Next.js config
- Tool: `eslint.config.mjs` using flat config
- Indentation: 2 spaces (implicit in ESLint config)
- Line length: No hard limit, but keep readable (~100-120 characters)
- Quotes: Single quotes preferred in most contexts

**Linting:**
- Tool: ESLint v9 with `eslint-config-next` (core-web-vitals + typescript)
- Config file: `eslint.config.mjs` at project root
- Run linting: `npm run lint`
- Extends: Next.js built-in rules for performance, accessibility, and security
- No Prettier detected — ESLint alone handles code formatting

**Common ESLint Rules Observed:**
- React import not required in `.jsx`/`.tsx` files (Next.js 17+)
- Proper TypeScript type checking enabled
- No unused variables allowed
- Consistent naming conventions enforced

## Import Organization

**Order:**
1. React/Next.js imports — e.g., `import { useEffect, useState } from 'react'`
2. Next.js built-ins — e.g., `import { NextResponse } from 'next/server'`
3. Internal library imports with `@/` alias — e.g., `import { getDb } from '@/lib/db'`
4. Type imports — e.g., `import type { Metadata } from 'next'`
5. Relative imports within same feature (less common)

**Path Aliases:**
- `@/*` maps to `./src/*` — allows `import { ... } from '@/lib/api'` instead of relative paths
- Configured in `tsconfig.json` under `compilerOptions.paths`
- Used consistently across all components and pages

**Example:**
```typescript
// Observed in src/app/analytics/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { BarChart, Bar, LineChart, Line, ... } from 'recharts';
import type { AnalyticsData } from '@/lib/api';
import { getAnalytics } from '@/lib/api';
```

## Error Handling

**Patterns:**
- Try-catch blocks for async operations: `try { ... } catch (err) { ... }`
- Error logging to console: `console.error('message', err)`
- User feedback via `alert()` or toast notifications
- Silent failures with fallback values (when appropriate) — e.g., `?.catch(() => null)`
- No custom error types; use built-in `Error` class

**API Errors:**
- NextResponse with status codes: `NextResponse.json({ error: 'message' }, { status: 400 })`
- Validation errors return 400, not found returns 404, server errors return 500
- Example from `src/app/api/cafe/inventory/route.ts`:
  ```typescript
  if (!item_name) return NextResponse.json({ error: 'item_name required' }, { status: 400 });
  ```

**Client-Side Errors:**
- Wrapped in try-catch, logged to console
- Alert or toast shown to user for critical failures
- Example from `src/app/bookings/page.tsx`:
  ```typescript
  try {
    await api.cancelBooking(bookingId);
  } catch (err) {
    alert('Failed to cancel booking');
  }
  ```

## Logging

**Framework:** `console` module (no structured logging library detected)

**Patterns:**
- `console.error()` for errors in catch blocks
- `console.log()` for debugging (test logs in E2E suites only)
- No info/warn levels observed
- Location: Main in API routes and page load functions

**Examples:**
- `src/app/bookings/page.tsx`: `console.error('Failed to load bookings', err)`
- `tests/e2e/01-navigation.spec.ts`: `console.log('Pages with issues (app bugs, not test bugs):', errors)`

## Comments

**When to Comment:**
- JSDoc comments above exported functions and interfaces (inconsistent usage)
- Inline comments for non-obvious business logic
- Comments for handling known issues or workarounds
- Minimal comments in component code (prefer descriptive variable/function names)

**JSDoc/TSDoc:**
- Observed in `tests/e2e/helpers.ts` with function descriptions:
  ```typescript
  /**
   * Navigate to a page and wait for React hydration.
   * Uses 'load' event then waits for sidebar to appear.
   * Dismisses Next.js dev error overlay if present.
   */
  export async function navigateAndWait(page: Page, path: string)
  ```
- Not consistently used across codebase
- When used, describes purpose, not implementation details

## Function Design

**Size:** Functions keep to single responsibility
- Page components: 50-200 lines (including JSX)
- API route handlers: 20-50 lines
- Utility functions: 5-20 lines

**Parameters:**
- Page functions use destructuring for Next.js props: `function Page({ params }: { params: { id: string } })`
- API handlers accept `NextRequest` and return `NextResponse`
- Async functions properly typed: `async function name(): Promise<Type>`

**Return Values:**
- Components return JSX (React.ReactNode)
- API handlers return `NextResponse` with JSON data
- Utility functions explicitly typed: `export function formatDate(dateStr: string): string`
- Functions may return `undefined` implicitly when no explicit return

**Error Return Patterns:**
- API routes return error responses with status codes
- Client functions throw errors or return fallback data
- No wrapper result types (no `{ ok: boolean, data?, error? }` pattern)

## Module Design

**Exports:**
- Default exports for page components: `export default function AnalyticsPage() { ... }`
- Named exports for utilities and helpers: `export function formatDate(...)`
- Named exports for interfaces: `export interface Booking { ... }`
- Single API object export: `export const api = { ... }` in `src/lib/api.ts`

**Barrel Files:**
- No barrel files (no index.ts re-exporting) detected
- Direct imports from specific files preferred: `import { getDb } from '@/lib/db'`

**File Organization:**
- One logical unit per file
- `src/lib/` contains pure utilities and helpers
- `src/app/` contains Next.js pages and API routes
- Database layer isolated in `src/lib/db.ts`
- API layer isolated in `src/lib/api.ts`

## Database

**Query Style:**
- Parameterized queries with placeholders: `db.prepare('... WHERE id = ?').get(id)`
- Transaction support via `db.transaction(fn)`
- No ORM; raw SQL with better-sqlite3 client

**Example:**
```typescript
// From src/lib/db.ts
const result = db.prepare(
  'INSERT INTO employees (...) VALUES (?, ?, ?, ?, ?, ?)'
).run(name, phone, pin_hash, role, department, hire_date);
```

## Testing Comments

**Test Suites:**
- Organized with `test.describe()` blocks
- Descriptive test names: `test('every sidebar link navigates to correct page')`
- Comments at top of spec files explaining test scope:
  ```typescript
  /**
   * Navigation & Layout E2E Tests
   * Tests: sidebar links, Ctrl+K search, sidebar toggle, quick actions
   */
  ```

---

*Convention analysis: 2026-03-22*
