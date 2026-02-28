import { NextRequest, NextResponse } from 'next/server';
import Tesseract from 'tesseract.js';

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:3100';
const API_KEY = process.env.GATEWAY_API_KEY || 'rp-gateway-2026-secure-key';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('receipt') as File;
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // OCR with Tesseract
    const { data: { text } } = await Tesseract.recognize(buffer, 'eng');

    if (!text.trim()) {
      return NextResponse.json({ error: 'Could not extract text from image' }, { status: 422 });
    }

    // Send OCR text to Ollama for structured extraction
    const prompt = `Extract purchase/receipt information from this OCR text and return ONLY valid JSON (no markdown, no explanation):

OCR Text:
${text}

Return this exact JSON structure:
{
  "vendor": "store/vendor name",
  "invoice_number": "invoice or receipt number if visible, or null",
  "purchase_date": "YYYY-MM-DD format if visible, or today's date",
  "category": "one of: Kitchen Supplies, Beverages, Equipment, Maintenance, Utilities, Other",
  "items": [
    {"item_name": "item description", "quantity": 1, "unit_price": 0, "total": 0}
  ],
  "total_amount": 0
}

If you cannot determine a value, use reasonable defaults. Always return valid JSON.`;

    const ollamaRes = await fetch(`${GATEWAY_URL}/api/ollama/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    let extracted = null;
    if (ollamaRes.ok) {
      const ollamaData = await ollamaRes.json();
      const reply = ollamaData.reply || '';
      // Try to parse JSON from the reply
      const jsonMatch = reply.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          extracted = JSON.parse(jsonMatch[0]);
        } catch {
          // AI returned invalid JSON
        }
      }
    }

    return NextResponse.json({
      ocr_text: text,
      extracted: extracted || {
        vendor: '',
        invoice_number: null,
        purchase_date: new Date().toISOString().slice(0, 10),
        category: 'Other',
        items: [],
        total_amount: 0,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Scan failed', message }, { status: 500 });
  }
}
