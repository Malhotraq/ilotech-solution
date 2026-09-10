import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminCookieName, verifyAdminToken } from '@/lib/auth';
import { query, escapeLike } from '@/lib/db';

// BOM agar file CSV terbuka benar di Excel Windows (huruf Indonesia tidak rusak).
const BOM = String.fromCharCode(0xfeff);

// GET /api/admin/export?status=&q= — unduh CSV (dibuka di Excel).
// Filter sama seperti dashboard.
export async function GET(req) {
  const token = cookies().get(getAdminCookieName())?.value;
  if (!verifyAdminToken(token)) {
    return NextResponse.json({ error: 'Unauthorized. Silakan login admin.' }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(req.url);
    const status = (searchParams.get('status') || '').toUpperCase();
    const q = (searchParams.get('q') || '').trim();

    let rows;
    if (status) {
      const r = await query('SELECT * FROM orders WHERE status = $1 ORDER BY id DESC LIMIT 2000', [status]);
      rows = r.rows;
    } else if (q) {
      const like = `%${escapeLike(q)}%`;
      const r = await query(
        `SELECT * FROM orders WHERE kode ILIKE $1 ESCAPE '\\' OR nama ILIKE $1 ESCAPE '\\' OR wa ILIKE $1 ESCAPE '\\' OR layanan ILIKE $1 ESCAPE '\\' ORDER BY id DESC LIMIT 2000`,
        [like]
      );
      rows = r.rows;
    } else {
      const r = await query('SELECT * FROM orders ORDER BY id DESC LIMIT 2000');
      rows = r.rows;
    }

    const head = ['kode', 'nama', 'wa', 'kategori', 'layanan', 'status', 'estimasi_biaya', 'biaya_akhir', 'estimasi_selesai', 'rating', 'masuk', 'update'];
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [head.join(';')];
    for (const r of rows) {
      lines.push([r.kode, r.nama, r.wa, r.kategori, r.layanan, r.status, r.estimasi_biaya, r.biaya_akhir, r.estimasi_selesai, r.rating || 0, r.created_at, r.updated_at].map(esc).join(';'));
    }
    const csv = BOM + lines.join('\r\n');
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="ilotech-order-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (e) {
    console.error('GET /api/admin/export', e);
    return NextResponse.json({ error: 'Gagal export.' }, { status: 500 });
  }
}
