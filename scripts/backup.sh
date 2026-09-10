#!/bin/bash
# scripts/backup.sh — backup Postgres + foto upload (Linux/VPS).
# Pakai: ./scripts/backup.sh   (dari folder project, container harus jalan)
# Hasil: backups/ilotech-YYYY-MM-DD-HHMM.dump (pg_dump custom-format, terkompresi)
#      + backups/uploads-YYYY-MM-DD-HHMM.tar.gz (foto)
# Retensi: 14 backup terakhir, yang lama dihapus otomatis.
# Restore: lihat README bagian Backup.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p backups

STAMP=$(date +%F-%H%M)
DB_C=ilotech-db
WEB_C=ilotech-web

echo "[backup] database -> backups/ilotech-$STAMP.dump"
docker compose exec -T db sh -c "pg_dump -U \"\${POSTGRES_USER:-ilotech}\" -d \"\${POSTGRES_DB:-ilotech}\" -Fc -f /tmp/ilotech-$STAMP.dump"
docker cp "$DB_C:/tmp/ilotech-$STAMP.dump" backups/
docker compose exec -T db rm "/tmp/ilotech-$STAMP.dump"

echo "[backup] uploads -> backups/uploads-$STAMP.tar.gz"
docker compose exec -T web tar -czf "/tmp/uploads-$STAMP.tar.gz" -C /app/data uploads
docker cp "$WEB_C:/tmp/uploads-$STAMP.tar.gz" backups/
docker compose exec -T web rm "/tmp/uploads-$STAMP.tar.gz"

echo "[backup] retensi 14 hari..."
ls -t backups/ilotech-*.dump 2>/dev/null | tail -n +15 | xargs -r rm -f
ls -t backups/uploads-*.tar.gz 2>/dev/null | tail -n +15 | xargs -r rm -f

echo "[backup] selesai:"; ls -lh backups/ | tail -n +2
