#!/usr/bin/env node
// scripts/cleanup-uploads.mjs — hapus foto ORPHAN (tidak direferensikan order mana pun).
//
// Orphan terjadi bila pelanggan mengupload foto tapi tidak jadi submit order
// (tutup tab / gagal jaringan). Tanpa dibersihkan, folder upload membengkak.
//
// Cara pakai:
//   node scripts/cleanup-uploads.mjs              # hapus orphan > 24 jam
//   node scripts/cleanup-uploads.mjs --dry-run    # simulasi saja (tidak menghapus)
//   node scripts/cleanup-uploads.mjs --older-than=72  # ambang jam custom
//
// Cron VPS (tiap Minggu jam 3 pagi):
//   0 3 * * 0 cd /root/ilotech && /usr/bin/node scripts/cleanup-uploads.mjs >> backups/cleanup.log 2>&1
//
// Catatan: script membaca .env manual (tanpa dependensi dotenv) — cukup
// DATABASE_URL (+ UPLOAD_DIR opsional). Aman: hanya menghapus file yang
// (1) namanya lolos pola ketat API upload, (2) tidak ada di database,
// (3) lebih tua dari ambang (default 24 jam, jeda aman untuk form yg sedang diisi).

import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

const NAMA_OK = /^[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp)$/i;

function muatEnv(file) {
  try {
    const teks = fs.readFileSync(file, 'utf8');
    for (const baris of teks.split('\n')) {
      const b = baris.trim();
      if (!b || b.startsWith('#') || !b.includes('=')) continue;
      const i = b.indexOf('=');
      const k = b.slice(0, i).trim();
      let v = b.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (!(k in process.env)) process.env[k] = v;
    }
  } catch { /* .env tidak ada -> pakai env OS / default */ }
}

muatEnv(path.join(process.cwd(), '.env'));

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const ambangArg = args.find((a) => a.startsWith('--older-than='));
const BATAS_JAM = Math.max(1, Number((ambangArg || '').split('=')[1]) || 24);

const rawDir = process.env.UPLOAD_DIR || './data/uploads';
const dir = path.isAbsolute(rawDir) ? rawDir : path.join(process.cwd(), rawDir);

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL belum diisi (cek .env).');
  process.exit(1);
}
if (!fs.existsSync(dir)) {
  console.log(`ℹ️ Folder upload belum ada (${dir}) — tidak ada yang dibersihkan.`);
  process.exit(0);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 8000,
});

try {
  // 1. Kumpulkan semua nama file yang masih dipakai order.
  const { rows } = await pool.query('SELECT foto_urls FROM orders');
  const dipakai = new Set();
  for (const r of rows) {
    try {
      const arr = JSON.parse(r.foto_urls || '[]');
      if (Array.isArray(arr)) {
        for (const u of arr) {
          const nama = String(u || '').split('/').pop();
          if (nama && NAMA_OK.test(nama)) dipakai.add(nama);
        }
      }
    } catch { /* JSON rusak -> abaikan baris ini */ }
  }

  // 2. Pindai folder, hapus yang orphan + tua.
  const batasMs = Date.now() - BATAS_JAM * 3600 * 1000;
  const files = fs.readdirSync(dir);
  let hapus = 0;
  let byteBebas = 0;
  let dilewatiMuda = 0;

  for (const f of files) {
    const full = path.join(dir, f);
    let stat;
    try {
      stat = fs.statSync(full);
    } catch { continue; }
    if (!stat.isFile() || !NAMA_OK.test(f) || dipakai.has(f)) continue;
    if (stat.mtimeMs > batasMs) {
      dilewatiMuda++;
      continue; // masih dalam masa tenggang (form mungkin sedang diisi)
    }
    byteBebas += stat.size;
    hapus++;
    if (dryRun) {
      console.log(`  [dry-run] akan dihapus: ${f} (${(stat.size / 1024).toFixed(1)} KB)`);
    } else {
      fs.unlinkSync(full);
      console.log(`  dihapus: ${f} (${(stat.size / 1024).toFixed(1)} KB)`);
    }
  }

  console.log(
    `${dryRun ? '🔍 Simulasi' : '✅ Selesai'}: ${hapus} file orphan${dryRun ? ' (tidak jadi dihapus)' : ' dihapus'} ` +
    `(${(byteBebas / 1024 / 1024).toFixed(2)} MB), ${dipakai.size} file masih dipakai, ` +
    `${dilewatiMuda} orphan muda (< ${BATAS_JAM} jam) dibiarkan.`
  );
} catch (e) {
  console.error('❌ Gagal cleanup:', e?.message || e);
  process.exitCode = 1;
} finally {
  await pool.end().catch(() => {});
}
