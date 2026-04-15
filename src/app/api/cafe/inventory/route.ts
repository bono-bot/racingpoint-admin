import { NextRequest, NextResponse } from 'next/server';
import { getDb, withAdminDbError } from '@/lib/db';
import { COOKIE_NAME } from '@/lib/auth-config';

/**
 * Cafe inventory API — v47.0 Phase 346 dual-path implementation.
 *
 * When CAFE_PROXY_ENABLED=true, inventory reads/writes proxy to racecontrol
 * cafe_items (which has stock fields: is_countable, stock_quantity,
 * low_stock_threshold, restock endpoint).
 *
 * When CAFE_PROXY_ENABLED=false (default), legacy admin.db.inventory behavior
 * is preserved with zero regression.
 *
 * Mapping (admin inventory UI -> racecontrol cafe_items):
 *   item_name      -> name
 *   category       -> category_id (resolved via categories lookup)
 *   quantity        -> stock_quantity
 *   unit            -> not in rc schema, default "pcs"
 *   min_stock       -> low_stock_threshold
 *   cost_per_unit   -> cost_price_paise / 100 (paise to rupees)
 *   low_stock flag  -> stock_quantity <= low_stock_threshold
 */

const CAFE_PROXY_ENABLED = process.env.CAFE_PROXY_ENABLED === 'true';

// --- Proxy helpers -------------------------------------------------------------------

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

interface AdminInventoryItem {
  id: string;
  item_name: string;
  category: string;
  quantity: number;
  unit: string;
  min_stock: number;
  cost_per_unit: number;
  low_stock: number; // 1 if stock_quantity <= low_stock_threshold, else 0
  updated_at: string | null;
}

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

/**
 * Map racecontrol cafe_items to the admin inventory UI shape.
 * Sorts by low_stock DESC, then category, then name (matching legacy behavior).
 */
function rcToInventoryShape(
  items: RcCafeItem[],
  categories: RcCafeCategory[]
): AdminInventoryItem[] {
  const catMap = new Map(categories.map((c) => [c.id, c.name]));

  const mapped: AdminInventoryItem[] = items.map((it) => ({
    id: it.id,
    item_name: it.name,
    category: catMap.get(it.category_id) || 'Uncategorized',
    quantity: it.stock_quantity,
    unit: 'pcs', // racecontrol has no unit field; default
    min_stock: it.low_stock_threshold,
    cost_per_unit: Math.round(it.cost_price_paise / 100),
    low_stock: it.stock_quantity <= it.low_stock_threshold ? 1 : 0,
    updated_at: it.updated_at,
  }));

  // Sort: low_stock items first, then by category, then by name
  mapped.sort((a, b) => {
    if (a.low_stock !== b.low_stock) return b.low_stock - a.low_stock;
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.item_name.localeCompare(b.item_name);
  });

  return mapped;
}

// --- Proxy route handlers ------------------------------------------------------------

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
    return NextResponse.json({
      items: rcToInventoryShape(items, cats),
      source: 'racecontrol',
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: 'proxy fetch failed', error_code: msg, hint: 'check RC_URL and admin token' },
      { status: 503 }
    );
  }
}

/**
 * Proxy POST: create a new inventory item via racecontrol.
 * Admin sends: {item_name, category, quantity, unit, min_stock, cost_per_unit}
 * Maps to CreateCafeItemRequest with selling_price_paise=0 (inventory-only items).
 */
