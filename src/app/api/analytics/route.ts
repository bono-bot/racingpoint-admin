import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:3100';
const API_KEY = process.env.GATEWAY_API_KEY || 'rp-gateway-2026-secure-key';

export async function GET() {
  const db = getDb();

  // Sales by hour (peak hours analysis)
  const salesByHour = db.prepare(`
    SELECT
      CAST(strftime('%H', created_at) AS INTEGER) as hour,
      COUNT(*) as count,
      SUM(total_amount) as revenue
    FROM sales
    GROUP BY hour
    ORDER BY hour
  `).all() as { hour: number; count: number; revenue: number }[];

  // Fill in all 24 hours
  const hourlyData = Array.from({ length: 24 }, (_, i) => {
    const found = salesByHour.find(s => s.hour === i);
    return { hour: i, label: `${i.toString().padStart(2, '0')}:00`, count: found?.count || 0, revenue: found?.revenue || 0 };
  });

  // Revenue by day (last 30 days)
  const dailyRevenue = db.prepare(`
    SELECT sale_date as date, SUM(total_amount) as revenue, COUNT(*) as transactions
    FROM sales
    WHERE sale_date >= date('now', '-30 days')
    GROUP BY sale_date
    ORDER BY sale_date
  `).all();

  // Top menu items by quantity sold
  const topItems = db.prepare(`
    SELECT item_name, SUM(quantity) as total_qty, SUM(total) as total_revenue
    FROM sale_items
    GROUP BY item_name
    ORDER BY total_qty DESC
    LIMIT 15
  `).all();

  // Sales by payment method
  const paymentBreakdown = db.prepare(`
    SELECT payment_method, COUNT(*) as count, SUM(total_amount) as total
    FROM sales
    GROUP BY payment_method
  `).all();

  // Purchases by category (expense breakdown)
  const expenseBreakdown = db.prepare(`
    SELECT category, SUM(total_amount) as total, COUNT(*) as count
    FROM purchases
    GROUP BY category
    ORDER BY total DESC
  `).all();

  // Monthly revenue trend (last 12 months)
  const monthlyRevenue = db.prepare(`
    SELECT strftime('%Y-%m', sale_date) as month, SUM(total_amount) as revenue
    FROM sales
    GROUP BY month
    ORDER BY month
    LIMIT 12
  `).all();

  // Monthly expenses trend
  const monthlyExpenses = db.prepare(`
    SELECT strftime('%Y-%m', purchase_date) as month, SUM(total_amount) as expenses
    FROM purchases
    GROUP BY month
    ORDER BY month
    LIMIT 12
  `).all();

  // Booking stats from gateway
  let bookingStats = { total: 0, sources: { whatsapp: 0, discord: 0 } };
  try {
    const res = await fetch(`${GATEWAY_URL}/api/bookings?limit=1000`, {
      headers: { 'x-api-key': API_KEY },
    });
    if (res.ok) {
      const data = await res.json();
      const bookings = data.bookings || [];
      bookingStats.total = bookings.length;
      bookingStats.sources.whatsapp = bookings.filter((b: { source: string }) => b.source === 'whatsapp').length;
      bookingStats.sources.discord = bookings.filter((b: { source: string }) => b.source === 'discord').length;
    }
  } catch {
    // Gateway unavailable
  }

  // Inventory alerts
  const lowStock = db.prepare(`
    SELECT item_name, quantity, unit, min_stock
    FROM inventory
    WHERE quantity <= min_stock
  `).all();

  return NextResponse.json({
    hourlyData,
    dailyRevenue,
    topItems,
    paymentBreakdown,
    expenseBreakdown,
    monthlyRevenue,
    monthlyExpenses,
    bookingStats,
    lowStock,
  });
}
