'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { StatusBadge } from '@/components/OrderUI';

export default function LacakPage() {
  const [kode, setKode] = useState('');
  const [wa, setWa] = useState('');
  const [hasil, setHasil] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function cari(e) {
    e?.preventDefault();
    setError('');
    setHasil(null);
    const k = kode.trim().toUpperCase();
    if (!k && !wa.trim()) {
      setError('Isi kode tracking atau no. WA dulu.');
      return;
    }
    // Kalau ada kode spesifik -> langsung ke halaman detail
    if (k && k.startsWith('ILS-')) {
      router.push(`/lacak/${k}`);
      return;
    }
    // Kalau cari pakai WA -> tampilkan list
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (k) q.set('kode', k);
      if (wa.trim()) q.set('wa', wa.trim());
      const res = await fetch(`/api/orders?${q.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mencari');
      if (data.orders?.length === 1) {
        router.push(`/lacak/${data.orders[0].kode}`);
        return;
      }
      setHasil(data.orders || []);
      if (!data.orders?.length) setError('Tidak ditemukan. Cek lagi kode / no WA kamu.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Navbar />
      <div className="wrap page-head">
        <span className="pill">TRACKING ORDER</span>
        <h1>Lacak Perkembangan Order</h1>
        <p>Masukkan kode tracking (ILS-XXXXXX) yang kamu dapat saat order. Atau cari pakai no. WA.</p>
      </div>
      <div className="wrap" style={{ paddingBottom: 70, maxWidth: 760 }}>
        <form className="panel" onSubmit={cari}>
          {error && <div className="err">⚠️ {error}</div>}
          <div className="field">
            <label>Kode Tracking</label>
            <input value={kode} onChange={(e) => setKode(e.target.value.toUpperCase())} placeholder="cth: ILS-A8K2QP" style={{ letterSpacing: 1, fontWeight: 800 }} />
          </div>
          <div className="field">
            <label>atau No. WA <small>(untuk lihat semua order-mu)</small></label>
            <input value={wa} onChange={(e) => setWa(e.target.value)} placeholder="0812..." />
          </div>
          <button className="btn cy" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Mencari...' : '🔍 Cari Order'}
          </button>
        </form>

        {hasil && hasil.length > 0 && (
          <div style={{ marginTop: 18 }}>
            <h3 style={{ marginBottom: 12 }}>Ditemukan {hasil.length} order:</h3>
            {hasil.map((o) => (
              <Link key={o.kode} href={`/lacak/${o.kode}`} style={{ textDecoration: 'none' }}>
                <div className="order-card">
                  <div className="top">
                    <span className="kode">{o.kode}</span>
                    <StatusBadge status={o.status} />
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--mut)' }}>
                    {o.layanan} • {o.nama} • {new Date(o.createdAt).toLocaleDateString('id-ID')}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="side-card" style={{ marginTop: 18 }}>
          <h4>❓ Kode hilang?</h4>
          <p>
            Cari pakai no. WA di atas, atau chat admin{' '}
            <a href="https://wa.me/62895803366608" target="_blank" rel="noopener" style={{ color: 'var(--cy)', fontWeight: 800 }}>
              0895-8033-66608
            </a>{' '}
            dengan menyebut nama + tanggal order.
          </p>
        </div>
      </div>
      <Footer />
    </>
  );
}
