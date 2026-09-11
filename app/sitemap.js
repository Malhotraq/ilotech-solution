// app/sitemap.js — peta situs untuk Google (hanya halaman publik, tanpa detail order).
export default function sitemap() {
  const base = (process.env.SITE_URL || '').startsWith('http')
    ? process.env.SITE_URL.replace(/\/$/, '')
    : null;
  if (!base) return [];
  const now = new Date();
  return ['/', '/order', '/lacak', '/status'].map((p) => ({ url: base + p, lastModified: now }));
}
