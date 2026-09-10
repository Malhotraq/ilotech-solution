# scripts/start.ps1 — nyalakan semuanya (Windows + Docker di WSL2).
# Pakai: powershell -ExecutionPolicy Bypass -File .\scripts\start.ps1
# - Menjaga WSL tetap hidup (keeper) agar VM tidak mati saat idle.
# - docker compose up -d (build ulang bila ada perubahan kode).
# - Buka http://localhost:3000 di browser.
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)

# 1. Keeper: proses ringan agar WSL tidak di-terminate Windows saat idle.
$keeper = Get-Process | Where-Object { $_.ProcessName -eq 'wsl' -and $_.Id -ne $PID } | Select-Object -First 1
if (-not $keeper) {
  Write-Output '[start] menyalakan penjaga WSL...'
  Start-Process -FilePath 'wsl.exe' -ArgumentList '-d', 'Ubuntu', 'sleep', 'infinity' -WindowStyle Hidden
}

# 2. Project path versi WSL (/mnt/e/...).
$proj = (Get-Location).Path
$projWsl = '/mnt/' + $proj.Substring(0, 1).ToLower() + ($proj.Substring(2) -replace '\\', '/')

# 3. Up (deteksi docker native vs WSL).
$nativeOk = $false
try { docker ps 2>$null | Out-Null; if ($LASTEXITCODE -eq 0) { $nativeOk = $true } } catch {}
if ($nativeOk) { docker compose up -d --build }
else { & wsl.exe -d Ubuntu --cd $projWsl -- docker compose up -d --build }

Write-Output ''
Write-Output '[start] SELESAI — buka: http://localhost:3000'
Write-Output '[start] dashboard admin: http://localhost:3000/admin'
