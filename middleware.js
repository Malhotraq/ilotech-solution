// Middleware berjalan di Edge Runtime → TIDAK boleh import 'crypto' Node.js.
// Jadi verifikasi HMAC pakai Web Crypto (globalThis.crypto.subtle) yang tersedia di Edge.
import { NextResponse } from 'next/server';

async function hmacHex(secret, message) {
  const enc = new TextEncoder();
  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await globalThis.crypto.subtle.sign('HMAC', key, enc.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Lindungi /admin/dashboard (dan semua di bawah /admin kecuali halaman login)
export async function middleware(req) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/admin') && pathname !== '/admin') {
    const token = req.cookies.get('ilotech_admin')?.value;
    const secret = process.env.ADMIN_SECRET || 'dev-secret-ganti-di-production';
    const expected = await hmacHex(secret, 'ilotech-admin');
    if (!token || token !== expected) {
      const url = req.nextUrl.clone();
      url.pathname = '/admin';
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
