// lib/notify.js
// Notifikasi WhatsApp otomatis via Fonnte (https://fonnte.com).
//
// CARA AKTIF:
//   1. Daftar Fonnte, hubungkan nomor WA (bisa nomor admin yang sama), dapatkan TOKEN.
//   2. Isi di .env:  FONNTE_TOKEN=isi-token
//   3. Restart (dev) / up -d --build (Docker).
//
// Bila FONNTE_TOKEN kosong -> semua panggilan di-skip diam-diam (return {skipped:true}),
// jadi website tetap jalan normal tanpa WA otomatis. Pengiriman TIDAK PERNAH
// menggagalkan request utama: selalu bungkus try/catch dan panggil tanpa await
// (fire-and-forget) dari API route.

function fonnteAktif() {
  return Boolean((process.env.FONNTE_TOKEN || '').trim());
}

export function isNotifyAktif() {
  return fonnteAktif();
}

async function kirimFonnte(target, message) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000); // jangan gantung > 8 detik
  try {
    const res = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        Authorization: process.env.FONNTE_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ target, message, delay: '1' }),
      signal: ctrl.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.status === false) {
      console.error('Fonnte gagal:', data?.reason || res.status);
      return { ok: false };
    }
    return { ok: true };
  } catch (e) {
    console.error('Fonnte error:', e?.message || e);
    return { ok: false };
  } finally {
    clearTimeout(t);
  }
}

// API utama. Aman dipanggil tanpa await: notifyWa(...).catch(()=>{}).
export async function notifyWa(target, message) {
  if (!fonnteAktif()) return { skipped: true };
  const digits = String(target || '').replace(/[^0-9]/g, '');
  if (!digits || !message) return { skipped: true };
  return kirimFonnte(digits, message);
}

export function siteUrl() {
  return (process.env.SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
}
