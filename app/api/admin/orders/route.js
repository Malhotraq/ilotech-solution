import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminCookieName, verifyAdminToken } from '@/lib/auth';
import { query, rowToOrder, escapeLike } from '@/lib/db';

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized. Silakan login admin.' }, { status: 401 });
}

function isAdmin() {
  const token = cookies().get(getAdminCookieName())?.value;
  return verifyAdminToken(token);
}

// GET /api/admin/orders?status=&q= — list untuk dashboard
export async function GET(req) {
  if (!isAdmin()) return unauthorized();
  try {
    const { searchParams } = new URL(req.url);
    const status = (searchParams.get('status') || '').toUpperCase();
    const q = (searchParams.get('q') || '').trim();

    let rows;
    if (status) {
      const r = await query('SELECT * FROM orders WHERE status = $1 ORDER BY id DESC LIMIT 200', [status]);
      rows = r.rows;
    } else if (q) {
      const like = `%${escapeLike(q)}%`;
      const r = await query(
        `SELECT * FROM orders WHERE kode ILIKE $1 ESCAPE '\\' OR nama ILIKE $1 ESCAPE '\\' OR wa ILIKE $1 ESCAPE '\\' OR layanan ILIKE $1 ESCAPE '\\' ORDER BY id DESC LIMIT 200`,
        [like]
      );
      rows = r.rows;
    } else {
      const r = await query('SELECT * FROM orders ORDER BY id DESC LIMIT 200');
      rows = r.rows;
    }

    // statistik sederhana
    const s = await query(`SELECT status, COUNT(*)::int c FROM orders GROUP BY status`);
    const stats = s.rows.reduce((a, r) => ({ ...a, [r.status]: r.c }), {});

    // ringkasan bisnis untuk kartu atas dashboard
    const aktif = await query(`SELECT COUNT(*)::int c FROM orders WHERE status NOT IN ('DIAMBIL','DIBATALKAN')`);
    const perhatian = await query(`SELECT COUNT(*)::int c FROM orders WHERE status IN ('DITERIMA','MENUNGGU_PERSETUJUAN')`);
    const omzet = await query(
      `SELECT COALESCE(SUM(biaya_akhir),0)::bigint t FROM orders
       WHERE status IN ('SELESAI','DIAMBIL')
       AND to_char(created_at,'YYYY-MM') = to_char(now(),'YYYY-MM')`
    );
    const finance = {
      aktif: aktif.rows[0]?.c || 0,
      perhatian: perhatian.rows[0]?.c || 0,
      omzetBulanIni: Number(omzet.rows[0]?.t) || 0,
    };

    return NextResponse.json({ orders: rows.map(rowToOrder), stats, finance });
  } catch (e) {
    console.error('GET /api/admin/orders', e);
    return NextResponse.json({ error: 'Gagal memuat.' }, { status: 500 });
  }
}
