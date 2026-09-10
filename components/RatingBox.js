'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// Form rating bintang — tampil sekali setelah order SELESAI/DIAMBIL & belum dirating.
export default function RatingBox({ kode }) {
  const [bintang, setBintang] = useState(5);
  const [ulasan, setUlasan] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const router = useRouter();

  async function submit(e) {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${kode}/rating`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: bintang, ulasan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan');
      router.refresh();
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="side-card" style={{ marginTop: 18 }}>
      <h4>⭐ Puas dengan hasilnya? Kasih rating!</h4>
      {err && <div className="err">⚠️ {err}</div>}
      <form onSubmit={submit}>
        <div style={{ fontSize: 30, letterSpacing: 4, margin: '8px 0' }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setBintang(n)}
              aria-label={`${n} bintang`}
              style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: n <= bintang ? 1 : 0.3 }}
            >
              ⭐
            </button>
          ))}
        </div>
        <div className="field">
          <label>Ulasan (opsional, tampil di website)</label>
          <textarea value={ulasan} onChange={(e) => setUlasan(e.target.value)} maxLength={500} placeholder="cth: Pengerjaan cepat, HP seperti baru lagi!" style={{ minHeight: 70 }} />
        </div>
        <button className="btn cy btn-sm" disabled={loading}>
          {loading ? 'Menyimpan...' : 'Kirim Rating'}
        </button>
      </form>
    </div>
  );
}
