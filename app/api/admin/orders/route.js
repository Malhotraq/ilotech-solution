import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminCookieName, verifyAdminToken } from '@/lib/auth';
import { query, rowToOrder, escapeLike } from '@/lib/db';
import { slaInfo, isValidStatus } from '@/lib/status';

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized. Silakan login admin.' }, { status: 401 });
}

function isAdmin() {
  const token = cookies().get(getAdminCookieName())?.value;
  return verifyAdminToken(token);
}

const TGL_OK = /^\d{4}-\d{2}-\d{2}$/;

// GET /api/admin/orders?status=&q=&dari=YYYY-MM-DD&sampai=YYYY-MM-DD — list untuk dashboard
export async function GET(req) {
  if (!isAdmin()) return unauthorized();
  try {
    const { searchParams } = new URL(req.url);
    const status = (searchParams.get('status') || '').toUpperCase();
    const q = (searchParams.get('q') || '').trim();
    const dari = (searchParams.get('dari') || '').trim();
    const sampai = (searchParams.get('sampai') || '').trim();

    if (status && !isValidStatus(status)) {
      return NextResponse.json({ error: 'Status tidak valid.' }, { status: 400 });
    }
    if ((dari && !TGL_OK.test(dari)) || (sampai && !TGL_OK.test(sampai))) {
      return NextResponse.json({ error: 'Format tanggal harus YYYY-MM-DD.' }, { status: 400 });
    }

    // Filter digabung dengan AND (status + tanggal + kata kunci boleh dipakai bersamaan).
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
    params.push(200);

    const r = await query(`SELECT * FROM orders ${where} ORDER BY id DESC LIMIT $${params.length}`, params);
    const rows = r.rows;

    // statistik sederhana
    const s = await query(`SELECT status, COUNT(*)::int c FROM orders GROUP BY status`);
    const stats = s.rows.reduce((a, r) => ({ ...a, [r.status]: r.c }), {});

    // ringkasan bisnis untuk kartu atas dashboard
    const aktif = await query(`SELECT COUNT(*)::int c FROM orders WHERE status NOT IN ('DIAMBIL','DIBATALKAN')`);
    const perhatian = await query(`SELECT COUNT(*)::int c FROM orders WHERE status IN ('DITERIMA','MENUNGGU_PERSETUJUAN')`);
    const omzet = await query(
      `SELECT COALESCE(SUM(biaya_akhir),0)::bigint t FROM orders
       WHERE status IN ('SELESAI','DIAMBIL')
       AND to_char(updated_at,'YYYY-MM') = to_char(now(),'YYYY-MM')`
    );
    const finance = {
      aktif: aktif.rows[0]?.c || 0,
      perhatian: perhatian.rows[0]?.c || 0,
      omzetBulanIni: Number(omzet.rows[0]?.t) || 0,
      lewatSla: 0,
    };

    // Hitung order aktif yang diam terlalu lama di satu status (lewat SLA).
    // Dilakukan di JS agar memakai definisi SLA yang sama dengan dashboard (lib/status.js).
    try {
      const a = await query(
        `SELECT status, updated_at FROM orders WHERE status NOT IN ('DIAMBIL','DIBATALKAN')`
      );
      finance.lewatSla = a.rows.filter((r) => slaInfo(r.status, r.updated_at).lewat).length;
    } catch {
      finance.lewatSla = 0; // statistik tambahan gagal -> jangan gagalkan seluruh request
    }

    // Omzet harian 14 hari terakhir untuk grafik dashboard
    // (order SELESAI/DIAMBIL dikelompokkan per tanggal selesai = updated_at).
    let grafik = [];
    try {
      const g = await query(
        `SELECT to_char(updated_at,'YYYY-MM-DD') t,
                COALESCE(SUM(biaya_akhir),0)::bigint omzet,
                COUNT(*)::int jml
         FROM orders
         WHERE status IN ('SELESAI','DIAMBIL') AND updated_at >= now() - interval '13 days'
         GROUP BY 1 ORDER BY 1`
      );
      grafik = g.rows.map((x) => ({ t: x.t, omzet: Number(x.omzet) || 0, jml: x.jml || 0 }));
    } catch {
      grafik = []; // grafik gagal -> dashboard tetap jalan tanpa grafik
    }

    return NextResponse.json({ orders: rows.map(rowToOrder), stats, finance, grafik });
  } catch (e) {
    console.error('GET /api/admin/orders', e);
    return NextResponse.json({ error: 'Gagal memuat.' }, { status: 500 });
  }
}
