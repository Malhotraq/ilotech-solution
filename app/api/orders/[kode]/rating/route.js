import { NextResponse } from 'next/server';
import { query, rowToOrder } from '@/lib/db';
import { rateLimit, clientIp } from '@/lib/ratelimit';

// POST /api/orders/[kode]/rating  { rating: 1-5, ulasan?: maks 500 }
// Bisa diisi sekali, setelah order SELESAI/DIAMBIL. Testimoni tampil di landing.
export async function POST(req, { params }) {
  const rl = rateLimit(`rating:${clientIp(req)}`, 20, 60 * 60 * 1000);
  if (!rl.ok) return NextResponse.json({ error: 'Terlalu banyak percobaan. Coba lagi nanti.' }, { status: 429 });
  try {
    const b = await req.json();
    const rating = Number(b.rating);
    const ulasan = String(b.ulasan || '').trim().slice(0, 500);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating harus 1–5.' }, { status: 400 });
    }
    const kode = String(params.kode || '').toUpperCase();
    const r = await query('SELECT * FROM orders WHERE kode = $1', [kode]);
    if (!r.rows.length) return NextResponse.json({ error: 'Order tidak ditemukan.' }, { status: 404 });
    const row = r.rows[0];
    if (!['SELESAI', 'DIAMBIL'].includes(row.status)) {
      return NextResponse.json({ error: 'Rating hanya bisa diisi setelah order selesai.' }, { status: 409 });
    }
    if (Number(row.rating) > 0) {
      return NextResponse.json({ error: 'Order ini sudah dirating. Terima kasih!' }, { status: 409 });
    }
    const updated = await query(
      `UPDATE orders SET rating=$1, ulasan=$2, updated_at=now() WHERE id=$3 RETURNING *`,
      [rating, ulasan, row.id]
    );
    return NextResponse.json({ order: rowToOrder(updated.rows[0]) });
  } catch (e) {
    console.error('POST /api/orders/[kode]/rating', e);
    return NextResponse.json({ error: 'Gagal menyimpan rating.' }, { status: 500 });
  }
}
