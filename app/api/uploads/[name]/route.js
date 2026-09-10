import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { uploadDir } from '@/lib/db';

const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

// GET /api/uploads/<nama> — sajikan foto. Nama divalidasi ketat agar tidak
// bisa dipakai path-traversal (cth: ../../.env mustahil lolos regex).
export async function GET(req, { params }) {
  const nama = String(params.name || '');
  if (!/^[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp)$/i.test(nama)) {
    return NextResponse.json({ error: 'Nama file tidak valid.' }, { status: 400 });
  }
  const file = path.join(uploadDir(), path.basename(nama));
  if (!fs.existsSync(file)) {
    return NextResponse.json({ error: 'Foto tidak ditemukan.' }, { status: 404 });
  }
  const ext = path.extname(nama).toLowerCase();
  const buf = fs.readFileSync(file);
  return new Response(buf, {
    headers: {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
