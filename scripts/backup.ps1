# scripts/backup.ps1 — backup Postgres + foto upload (Windows).
# Pakai (ExecutionPolicy Bypass):
#   powershell -ExecutionPolicy Bypass -File .\scripts\backup.ps1
# Hasil: backups\ilotech-YYYY-MM-DD-HHMM.dump + backups\uploads-....tar.gz
# - Bila Docker Desktop tersedia: jalan native.
# - Bila Docker hanya ada di WSL2: didelegasikan ke scripts/backup.sh di dalam WSL
#   (argumen docker tidak bisa lewat wsl.exe langsung karena quoting rusak).
# Restore: lihat README bagian Backup.
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
New-Item -ItemType Directory -Path 'backups' -Force | Out-Null

$nativeOk = $false
try { docker ps 2>$null | Out-Null; if ($LASTEXITCODE -eq 0) { $nativeOk = $true } } catch {}

if ($nativeOk) {
  Write-Output '[backup] memakai Docker native'
  $stamp = Get-Date -Format 'yyyy-MM-dd-HHmm'
  docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -f /tmp/ilotech-backup.dump'
  if ($LASTEXITCODE -ne 0) { throw 'pg_dump gagal' }
  docker cp "ilotech-db:/tmp/ilotech-backup.dump" "backups/ilotech-$stamp.dump"
  docker compose exec -T db rm /tmp/ilotech-backup.dump
  docker compose exec -T web tar -czf /tmp/uploads-backup.tar.gz -C /app/data uploads
  docker cp "ilotech-web:/tmp/uploads-backup.tar.gz" "backups/uploads-$stamp.tar.gz"
  docker compose exec -T web rm /tmp/uploads-backup.tar.gz
} else {
  Write-Output '[backup] memakai Docker di WSL2 (delegasi ke scripts/backup.sh)'
  $proj = (Split-Path $PSScriptRoot -Parent)
  $projWsl = '/mnt/' + $proj.Substring(0, 1).ToLower() + ($proj.Substring(2) -replace '\\', '/')
  & wsl.exe -d Ubuntu --cd $projWsl -- bash ./scripts/backup.sh
  if ($LASTEXITCODE -ne 0) { throw 'backup via WSL gagal' }
}

Write-Output '[backup] selesai:'; Get-ChildItem 'backups\' | Format-Table Name, Length
