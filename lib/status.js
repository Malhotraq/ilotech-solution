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
