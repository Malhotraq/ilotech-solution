import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { uploadDir } from '@/lib/db';
import { rateLimit, clientIp } from '@/lib/ratelimit';

const MAX_FILE = 3; // maks 3 foto per request
const MAX_BYTES = 3 * 1024 * 1024; // 3 MB per foto
const EXT_OK = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

// POST /api/uploads — terima FormData { foto: File[] } -> { urls: ['/api/uploads/xxx.jpg'] }
// Dipakai form order SEBELUM submit (foto diupload dulu, URL-nya ikut ke POST /api/orders).
export async function POST(req) {
  const rl = rateLimit(`upload:${clientIp(req)}`, 20, 60 * 60 * 1000);
  if (!rl.ok) return NextResponse.json({ error: 'Terlalu banyak upload. Coba lagi nanti.' }, { status: 429 });
  try {
    const fd = await req.formData();
    const files = fd.getAll('foto').filter((f) => f && typeof f.arrayBuffer === 'function');
    if (!files.length) return NextResponse.json({ error: 'Tidak ada foto.' }, { status: 400 });
    if (files.length > MAX_FILE) {
      return NextResponse.json({ error: `Maksimal ${MAX_FILE} foto.` }, { status: 400 });
    }

    const dir = uploadDir();
    fs.mkdirSync(dir, { recursive: true });

    const urls = [];
    for (const f of files) {
      const ext = path.extname(f.name || '').toLowerCase();
      if (!EXT_OK[ext]) {
        return NextResponse.json({ error: `Format ${f.name || '?'} tidak didukung. Pakai JPG/PNG/WebP.` }, { status: 400 });
      }
      if (f.size > MAX_BYTES || f.size <= 0) {
        return NextResponse.json({ error: `Foto ${f.name} harus 1 byte – 3 MB.` }, { status: 400 });
      }
      const nama = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
      const buf = Buffer.from(await f.arrayBuffer());
      fs.writeFileSync(path.join(dir, nama), buf);
      urls.push(`/api/uploads/${nama}`);
    }
    return NextResponse.json({ urls }, { status: 201 });
  } catch (e) {
    console.error('POST /api/uploads', e);
    return NextResponse.json({ error: 'Gagal upload foto.' }, { status: 500 });
  }
}
