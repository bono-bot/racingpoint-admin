import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/** Every page the sidebar links to — the deploy contract. */
const EXPECTED_PAGES = [
  '/', '/analytics', '/billing', '/billing/history',
  '/billing/rates', '/billing/reports', '/bookings', '/cafe',
  '/cafe/inventory', '/calendar', '/chat', '/coupons',
  '/customers', '/finance', '/fleet', '/hr',
  '/hr/attendance', '/hr/hiring', '/hr/leaves', '/kiosk',
  '/leaderboard', '/memberships', '/packages', '/pricing',
  '/purchases', '/sales', '/sessions', '/settings',
  '/tournaments', '/transcribe', '/waivers', '/wallet-transactions',
];

const EXPECTED_APIS = [
  '/api/health', '/api/auth/login', '/api/auth/logout',
];

/**
 * Check which built pages actually exist in the .next/server/app directory.
 * Works in both dev (cwd/.next) and standalone (.next relative to server.js).
 */
function getAvailablePages(): string[] {
  // In standalone, .next is at process.cwd()/.next
  const serverAppDir = path.join(process.cwd(), '.next', 'server', 'app');
  if (!fs.existsSync(serverAppDir)) return [];

  const pages: string[] = [];

  function scan(dir: string, prefix: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      // Skip route groups like (auth), (dashboard) — they don't affect the URL
      if (entry.isDirectory() && entry.name.startsWith('(')) {
        scan(path.join(dir, entry.name), prefix);
        continue;
      }
      // A .html file = a page exists at that route
      if (entry.isFile() && entry.name.endsWith('.html')) {
        const routeName = entry.name.replace('.html', '');
        const route = routeName === 'index' ? prefix || '/' : `${prefix}/${routeName}`;
        pages.push(route);
      }
      // Recurse into subdirectories (billing/history, hr/hiring, etc.)
      // Also match dynamic segments like [id], [number] as valid pages
      if (entry.isDirectory() && entry.name.startsWith('[') && entry.name.endsWith(']')) {
        pages.push(`${prefix}/${entry.name}`);
        continue;
      }
      if (entry.isDirectory() && !entry.name.startsWith('_') && entry.name !== 'api') {
        scan(path.join(dir, entry.name), `${prefix}/${entry.name}`);
      }
    }
  }

  scan(serverAppDir, '');
  return pages.sort();
}

export async function GET() {
  const available = getAvailablePages();
  const missing = EXPECTED_PAGES.filter(p => !available.includes(p));
  const extra = available.filter(p => !EXPECTED_PAGES.includes(p) && !p.startsWith('/_') && p !== '/login');

  const hasStatic = fs.existsSync(path.join(process.cwd(), '.next', 'static'));

  const healthy = missing.length === 0 && hasStatic;

  return NextResponse.json({
    status: healthy ? 'ok' : 'degraded',
    service: 'racingpoint-admin',
    version: '0.1.0',
    deploy: {
      pages_expected: EXPECTED_PAGES.length,
      pages_available: available.length,
      pages_missing: missing,
      pages_extra: extra,
      static_assets: hasStatic,
      healthy,
    },
  }, { status: healthy ? 200 : 503 });
}
