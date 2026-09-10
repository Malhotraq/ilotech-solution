import Link from 'next/link';
import { notFound } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { StatusBadge, formatRupiah } from '@/components/OrderUI';
import ApproveBox from '@/components/ApproveBox';
import RatingBox from '@/components/RatingBox';
import { STATUS_LIST, STATUS_LABEL, STATUS_DESC } from '@/lib/status';
import { query, rowToOrder, getLogs } from '@/lib/db';
import { waLink, GOOGLE_REVIEW_URL } from '@/lib/site';
import { formatTanggal } from '@/lib/format';

export const dynamic = 'force-dynamic';

async function getOrder(kode) {
  const r = await query('SELECT * FROM orders WHERE kode = $1', [String(kode).toUpperCase()]);
  if (!r.rows.length) return null;
  const order = rowToOrder(r.rows[0]);
  const logs = await getLogs(r.rows[0].id);
  return { order, logs };
}

export default async function DetailLacak({ params }) {
  const kode = decodeURIComponent(params.kode || '').toUpperCase();
  const data = await getOrder(kode);
  if (!data) notFound();

  const { order, logs } = data;
  const idxNow = STATUS_LIST.indexOf(order.status);

  const waHref = waLink(`Halo IloTech! Saya mau tanya progres order ${order.kode} (${order.layanan}).`);

  return (
    <>
      <Navbar />
      <div className="wrap page-head">
        <Link href="/lacak" style={{ color: 'var(--cy)', fontWeight: 700, textDecoration: 'none' }}>← Kembali cari</Link>
        <h1 style={{ marginTop: 8 }}>{order.kode}</h1>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <StatusBadge status={order.status} />
          <span style={{ color: 'var(--mut)', fontSize: 14 }}>
            Update terakhir: {formatTanggal(order.updatedAt)}
          </span>
        </div>
      </div>

      <div className="wrap" style={{ paddingBottom: 70, maxWidth: 820 }}>
        <div className="order-card">
          <div className="top">
            <b>{order.layanan} <span style={{ color: 'var(--mut)', fontWeight: 400 }}>({order.kategori})</span></b>
          </div>
          <p style={{ color: '#cbd8f0', fontSize: 15 }}>{order.deskripsi}</p>
          <dl className="kv">
            <dt>Nama</dt><dd>{order.nama}</dd>
            <dt>Layanan</dt><dd>{order.layanan}</dd>
            <dt>Tanggal order</dt><dd>{formatTanggal(order.createdAt)}</dd>
            <dt>Metode antar</dt><dd>{order.metodeAntar}</dd>
            {order.estimasiSelesai && (<><dt>Estimasi selesai</dt><dd>{order.estimasiSelesai}</dd></>)}
            <dt>Estimasi biaya</dt><dd>{formatRupiah(order.estimasiBiaya)}</dd>
            {order.biayaAkhir > 0 && (<><dt>Biaya akhir</dt><dd>{formatRupiah(order.biayaAkhir)}</dd></>)}
            {order.catatanAdmin && (<><dt>Catatan teknisi</dt><dd>{order.catatanAdmin}</dd></>)}
          </dl>

          {order.fotoUrls?.length > 0 && (
            <>
              <h3 style={{ marginTop: 22, marginBottom: 6 }}>📷 Foto Kerusakan</h3>
              <div className="foto-grid">
                {order.fotoUrls.map((u, i) => (
                  <a key={i} href={u} target="_blank" rel="noopener" className="foto-thumb">
                    <img src={u} alt={`Foto kerusakan ${i + 1}`} loading="lazy" />
                  </a>
                ))}
              </div>
            </>
          )}

          {order.status === 'MENUNGGU_PERSETUJUAN' && (
            <ApproveBox kode={order.kode} estimasi={order.estimasiBiaya} />
          )}

          <h3 style={{ marginTop: 22, marginBottom: 6 }}>📍 Progres Pengerjaan</h3>
          <div className="timeline">
            {STATUS_LIST.map((s, i) => {
              const done = order.status !== 'DIBATALKAN' && i < idxNow;
              const now = s === order.status;
              const log = [...logs].reverse().find((l) => l.status === s);
              return (
                <div key={s} className={`tl-item ${done ? 'done' : ''} ${now ? 'now' : ''}`}>
                  <b>{i + 1}. {STATUS_LABEL[s]} {now ? '← posisi sekarang' : done ? '✓' : ''}</b>
                  <small>{STATUS_DESC[s]}</small>
                  {log && <p>📝 {log.catatan || '-'} <small>({formatTanggal(log.createdAt)})</small></p>}
                </div>
              );
            })}
            {order.status === 'DIBATALKAN' && (
              <div className="tl-item now"><b>Dibatalkan</b><small>Hubungi admin jika ini keliru.</small></div>
            )}
          </div>

          {logs.length > 0 && (
            <>
              <h3 style={{ marginTop: 22, marginBottom: 6 }}>🕒 Riwayat Update</h3>
              {logs.map((l) => (
                <div key={l.id} style={{ fontSize: 14, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                  <b>{STATUS_LABEL[l.status] || l.status}</b>{' '}
                  <span style={{ color: 'var(--mut)' }}>— {formatTanggal(l.createdAt)}</span>
                  {l.catatan && <div style={{ color: '#cbd8f0' }}>{l.catatan}</div>}
                </div>
              ))}
            </>
          )}

          <div className="cta-row" style={{ marginTop: 20 }}>
            <a className="btn wa" target="_blank" rel="noopener" href={waHref}>
              💬 Tanya Admin via WA
            </a>
            <Link className="btn ghost" href={`/nota/${order.kode}`}>🖨️ Nota</Link>
            <Link className="btn ghost" href="/order">+ Buat Order Baru</Link>
          </div>

          {['SELESAI', 'DIAMBIL'].includes(order.status) && !order.rating && (
            <RatingBox kode={order.kode} />
          )}
          {order.rating > 0 && (
            <div className="side-card" style={{ marginTop: 18 }}>
              <h4>⭐ Rating kamu: {'⭐'.repeat(Math.min(5, order.rating))}</h4>
              {order.ulasan && <p>“{order.ulasan}”</p>}
              <p style={{ color: 'var(--mut)', fontSize: 13 }}>Terima kasih atas penilaianmu!</p>
              {GOOGLE_REVIEW_URL && (
                <a className="btn cy btn-sm" target="_blank" rel="noopener" href={GOOGLE_REVIEW_URL} style={{ marginTop: 8 }}>
                  ⭐ Ulas kami juga di Google
                </a>
              )}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
