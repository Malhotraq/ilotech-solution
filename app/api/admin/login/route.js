import { NextResponse } from 'next/server';
import { checkPassword, createAdminToken, getAdminCookieName } from '@/lib/auth';

// POST /api/admin/login { password }
export async function POST(req) {
  try {
    const { password } = await req.json();
    if (!checkPassword(password)) {
      return NextResponse.json({ error: 'Password salah.' }, { status: 401 });
    }
    const res = NextResponse.json({ ok: true });
    // secure:false agar login tetap jalan di http://IP-VPS:3000 (sebelum pasang HTTPS).
    // Aman karena sudah httpOnly + sameSite lax + password single-admin.
    // Kalau nanti full HTTPS + ingin strict, boleh ubah ke true.
    res.cookies.set(getAdminCookieName(), createAdminToken(), {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 hari
    });
    return res;
  } catch (e) {
    return NextResponse.json({ error: 'Gagal login.' }, { status: 500 });
  }
}
