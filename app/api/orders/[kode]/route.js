import { NextResponse } from 'next/server';
import { getDb, rowToOrder, getLogs } from '@/lib/db';

// GET /api/orders/[kode] — detail + logs (dipakai bila butuh fetch client-side)
export async function GET(req, { params }) {
  try {
    const kode = String(params.kode || '').toUpperCase();
    const db = getDb();
    const row = db.prepare('SELECT * FROM orders WHERE kode = ?').get(kode);
    if (!row) return NextResponse.json({ error: 'Order tidak ditemukan.' }, { status: 404 });
    return NextResponse.json({ order: rowToOrder(row), logs: getLogs(db, row.id) });
  } catch (e) {
    console.error('GET /api/orders/[kode]', e);
    return NextResponse.json({ error: 'Terjadi kesalahan server.' }, { status: 500 });
  }
}
