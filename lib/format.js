// lib/format.js
// Format tanggal yang aman untuk output DB (ISO dari Postgres) maupun
// format lama "YYYY-MM-DD HH:MM:SS". new Date('2026-01-01 10:00:00') TIDAK
// valid di semua browser (Safari -> Invalid Date), jadi ubah spasi jadi 'T'
// dulu (dianggap waktu lokal).

export function toDateSafe(v) {
  if (!v) return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  const s = String(v).trim();
  const iso = s.includes('T') ? s : s.replace(' ', 'T');
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatTanggal(v) {
  const d = toDateSafe(v);
  return d ? d.toLocaleString('id-ID') : String(v ?? '—');
}

export function formatTanggalPendek(v) {
  const d = toDateSafe(v);
  return d ? d.toLocaleDateString('id-ID') : String(v ?? '—');
}
