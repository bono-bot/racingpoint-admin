import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const db = getDb();

  const totalSales = db.prepare('SELECT COALESCE(SUM(total_amount), 0) as total FROM sales').get() as { total: number };
  const totalPurchases = db.prepare('SELECT COALESCE(SUM(total_amount), 0) as total FROM purchases').get() as { total: number };
  const todayStr = new Date().toISOString().slice(0, 10);
  const todaySales = db.prepare('SELECT COALESCE(SUM(total_amount), 0) as total FROM sales WHERE sale_date = ?').get(todayStr) as { total: number };
  const todayPurchases = db.prepare('SELECT COALESCE(SUM(total_amount), 0) as total FROM purchases WHERE purchase_date = ?').get(todayStr) as { total: number };

  // Last 30 days daily revenue
  const dailyRevenue = db.prepare(`
    SELECT sale_date as date, SUM(total_amount) as revenue
    FROM sales
    WHERE sale_date >= date('now', '-30 days')
    GROUP BY sale_date
    ORDER BY sale_date
  `).all();

  // Sales by payment method
  const byPayment = db.prepare(`
    SELECT payment_method, COUNT(*) as count, SUM(total_amount) as total
    FROM sales
    GROUP BY payment_method
  `).all();

  // Top selling items
  const topItems = db.prepare(`
    SELECT item_name, SUM(quantity) as total_qty, SUM(total) as total_revenue
    FROM sale_items
    GROUP BY item_name
    ORDER BY total_qty DESC
    LIMIT 10
  `).all();

  // Purchases by category
  const purchasesByCategory = db.prepare(`
    SELECT category, COUNT(*) as count, SUM(total_amount) as total
    FROM purchases
    GROUP BY category
  `).all();

  return NextResponse.json({
    summary: {
      totalSales: totalSales.total,
      totalPurchases: totalPurchases.total,
      netProfit: totalSales.total - totalPurchases.total,
      todaySales: todaySales.total,
      todayPurchases: todayPurchases.total,
    },
    dailyRevenue,
    byPayment,
    topItems,
    purchasesByCategory,
  });
}
