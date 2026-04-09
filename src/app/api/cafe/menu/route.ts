import { NextRequest, NextResponse } from 'next/server';
import { getDb, withAdminDbError } from '@/lib/db';
import { COOKIE_NAME } from '@/lib/auth-config';

/**
 * Cafe menu API — v47.0 Phase 346 dual-path scaffolding.
 *
 * TWO implementations live here:
 * 1. Legacy: admin.db.menu_items (current behavior, still the default)
 * 2. New: proxy to racecontrol /api/v1/cafe/items (the venue-ready single source of truth)
 *
 * The new path is gated behind `CAFE_PROXY_ENABLED=true` env var, default OFF.
 * The cutover MUST happen during a maintenance window with:
 *   - Pre-cutover admin.db snapshot backup
 *   - Schema diff verification (PRICE IS IN RUPEES IN ADMIN.DB, PAISE IN RACECONTROL)
 *   - Manual smoke test on POS + kiosk
 *   - Playwright contract test passing
 *
 * Critical field mapping:
 *   admin.db.menu_items.price (rupees, INTEGER) ↔ racecontrol.db.cafe_items.selling_price_paise (paise, i64)
 *   admin.db.menu_items.category (text string)  ↔ racecontrol.db.cafe_items.category_id (TEXT FK to cafe_categories.id)
 *   admin.db.menu_items.veg (0/1)                ↔ (no equivalent — dropped, consider adding to racecontrol schema)
 *   admin.db.menu_items.available (0/1)          ↔ racecontrol.db.cafe_items.is_available (bool)
 *
 * Any cutover that ignores the rupees-vs-paise difference will DIVIDE every menu
 * price by 100 on the POS/kiosk. ₹199 becomes ₹1.99. Customers could order a
 * ₹199 burger for ₹1.99 until a manager notices.
 *
 * Phase 346-01 delivers this scaffolding; Phase 346-02 delivers the cutover
 * migration (drop admin.db tables) during a maintenance window.
 */

const CAFE_PROXY_ENABLED = process.env.CAFE_PROXY_ENABLED === 'true';

// ─── Proxy implementation (flag-gated) ───────────────────────────────────────

