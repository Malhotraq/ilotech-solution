'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { StatusBadge, formatRupiah } from '@/components/OrderUI';
import { STATUS_LABEL } from '@/lib/status';

const ALL_STATUS = ['SEMUA', 'DITERIMA', 'DIAGNOSA', 'MENUNGGU_PERSETUJUAN', 'DIKERJAKAN', 'SELESAI', 'DIAMBIL', 'DIBATALKAN'];

export default function Dashboard() {
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({});
  const [status, setStatus] = useState('SEMUA');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function load() {
    setLoading(true);
    const p = new URLSearchParams();
    if (status !== 'SEMUA') p.set('status', status);
    if (q.trim()) p.set('q', q.trim());
    const res = await fetch(`/api/admin/orders?${p.toString()}`);
    if (res.status === 401) {
      router.push('/admin');
      return;
    }
    const data = await res.json();
    setOrders(data.orders || []);
    setStats(data.stats || {});
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function openDetail(id) {
    const res = await fetch(`/api/admin/orders/${id}`);
    const data = await res.json();
    if (res.ok) setSelected({ ...data.order, logs: data.logs, _catatanLog: '' });
  }

  async function save() {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/orders/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: selected.status,
          estimasiBiaya: selected.estimasiBiaya,
          biayaAkhir: selected.biayaAkhir,
          estimasiSelesai: selected.estimasiSelesai,
          catatanAdmin: selected.catatanAdmin,
          catatanLog: selected._catatanLog,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal simpan');
      setSelected(null);
      load();
      alert('✅ Order ' + data.order.kode + ' berhasil diupdate. Pelanggan bisa lihat di /lacak.');
    } catch (e) {
      alert('❌ ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin');
  }

  return (
    <div className="wrap admin-shell">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Link href="/" style={{ color: 'var(--cy)', textDecoration: 'none' }}>← Web</Link>
          <h1 style={{ marginTop: 4 }}>📊 Dashboard Admin</h1>
          <p style={{ color: 'var(--mut)' }}>Kelola order masuk & update progres agar terlihat pelanggan.</p>
        </div>
        <button className="btn ghost btn-sm" onClick={logout}>Keluar</button>
      </div>

      <div className="grid4" style={{ marginTop: 18 }}>
        {['DITERIMA', 'DIKERJAKAN', 'SELESAI', 'DIAMBIL'].map((s) => (
          <div key={s} className="side-card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 900 }}>{stats[s] || 0}</div>
            <div style={{ fontSize: 13, color: 'var(--mut)' }}>{STATUS_LABEL[s]}</div>
          </div>
        ))}
      </div>

      <form className="toolbar" onSubmit={(e) => { e.preventDefault(); load(); }}>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          {ALL_STATUS.map((s) => (
            <option key={s} value={s}>{s === 'SEMUA' ? 'Semua status' : STATUS_LABEL[s]}</option>
          ))}
        </select>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari kode / nama / WA / layanan..." style={{ flex: 1, minWidth: 200 }} />
        <button className="btn cy btn-sm" type="submit">Cari</button>
      </form>

      <div className="table-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>Kode</th><th>Pelanggan</th><th>Layanan</th><th>Status</th><th>Masuk</th><th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 30 }}>Memuat...</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 30 }}>Belum ada order. Bagikan link <b>/order</b> ke pelanggan.</td></tr>
            ) : (
              orders.map((o) => (
                <tr key={o.id}>
                  <td><b>{o.kode}</b></td>
                  <td>{o.nama}<br /><small style={{ color: 'var(--mut)' }}>{o.wa}</small></td>
                  <td>{o.layanan}<br /><small style={{ color: 'var(--mut)' }}>{o.kategori}</small></td>
                  <td><StatusBadge status={o.status} /></td>
                  <td><small>{new Date(o.createdAt).toLocaleString('id-ID')}</small></td>
                  <td>
                    <button className="btn btn-sm" style={{ background: 'var(--cy)', color: '#04222a' }} onClick={() => openDetail(o.id)}>
                      Kelola
                    </button>{' '}
                    <Link href={`/lacak/${o.kode}`} target="_blank" className="btn ghost btn-sm">Lihat</Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 100, display: 'grid', placeItems: 'center', padding: 16 }} onClick={() => setSelected(null)}>
          <div className="panel" style={{ maxWidth: 640, width: '100%', maxHeight: '90vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <h3>Kelola {selected.kode}</h3>
            <p style={{ color: 'var(--mut)', fontSize: 14, marginBottom: 12 }}>
              {selected.nama} • {selected.wa} • {selected.layanan}<br />“{selected.deskripsi}”
            </p>
            <div className="grid2">
              <div className="field">
                <label>Status</label>
                <select value={selected.status} onChange={(e) => setSelected({ ...selected, status: e.target.value })}>
                  {Object.keys(STATUS_LABEL).map((s) => (
                    <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Estimasi selesai</label>
                <input value={selected.estimasiSelesai || ''} onChange={(e) => setSelected({ ...selected, estimasiSelesai: e.target.value })} placeholder="cth: 2-3 hari / Jumat sore" />
              </div>
            </div>
            <div className="grid2">
              <div className="field">
                <label>Estimasi biaya (Rp)</label>
                <input type="number" value={selected.estimasiBiaya || 0} onChange={(e) => setSelected({ ...selected, estimasiBiaya: e.target.value })} />
                <div className="hint">{formatRupiah(selected.estimasiBiaya)}</div>
              </div>
              <div className="field">
                <label>Biaya akhir (Rp, isi saat selesai)</label>
                <input type="number" value={selected.biayaAkhir || 0} onChange={(e) => setSelected({ ...selected, biayaAkhir: e.target.value })} />
              </div>
            </div>
            <div className="field">
              <label>Catatan teknisi (terlihat pelanggan)</label>
              <textarea value={selected.catatanAdmin || ''} onChange={(e) => setSelected({ ...selected, catatanAdmin: e.target.value })} placeholder="cth: LCD harus ganti, ori 650rb / KW 380rb. Menunggu persetujuan." />
            </div>
            <div className="field">
              <label>Catatan log update ini <small>(masuk riwayat timeline)</small></label>
              <input value={selected._catatanLog || ''} onChange={(e) => setSelected({ ...selected, _catatanLog: e.target.value })} placeholder="cth: Sudah dibongkar, IC cas kena. Info biaya ke WA pelanggan." />
            </div>
            {selected.logs?.length > 0 && (
              <div style={{ fontSize: 13, color: 'var(--mut)', marginBottom: 12 }}>
                Riwayat: {selected.logs.map((l) => `${STATUS_LABEL[l.status]} (${new Date(l.createdAt).toLocaleDateString('id-ID')})`).join(' → ')}
              </div>
            )}
            <div className="cta-row">
              <button className="btn cy" onClick={save} disabled={saving} style={{ flex: 1 }}>
                {saving ? 'Menyimpan...' : '💾 Simpan Update'}
              </button>
              <button className="btn ghost" onClick={() => setSelected(null)}>Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
