// lib/db.js
// SQLite via better-sqlite3. File DB disimpan di DB_PATH (default ./data/ilotech.db).
// Di Docker, folder /app/data di-mount sebagai volume agar data tidak hilang saat update.

import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

let _db = null;

function dbFile() {
  const p = process.env.DB_PATH || './data/ilotech.db';
  return path.isAbsolute(p) ? p : path.join(process.cwd(), p);
}

export function getDb() {
  if (_db) return _db;

  const file = dbFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });

  const db = new Database(file);
  db.pragmas = [{ journal_mode: 'WAL' }];
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // --- schema ---
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE TABLE IF NOT EXISTS status_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      status TEXT NOT NULL,
      catatan TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_orders_kode ON orders(kode);
    CREATE INDEX IF NOT EXISTS idx_orders_wa ON orders(wa);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
  `);

  _db = db;
  return _db;
}

// --- helpers ---

const KODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // tanpa I,L,O,0,1 agar tidak ambigu

export function generateKode(db) {
  for (let i = 0; i < 20; i++) {
    let rand = '';
    for (let j = 0; j < 6; j++) {
      rand += KODE_ALPHABET[Math.floor(Math.random() * KODE_ALPHABET.length)];
    }
    const kode = `ILS-${rand}`;
    const exists = db.prepare('SELECT 1 FROM orders WHERE kode = ?').get(kode);
    if (!exists) return kode;
  }
  // fallback: pakai timestamp
  return `ILS-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

export function rowToOrder(row) {
  if (!row) return null;
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
    estimasiBiaya: row.estimasi_biaya,
    biayaAkhir: row.biaya_akhir,
    estimasiSelesai: row.estimasi_selesai,
    catatanAdmin: row.catatan_admin,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getLogs(db, orderId) {
  const rows = db
    .prepare(`SELECT * FROM status_logs WHERE order_id = ? ORDER BY id ASC`)
    .all(orderId);
  return rows.map((r) => ({
    id: r.id,
    status: r.status,
    catatan: r.catatan,
    createdAt: r.created_at,
  }));
}

export function addLog(db, orderId, status, catatan = '') {
  db.prepare(`INSERT INTO status_logs (order_id, status, catatan) VALUES (?, ?, ?)`)
    .run(orderId, status, catatan);
}
