// lib/site.js
// Satu sumber kebenaran untuk nomor WhatsApp admin + link wa.me.
// Ganti nomor cukup di .env (ADMIN_WA & NEXT_PUBLIC_ADMIN_WA), jangan edit satu-satu di halaman.
//
// Catatan Next.js: file ini dipakai komponen Client & Server, jadi baca varian
// NEXT_PUBLIC_* (di-inline saat BUILD). Setelah ganti nomor: rebuild + restart
// (lokal: npm run build / dev otomatis; Docker: docker compose up -d --build).

const FALLBACK_WA = '62895803366608'; // nomor lama, dipakai bila env belum diisi

export const ADMIN_WA =
  (process.env.NEXT_PUBLIC_ADMIN_WA || '').replace(/[^0-9]/g, '') || FALLBACK_WA;

// Teks tampilan, mis. 62895803366608 -> 0895-8033-66608
export function formatWaDisplay() {
  const local = ADMIN_WA.startsWith('62') ? '0' + ADMIN_WA.slice(2) : ADMIN_WA;
  return local.replace(/(\d{4})(\d{4})(\d+)/, '$1-$2-$3');
}

// waLink('halo') -> https://wa.me/62895...?text=halo (otomatis encode)
export function waLink(text = '') {
  return text
    ? `https://wa.me/${ADMIN_WA}?text=${encodeURIComponent(text)}`
    : `https://wa.me/${ADMIN_WA}`;
}

// Link "Ulas kami di Google" (dari Google Business Profile → Bagikan → link review).
// Kosongkan bila belum ada: tombolnya otomatis disembunyikan.
export const GOOGLE_REVIEW_URL = process.env.NEXT_PUBLIC_GOOGLE_REVIEW_URL || '';