async function proxyPost(req: NextRequest) {
  try {
    const body = await req.json();
    const { item_name, category, quantity, min_stock, cost_per_unit } = body as {
      item_name?: string;
      category?: string;
      quantity?: number;
      min_stock?: number;
      cost_per_unit?: number;
    };

    if (!item_name) {
      return NextResponse.json(
        { error: 'item_name required', error_code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const categoryId = await resolveCategory(req, category || 'General');

    const res = await proxyFetch(req, 'POST', '/cafe/items', {
      name: item_name,
      category_id: categoryId,
      selling_price_paise: 0, // inventory-only items have no selling price
      cost_price_paise: Math.round((cost_per_unit || 0) * 100),
      is_countable: true,
      stock_quantity: quantity || 0,
      low_stock_threshold: min_stock || 5,
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
 * Proxy PUT: update inventory item or adjust stock.
 * Two modes:
 * 1. Stock adjustment: {id, adjustment, type: "in"|"out"} -> POST /cafe/items/{id}/restock
 * 2. Field updates: {id, item_name, category, min_stock, cost_per_unit} -> PUT /cafe/items/{id}
 */
async function proxyPut(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, adjustment, type, item_name, category, quantity, min_stock, cost_per_unit } =
      body as {
        id?: string;
        adjustment?: number;
        type?: string;
        item_name?: string;
        category?: string;
        quantity?: number;
        min_stock?: number;
        cost_per_unit?: number;
      };

    if (!id) {
      return NextResponse.json(
        { error: 'id required', error_code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Stock adjustment mode
    if (adjustment !== undefined && type) {
      if (type === 'in') {
        // Restock: add quantity
        const res = await proxyFetch(req, 'POST', `/cafe/items/${id}/restock`, {
          quantity: adjustment,
        });
        if (!res.ok) {
          const errBody = await res.text();
          return NextResponse.json(
            { error: 'restock failed', error_code: 'RC_RESTOCK_FAILED', detail: errBody },
            { status: res.status >= 400 && res.status < 600 ? res.status : 502 }
          );
        }
        return NextResponse.json({ ok: true });
      } else if (type === 'out') {
        // Stock out: need to get current quantity and subtract
        // Use the restock endpoint with negative quantity (if supported)
        // or calculate new quantity and PUT it
        const itemsRes = await proxyFetch(req, 'GET', '/cafe/items');
        if (!itemsRes.ok) {
          return NextResponse.json(
            { error: 'could not fetch items to calculate stock', error_code: 'RC_CAFE_UNAVAILABLE' },
            { status: 502 }
          );
        }
        const itemsJson = (await itemsRes.json()) as { items?: RcCafeItem[] } | RcCafeItem[];
        const items = Array.isArray(itemsJson) ? itemsJson : itemsJson.items ?? [];
        const item = items.find((i) => i.id === id);
        if (!item) {
          return NextResponse.json(
            { error: 'item not found', error_code: 'NOT_FOUND' },
            { status: 404 }
          );
        }
        const newQty = Math.max(0, item.stock_quantity - adjustment);
        const res = await proxyFetch(req, 'PUT', `/cafe/items/${id}`, {
          stock_quantity: newQty,
        });
        if (!res.ok) {
          const errBody = await res.text();
          return NextResponse.json(
            { error: 'stock update failed', error_code: 'RC_UPDATE_FAILED', detail: errBody },
            { status: res.status >= 400 && res.status < 600 ? res.status : 502 }
          );
        }
        return NextResponse.json({ ok: true, quantity: newQty });
      } else {
        // Direct set (type = "adjustment")
        const res = await proxyFetch(req, 'PUT', `/cafe/items/${id}`, {
          stock_quantity: adjustment,
        });
        if (!res.ok) {
          const errBody = await res.text();
          return NextResponse.json(
            { error: 'stock set failed', error_code: 'RC_UPDATE_FAILED', detail: errBody },
            { status: res.status >= 400 && res.status < 600 ? res.status : 502 }
          );
        }
        return NextResponse.json({ ok: true, quantity: adjustment });
      }
    }

    // Field update mode
    const rcPayload: Record<string, unknown> = {};
    if (item_name !== undefined) rcPayload.name = item_name;
    if (min_stock !== undefined) rcPayload.low_stock_threshold = min_stock;
    if (quantity !== undefined) rcPayload.stock_quantity = quantity;
    if (cost_per_unit !== undefined) {
      rcPayload.cost_price_paise = Math.round(cost_per_unit * 100);
    }
    if (category !== undefined) {
      rcPayload.category_id = await resolveCategory(req, category);
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

// --- Legacy admin.db implementation (current default) --------------------------------

async function legacyGet() {
  try {
    const db = getDb();
    const items = db
      .prepare(
        `SELECT i.*,
        CASE WHEN i.quantity <= i.min_stock THEN 1 ELSE 0 END as low_stock
      FROM inventory i
      ORDER BY low_stock DESC, i.category, i.item_name`
      )
      .all();
    return NextResponse.json({ items });
  } catch (err) {
    return withAdminDbError(err);
  }
}

async function legacyPost(req: NextRequest) {
  try {
    const body = await req.json();
    const { item_name, category, quantity, unit, min_stock, cost_per_unit } = body;
    if (!item_name)
      return NextResponse.json({ error: 'item_name required' }, { status: 400 });

    const db = getDb();
    const result = db
      .prepare(
        'INSERT INTO inventory (item_name, category, quantity, unit, min_stock, cost_per_unit) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .run(
        item_name,
        category || 'General',
        quantity || 0,
        unit || 'pcs',
        min_stock || 5,
        cost_per_unit || 0
      );
    return NextResponse.json({ id: result.lastInsertRowid });
  } catch (err) {
    return withAdminDbError(err);
  }
}

async function legacyPut(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, adjustment, type, notes, ...updates } = body;
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const db = getDb();

    // Stock adjustment
    if (adjustment !== undefined && type) {
      const item = db.prepare('SELECT * FROM inventory WHERE id = ?').get(id) as
        | { quantity: number }
        | undefined;
      if (!item)
        return NextResponse.json({ error: 'Item not found' }, { status: 404 });

      const newQty =
        type === 'in'
          ? item.quantity + adjustment
          : type === 'out'
            ? item.quantity - adjustment
            : adjustment;
      db.prepare(
        'UPDATE inventory SET quantity = ?, updated_at = datetime("now") WHERE id = ?'
      ).run(newQty, id);
      db.prepare(
        'INSERT INTO stock_movements (inventory_id, type, quantity, notes) VALUES (?, ?, ?, ?)'
      ).run(id, type, adjustment, notes || null);
      return NextResponse.json({ ok: true, quantity: newQty });
    }

    // Field updates
    const fields: string[] = [];
    const values: unknown[] = [];
    for (const [k, v] of Object.entries(updates)) {
      if (
        ['item_name', 'category', 'quantity', 'unit', 'min_stock', 'cost_per_unit'].includes(k)
      ) {
        fields.push(`${k} = ?`);
        values.push(v);
      }
    }
    if (fields.length > 0) {
      fields.push('updated_at = datetime("now")');
      values.push(id);
      db.prepare(`UPDATE inventory SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    }
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
