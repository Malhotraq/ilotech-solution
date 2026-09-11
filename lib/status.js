// lib/status.js
// Daftar status order + helper tampilan (satu sumber kebenaran untuk front & back)

export const STATUS_LIST = [
  'DITERIMA',
  'DIAGNOSA',
  'MENUNGGU_PERSETUJUAN',
  'DIKERJAKAN',
  'SELESAI',
  'DIAMBIL',
];

export const STATUS_LABEL = {
  DITERIMA: 'Diterima',
  DIAGNOSA: 'Diagnosa',
  MENUNGGU_PERSETUJUAN: 'Menunggu Persetujuan',
  DIKERJAKAN: 'Dikerjakan',
  SELESAI: 'Selesai / Bisa Diambil',
  DIAMBIL: 'Sudah Diambil',
  DIBATALKAN: 'Dibatalkan',
};

export const STATUS_DESC = {
  DITERIMA: 'Order masuk, menunggu dicek teknisi.',
  DIAGNOSA: 'Teknisi sedang memeriksa kerusakan & estimasi biaya.',
  MENUNGGU_PERSETUJUAN: 'Menunggu persetujuan biaya dari kamu via WA.',
  DIKERJAKAN: 'Perangkat sedang diperbaiki / dikerjakan.',
  SELESAI: 'Sudah beres & lolos tes. Siap diambil / diantar.',
  DIAMBIL: 'Perangkat sudah diambil pelanggan. Terima kasih!',
  DIBATALKAN: 'Order dibatalkan.',
};

export function isValidStatus(s) {
  return Object.keys(STATUS_LABEL).includes(s);
}

export function nextStatus(current) {
  const i = STATUS_LIST.indexOf(current);
  if (i === -1 || i === STATUS_LIST.length - 1) return null;
  return STATUS_LIST[i + 1];
}

// --- SLA (batas wajar order diam di satu status, dalam jam) ---
// Dipakai dashboard untuk menandai order yang "macet" agar tidak terlewat.
// DIAMBIL / DIBATALKAN = terminal, tidak ada SLA (null).
export const SLA_JAM = {
  DITERIMA: 24,
  DIAGNOSA: 48,
  MENUNGGU_PERSETUJUAN: 72,
  DIKERJAKAN: 120,
  SELESAI: 72,
  DIAMBIL: null,
  DIBATALKAN: null,
};

// slaInfo(status, updatedAt) -> { jam, batas, lewat }
// jam = umur sejak update terakhir. lewat = true bila melewati batas SLA.
export function slaInfo(status, updatedAt) {
  const batas = SLA_JAM[status] ?? null;
  if (!batas) return { jam: 0, batas: null, lewat: false };
  const t = updatedAt instanceof Date ? updatedAt.getTime() : new Date(updatedAt).getTime();
  if (Number.isNaN(t)) return { jam: 0, batas, lewat: false };
  const jam = Math.max(0, (Date.now() - t) / 3600000);
  return { jam, batas, lewat: jam > batas };
}

// 0.4 -> "24 mnt", 5 -> "5 jam", 60 -> "2 hari"
export function formatUmur(jam) {
  if (!Number.isFinite(jam) || jam < 0) return '—';
  if (jam < 1) return `${Math.max(1, Math.round(jam * 60))} mnt`;
  if (jam < 48) return `${Math.floor(jam)} jam`;
  return `${Math.floor(jam / 24)} hari`;
}
