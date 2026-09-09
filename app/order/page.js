'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const LAYANAN = {
  JASA: ['Pembuatan Website', 'Pembuatan Aplikasi', 'Upgrade Laptop & Komputer', 'Lainnya'],
  SERVICE: ['Service HP', 'Laptop & Komputer', 'Service Printer', 'Lainnya'],
};

function OrderForm() {
  const sp = useSearchParams();
  const [form, setForm] = useState({
    nama: '',
    wa: '',
    kategori: sp.get('kategori') || 'SERVICE',
    layanan: sp.get('layanan') || 'Service HP',
    deskripsi: '',
    alamat: '',
    metodeAntar: 'antar-sendiri',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasil, setHasil] = useState(null);

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal membuat order');
      setHasil(data.order);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (hasil) {
    const waText = encodeURIComponent(
      `Halo IloTech! Saya baru order ${hasil.layanan} dengan kode ${hasil.kode}. Nama: ${hasil.nama}. Mohon info selanjutnya.`
    );
    return (
      <>
        <Navbar />
        <div className="wrap page-head">
          <span className="pill">ORDER BERHASIL ✅</span>
          <h1>Order Kamu Sudah Masuk!</h1>
          <p>Simpan kode tracking di bawah. Screenshot halaman ini agar tidak hilang.</p>
        </div>
        <div className="wrap form-shell" style={{ gridTemplateColumns: '1fr' }}>
          <div className="okbox">
            <p>KODE TRACKING KAMU</p>
            <div className="kode">{hasil.kode}</div>
            <p style={{ color: 'var(--mut)' }}>
              {hasil.nama} • {hasil.layanan} • {new Date(hasil.createdAt).toLocaleString('id-ID')}
            </p>
            <div className="cta-row" style={{ justifyContent: 'center', marginTop: 18 }}>
              <Link className="btn cy" href={`/lacak/${hasil.kode}`}>🔍 Lacak Progres Sekarang</Link>
              <a className="btn wa" target="_blank" rel="noopener" href={`https://wa.me/62895803366608?text=${waText}`}>
                💬 Konfirmasi via WA
              </a>
              <button className="btn ghost" onClick={() => { setHasil(null); setForm({ nama: '', wa: '', kategori: 'SERVICE', layanan: 'Service HP', deskripsi: '', alamat: '', metodeAntar: 'antar-sendiri' }); }}>
                + Buat Order Lain
              </button>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="wrap page-head">
        <span className="pill">FORM ORDER ONLINE</span>
        <h1>Buat Order Service / Jasa</h1>
        <p>Isi 1 menit, langsung dapat kode tracking. Teknisi kami akan hubungi via WA untuk diagnosa gratis.</p>
      </div>

      <div className="wrap form-shell">
        <form className="panel" onSubmit={submit}>
          <h3>📝 Data Order</h3>
          {error && <div className="err">⚠️ {error}</div>}

          <div className="grid2">
            <div className="field">
              <label>Nama Lengkap *</label>
              <input value={form.nama} onChange={(e) => set('nama', e.target.value)} placeholder="cth: Ahmad Ilomata" required minLength={3} />
            </div>
            <div className="field">
              <label>No. WhatsApp Aktif * <small>(cth: 0812xxxx)</small></label>
              <input value={form.wa} onChange={(e) => set('wa', e.target.value)} placeholder="0812..." required />
              <div className="hint">Untuk info progres & persetujuan biaya.</div>
            </div>
          </div>

          <div className="grid2">
            <div className="field">
              <label>Kategori *</label>
              <select value={form.kategori} onChange={(e) => { set('kategori', e.target.value); set('layanan', LAYANAN[e.target.value][0]); }}>
                <option value="SERVICE">SERVICE / PERBAIKAN</option>
                <option value="JASA">JASA (Website/Aplikasi/Upgrade)</option>
              </select>
            </div>
            <div className="field">
              <label>Layanan *</label>
              <select value={form.layanan} onChange={(e) => set('layanan', e.target.value)}>
                {LAYANAN[form.kategori].map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="field">
            <label>Ceritakan Keluhan / Kebutuhan *</label>
            <textarea
              value={form.deskripsi}
              onChange={(e) => set('deskripsi', e.target.value)}
              placeholder="cth: HP Samsung A12 mati total setelah jatuh, sebelumnya baterai cepat habis. / Mau bikin website toko kue, 5 halaman + katalog WA."
              required minLength={10}
            />
            <div className="hint">Makin detail makin cepat diagnosa. Minimal 10 karakter.</div>
          </div>

          <div className="field">
            <label>Metode Antar Perangkat</label>
            <select value={form.metodeAntar} onChange={(e) => set('metodeAntar', e.target.value)}>
              <option value="antar-sendiri">Antar sendiri ke Tilango</option>
              <option value="jemput">Minta dijemput (Tilango & Kota Gorontalo)</option>
              <option value="online">Online / tidak perlu antar (website/aplikasi)</option>
            </select>
          </div>

          {form.metodeAntar === 'jemput' && (
            <div className="field">
              <label>Alamat Penjemputan *</label>
              <textarea value={form.alamat} onChange={(e) => set('alamat', e.target.value)} placeholder="Tulis alamat lengkap + patokan" style={{ minHeight: 70 }} required={form.metodeAntar === 'jemput'} />
            </div>
          )}

          <button className="btn cy" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Mengirim...' : '🚀 Kirim Order & Dapat Kode Tracking'}
          </button>
          <p style={{ fontSize: 13, color: 'var(--mut)', marginTop: 10, textAlign: 'center' }}>
            Dengan mengorder kamu setuju dihubungi teknisi via WA. Diagnosa awal gratis.
          </p>
        </form>

        <div>
          <div className="side-card">
            <h4>📦 Alur Setelah Order</h4>
            <ol>
              <li>Dapat kode <b>ILS-XXXXXX</b></li>
              <li>Teknisi chat WA untuk diagnosa</li>
              <li>Setujui biaya → dikerjakan</li>
              <li>Cek progres di menu <b>Lacak Order</b></li>
              <li>Ambil + bayar setelah oke + garansi</li>
            </ol>
          </div>
          <div className="side-card">
            <h4>💡 Tips Cepat ACC</h4>
            <p>Tulis merk + tipe perangkat + kronologi rusak. Contoh: “Laptop Asus X441U, no display setelah update Windows, lampu indikator nyala”.</p>
          </div>
          <div className="side-card">
            <h4>📞 Butuh bantuan isi form?</h4>
            <p><a href="https://wa.me/62895803366608" target="_blank" rel="noopener" style={{ color: 'var(--cy)', fontWeight: 800 }}>Chat WA 0895-8033-66608</a></p>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

export default function OrderPage() {
  return (
    <Suspense fallback={<div className="wrap" style={{ padding: 60 }}>Memuat form...</div>}>
      <OrderForm />
    </Suspense>
  );
}
