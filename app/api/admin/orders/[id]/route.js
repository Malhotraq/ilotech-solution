import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminCookieName, verifyAdminToken } from '@/lib/auth';
import { getDb, rowToOrder, addLog, getLogs } from '@/lib/db';
import { isValidStatus } from '@/lib/status';

function isAdmin() {
  const token = cookies().get(getAdminCookieName())?.value;
  return verifyAdminToken(token);
}

// GET /api/admin/orders/[id] — detail + logs (untuk modal edit admin)
export async function GET(req, { params }) {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const db = getDb();
  const row = db.prepare('SELECT * FROM orders WHERE id = ?').get(params.id);
  if (!row) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 });
  return NextResponse.json({ order: rowToOrder(row), logs: getLogs(db, row.id) });
}

// PATCH /api/admin/orders/[id]
// body: { status?, estimasiBiaya?, biayaAkhir?, estimasiSelesai?, catatanAdmin?, catatanLog? }
export async function PATCH(req, { params }) {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const b = await req.json();
    const db = getDb();
    const row = db.prepare('SELECT * FROM orders WHERE id = ?').get(params.id);
    if (!row) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 });

    const status = b.status ? String(b.status).toUpperCase() : row.status;
    if (!isValidStatus(status)) return NextResponse.json({ error: 'Status tidak valid.' }, { status: 400 });

    const estimasiBiaya = b.estimasiBiaya !== undefined ? Number(b.estimasiBiaya) || 0 : row.estimasi_biaya;
    const biayaAkhir = b.biayaAkhir !== undefined ? Number(b.biayaAkhir) || 0 : row.biaya_akhir;
    const estimasiSelesai = b.estimasiSelesai !== undefined ? String(b.estimasiSelesai) : row.estimasi_selesai;
    const catatanAdmin = b.catatanAdmin !== undefined ? String(b.catatanAdmin) : row.catatan_admin;
    const catatanLog = String(b.catatanLog || '').trim();

    db.prepare(
      `UPDATE orders SET status=?, estimasi_biaya=?, biaya_akhir=?, estimasi_selesai=?, catatan_admin=?, updated_at=datetime('now','localtime') WHERE id=?`
    ).run(status, estimasiBiaya, biayaAkhir, estimasiSelesai, catatanAdmin, params.id);

    // selalu catat log bila status berubah ATAU ada catatanLog
    if (status !== row.status || catatanLog) {
      addLog(db, Number(params.id), status, catatanLog || `Status diubah ${row.status} → ${status}`);
    }

    const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(params.id);
    return NextResponse.json({ order: rowToOrder(updated), logs: getLogs(db, updated.id) });
  } catch (e) {
    console.error('PATCH admin order', e);
    return NextResponse.json({ error: 'Gagal update.' }, { status: 500 });
  }
}

// DELETE /api/admin/orders/[id] — hapus (hati-hati, untuk data spam/salah)
export async function DELETE(req, { params }) {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const db = getDb();
  db.prepare('DELETE FROM orders WHERE id = ?').run(params.id);
  return NextResponse.json({ ok: true });
}
