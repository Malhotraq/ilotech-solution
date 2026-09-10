import { NextResponse } from 'next/server';
import { query, generateKode, rowToOrder, addLog } from '@/lib/db';
import { rateLimit, clientIp } from '@/lib/ratelimit';
import { notifyWa, siteUrl } from '@/lib/notify';
import { ADMIN_WA } from '@/lib/site';

export const MAX = {
  nama: 100,
  layanan: 100,
  deskripsi: 2000,
  alamat: 500,
};

function normalizeWa(input) {
  let w = String(input || '').replace(/[^0-9]/g, '');
  if (w.startsWith('0')) w = '62' + w.slice(1);
  else if (w.startsWith('8')) w = '62' + w;
  return w;
}

// POST /api/orders — buat order baru dari form publik
export async function POST(req) {
  // Anti-spam: maks 10 order / jam / IP (cukup untuk pemakaian normal,
  // menahan script iseng yang membanjiri database).
  const rl = rateLimit(`order:${clientIp(req)}`, 10, 60 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Terlalu banyak order dari jaringan ini. Coba lagi nanti atau chat WA admin.' },
      { status: 429 }
    );
  }
  try {
    const b = await req.json();
    const nama = String(b.nama || '').trim();
    const wa = normalizeWa(b.wa);
    const kategori = String(b.kategori || 'SERVICE').toUpperCase();
    const layanan = String(b.layanan || '').trim();
    const deskripsi = String(b.deskripsi || '').trim();
    const alamat = String(b.alamat || '').trim();
    const metodeAntar = String(b.metodeAntar || 'antar-sendiri');
    // Foto dari /api/uploads (opsional, maks 3). URL harus pola internal
    // agar tidak bisa diisi link luar / path aneh.
    const fotoUrls = Array.isArray(b.fotoUrls) ? b.fotoUrls : [];
    const polaFoto = /^\/api\/uploads\/[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp)$/i;
    if (fotoUrls.length > 3 || !fotoUrls.every((u) => typeof u === 'string' && polaFoto.test(u))) {
      return NextResponse.json({ error: 'Foto tidak valid. Upload ulang via form (maks 3, JPG/PNG/WebP).' }, { status: 400 });
    }

    if (nama.length < 3 || nama.length > MAX.nama) return NextResponse.json({ error: `Nama 3–${MAX.nama} huruf.` }, { status: 400 });
    if (wa.length < 10 || wa.length > 15) return NextResponse.json({ error: 'No. WA tidak valid. Contoh: 08123456789' }, { status: 400 });
    if (!['JASA', 'SERVICE'].includes(kategori)) return NextResponse.json({ error: 'Kategori tidak valid.' }, { status: 400 });
    if (!layanan || layanan.length > MAX.layanan) return NextResponse.json({ error: 'Layanan wajib dipilih.' }, { status: 400 });
    if (deskripsi.length < 10 || deskripsi.length > MAX.deskripsi) return NextResponse.json({ error: `Deskripsi 10–${MAX.deskripsi} karakter. Ceritakan keluhan lebih detail.` }, { status: 400 });
    if (alamat.length > MAX.alamat) return NextResponse.json({ error: `Alamat maksimal ${MAX.alamat} karakter.` }, { status: 400 });
    if (metodeAntar === 'jemput' && alamat.length < 10) return NextResponse.json({ error: 'Alamat penjemputan minimal 10 karakter.' }, { status: 400 });

    // INSERT dengan retry bila kode unik tabrakan (sangat jarang, hanya saat
    // dua order dibuat persis bersamaan). Postgres menolak via constraint UNIQUE (23505).
    let rows = null;
    let lastErr = null;
    for (let attempt = 0; attempt < 3 && !rows; attempt++) {
      const kode = await generateKode();
      try {
        const ins = await query(
          `INSERT INTO orders (kode, nama, wa, kategori, layanan, deskripsi, alamat, metode_antar, foto_urls, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'DITERIMA') RETURNING *`,
          [kode, nama, wa, kategori, layanan, deskripsi, alamat, metodeAntar, JSON.stringify(fotoUrls)]
        );
        rows = ins.rows;
      } catch (e) {
        if (e?.code === '23505') { lastErr = e; continue; }
        throw e;
      }
    }
    if (!rows) throw lastErr || new Error('Gagal membuat kode unik');

    await addLog(rows[0].id, 'DITERIMA', 'Order diterima via website. Menunggu diagnosa teknisi.');

    // Notifikasi WA ke admin (fire-and-forget; di-skip bila FONNTE_TOKEN kosong).
    notifyWa(
      ADMIN_WA,
      `🔔 ORDER BARU ${rows[0].kode}\n${nama} • ${layanan}\n"${deskripsi.slice(0, 120)}"\nCek: ${siteUrl()}/admin/dashboard`
    ).catch(() => {});

    return NextResponse.json({ order: rowToOrder(rows[0]) }, { status: 201 });
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

    let rows = [];

    if (kode) {
      const r = await query('SELECT * FROM orders WHERE kode = $1', [kode]);
      rows = r.rows;
    } else if (waRaw) {
      const wa = waRaw.replace(/[^0-9]/g, '');
      // Minimal 9 digit agar tidak bisa "memanen" order orang lain
      // dengan menebak 1-2 digit (cth: ?wa=1 dulu mengembalikan semua order).
      if (wa.length < 9) {
        return NextResponse.json({ error: 'No. WA minimal 9 digit.' }, { status: 400 });
      }
      // cocokkan 3 format: apa adanya, 08xx, dan 628xx (biar fleksibel).
      // Ekor 8 digit hanya berisi angka -> aman dipakai di LIKE.
      const alt = wa.startsWith('62') ? '0' + wa.slice(2) : wa.startsWith('0') ? '62' + wa.slice(1) : wa;
      const r = await query(
        `SELECT * FROM orders WHERE wa IN ($1,$2) OR wa LIKE $3 ORDER BY id DESC LIMIT 20`,
        [wa, alt, `%${wa.slice(-8)}%`]
      );
      rows = r.rows;
    } else {
      return NextResponse.json({ error: 'Isi kode atau wa.' }, { status: 400 });
    }

    return NextResponse.json({ orders: rows.map(rowToOrder) });
  } catch (e) {
    console.error('GET /api/orders', e);
    return NextResponse.json({ error: 'Terjadi kesalahan server.' }, { status: 500 });
  }
}
