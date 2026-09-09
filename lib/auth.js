// lib/auth.js
// Auth admin SUPER sederhana: single password dari env.
// Login benar -> server set cookie httpOnly berisi signature HMAC.
// Setiap request admin -> verifikasi signature. Tanpa database session.
// Cocok untuk 1 admin UMKM. Kalau butuh multi-user, ganti ke NextAuth/DB.

import crypto from 'crypto';

const COOKIE_NAME = 'ilotech_admin';

function getSecret() {
  return process.env.ADMIN_SECRET || 'dev-secret-ganti-di-production';
}

export function createAdminToken() {
  // token = hmac(secret, "ilotech-admin")
  // deterministik tapi tidak bisa ditebak tanpa secret
  return crypto
    .createHmac('sha256', getSecret())
    .update('ilotech-admin')
    .digest('hex');
}

export function verifyAdminToken(token) {
  if (!token) return false;
  const expected = createAdminToken();
  // timingSafeEqual agar tidak rentan timing attack
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function getAdminCookieName() {
  return COOKIE_NAME;
}

export function checkPassword(input) {
  const real = process.env.ADMIN_PASSWORD || '';
  if (!real) return false;
  const a = Buffer.from(String(input));
  const b = Buffer.from(String(real));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
