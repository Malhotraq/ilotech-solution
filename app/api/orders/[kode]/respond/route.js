import { NextResponse } from 'next/server';
import { query, rowToOrder, addLog } from '@/lib/db';
import { rateLimit, clientIp } from '@/lib/ratelimit';
import { notifyWa, siteUrl } from '@/lib/notify';
import { ADMIN_WA } from '@/lib/site';

// POST /api/orders/[kode]/respond  { action: 'setuju' | 'tolak' }
// Tombol persetujuan biaya di halaman /lacak/[kode] (hanya saat MENUNGGU_PERSETUJUAN).
// Kode tracking = "kunci"nya: siapa pun yang pegang kode dianggap pemilik order.
export async function POST(req, { params }) {
  const rl = rateLimit(`respond:${clientIp(req)}`, 20, 60 * 60 * 1000);
  if (!rl.ok) return NextResponse.json({ error: 'Terlalu banyak percobaan. Coba lagi nanti.' }, { status: 429 });
  try {
    const { action } = await req.json();
    if (!['setuju', 'tolak'].includes(action)) {
      return NextResponse.json({ error: 'Aksi tidak valid.' }, { status: 400 });
    }
    const kode = String(params.kode || '').toUpperCase();
    const r = await query('SELECT * FROM orders WHERE kode = $1', [kode]);
    if (!r.rows.length) return NextResponse.json({ error: 'Order tidak ditemukan.' }, { status: 404 });
    const row = r.rows[0];
    if (row.status !== 'MENUNGGU_PERSETUJUAN') {
      return NextResponse.json({ error: 'Order ini tidak sedang menunggu persetujuan.' }, { status: 409 });
    }

    if (action === 'setuju') {
      await query(
        `UPDATE orders SET status='DIKERJAKAN', approved_at=now(), updated_at=now() WHERE id=$1`,
        [row.id]
      );
      await addLog(row.id, 'DIKERJAKAN', 'Pelanggan MENYETUJUI estimasi biaya via website. Silakan dikerjakan.', 'pelanggan');
      notifyWa(ADMIN_WA, `✅ ${kode} DISETUJUI pelanggan. Estimasi Rp ${Number(row.estimasi_biaya).toLocaleString('id-ID')}. Segera kerjakan: ${siteUrl()}/admin/dashboard`).catch(() => {});
    } else {
      await query(`UPDATE orders SET status='DIAGNOSA', updated_at=now() WHERE id=$1`, [row.id]);
      await addLog(row.id, 'DIAGNOSA', 'Pelanggan MENOLAK estimasi biaya. Hubungi via WA untuk revisi/negosiasi.', 'pelanggan');
      notifyWa(ADMIN_WA, `❌ ${kode} DITOLAK pelanggan. Hubungi & revisi estimasi: ${siteUrl()}/admin/dashboard`).catch(() => {});
    }

    const updated = await query('SELECT * FROM orders WHERE id = $1', [row.id]);
    return NextResponse.json({ order: rowToOrder(updated.rows[0]) });
  } catch (e) {
    console.error('POST /api/orders/[kode]/respond', e);
    return NextResponse.json({ error: 'Gagal memproses.' }, { status: 500 });
  }
}
