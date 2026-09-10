import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminCookieName, verifyAdminToken } from '@/lib/auth';
import { query, rowToOrder, addLog, getLogs } from '@/lib/db';
import { isValidStatus, STATUS_LABEL } from '@/lib/status';
import { notifyWa, siteUrl } from '@/lib/notify';

function isAdmin() {
  const token = cookies().get(getAdminCookieName())?.value;
  return verifyAdminToken(token);
}

// ID harus angka; "1 OR 1=1" dsb langsung 404 (tidak sampai ke SQL).
function idValid(id) {
  return /^\d+$/.test(String(id || ''));
}

// GET /api/admin/orders/[id] — detail + logs (untuk modal edit admin)
export async function GET(req, { params }) {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!idValid(params.id)) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 });
  const r = await query('SELECT * FROM orders WHERE id = $1', [params.id]);
  if (!r.rows.length) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 });
  const row = r.rows[0];
  return NextResponse.json({ order: rowToOrder(row), logs: await getLogs(row.id) });
}

// PATCH /api/admin/orders/[id]
// body: { status?, estimasiBiaya?, biayaAkhir?, estimasiSelesai?, catatanAdmin?, catatanLog? }
export async function PATCH(req, { params }) {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!idValid(params.id)) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 });
  try {
    const b = await req.json();
    const r = await query('SELECT * FROM orders WHERE id = $1', [params.id]);
    if (!r.rows.length) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 });
    const row = r.rows[0];

    const status = b.status ? String(b.status).toUpperCase() : row.status;
    if (!isValidStatus(status)) return NextResponse.json({ error: 'Status tidak valid.' }, { status: 400 });

    // Biaya: harus angka wajar (0 – 999 jt). Tolak negatif/NaN agar tidak merusak nota.
    const MAX_BIAYA = 999999999;
    const estimasiBiaya = b.estimasiBiaya !== undefined ? Number(b.estimasiBiaya) : Number(row.estimasi_biaya);
    const biayaAkhir = b.biayaAkhir !== undefined ? Number(b.biayaAkhir) : Number(row.biaya_akhir);
    if (![estimasiBiaya, biayaAkhir].every((n) => Number.isFinite(n) && n >= 0 && n <= MAX_BIAYA)) {
      return NextResponse.json({ error: 'Biaya harus angka 0 – 999.999.999.' }, { status: 400 });
    }
    const estimasiSelesai = b.estimasiSelesai !== undefined ? String(b.estimasiSelesai).slice(0, 200) : row.estimasi_selesai;
    const catatanAdmin = b.catatanAdmin !== undefined ? String(b.catatanAdmin).slice(0, 2000) : row.catatan_admin;
    const catatanLog = String(b.catatanLog || '').trim().slice(0, 1000);

    const updated = await query(
      `UPDATE orders SET status=$1, estimasi_biaya=$2, biaya_akhir=$3, estimasi_selesai=$4, catatan_admin=$5, updated_at=now()
       WHERE id=$6 RETURNING *`,
      [status, Math.round(estimasiBiaya), Math.round(biayaAkhir), estimasiSelesai, catatanAdmin, params.id]
    );

    // selalu catat log bila status berubah ATAU ada catatanLog
    if (status !== row.status || catatanLog) {
      await addLog(Number(params.id), status, catatanLog || `Status diubah ${row.status} → ${status}`, 'admin');
    }

    // Notifikasi WA otomatis ke pelanggan bila status BERUBAH
    // (fire-and-forget; di-skip bila FONNTE_TOKEN kosong).
    if (status !== row.status) {
      const label = STATUS_LABEL[status] || status;
      notifyWa(
        row.wa,
        `🔧 IloTech: order ${row.kode} → *${label}*${catatanAdmin ? `\nCatatan: ${String(catatanAdmin).slice(0, 200)}` : ''}\nCek detail: ${siteUrl()}/lacak/${row.kode}`
      ).catch(() => {});
    }

    return NextResponse.json({ order: rowToOrder(updated.rows[0]), logs: await getLogs(updated.rows[0].id) });
  } catch (e) {
    console.error('PATCH admin order', e);
    return NextResponse.json({ error: 'Gagal update.' }, { status: 500 });
  }
}

// DELETE /api/admin/orders/[id] — hapus (hati-hati, untuk data spam/salah)
export async function DELETE(req, { params }) {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!idValid(params.id)) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 });
  await query('DELETE FROM orders WHERE id = $1', [params.id]);
  return NextResponse.json({ ok: true });
}
