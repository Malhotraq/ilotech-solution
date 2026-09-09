# ---- Tahap 1: install & build ----
FROM node:20-bookworm-slim AS builder
WORKDIR /app

# butuh python/make/g++ untuk better-sqlite3
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json ./
# pakai npm install (tanpa lockfile pun jalan)
RUN npm install

COPY . .
# dummy env agar build tidak gagal (nilai asli diisi saat running via compose/.env)
ENV ADMIN_PASSWORD=dummy \
    ADMIN_SECRET=dummy-secret-minimal-32-karakter-123456 \
    DB_PATH=/app/data/ilotech.db \
    NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- Tahap 2: image produksi (ringan) ----
FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/* \
  && mkdir -p /app/data

# salin hasil standalone (Next.js output standalone sudah termasuk server minimal)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
# better-sqlite3 native binding ikut dari node_modules — salin yang perlu
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
ENV PORT=3000 \
    HOSTNAME=0.0.0.0 \
    DB_PATH=/app/data/ilotech.db

# data/ di-mount sebagai volume (lihat docker-compose.yml) agar DB awet
VOLUME ["/app/data"]

CMD ["node", "server.js"]
