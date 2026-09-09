import { NextResponse } from 'next/server';
import { getDb, generateKode, rowToOrder, addLog } from '@/lib/db';

function normalizeWa(input) {
  let w = String(input || '').replace(/[^0-9]/g, '');
  if (w.startsWith('0')) w = '62' + w.slice(1);
  else if (w.startsWith('8')) w = '62' + w;
  return w;
}

// POST /api/orders — buat order baru dari form publik
export async function POST(req) {
  try {
    const b = await req.json();
    const nama = String(b.nama || '').trim();
    const wa = normalizeWa(b.wa);
    const kategori = String(b.kategori || 'SERVICE').toUpperCase();
    const layanan = String(b.layanan || '').trim();
    const deskripsi = String(b.deskripsi || '').trim();
    const alamat = String(b.alamat || '').trim();
    const metodeAntar = String(b.metodeAntar || 'antar-sendiri');

    if (nama.length < 3) return NextResponse.json({ error: 'Nama minimal 3 huruf.' }, { status: 400 });
    if (wa.length < 10 || wa.length > 15) return NextResponse.json({ error: 'No. WA tidak valid. Contoh: 08123456789' }, { status: 400 });
    if (!['JASA', 'SERVICE'].includes(kategori)) return NextResponse.json({ error: 'Kategori tidak valid.' }, { status: 400 });
    if (!layanan) return NextResponse.json({ error: 'Layanan wajib dipilih.' }, { status: 400 });
    if (deskripsi.length < 10) return NextResponse.json({ error: 'Deskripsi minimal 10 karakter. Ceritakan keluhan lebih detail.' }, { status: 400 });
    if (metodeAntar === 'jemput' && alamat.length < 10) return NextResponse.json({ error: 'Alamat penjemputan minimal 10 karakter.' }, { status: 400 });

    const db = getDb();
    const kode = generateKode(db);

    const info = db
      .prepare(
        `INSERT INTO orders (kode, nama, wa, kategori, layanan, deskripsi, alamat, metode_antar, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'DITERIMA')`
      )
      .run(kode, nama, wa, kategori, layanan, deskripsi, alamat, metodeAntar);

    addLog(db, Number(info.lastInsertRowid), 'DITERIMA', 'Order diterima via website. Menunggu diagnosa teknisi.');

    const row = db.prepare('SELECT * FROM orders WHERE id = ?').get(info.lastInsertRowid);
    return NextResponse.json({ order: rowToOrder(row) }, { status: 201 });
  } catch (e) {
    console.error('POST /api/orders', e);
    return NextResponse.json({ error: 'Terjadi kesalahan server.' }, { status: 500 });
  }
}

// GET /api/orders?kode=ILS-xxx&wa=08xx — cari order (untuk halaman /lacak)
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const kode = (searchParams.get('kode') || '').trim().toUpperCase();
    const waRaw = (searchParams.get('wa') || '').trim();

    const db = getDb();
    let rows = [];

    if (kode) {
      const r = db.prepare('SELECT * FROM orders WHERE kode = ?').get(kode);
      if (r) rows = [r];
    } else if (waRaw) {
      const wa = waRaw.replace(/[^0-9]/g, '');
      // cocokkan 3 format: apa adanya, 08xx, dan 628xx (biar fleksibel)
      const alt = wa.startsWith('62') ? '0' + wa.slice(2) : wa.startsWith('0') ? '62' + wa.slice(1) : wa;
      rows = db
        .prepare(`SELECT * FROM orders WHERE wa IN (?, ?) OR wa LIKE ? ORDER BY id DESC LIMIT 20`)
        .all(wa, alt, `%${wa.slice(-8)}%`);
    } else {
      return NextResponse.json({ error: 'Isi kode atau wa.' }, { status: 400 });
    }

    return NextResponse.json({ orders: rows.map(rowToOrder) });
  } catch (e) {
    console.error('GET /api/orders', e);
    return NextResponse.json({ error: 'Terjadi kesalahan server.' }, { status: 500 });
  }
}
