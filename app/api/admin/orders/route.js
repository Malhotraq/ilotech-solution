import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminCookieName, verifyAdminToken } from '@/lib/auth';
import { getDb, rowToOrder } from '@/lib/db';

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

    const db = getDb();
    let rows;
    if (status) {
      rows = db.prepare('SELECT * FROM orders WHERE status = ? ORDER BY id DESC LIMIT 200').all(status);
    } else if (q) {
      const like = `%${q}%`;
      rows = db
        .prepare(
          `SELECT * FROM orders WHERE kode LIKE ? OR nama LIKE ? OR wa LIKE ? OR layanan LIKE ? ORDER BY id DESC LIMIT 200`
        )
        .all(like, like, like, like);
    } else {
      rows = db.prepare('SELECT * FROM orders ORDER BY id DESC LIMIT 200').all();
    }

    // statistik sederhana
    const stats = db
      .prepare(`SELECT status, COUNT(*) c FROM orders GROUP BY status`)
      .all()
      .reduce((a, r) => ({ ...a, [r.status]: r.c }), {});

    return NextResponse.json({ orders: rows.map(rowToOrder), stats });
  } catch (e) {
    console.error('GET /api/admin/orders', e);
    return NextResponse.json({ error: 'Gagal memuat.' }, { status: 500 });
  }
}
