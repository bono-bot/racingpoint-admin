import { NextRequest, NextResponse } from 'next/server';
import { getDb, withAdminDbError } from '@/lib/db';
import { COOKIE_NAME } from '@/lib/auth-config';

/**
 * Cafe menu API — v47.0 Phase 346 dual-path implementation.
 *
 * TWO implementations live here:
 * 1. Legacy: admin.db.menu_items (current behavior, still the default)
 * 2. New: proxy to racecontrol /api/v1/cafe/items (the venue-ready single source of truth)
 *
 * The new path is gated behind `CAFE_PROXY_ENABLED=true` env var, default OFF.
 *
 * Critical field mapping:
 *   admin.db.menu_items.price (rupees, INTEGER) <-> racecontrol.db.cafe_items.selling_price_paise (paise, i64)
 *   admin.db.menu_items.category (text string)  <-> racecontrol.db.cafe_items.category_id (TEXT FK to cafe_categories.id)
 *   admin.db.menu_items.veg (0/1)                <-> (no equivalent in racecontrol schema)
 *   admin.db.menu_items.available (0/1)          <-> racecontrol.db.cafe_items.is_available (bool)
 *
 * Any cutover that ignores the rupees-vs-paise difference will DIVIDE every menu
 * price by 100 on the POS/kiosk. Rs.199 becomes Rs.1.99.
 */

const CAFE_PROXY_ENABLED = process.env.CAFE_PROXY_ENABLED === 'true';

// --- Proxy implementation (flag-gated) -----------------------------------------------

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
  price: number; // rupees -- keep UI shape
  veg: number;
  available: number;
  created_at?: string | null;
}

/**
 * Flatten racecontrol cafe_items + cafe_categories into the flat
 * admin.db.menu_items shape the UI currently expects.
 *
 * Rupees conversion: selling_price_paise / 100 -> price (rupees).
 */
function rcToAdminShape(items: RcCafeItem[], categories: RcCafeCategory[]): AdminMenuItem[] {
  const catMap = new Map(categories.map((c) => [c.id, c.name]));
  return items.map((it) => ({
    id: it.id,
    category: catMap.get(it.category_id) || 'Uncategorized',
    name: it.name,
    price: Math.round(it.selling_price_paise / 100),
    veg: 1, // default -- racecontrol schema has no veg flag
    available: it.is_available ? 1 : 0,
    created_at: it.created_at,
  }));
}

/**
 * Resolve a category name string to a racecontrol category_id UUID.
 * Uses POST /cafe/categories which is INSERT OR IGNORE (idempotent lookup-or-create).
 */
async function resolveCategory(req: NextRequest, categoryName: string): Promise<string> {
  const res = await proxyFetch(req, 'POST', '/cafe/categories', {
    name: categoryName,
  });
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`RC_CATEGORY_RESOLVE_FAILED: ${res.status} ${errBody}`);
  }
  const data = (await res.json()) as { id: string; name: string };
  return data.id;
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

/**
 * Proxy POST: create a new cafe item via racecontrol.
 * Admin sends: {category: "Burgers", name: "Test", price: 199, veg: 1}
 * Proxy resolves category string to category_id, converts price (rupees) to paise.
 */
