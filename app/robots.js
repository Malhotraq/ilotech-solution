// app/robots.js — aturan crawler. Sitemap hanya diumumkan bila SITE_URL valid.
export default function robots() {
  const base = (process.env.SITE_URL || '').startsWith('http')
    ? process.env.SITE_URL.replace(/\/$/, '')
    : null;
  return {
    rules: [{ userAgent: '*', allow: '/' }],
    ...(base ? { sitemap: `${base}/sitemap.xml` } : {}),
  };
}
