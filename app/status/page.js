import Link from 'next/link';
import fs from 'fs';
import path from 'path';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Status Layanan — IloTech Solution',
  description: 'Pantau kondisi website, database, dan antrian order IloTech Solution secara real-time.',
  robots: { index: false, follow: true },
};

function formatUptime(detik) {
  const d = Math.floor(detik / 86400);
  const j = Math.floor((detik % 86400) / 3600);
  const m = Math.floor((detik % 3600) / 60);
  if (d > 0) return `${d} hari ${j} jam`;
  if (j > 0) return `${j} jam ${m} mnt`;
  return `${m} mnt`;
}

function versiApp() {
  try {
    const raw = fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8');
    return JSON.parse(raw)?.version || '?';
  } catch {
    return '?';
  }
}

export default async function StatusPage() {
  // Website: bila halaman ini ter-render, web jelas hidup.
  // Database: ping + hitung antrian aktif (tanpa data sensitif apa pun).
  let db = { ok: false, latencyMs: null, total: 0, aktif: 0 };
  const mulai = Date.now();
  try {
    await query('SELECT 1');
    db.latencyMs = Date.now() - mulai;
    const t = await query('SELECT COUNT(*)::int c FROM orders');
    const a = await query(`SELECT COUNT(*)::int c FROM orders WHERE status NOT IN ('DIAMBIL','DIBATALKAN')`);
    db = { ok: true, latencyMs: db.latencyMs, total: t.rows[0]?.c || 0, aktif: a.rows[0]?.c || 0 };
  } catch {
    db = { ok: false, latencyMs: null, total: 0, aktif: 0 };
  }

  const semuaOk = db.ok;
  const dicek = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });

  const kartu = (judul, nilai, sub, ok) => (
    <div className="side-card" style={{ textAlign: 'center', borderColor: ok === false ? 'var(--danger)' : undefined }}>
      <div style={{ fontSize: 13, color: 'var(--mut)' }}>{judul}</div>
      <div style={{ fontSize: 24, fontWeight: 900, margin: '6px 0' }}>{nilai}</div>
      <div style={{ fontSize: 13, color: 'var(--mut)' }}>{sub}</div>
    </div>
  );

  return (
    <>
      <Navbar />
      <div className="wrap page-head">
        <span className="pill">STATUS LAYANAN</span>
        <h1>{semuaOk ? '🟢 Semua Sistem Normal' : '🔴 Gangguan Terdeteksi'}</h1>
        <p>
          Kondisi website & database IloTech Solution saat ini.
          {db.ok ? ' Silakan order seperti biasa.' : ' Tim kami sedang menangani. Untuk mendesak, chat WA admin.'}
        </p>
      </div>
      <div className="wrap" style={{ paddingBottom: 70, maxWidth: 860 }}>
        <div className="grid4">
          {kartu('🌐 Website', 'Online', 'halaman ini ter-load', true)}
          {kartu('💾 Database', db.ok ? 'Online' : 'Gangguan', db.ok ? `respon ${db.latencyMs} ms` : 'tidak dapat dihubungi', db.ok)}
          {kartu('📦 Order Aktif', db.ok ? db.aktif : '—', db.ok ? `dari ${db.total} total order` : 'data tidak tersedia', db.ok)}
          {kartu('⏱️ Uptime Server', formatUptime(process.uptime()), `dicek ${dicek} WITA • v${versiApp()}`, true)}
        </div>
        <div className="cta-row" style={{ marginTop: 18 }}>
          <a className="btn ghost btn-sm" href="/status">🔄 Muat ulang</a>
          <Link className="btn cy btn-sm" href="/order">📝 Buat Order</Link>
          <Link className="btn ghost btn-sm" href="/lacak">🔍 Lacak Order</Link>
        </div>
      </div>
      <Footer />
    </>
  );
}
