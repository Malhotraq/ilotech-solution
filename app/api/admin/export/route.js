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
    const dari = (searchParams.get('dari') || '').trim();
    const sampai = (searchParams.get('sampai') || '').trim();
    const TGL_OK = /^\d{4}-\d{2}-\d{2}$/;
    if ((dari && !TGL_OK.test(dari)) || (sampai && !TGL_OK.test(sampai))) {
      return NextResponse.json({ error: 'Format tanggal harus YYYY-MM-DD.' }, { status: 400 });
    }

    // Filter sama seperti dashboard (boleh digabung).
    const conds = [];
    const params = [];
    if (status) {
      params.push(status);
      conds.push(`status = $${params.length}`);
    }
    if (dari) {
      params.push(dari);
      conds.push(`created_at::date >= $${params.length}::date`);
    }
    if (sampai) {
      params.push(sampai);
      conds.push(`created_at::date <= $${params.length}::date`);
    }
    if (q) {
      params.push(`%${escapeLike(q)}%`);
      conds.push(`(kode ILIKE $${params.length} ESCAPE '\\' OR nama ILIKE $${params.length} ESCAPE '\\' OR wa ILIKE $${params.length} ESCAPE '\\' OR layanan ILIKE $${params.length} ESCAPE '\\')`);
    }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    params.push(2000);
    const r = await query(`SELECT * FROM orders ${where} ORDER BY id DESC LIMIT $${params.length}`, params);
    const rows = r.rows;

    const head = ['kode', 'nama', 'wa', 'kategori', 'layanan', 'status', 'estimasi_biaya', 'biaya_akhir', 'estimasi_selesai', 'rating', 'masuk', 'update'];
    // Anti CSV-formula-injection: sel yang diawali = + - @ (atau tab/CR) bisa
    // dieksekusi sebagai formula saat dibuka di Excel. Awali dengan "'" agar
    // selalu diperlakukan sebagai teks.
    const esc = (v) => {
      let s = String(v ?? '');
      if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
      return `"${s.replace(/"/g, '""')}"`;
    };
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
