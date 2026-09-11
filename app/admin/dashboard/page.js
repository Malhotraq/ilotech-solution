'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { StatusBadge, formatRupiah } from '@/components/OrderUI';
import { STATUS_LABEL, nextStatus, slaInfo, formatUmur } from '@/lib/status';
import { formatTanggal, formatTanggalPendek } from '@/lib/format';

const ALL_STATUS = ['SEMUA', 'LEWAT_SLA', 'DITERIMA', 'DIAGNOSA', 'MENUNGGU_PERSETUJUAN', 'DIKERJAKAN', 'SELESAI', 'DIAMBIL', 'DIBATALKAN'];

// YYYY-MM-DD zona waktu lokal browser (bukan UTC, agar "Hari ini" sesuai WITA).
function tglLokal(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatRpSingkat(n) {
  n = Number(n) || 0;
  if (n >= 1e9) return (n / 1e9).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' M';
  if (n >= 1e6) return (n / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' jt';
  if (n >= 1e3) return Math.round(n / 1e3) + ' rb';
  return String(n);
}

// Grafik batang SVG murni (tanpa dependensi tambahan) — omzet per hari.
function GrafikOmzet({ data }) {
  const hari = [];
  const now = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const key = tglLokal(d);
    const row = (data || []).find((r) => r.t === key);
    hari.push({
      key,
      label: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
      omzet: row ? Number(row.omzet) || 0 : 0,
      jml: row ? Number(row.jml) || 0 : 0,
    });
  }
  const maks = Math.max(1, ...hari.map((h) => h.omzet));
  const total = hari.reduce((a, h) => a + h.omzet, 0);
  const W = 700, H = 190, atas = 24, bawah = 26, kiri = 8;
  const areaH = H - atas - bawah;
  const slot = (W - kiri * 2) / hari.length;
  const barW = Math.min(34, slot * 0.55);
  return (
    <div className="side-card" style={{ marginTop: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
        <h4 style={{ margin: 0 }}>📈 Omzet 14 Hari Terakhir</h4>
        <small style={{ color: 'var(--mut)' }}>Total: <b style={{ color: '#7bf0a4' }}>{formatRupiah(total)}</b> • dari order SELESAI/DIAMBIL</small>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', marginTop: 10 }} role="img" aria-label="Grafik omzet 14 hari terakhir">
        {hari.map((h, i) => {
          const tinggi = Math.max(h.omzet > 0 ? 4 : 0, (h.omzet / maks) * areaH);
          const x = kiri + slot * i + (slot - barW) / 2;
          const y = atas + (areaH - tinggi);
          return (
            <g key={h.key}>
              <title>{`${h.label}: ${formatRupiah(h.omzet)} (${h.jml} order)`}</title>
              <rect x={x} y={y} width={barW} height={tinggi} rx={4} fill={h.omzet > 0 ? 'var(--ok)' : 'rgba(255,255,255,.08)'} opacity={h.omzet > 0 ? 0.9 : 1} />
              {i % 2 === 0 && (
                <text x={x + barW / 2} y={H - 8} fontSize={10} textAnchor="middle" fill="var(--mut)">{h.label}</text>
              )}
            </g>
          );
        })}
        <text x={kiri} y={14} fontSize={11} fill="var(--mut)">maks {formatRpSingkat(maks)}/hari</text>
      </svg>
    </div>
  );
}

export default function Dashboard() {
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({});
  const [finance, setFinance] = useState({ aktif: 0, perhatian: 0, omzetBulanIni: 0, lewatSla: 0 });
  const [status, setStatus] = useState('SEMUA');
  const [q, setQ] = useState('');
  const [dari, setDari] = useState('');
  const [sampai, setSampai] = useState('');
  const [grafik, setGrafik] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function load(ov = {}) {
    setLoading(true);
    // "LEWAT_SLA" adalah filter client-side (API tidak mengenal status itu),
    // jadi jangan kirim sebagai ?status=, melainkan saring setelah fetch.
    const st = ov.status ?? status;
    const d = ov.dari ?? dari;
    const s = ov.sampai ?? sampai;
    const qq = ov.q ?? q;
    const hanyaSla = st === 'LEWAT_SLA';
    const p = new URLSearchParams();
    if (!hanyaSla && st !== 'SEMUA') p.set('status', st);
    if (qq.trim()) p.set('q', qq.trim());
    if (d) p.set('dari', d);
    if (s) p.set('sampai', s);
    const res = await fetch(`/api/admin/orders?${p.toString()}`);
    if (res.status === 401) {
      router.push('/admin');
      return;
    }
    const data = await res.json();
    let list = data.orders || [];
    if (hanyaSla) list = list.filter((o) => slaInfo(o.status, o.updatedAt).lewat);
    setOrders(list);
    setStats(data.stats || {});
    setFinance({ aktif: 0, perhatian: 0, omzetBulanIni: 0, lewatSla: 0, ...(data.finance || {}) });
    setGrafik(data.grafik || []);
    setLoading(false);
  }

  // Preset rentang tanggal — langsung terapkan (set state + fetch).
  function preset(nama) {
    const now = new Date();
    let d = '', s = tglLokal(now);
    if (nama === 'hari-ini') {
      d = s;
    } else if (nama === '7-hari') {
      const t = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
      d = tglLokal(t);
    } else if (nama === 'bulan-ini') {
      d = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    } else {
      d = ''; s = ''; // reset
    }
    setDari(d);
    setSampai(s);
    load({ dari: d, sampai: s });
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

  // Aksi cepat: majukan status 1 langkah tanpa buka modal.
  async function cepat(o) {
    const ns = nextStatus(o.status);
    if (!ns) return;
    if (!confirm(`Update ${o.kode} ke "${STATUS_LABEL[ns]}"? Pelanggan langsung melihatnya.`)) return;
    const res = await fetch(`/api/admin/orders/${o.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: ns }),
    });
    if (!res.ok) {
      const d = await res.json();
      alert('❌ ' + (d.error || 'Gagal update'));
      return;
    }
    load();
  }

  async function hapus(o) {
    if (!confirm(`HAPUS permanen order ${o.kode} (${o.nama})?`)) return;
    if (!confirm('Yakin? Data & riwayatnya hilang selamanya dan tidak bisa dibatalkan!')) return;
    await fetch(`/api/admin/orders/${o.id}`, { method: 'DELETE' });
    load();
  }

  const exportHref = `/api/admin/export?${status !== 'SEMUA' && status !== 'LEWAT_SLA' ? `status=${status}&` : ''}${q.trim() ? `q=${encodeURIComponent(q.trim())}&` : ''}${dari ? `dari=${dari}&` : ''}${sampai ? `sampai=${sampai}` : ''}`;

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
        <div className="side-card" style={{ textAlign: 'center', borderColor: 'var(--or)' }}>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{finance.aktif || 0}</div>
          <div style={{ fontSize: 13, color: 'var(--mut)' }}>Order Aktif</div>
        </div>
        <div className="side-card" style={{ textAlign: 'center', borderColor: 'var(--danger)' }}>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{finance.perhatian || 0}</div>
          <div style={{ fontSize: 13, color: 'var(--mut)' }}>Perlu Perhatian</div>
        </div>
        <div className="side-card" style={{ textAlign: 'center', borderColor: 'var(--ok)' }}>
          <div style={{ fontSize: 22, fontWeight: 900 }}>{formatRupiah(finance.omzetBulanIni)}</div>
          <div style={{ fontSize: 13, color: 'var(--mut)' }}>Omzet Bulan Ini</div>
        </div>
        <div className="side-card" style={{ textAlign: 'center', borderColor: 'var(--danger)' }}>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{finance.lewatSla || 0}</div>
          <div style={{ fontSize: 13, color: 'var(--mut)' }}>⚠️ Lewat SLA</div>
        </div>
        <div className="side-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{orders.length}</div>
          <div style={{ fontSize: 13, color: 'var(--mut)' }}>Tampil di Daftar</div>
        </div>
      </div>

      <div className="grid4" style={{ marginTop: 18 }}>
        {Object.keys(STATUS_LABEL).map((s) => (
          <div key={s} className="side-card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 900 }}>{stats[s] || 0}</div>
            <div style={{ fontSize: 13, color: 'var(--mut)' }}>{STATUS_LABEL[s]}</div>
          </div>
        ))}
      </div>

      <GrafikOmzet data={grafik} />

      <form className="toolbar" onSubmit={(e) => { e.preventDefault(); load(); }}>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          {ALL_STATUS.map((s) => (
            <option key={s} value={s}>{s === 'SEMUA' ? 'Semua status' : s === 'LEWAT_SLA' ? '⚠️ Lewat SLA' : STATUS_LABEL[s]}</option>
          ))}
        </select>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari kode / nama / WA / layanan..." style={{ flex: 1, minWidth: 200 }} />
        <input type="date" value={dari} max={sampai || undefined} onChange={(e) => setDari(e.target.value)} aria-label="Dari tanggal" title="Dari tanggal (tanggal masuk order)" />
        <input type="date" value={sampai} min={dari || undefined} onChange={(e) => setSampai(e.target.value)} aria-label="Sampai tanggal" title="Sampai tanggal (tanggal masuk order)" />
        <button className="btn cy btn-sm" type="submit">Cari</button>
        <a className="btn ghost btn-sm" href={exportHref}>📥 Export CSV</a>
      </form>
      <div className="cta-row" style={{ margin: '0 0 4px', gap: 8, alignItems: 'center' }}>
        <small style={{ color: 'var(--mut)' }}>Preset:</small>
        <button type="button" className="btn ghost btn-sm" onClick={() => preset('hari-ini')}>Hari ini</button>
        <button type="button" className="btn ghost btn-sm" onClick={() => preset('7-hari')}>7 hari</button>
        <button type="button" className="btn ghost btn-sm" onClick={() => preset('bulan-ini')}>Bulan ini</button>
        {(dari || sampai) && (
          <button type="button" className="btn ghost btn-sm" onClick={() => preset('reset')}>✕ Reset tanggal</button>
        )}
      </div>

      <div className="table-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>Kode</th><th>Pelanggan</th><th>Layanan</th><th>Status</th><th>Umur</th><th>Masuk</th><th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 30 }}>Memuat...</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 30 }}>{status === 'LEWAT_SLA' ? '🎉 Tidak ada order yang lewat SLA. Kerja bagus!' : 'Belum ada order. Bagikan link /order ke pelanggan.'}</td></tr>
            ) : (
              orders.map((o) => {
                const sla = slaInfo(o.status, o.updatedAt);
                return (
                <tr key={o.id} style={sla.lewat ? { background: 'rgba(255,93,93,.07)' } : undefined}>
                  <td><b>{o.kode}</b></td>
                  <td>{o.nama}<br /><small style={{ color: 'var(--mut)' }}>{o.wa}</small></td>
                  <td>{o.layanan}<br /><small style={{ color: 'var(--mut)' }}>{o.kategori}</small></td>
                  <td><StatusBadge status={o.status} /></td>
                  <td>
                    <small title={sla.batas ? `Batas SLA: ${sla.batas} jam sejak update terakhir` : 'Status terminal, tanpa SLA'}>
                      {sla.batas ? formatUmur(sla.jam) : '—'}
                    </small>
                    {sla.lewat && (<><br /><small style={{ color: '#ff9c9c', fontWeight: 800 }}>🔴 LEWAT SLA</small></>)}
                  </td>
                  <td><small>{formatTanggal(o.createdAt)}</small></td>
                  <td>
                    <button className="btn btn-sm" style={{ background: 'var(--cy)', color: '#04222a' }} onClick={() => openDetail(o.id)}>
                      Kelola
                    </button>{' '}
                    {nextStatus(o.status) && (
                      <button className="btn btn-sm" style={{ background: 'var(--ok)', color: '#04222a' }} title={`Langsung lanjut ke: ${STATUS_LABEL[nextStatus(o.status)]}`} onClick={() => cepat(o)}>
                        ➡️
                      </button>
                    )}{' '}
                    <Link href={`/lacak/${o.kode}`} target="_blank" className="btn ghost btn-sm">Lihat</Link>{' '}
                    <button className="btn btn-sm" style={{ background: 'transparent', border: '1px solid var(--danger)', color: '#ff9c9c' }} title="Hapus permanen" onClick={() => hapus(o)}>
                      ✕
                    </button>
                  </td>
                </tr>
                );
              })
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
              <br /><Link href={`/lacak/${selected.kode}`} target="_blank" style={{ color: 'var(--cy)' }}>🔍 Lihat halaman pelanggan</Link>
              {' • '}<Link href={`/nota/${selected.kode}`} target="_blank" style={{ color: 'var(--cy)' }}>🖨️ Nota</Link>
            </p>
            {selected.fotoUrls?.length > 0 && (
              <div className="foto-grid" style={{ marginBottom: 12 }}>
                {selected.fotoUrls.map((u, i) => (
                  <a key={i} href={u} target="_blank" rel="noopener" className="foto-thumb">
                    <img src={u} alt={`Foto ${i + 1}`} loading="lazy" />
                  </a>
                ))}
              </div>
            )}
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
                Riwayat: {selected.logs.map((l) => `${STATUS_LABEL[l.status]}${l.actor === 'pelanggan' ? '👤' : ''} (${formatTanggalPendek(l.createdAt)})`).join(' → ')}
                <br /><small>👤 = aksi pelanggan (setuju/tolak via website)</small>
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
