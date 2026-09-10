'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatRupiah } from '@/components/OrderUI';

// Kotak persetujuan biaya — tampil hanya saat status MENUNGGU_PERSETUJUAN.
// Setuju -> DIKERJAKAN (otomatis), Tolak -> DIAGNOSA + admin dihubungi.
export default function ApproveBox({ kode, estimasi }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const router = useRouter();

  async function act(action) {
    const yakin = confirm(
      action === 'setuju'
        ? `Setujui estimasi ${formatRupiah(estimasi)}? Teknisi langsung mengerjakan perangkatmu.`
        : 'Tolak estimasi? Status kembali ke Diagnosa dan admin akan menghubungimu via WA.'
    );
    if (!yakin) return;
    setErr('');
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${kode}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memproses');
      router.refresh();
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="approve-box">
      <h3>💰 Persetujuan Biaya Diperlukan</h3>
      <p>
        Teknisi memberi estimasi <b>{formatRupiah(estimasi)}</b>. Perangkat <b>belum dikerjakan</b> sebelum
        kamu menyetujui. Silakan pilih:
      </p>
      {err && <div className="err">⚠️ {err}</div>}
      <div className="cta-row">
        <button className="btn cy" onClick={() => act('setuju')} disabled={loading}>
          {loading ? 'Memproses...' : '✅ Setuju, Kerjakan!'}
        </button>
        <button className="btn ghost" onClick={() => act('tolak')} disabled={loading}>
          ❌ Tolak / Minta Revisi
        </button>
      </div>
    </div>
  );
}
