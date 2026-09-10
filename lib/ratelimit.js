// lib/ratelimit.js
// Rate limiter in-memory (tanpa dependensi tambahan).
// COCOK untuk deploy saat ini: 1 container Docker di 1 VPS (single instance).
// Bila nanti scale ke multi-instance / multi-replica, ganti dengan store bersama
// (mis. Redis / tabel SQLite) karena hitungan ini tidak terbagi antar proses.

const buckets = new Map(); // key -> { count, start }

function sweep(now, windowMs) {
  if (buckets.size < 2000) return;
  for (const [k, v] of buckets) {
    if (now - v.start > windowMs) buckets.delete(k);
  }
}

// return { ok, remaining }. ok=false berarti sudah over-limit -> balas 429.
export function rateLimit(key, max, windowMs) {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || now - b.start > windowMs) {
    b = { count: 0, start: now };
    buckets.set(key, b);
  }
  b.count += 1;
  if (Math.random() < 0.02) sweep(now, windowMs);
  return { ok: b.count <= max, remaining: Math.max(0, max - b.count) };
}

export function clientIp(req) {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip')?.trim() || 'unknown';
}
