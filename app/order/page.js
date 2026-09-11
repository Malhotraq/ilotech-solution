'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { waLink, formatWaDisplay } from '@/lib/site';
import { formatTanggal } from '@/lib/format';

const LAYANAN = {
  JASA: ['Pembuatan Website', 'Pembuatan Aplikasi', 'Upgrade Laptop & Komputer', 'Lainnya'],
  SERVICE: ['Service HP', 'Laptop & Komputer', 'Service Printer', 'Lainnya'],
};

// Normalisasi query URL agar link rusak / ketikan manual tidak me-crash form.
// Contoh yang ditangani: ?kategori=jasa (huruf kecil), ?layanan=Laptop (terpotong
// karena '&' tidak di-encode di link lama), atau layanan yang tidak dikenal.
function layananAwal(sp) {
  const rawKat = (sp.get('kategori') || 'SERVICE').toUpperCase();
  const kategori = LAYANAN[rawKat] ? rawKat : 'SERVICE';
  const rawLay = (sp.get('layanan') || '').trim();
  const cocok = LAYANAN[kategori].find((l) => l.toLowerCase() === rawLay.toLowerCase());
  return { kategori, layanan: cocok || LAYANAN[kategori][0] };
}

function OrderForm() {
  const sp = useSearchParams();
  const awal = layananAwal(sp);
  const [form, setForm] = useState({
    nama: '',
    wa: '',
    kategori: awal.kategori,
    layanan: awal.layanan,
    deskripsi: '',
    alamat: '',
    metodeAntar: 'antar-sendiri',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasil, setHasil] = useState(null);
  const [fotos, setFotos] = useState([]); // File[] maks 3 (JPG/PNG/WebP @3MB)
  const [preview, setPreview] = useState([]); // thumbnail object-URL
  const [olahFoto, setOlahFoto] = useState(false); // true saat kompres foto berjalan
  const [tahap, setTahap] = useState('');

  // Kompres foto di browser SEBELUM disimpan/di-upload: sisi terpanjang
  // maks 1280px, kualitas 0.82. Menghemat kuota upload + storage server.
  // Gagal kompres (browser lama/kanvas error) -> pakai file asli (fallback aman).
  const FOTO_SISI_MAKS = 1280;

  function kompresFoto(file) {
    return new Promise((resolve) => {
      const tipe = file.type === 'image/webp' ? 'image/webp' : 'image/jpeg';
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        try {
          const skala = Math.min(1, FOTO_SISI_MAKS / Math.max(img.width, img.height));
          const w = Math.max(1, Math.round(img.width * skala));
          const h = Math.max(1, Math.round(img.height * skala));
          const kanvas = document.createElement('canvas');
          kanvas.width = w;
          kanvas.height = h;
          kanvas.getContext('2d').drawImage(img, 0, 0, w, h);
          kanvas.toBlob(
            (blob) => {
              if (!blob) return resolve(file);
              const ext = tipe === 'image/webp' ? '.webp' : '.jpg';
              const nama = (file.name || 'foto').replace(/\.[a-z0-9]+$/i, '') + ext;
              resolve(new File([blob], nama, { type: tipe }));
            },
            tipe,
            0.82
          );
        } catch {
          resolve(file);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(file);
      };
      img.src = url;
    });
  }

  async function pilihFoto(list) {
    setError('');
    setOlahFoto(true);
    try {
      // URL thumbnail disejajarkan 1:1 dengan `fotos`; URL baru hanya dibuat
      // untuk file yang benar-benar ditambahkan, URL lama dipakai ulang
      // (tidak dibuat ulang agar tidak bocor memori).
      const arr = [...fotos];
      const urls = [...preview];
      for (const f of list) {
        if (arr.length >= 3) break;
        if (!/^image\/(jpeg|png|webp)$/.test(f.type)) {
          setError(`Format ${f.name} harus JPG / PNG / WebP.`);
          continue;
        }
        if (f.size > 3 * 1024 * 1024 || f.size <= 0) {
          setError(`Foto ${f.name} maksimal 3 MB.`);
          continue;
        }
        const kecil = await kompresFoto(f);
        if (kecil.size > 3 * 1024 * 1024) {
          setError(`Foto ${f.name} masih di atas 3 MB setelah dikompres, dilewati.`);
          continue;
        }
        arr.push(kecil);
        urls.push(URL.createObjectURL(kecil));
      }
      setFotos(arr.slice(0, 3));
      setPreview(urls.slice(0, 3));
    } finally {
      setOlahFoto(false);
    }
  }

  function hapusFoto(i) {
    // Bebaskan object-URL yang dibuang agar memori browser tidak bocor.
    if (preview[i]) URL.revokeObjectURL(preview[i]);
    setFotos(fotos.filter((_, x) => x !== i));
    setPreview(preview.filter((_, x) => x !== i));
  }

  // Bebaskan semua thumbnail saat halaman ditutup/pindah route.
  // (via ref agar cleanup unmount selalu melihat daftar URL terbaru,
  // bukan snapshot kosong saat mount.)
  const previewRef = useRef([]);
  previewRef.current = preview;
  useEffect(
    () => () => previewRef.current.forEach((u) => URL.revokeObjectURL(u)),
    []
  );

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function orderLain() {
    preview.forEach((u) => URL.revokeObjectURL(u));
    setHasil(null);
    setFotos([]);
    setPreview([]);
    setForm({ nama: '', wa: '', kategori: 'SERVICE', layanan: 'Service HP', deskripsi: '', alamat: '', metodeAntar: 'antar-sendiri' });
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // 1. Upload foto dulu (bila ada), URL-nya ikut terkirim bersama order.
      let fotoUrls = [];
      if (fotos.length) {
        setTahap(`Mengupload ${fotos.length} foto...`);
        const fd = new FormData();
        fotos.forEach((f) => fd.append('foto', f));
        const up = await fetch('/api/uploads', { method: 'POST', body: fd });
        const ud = await up.json();
        if (!up.ok) throw new Error(ud.error || 'Gagal upload foto');
        fotoUrls = ud.urls || [];
      }
      setTahap('Mengirim order...');
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, fotoUrls }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal membuat order');
      setHasil(data.order);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setTahap('');
    }
  }

  if (hasil) {
    const waHref = waLink(
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
              {hasil.nama} • {hasil.layanan} • {formatTanggal(hasil.createdAt)}
            </p>
            <div className="cta-row" style={{ justifyContent: 'center', marginTop: 18 }}>
              <Link className="btn cy" href={`/lacak/${hasil.kode}`}>🔍 Lacak Progres Sekarang</Link>
              <a className="btn wa" target="_blank" rel="noopener" href={waHref}>
                💬 Konfirmasi via WA
              </a>
              <button className="btn ghost" onClick={orderLain}>
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
              <input value={form.nama} onChange={(e) => set('nama', e.target.value)} placeholder="cth: Ahmad Ilomata" required minLength={3} maxLength={100} />
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
              required minLength={10} maxLength={2000}
            />
            <div className="hint">Makin detail makin cepat diagnosa. Minimal 10 karakter.</div>
          </div>

          <div className="field">
            <label>Foto Kerusakan <small>(opsional, maks 3 — mempercepat diagnosa)</small></label>
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={olahFoto} onChange={(e) => { pilihFoto(e.target.files); e.target.value = ''; }} />
            <div className="hint">JPG / PNG / WebP @maks 3 MB — otomatis dikompres di HP-mu biar upload cepat.{olahFoto ? ' ⏳ Mengompres foto...' : ''}</div>
            {preview.length > 0 && (
              <div className="foto-grid">
                {preview.map((src, i) => (
                  <div key={i} className="foto-thumb">
                    <img src={src} alt={`Foto ${i + 1}`} />
                    <button type="button" onClick={() => hapusFoto(i)} aria-label="Hapus foto">✕</button>
                  </div>
                ))}
              </div>
            )}
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
              <textarea value={form.alamat} onChange={(e) => set('alamat', e.target.value)} placeholder="Tulis alamat lengkap + patokan" style={{ minHeight: 70 }} required={form.metodeAntar === 'jemput'} maxLength={500} />
            </div>
          )}

          <button className="btn cy" style={{ width: '100%' }} disabled={loading || olahFoto}>
            {olahFoto ? '⏳ Mengompres foto...' : loading ? (tahap || 'Mengirim...') : '🚀 Kirim Order & Dapat Kode Tracking'}
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
            <p><a href={waLink('Halo IloTech! Saya butuh bantuan isi form order.')} target="_blank" rel="noopener" style={{ color: 'var(--cy)', fontWeight: 800 }}>Chat WA {formatWaDisplay()}</a></p>
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
