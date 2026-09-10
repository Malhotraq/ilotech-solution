import { NextResponse } from 'next/server';
import { query, rowToOrder, getLogs } from '@/lib/db';

// GET /api/orders/[kode] — detail + logs (dipakai bila butuh fetch client-side)
export async function GET(req, { params }) {
  try {
    const kode = String(params.kode || '').toUpperCase();
    const r = await query('SELECT * FROM orders WHERE kode = $1', [kode]);
    if (!r.rows.length) return NextResponse.json({ error: 'Order tidak ditemukan.' }, { status: 404 });
    return NextResponse.json({ order: rowToOrder(r.rows[0]), logs: await getLogs(r.rows[0].id) });
  } catch (e) {
    console.error('GET /api/orders/[kode]', e);
    return NextResponse.json({ error: 'Terjadi kesalahan server.' }, { status: 500 });
  }
}
