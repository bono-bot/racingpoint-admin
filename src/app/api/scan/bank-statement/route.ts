import { NextRequest, NextResponse } from 'next/server';
import Tesseract from 'tesseract.js';
import { getDb } from '@/lib/db';

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:3100';
const API_KEY = process.env.GATEWAY_API_KEY || 'rp-gateway-2026-secure-key';

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let rawText = '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('statement') as File;
      if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });

      const fileName = file.name.toLowerCase();

      if (fileName.endsWith('.csv')) {
        // Parse CSV directly
        rawText = await file.text();
      } else {
        // Image — OCR it
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const { data: { text } } = await Tesseract.recognize(buffer, 'eng');
        rawText = text;
      }
    } else {
      // JSON body with raw text
      const body = await req.json();
      rawText = body.text || '';
    }

    if (!rawText.trim()) {
      return NextResponse.json({ error: 'No text to parse' }, { status: 422 });
    }

    // Send to Ollama for structured extraction
    const prompt = `Parse this bank statement text and extract individual transactions. Return ONLY valid JSON (no markdown, no explanation):

Bank Statement Text:
${rawText.slice(0, 3000)}

Return this exact JSON structure:
{
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "transaction description",
      "amount": 0,
      "type": "credit or debit"
    }
  ]
}

Rules:
- Each transaction should have date, description, amount, and type (credit/debit)
- Amount should always be positive
- If a transaction is a payment/expense, type is "debit"
- If a transaction is a deposit/receipt, type is "credit"
Always return valid JSON.`;

    const ollamaRes = await fetch(`${GATEWAY_URL}/api/ollama/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    let transactions: { date: string; description: string; amount: number; type: string }[] = [];
    if (ollamaRes.ok) {
      const ollamaData = await ollamaRes.json();
      const reply = ollamaData.reply || '';
      const jsonMatch = reply.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          transactions = parsed.transactions || [];
        } catch {
          // AI returned invalid JSON
        }
      }
    }

    // Try to match transactions against existing purchases and sales
    const db = getDb();
    const purchases = db.prepare('SELECT id, vendor, total_amount, purchase_date FROM purchases').all() as {
      id: number; vendor: string; total_amount: number; purchase_date: string;
    }[];
    const sales = db.prepare('SELECT id, bill_number, total_amount, sale_date FROM sales').all() as {
      id: number; bill_number: string; total_amount: number; sale_date: string;
    }[];

    const matched = transactions.map(tx => {
      let match: { type: 'purchase' | 'sale'; id: number; label: string } | null = null;

      // Try to match by amount and approximate date
      if (tx.type === 'debit') {
        const found = purchases.find(p =>
          Math.abs(p.total_amount - tx.amount) < 1 &&
          Math.abs(new Date(p.purchase_date).getTime() - new Date(tx.date).getTime()) < 3 * 86400000
        );
        if (found) match = { type: 'purchase', id: found.id, label: `Purchase from ${found.vendor}` };
      } else {
        const found = sales.find(s =>
          Math.abs(s.total_amount - tx.amount) < 1 &&
          Math.abs(new Date(s.sale_date).getTime() - new Date(tx.date).getTime()) < 3 * 86400000
        );
        if (found) match = { type: 'sale', id: found.id, label: `Sale ${found.bill_number}` };
      }

      return { ...tx, match };
    });

    return NextResponse.json({
      raw_text: rawText.slice(0, 500),
      transactions: matched,
      total_parsed: matched.length,
      total_matched: matched.filter(t => t.match).length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Parse failed', message }, { status: 500 });
  }
}

// Save parsed transactions to DB
export async function PUT(req: NextRequest) {
  try {
    const { transactions } = await req.json();
    if (!transactions || !Array.isArray(transactions)) {
      return NextResponse.json({ error: 'transactions array required' }, { status: 400 });
    }

    const db = getDb();
    const stmt = db.prepare(
      'INSERT INTO bank_transactions (transaction_date, description, amount, type, matched_purchase_id, matched_sale_id, raw_text) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );

    const tx = db.transaction(() => {
      for (const t of transactions) {
        stmt.run(
          t.date, t.description, t.amount, t.type,
          t.match?.type === 'purchase' ? t.match.id : null,
          t.match?.type === 'sale' ? t.match.id : null,
          JSON.stringify(t),
        );
      }
    });
    tx();

    return NextResponse.json({ ok: true, saved: transactions.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Save failed', message }, { status: 500 });
  }
}
