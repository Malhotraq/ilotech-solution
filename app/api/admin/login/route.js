import { NextResponse } from 'next/server';
import { checkPassword, createAdminToken, getAdminCookieName } from '@/lib/auth';
import { rateLimit, clientIp } from '@/lib/ratelimit';

// `secure` hanya bila request benar-benar datang via HTTPS.
// - Akses langsung http (localhost / http://IP-VPS:3000 saat testing) -> false, login tetap jalan.
// - Akses domain via Nginx (DEPLOY.md memasang `proxy_set_header X-Forwarded-Proto $scheme`) -> true.
// Override manual bila terminasi TLS berbeda: COOKIE_SECURE=true / false.
function wantSecure(req) {
  if (process.env.COOKIE_SECURE === 'true') return true;
  if (process.env.COOKIE_SECURE === 'false') return false;
  return req.headers.get('x-forwarded-proto') === 'https';
}

// POST /api/admin/login { password }
export async function POST(req) {
  // Tahan brute-force: maks 10x salah / 10 menit / IP.
  const rl = rateLimit(`login:${clientIp(req)}`, 10, 10 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json({ error: 'Terlalu banyak percobaan. Tunggu 10 menit.' }, { status: 429 });
  }
  try {
    const { password } = await req.json();
    if (!checkPassword(password)) {
      return NextResponse.json({ error: 'Password salah.' }, { status: 401 });
    }
    const res = NextResponse.json({ ok: true });
    // httpOnly + sameSite=lax + secure adaptif (lihat wantSecure di atas).
    res.cookies.set(getAdminCookieName(), createAdminToken(), {
      httpOnly: true,
      sameSite: 'lax',
      secure: wantSecure(req),
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 hari
    });
    return res;
  } catch (e) {
    return NextResponse.json({ error: 'Gagal login.' }, { status: 500 });
  }
}
