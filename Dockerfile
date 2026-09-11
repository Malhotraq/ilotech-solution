# ---- Tahap 1: install & build ----
# pg = pure-JS (tanpa native build), jadi tidak butuh python/make/g++.
FROM node:20-bookworm-slim AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# NEXT_PUBLIC_* di-inline ke JS browser SAAT BUILD, jadi nomor WA publik
# harus tersedia di sini (bukan hanya saat container jalan).
# Diisi dari docker-compose build.args (baca dari .env).
ARG NEXT_PUBLIC_ADMIN_WA=62895803366608
ARG NEXT_PUBLIC_GOOGLE_REVIEW_URL=
# dummy env agar build tidak gagal (nilai asli diisi saat running via compose/.env).
# Catatan: halaman dinamis (force-dynamic) tidak dieksekusi saat build,
# jadi dummy DATABASE_URL tidak pernah dipakai untuk koneksi betulan.
ENV ADMIN_PASSWORD=dummy \
    ADMIN_SECRET=dummy-secret-minimal-32-karakter-123456 \
    DATABASE_URL=postgres://dummy:dummy@localhost:5432/dummy \
    NEXT_PUBLIC_ADMIN_WA=${NEXT_PUBLIC_ADMIN_WA} \
    NEXT_PUBLIC_GOOGLE_REVIEW_URL=${NEXT_PUBLIC_GOOGLE_REVIEW_URL} \
    NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- Tahap 2: image produksi (ringan) ----
FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

RUN mkdir -p /app/data/uploads

# salin hasil standalone (Next.js output standalone sudah termasuk server minimal + dep terlacak)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
ENV PORT=3000 \
    HOSTNAME=0.0.0.0

# ./data di-mount sebagai volume (lihat docker-compose.yml) agar foto upload awet.
# Database Postgres memakai volume bernama `pgdata` (lihat docker-compose.yml).
VOLUME ["/app/data"]

CMD ["node", "server.js"]