async function proxyPost(req: NextRequest) {
  try {
    const body = await req.json();
    const { category, name, price, description } = body as {
      category?: string;
      name?: string;
      price?: number;
      description?: string;
    };

    if (!category || !name) {
      return NextResponse.json(
        { error: 'category and name are required', error_code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    if (price === undefined || price === null || price <= 0) {
      return NextResponse.json(
        { error: 'price must be a positive number (in rupees)', error_code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Resolve category name to category_id (lookup-or-create)
    const categoryId = await resolveCategory(req, category);

    // Convert rupees to paise: price * 100
    const sellingPricePaise = Math.round(price * 100);

    const res = await proxyFetch(req, 'POST', '/cafe/items', {
      name,
      category_id: categoryId,
      selling_price_paise: sellingPricePaise,
      cost_price_paise: 0,
      description: description || null,
    });

    if (!res.ok) {
      const errBody = await res.text();
      return NextResponse.json(
        { error: 'racecontrol create failed', error_code: 'RC_CREATE_FAILED', detail: errBody },
        { status: res.status >= 400 && res.status < 600 ? res.status : 502 }
      );
    }

    const data = (await res.json()) as { id: string };
    return NextResponse.json({ id: data.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: 'proxy post failed', error_code: msg },
      { status: 503 }
    );
  }
}

/**
 * Proxy PUT: update an existing cafe item via racecontrol.
 * Admin sends: {id: "uuid", price: 249, name: "Updated Name", category: "NewCat"}
 * Proxy converts price to paise, resolves category if changed.
 */
async function proxyPut(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, price, category, name, description, available } = body as {
      id?: string;
      price?: number;
      category?: string;
      name?: string;
      description?: string;
      available?: number;
    };

    if (!id) {
      return NextResponse.json(
        { error: 'id required', error_code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Build the racecontrol update payload
    const rcPayload: Record<string, unknown> = {};

    if (name !== undefined) rcPayload.name = name;
    if (description !== undefined) rcPayload.description = description;

    if (price !== undefined) {
      if (price <= 0) {
        return NextResponse.json(
          { error: 'price must be positive (in rupees)', error_code: 'VALIDATION_ERROR' },
          { status: 400 }
        );
      }
      rcPayload.selling_price_paise = Math.round(price * 100);
    }

    if (category !== undefined) {
      rcPayload.category_id = await resolveCategory(req, category);
    }

    // available is handled via toggle endpoint in racecontrol, but we can
    // also pass is_available in the PUT payload if the RC schema supports it
    if (available !== undefined) {
      rcPayload.is_available = available === 1;
    }

    if (Object.keys(rcPayload).length === 0) {
      return NextResponse.json(
        { error: 'no valid fields to update', error_code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const res = await proxyFetch(req, 'PUT', `/cafe/items/${id}`, rcPayload);

    if (!res.ok) {
      const errBody = await res.text();
      return NextResponse.json(
        { error: 'racecontrol update failed', error_code: 'RC_UPDATE_FAILED', detail: errBody },
        { status: res.status >= 400 && res.status < 600 ? res.status : 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: 'proxy put failed', error_code: msg },
      { status: 503 }
    );
  }
}

/**
 * Proxy DELETE: remove a cafe item via racecontrol.
 * Admin sends: {id: "uuid"} in body.
 */
async function proxyDelete(req: NextRequest) {
  try {
    const body = await req.json();
    const { id } = body as { id?: string };

    if (!id) {
      return NextResponse.json(
        { error: 'id required', error_code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const res = await proxyFetch(req, 'DELETE', `/cafe/items/${id}`);

    if (!res.ok) {
      const errBody = await res.text();
      return NextResponse.json(
        { error: 'racecontrol delete failed', error_code: 'RC_DELETE_FAILED', detail: errBody },
        { status: res.status >= 400 && res.status < 600 ? res.status : 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: 'proxy delete failed', error_code: msg },
      { status: 503 }
    );
  }
}

// --- Legacy admin.db implementation (current default) --------------------------------

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

async function legacyDelete(req: NextRequest) {
  try {
    const body = await req.json();
    const { id } = body;
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const db = getDb();
    db.prepare('DELETE FROM menu_items WHERE id = ?').run(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return withAdminDbError(err);
  }
}

// --- Route handlers (dispatch on flag) -----------------------------------------------

export async function GET(req: NextRequest) {
  if (CAFE_PROXY_ENABLED) return proxyGet(req);
  return legacyGet();
}

export async function POST(req: NextRequest) {
  if (CAFE_PROXY_ENABLED) return proxyPost(req);
  return legacyPost(req);
}

export async function PUT(req: NextRequest) {
  if (CAFE_PROXY_ENABLED) return proxyPut(req);
  return legacyPut(req);
}

export async function DELETE(req: NextRequest) {
  if (CAFE_PROXY_ENABLED) return proxyDelete(req);
  return legacyDelete(req);
}
