// lib/db.js
// Postgres via node-postgres (pg, pure-JS tanpa native build).
// Koneksi dari DATABASE_URL, mis: postgres://ilotech:RAHASIA@db:5432/ilotech
//   - Lokal (tanpa Docker): arahkan ke Postgres lokal / Neon / Supabase.
//   - Docker: diisi otomatis oleh docker-compose.yml (service `db`).
//
// Pool di-cache per proses. Di dev (hot-reload) pakai globalThis agar tidak
// membocorkan koneksi tiap reload.

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

function getPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL belum diisi. Copy .env.example jadi .env lalu isi.');
  }
  if (!globalThis.__ilotechPool) {
    globalThis.__ilotechPool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 8000,
    });
  }
  return globalThis.__ilotechPool;
}

let _schemaSiap = false;

// Skema + migrasi ringan (idempotent, aman dijalankan tiap start).
export async function ensureSchema() {
  if (_schemaSiap) return;
  const pool = getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      kode TEXT UNIQUE NOT NULL,
      nama TEXT NOT NULL,
      wa TEXT NOT NULL,
      kategori TEXT NOT NULL,
      layanan TEXT NOT NULL,
      deskripsi TEXT NOT NULL,
      alamat TEXT DEFAULT '',
      metode_antar TEXT DEFAULT 'antar-sendiri',
      status TEXT DEFAULT 'DITERIMA',
      estimasi_biaya INTEGER DEFAULT 0,
      biaya_akhir INTEGER DEFAULT 0,
      estimasi_selesai TEXT DEFAULT '',
      catatan_admin TEXT DEFAULT '',
      foto_urls TEXT DEFAULT '[]',
      rating INTEGER DEFAULT 0,
      ulasan TEXT DEFAULT '',
      approved_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS status_logs (
      id SERIAL PRIMARY KEY,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      status TEXT NOT NULL,
      catatan TEXT DEFAULT '',
      actor TEXT DEFAULT 'admin',
      created_at TIMESTAMPTZ DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_orders_kode ON orders(kode);
    CREATE INDEX IF NOT EXISTS idx_orders_wa ON orders(wa);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS foto_urls TEXT DEFAULT '[]';
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS rating INTEGER DEFAULT 0;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS ulasan TEXT DEFAULT '';
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
    ALTER TABLE status_logs ADD COLUMN IF NOT EXISTS actor TEXT DEFAULT 'admin';
  `);
  _schemaSiap = true;
}

// Query helper: pastikan skema siap, lalu jalankan parameterized query.
// SELALU pakai $1,$2,... untuk input user (anti SQL injection).
export async function query(text, params = []) {
  await ensureSchema();
  return getPool().query(text, params);
}

// Folder penyimpanan foto. Ikut volume yang sama dengan data agar awet.
export function uploadDir() {
  const p = process.env.UPLOAD_DIR || './data/uploads';
  return path.isAbsolute(p) ? p : path.join(process.cwd(), p);
}

export function ensureUploadDir() {
  fs.mkdirSync(uploadDir(), { recursive: true });
}

// --- helpers ---

const KODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // tanpa I,L,O,0,1 agar tidak ambigu

export async function generateKode() {
  for (let i = 0; i < 20; i++) {
    let rand = '';
    for (let j = 0; j < 6; j++) {
      rand += KODE_ALPHABET[crypto.randomInt(0, KODE_ALPHABET.length)];
    }
    const kode = `ILS-${rand}`;
    const { rows } = await query('SELECT 1 FROM orders WHERE kode = $1', [kode]);
    if (!rows.length) return kode;
  }
  // fallback: pakai timestamp
  return `ILS-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

function toISO(v) {
  if (!v) return '';
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? '' : v.toISOString();
  return String(v);
}

export function rowToOrder(row) {
  if (!row) return null;
  let fotoUrls = [];
  try {
    const parsed = JSON.parse(row.foto_urls || '[]');
    if (Array.isArray(parsed)) fotoUrls = parsed.filter((u) => typeof u === 'string').slice(0, 5);
  } catch { /* abaikan JSON rusak -> [] */ }
  return {
    id: row.id,
    kode: row.kode,
    nama: row.nama,
    wa: row.wa,
    kategori: row.kategori,
    layanan: row.layanan,
    deskripsi: row.deskripsi,
    alamat: row.alamat,
    metodeAntar: row.metode_antar,
    status: row.status,
    estimasiBiaya: Number(row.estimasi_biaya) || 0,
    biayaAkhir: Number(row.biaya_akhir) || 0,
    estimasiSelesai: row.estimasi_selesai || '',
    catatanAdmin: row.catatan_admin || '',
    fotoUrls,
    rating: Number(row.rating) || 0,
    ulasan: row.ulasan || '',
    approvedAt: toISO(row.approved_at),
    createdAt: toISO(row.created_at),
    updatedAt: toISO(row.updated_at),
  };
}

export async function getLogs(orderId) {
  const { rows } = await query(`SELECT * FROM status_logs WHERE order_id = $1 ORDER BY id ASC`, [orderId]);
  return rows.map((r) => ({
    id: r.id,
    status: r.status,
    catatan: r.catatan || '',
    actor: r.actor || 'admin',
    createdAt: toISO(r.created_at),
  }));
}

export async function addLog(orderId, status, catatan = '', actor = 'admin') {
  await query(
    `INSERT INTO status_logs (order_id, status, catatan, actor) VALUES ($1, $2, $3, $4)`,
    [orderId, status, catatan, actor]
  );
}

// Escape karakter wildcard LIKE (dipakai untuk keyword pencarian bebas).
export function escapeLike(s) {
  return String(s).replace(/[\\%_]/g, (c) => `\\${c}`);
}

// Testimoni landing: agregat + 3 ulasan terbaik terbaru.
export async function getTestimoni() {
  const agg = await query(`SELECT COUNT(*)::int c, COALESCE(AVG(rating),0)::float a FROM orders WHERE rating > 0`);
  const { rows } = await query(
    `SELECT nama, layanan, rating, ulasan FROM orders WHERE rating >= 4 AND ulasan <> '' ORDER BY id DESC LIMIT 3`
  );
  return { count: agg.rows[0]?.c || 0, avg: Number(agg.rows[0]?.a) || 0, rows };
}
