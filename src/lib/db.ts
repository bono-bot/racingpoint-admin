import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'admin.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    const fs = require('fs');
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initTables(db);
  }
  return db;
}

function initTables(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS menu_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      name TEXT NOT NULL,
      price INTEGER NOT NULL,
      veg INTEGER DEFAULT 1,
      available INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_name TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL DEFAULT 'General',
      quantity REAL NOT NULL DEFAULT 0,
      unit TEXT NOT NULL DEFAULT 'pcs',
      min_stock REAL NOT NULL DEFAULT 5,
      cost_per_unit REAL DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS stock_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inventory_id INTEGER NOT NULL REFERENCES inventory(id),
      type TEXT NOT NULL CHECK(type IN ('in', 'out', 'adjustment')),
      quantity REAL NOT NULL,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vendor TEXT NOT NULL,
      invoice_number TEXT,
      total_amount REAL NOT NULL,
      purchase_date TEXT NOT NULL,
      category TEXT DEFAULT 'General',
      notes TEXT,
      receipt_url TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS purchase_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_id INTEGER NOT NULL REFERENCES purchases(id),
      item_name TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit_price REAL NOT NULL,
      total REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bill_number TEXT UNIQUE,
      customer_name TEXT,
      total_amount REAL NOT NULL,
      payment_method TEXT DEFAULT 'cash',
      sale_date TEXT NOT NULL,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL REFERENCES sales(id),
      menu_item_id INTEGER REFERENCES menu_items(id),
      item_name TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL,
      total REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bank_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_date TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('credit', 'debit')),
      matched_purchase_id INTEGER REFERENCES purchases(id),
      matched_sale_id INTEGER REFERENCES sales(id),
      raw_text TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Seed menu if empty
  const count = db.prepare('SELECT COUNT(*) as c FROM menu_items').get() as { c: number };
  if (count.c === 0) {
    seedMenu(db);
  }
}

function seedMenu(db: Database.Database) {
  const items = [
    // Starters
    ['Starters', 'Veg Spring Rolls', 199, 1],
    ['Starters', 'Paneer Tikka', 249, 1],
    ['Starters', 'Chicken Tikka', 279, 0],
    ['Starters', 'Chicken Wings (6 pcs)', 299, 0],
    ['Starters', 'French Fries', 149, 1],
    ['Starters', 'Loaded Nachos (Veg)', 199, 1],
    ['Starters', 'Loaded Nachos (Chicken)', 249, 0],
    // Burgers
    ['Burgers', 'Classic Veg Burger', 179, 1],
    ['Burgers', 'Paneer Burger', 199, 1],
    ['Burgers', 'Chicken Burger', 219, 0],
    ['Burgers', 'Double Chicken Burger', 299, 0],
    // Pizzas
    ['Pizzas', 'Margherita', 199, 1],
    ['Pizzas', 'Farm Fresh (Veg)', 249, 1],
    ['Pizzas', 'Chicken Tikka Pizza', 279, 0],
    ['Pizzas', 'BBQ Chicken Pizza', 299, 0],
    // Sandwiches & Wraps
    ['Sandwiches & Wraps', 'Veg Club Sandwich', 179, 1],
    ['Sandwiches & Wraps', 'Chicken Club Sandwich', 219, 0],
    ['Sandwiches & Wraps', 'Paneer Wrap', 189, 1],
    ['Sandwiches & Wraps', 'Chicken Wrap', 219, 0],
    // Pasta
    ['Pasta', 'Penne Arrabiata (Veg)', 219, 1],
    ['Pasta', 'Alfredo Pasta (Veg)', 229, 1],
    ['Pasta', 'Chicken Alfredo Pasta', 269, 0],
    ['Pasta', 'Chicken Penne Arrabiata', 249, 0],
    // Rice Bowls
    ['Rice Bowls', 'Veg Fried Rice', 179, 1],
    ['Rice Bowls', 'Chicken Fried Rice', 219, 0],
    ['Rice Bowls', 'Egg Fried Rice', 189, 1],
    // Beverages
    ['Beverages', 'Cold Coffee', 149, 1],
    ['Beverages', 'Iced Tea (Lemon/Peach)', 129, 1],
    ['Beverages', 'Fresh Lime Soda', 99, 1],
    ['Beverages', 'Mango Shake', 159, 1],
    ['Beverages', 'Oreo Shake', 169, 1],
    ['Beverages', 'Brownie Shake', 179, 1],
    ['Beverages', 'Soft Drinks', 49, 1],
    ['Beverages', 'Water Bottle', 20, 1],
    // Desserts
    ['Desserts', 'Brownie with Ice Cream', 199, 1],
    ['Desserts', 'Chocolate Lava Cake', 229, 1],
  ];

  const stmt = db.prepare('INSERT INTO menu_items (category, name, price, veg) VALUES (?, ?, ?, ?)');
  const tx = db.transaction(() => {
    for (const item of items) {
      stmt.run(...item);
    }
  });
  tx();
}
