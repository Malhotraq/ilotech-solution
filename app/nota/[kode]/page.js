import Link from 'next/link';
import { notFound } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import PrintBtn from '@/components/PrintBtn';
import { formatRupiah } from '@/components/OrderUI';
import { STATUS_LABEL } from '@/lib/status';
import { formatTanggal } from '@/lib/format';
import { waLink, formatWaDisplay } from '@/lib/site';
import { query, rowToOrder } from '@/lib/db';

export const dynamic = 'force-dynamic';

// /nota/[kode] — nota service siap cetak (tombol print / simpan PDF via browser).
export default async function Nota({ params }) {
  const kode = decodeURIComponent(params.kode || '').toUpperCase();
  const r = await query('SELECT * FROM orders WHERE kode = $1', [kode]);
  if (!r.rows.length) notFound();
  const o = rowToOrder(r.rows[0]);
  const total = o.biayaAkhir > 0 ? o.biayaAkhir : o.estimasiBiaya;

  return (
    <>
      <div className="no-print">
        <Navbar />
      </div>
      <div className="wrap" style={{ paddingBottom: 70, maxWidth: 720 }}>
        <div className="nota">
          <div className="nota-head">
            <div>
              <h2 style={{ margin: 0 }}>IloTech Solution</h2>
              <small>Desa Ilotidea, Tilango, Gorontalo • {formatWaDisplay()}</small>
            </div>
            <div style={{ textAlign: 'right' }}>
              <b>NOTA SERVICE</b>
              <br />
              <span className="kode">{o.kode}</span>
            </div>
          </div>
          <table className="nota-tbl">
            <tbody>
              <tr><td>Tanggal</td><td>{formatTanggal(o.createdAt)}</td></tr>
              <tr><td>Pelanggan</td><td>{o.nama} ({o.wa})</td></tr>
              <tr><td>Layanan</td><td>{o.layanan} ({o.kategori})</td></tr>
              <tr><td>Keluhan</td><td>{o.deskripsi}</td></tr>
              <tr><td>Status</td><td>{STATUS_LABEL[o.status] || o.status}</td></tr>
              {o.estimasiSelesai && <tr><td>Estimasi selesai</td><td>{o.estimasiSelesai}</td></tr>}
              {o.catatanAdmin && <tr><td>Catatan teknisi</td><td>{o.catatanAdmin}</td></tr>}
              <tr><td>Estimasi biaya</td><td>{formatRupiah(o.estimasiBiaya)}</td></tr>
              {o.biayaAkhir > 0 && <tr><td>Biaya akhir</td><td><b>{formatRupiah(o.biayaAkhir)}</b></td></tr>}
              <tr className="total"><td>TOTAL</td><td>{formatRupiah(total)}</td></tr>
            </tbody>
          </table>
          <p className="nota-foot">
            Diagnosa awal gratis • Garansi pengerjaan • Simpan nota ini sebagai bukti pengambilan.
            <br />
            Lacak progres kapan saja di menu Lacak Order dengan kode {o.kode}.
          </p>
          <div className="cta-row no-print" style={{ marginTop: 16 }}>
            <PrintBtn />
            <a className="btn wa" target="_blank" rel="noopener" href={waLink(`Halo IloTech! Saya mau konfirmasi nota ${o.kode}.`)}>
              💬 Konfirmasi WA
            </a>
            <Link className="btn ghost" href={`/lacak/${o.kode}`}>🔍 Lacak</Link>
          </div>
        </div>
      </div>
      <div className="no-print">
        <Footer />
      </div>
    </>
  );
}