async function proxyFetch(
  req: NextRequest,
  method: string,
  rcPath: string,
  body?: unknown
): Promise<Response> {
  const rcUrl = process.env.RC_URL;
  if (!rcUrl) {
    throw new Error('RC_URL_MISSING');
  }
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) throw new Error('NO_TOKEN');
  return fetch(`${rcUrl}/api/v1${rcPath}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
}

interface RcCafeItem {
  id: string;
  name: string;
  description: string | null;
  category_id: string;
  selling_price_paise: number;
  cost_price_paise: number;
  is_available: boolean;
  created_at: string | null;
  updated_at: string | null;
  image_path: string | null;
  is_countable: boolean;
  stock_quantity: number;
  low_stock_threshold: number;
}

interface RcCafeCategory {
  id: string;
  name: string;
  sort_order: number;
}

interface AdminMenuItem {
  id: string | number;
  category: string;
  name: string;
  price: number; // rupees — keep UI shape
  veg: number;
  available: number;
  created_at?: string | null;
}

/**
 * Flatten racecontrol cafe_items + cafe_categories into the flat
 * admin.db.menu_items shape the UI currently expects.
 *
 * Rupees conversion: selling_price_paise / 100 → price (rupees).
 */
function rcToAdminShape(items: RcCafeItem[], categories: RcCafeCategory[]): AdminMenuItem[] {
  const catMap = new Map(categories.map((c) => [c.id, c.name]));
  return items.map((it) => ({
    id: it.id,
    category: catMap.get(it.category_id) || 'Uncategorized',
    name: it.name,
    price: Math.round(it.selling_price_paise / 100),
    veg: 1, // default — racecontrol schema has no veg flag
    available: it.is_available ? 1 : 0,
    created_at: it.created_at,
  }));
}

async function proxyGet(req: NextRequest) {
  try {
    const [itemsRes, catsRes] = await Promise.all([
      proxyFetch(req, 'GET', '/cafe/items'),
      proxyFetch(req, 'GET', '/cafe/categories'),
    ]);
    if (!itemsRes.ok || !catsRes.ok) {
      return NextResponse.json(
        {
          error: 'racecontrol cafe endpoints returned non-OK',
          error_code: 'RC_CAFE_UNAVAILABLE',
          items_status: itemsRes.status,
          cats_status: catsRes.status,
        },
        { status: 502 }
      );
    }
    const itemsJson = (await itemsRes.json()) as { items?: RcCafeItem[] } | RcCafeItem[];
    const catsJson = (await catsRes.json()) as
      | { categories?: RcCafeCategory[] }
      | RcCafeCategory[];
    const items = Array.isArray(itemsJson) ? itemsJson : itemsJson.items ?? [];
    const cats = Array.isArray(catsJson) ? catsJson : catsJson.categories ?? [];
    return NextResponse.json({ items: rcToAdminShape(items, cats), source: 'racecontrol' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: 'proxy fetch failed', error_code: msg, hint: 'check RC_URL and admin token' },
      { status: 503 }
    );
  }
}

// ─── Legacy admin.db implementation (current default) ────────────────────────

async function legacyGet() {
  try {
    const db = getDb();
    const items = db.prepare('SELECT * FROM menu_items ORDER BY category, name').all();
    return NextResponse.json({ items, source: 'admin.db' });
  } catch (err) {
    return withAdminDbError(err);
  }
}

async function legacyPost(req: NextRequest) {
  try {
    const body = await req.json();
    const { category, name, price, veg } = body;
    if (!category || !name || !price) {
      return NextResponse.json({ error: 'category, name, price required' }, { status: 400 });
    }
    const db = getDb();
    const result = db
      .prepare('INSERT INTO menu_items (category, name, price, veg) VALUES (?, ?, ?, ?)')
      .run(category, name, price, veg ? 1 : 0);
    return NextResponse.json({ id: result.lastInsertRowid });
  } catch (err) {
    return withAdminDbError(err);
  }
}

async function legacyPut(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const db = getDb();
    const fields: string[] = [];
    const values: unknown[] = [];
    for (const [k, v] of Object.entries(updates)) {
      if (['category', 'name', 'price', 'veg', 'available'].includes(k)) {
        fields.push(`${k} = ?`);
        values.push(v);
      }
    }
    if (fields.length === 0) return NextResponse.json({ error: 'no valid fields' }, { status: 400 });
    values.push(id);
    db.prepare(`UPDATE menu_items SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return withAdminDbError(err);
  }
}

// ─── Route handlers (dispatch on flag) ───────────────────────────────────────

export async function GET(req: NextRequest) {
  if (CAFE_PROXY_ENABLED) return proxyGet(req);
  return legacyGet();
}

export async function POST(req: NextRequest) {
  if (CAFE_PROXY_ENABLED) {
    // Write path not yet implemented in proxy mode — requires category_id
    // resolution (lookup or create) and rupees→paise conversion.
    // Phase 346-02 implements the write cutover during a maintenance window.
    return NextResponse.json(
      {
        error: 'cafe menu write proxy not yet enabled — use CAFE_PROXY_ENABLED=false for writes',
        error_code: 'CAFE_PROXY_WRITE_PENDING',
      },
      { status: 503 }
    );
  }
  return legacyPost(req);
}

export async function PUT(req: NextRequest) {
  if (CAFE_PROXY_ENABLED) {
    return NextResponse.json(
      {
        error: 'cafe menu write proxy not yet enabled',
        error_code: 'CAFE_PROXY_WRITE_PENDING',
      },
      { status: 503 }
    );
  }
  return legacyPut(req);
}
