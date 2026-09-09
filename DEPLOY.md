# CARA MENGONLINEKAN — IloTech Solution (Next.js + Docker)

Panduan ini ditulis agar kamu **paham konsepnya**, bukan sekadar copy-paste. Target akhir: website bisa dibuka semua orang via `https://ilotech...` dan order masuk tersimpan aman di VPS.

Estimasi waktu: 1–2 jam (pertama kali). Biaya: VPS ±Rp 60–120rb/bulan + domain ±Rp 150rb/tahun.

---

## DAFTAR ISI

1. [Peta besar: bagaimana website online bekerja](#1-peta-besar)
2. [Yang perlu disiapkan](#2-siap)
3. [Opsi A — VPS + Docker (DISARANKAN)](#3-vps-docker)
4. [Pasang domain + HTTPS gratis](#4-domain-https)
5. [Update website setelah ada perubahan](#5-update)
6. [Backup & keamanan](#6-backup)
7. [Opsi B — Vercel tanpa Docker (alternatif)](#7-vercel)
8. [Troubleshooting](#8-trouble)

---

## 1. PETA BESAR <a id="1-peta-besar"></a>

```
[HP Pelanggan] --internet--> [Domain ilotech.id] --> [VPS kamu: Ubuntu + Docker]
                                                            |
                                                     +------+------+
                                                     | container   |
                                                     | Next.js :3000|
                                                     | + ilotech.db |
                                                     +-------------+
```

- **VPS** = komputer sewaan yang nyala 24 jam di internet (contoh: IDCloudHost, Niagahoster, Biznet Gio, DigitalOcean, Contabo).
- **Docker** = “kotak” berisi aplikasimu + Node.js, agar jalan sama persis di laptop & di VPS.
- **docker-compose.yml** = resep “jalankan kotak web, port 3000, simpan DB di ./data”.
- **Domain** = nama cantik (`ilotechsolution.id`) yang mengarah ke IP VPS.
- **Nginx + Certbot** = pintu depan: menerima `https://...` (port 443) lalu meneruskan ke aplikasimu (port 3000), + sertifikat HTTPS gratis.

Kenapa XAMPP tidak dipakai? XAMPP untuk PHP. Project barumu Node.js (Next.js) → dijalankan via `node` / Docker, bukan via `htdocs`.

---

## 2. YANG PERLU DISIAPKAN <a id="2-siap"></a>

- [ ] Project ini sudah bisa jalan di laptop via `docker compose up` (test dulu!)
- [ ] Akun VPS Ubuntu 22.04/24.04, RAM minimal 1 GB (cukup untuk web ini)
- [ ] Domain (beli di Niagahoster/IDCloudHost/Cloudflare, ±Rp 130–180rb/tahun untuk `.id`/`.my.id`/`.com`)
- [ ] File `.env` produksi (password kuat!)
- [ ] Akun GitHub (opsional tapi disarankan untuk upload kode)

**Siapkan `.env` produksi di laptop dulu:**

```env
ADMIN_PASSWORD=BuatPasswordKuat!2026@Gorontalo
ADMIN_SECRET=isi-string-acak-panjang-minimal-32-karakter-xxxx
DB_PATH=/app/data/ilotech.db
ADMIN_WA=62895803366608
```

Bikin secret acak (di PowerShell):

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Max 256 }))
```

---

## 3. OPSI A — VPS + DOCKER <a id="3-vps-docker"></a>

### Langkah 1 — Beli & buka VPS

1. Beli VPS Ubuntu 22.04, lokasi **Singapore** (paling dekat ke Gorontalo, latency kecil).
2. Kamu dapat **IP publik**, contoh: `103.147.9.27`, + user `root` & password.
3. Sambungkan via SSH dari laptop:

```powershell
ssh root@103.147.9.27
```

> Di Windows 10/11 `ssh` sudah bawaan PowerShell. Masukkan password VPS saat diminta.

### Langkah 2 — Install Docker di VPS (sekali saja)

Jalankan di VPS (copy satu per satu, pahami tiap baris):

```bash
# update sistem
apt update && apt upgrade -y

# install docker resmi
curl -fsSL https://get.docker.com | sh

# cek
docker --version
docker compose version
```

### Langkah 3 — Upload project ke VPS

**Cara termudah (tanpa Git):** kompres dari laptop lalu upload via SCP.

Di laptop:

```powershell
# dari folder IloTechSolution, pastikan .env SUDAH diisi versi produksi
# hapus folder berat agar upload cepat:
# (node_modules, .next, data/*.db tidak perlu diupload)
```

Lalu upload (ganti IP):

```powershell
scp -r C:\xampp\htdocs\IloTechSolution root@103.147.9.27:/root/ilotech
```

> Akan diminta password. Tunggu sampai selesai. Alternatif modern: push ke GitHub lalu `git clone` di VPS — lebih rapi untuk update berikutnya.

**Cara rapi (pakai GitHub, disarankan):**

```bash
# di VPS:
apt install -y git
git clone https://github.com/usernamekamu/ilotech-solution.git /root/ilotech
cd /root/ilotech
# bikin .env produksi:
nano .env   # paste isi .env produksi, Ctrl+O Enter, Ctrl+X keluar
```

### Langkah 4 — Jalankan!

```bash
cd /root/ilotech
docker compose up -d --build
docker compose ps
docker compose logs -f
```

Buka di browser HP/laptop: `http://103.147.9.27:3000` (ganti IP kamu).

- `/` → landing ✅
- `/order` → buat 1 order dummy ✅
- `/lacak` → cari order tadi ✅
- `/admin` → login ✅

Kalau semua bisa dibuka via IP → **aplikasi sudah online**, tinggal percantik aksesnya pakai domain + HTTPS di bawah.

### Firewall (penting!)

```bash
ufw allow OpenSSH
ufw allow 80,443/tcp
ufw allow 3000/tcp   # sementara untuk test via IP; nanti boleh ditutup setelah Nginx jadi
ufw enable
ufw status
```

---

## 4. DOMAIN + HTTPS GRATIS <a id="4-domain-https"></a>

### a. Arahkan domain ke VPS

Di panel tempat beli domain, tambah **A Record**:

| Host | Type | Value |
|---|---|---|
| `@` | A | `103.147.9.27` (IP VPS kamu) |
| `www` | A | `103.147.9.27` |

Tunggu 5 menit – 2 jam (propagasi DNS). Cek: `ping ilotechmilikmu.id` harus balas IP VPS.

### b. Pasang Nginx sebagai reverse proxy + HTTPS

Di VPS:

```bash
apt install -y nginx certbot python3-certbot-nginx

# config nginx
nano /etc/nginx/sites-available/ilotech
```

Isi (ganti domain):

```nginx
server {
  server_name ilotechmilikmu.id www.ilotechmilikmu.id;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
```

```bash
ln -s /etc/nginx/sites-available/ilotech /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# HTTPS gratis (Let's Encrypt)
certbot --nginx -d ilotechmilikmu.id -d www.ilotechmilikmu.id
# pilih: redirect HTTP -> HTTPS = YES
```

Buka `https://ilotechmilikmu.id` 🎉. Gembok hijau = berhasil.

Sertifikat auto-perpanjang. Cek:

```bash
certbot renew --dry-run
```

Setelah Nginx jadi, kamu bisa tutup port 3000 dari publik (opsional, lebih aman):

```bash
ufw delete allow 3000/tcp
# di docker-compose.yml tetap port 3000:3000 (hanya untuk localhost/proxy), Nginx yang meneruskan
```

---

## 5. UPDATE WEBSITE (setelah edit di laptop) <a id="5-update"></a>

Setiap ada perubahan kode:

**Kalau pakai SCP:**

```powershell
# laptop: kompres ulang & upload menimpa, lalu di VPS:
ssh root@IP-VPS
cd /root/ilotech
docker compose up -d --build
docker compose logs -f --tail=50
```

**Kalau pakai Git (lebih enak):**

```bash
# laptop:
git add -A; git commit -m "update ..."; git push

# VPS:
cd /root/ilotech
git pull
docker compose up -d --build
```

**Data order AMAN** karena DB di `./data/ilotech.db` (volume). Jangan hapus folder `data/`!

---

## 6. BACKUP & KEAMANAN <a id="6-backup"></a>

**Backup DB (lakukan mingguan / sebelum update besar):**

```bash
# di VPS:
cd /root/ilotech
cp data/ilotech.db data/backup-$(date +%F).db
# download ke laptop:
```

```powershell
scp root@IP-VPS:/root/ilotech/data/ilotech.db C:\Backup\ilotech-2026-09-09.db
```

**Checklist keamanan:**

- [ ] `ADMIN_PASSWORD` kuat & tidak sama dengan contoh
- [ ] `ADMIN_SECRET` acak & berbeda tiap server
- [ ] Ubuntu rajin `apt update && apt upgrade -y` (bulanan)
- [ ] Jangan share file `.env` ke siapa pun / jangan commit ke GitHub! (`.gitignore` sudah mengecualikan `.env`)
- [ ] Aktifkan firewall `ufw` (lihat atas)
- [ ] Backup `data/ilotech.db` rutin

**Melihat log saat error:**

```bash
docker compose logs -f web
docker compose ps
df -h        # cek disk penuh?
free -h      # cek RAM?
```

---

## 7. OPSI B — VERCEL (tanpa Docker) <a id="7-vercel"></a>

Paling gampang (gratis, HTTPS otomatis), tapi **SQLite tidak cocok** (file hilang tiap deploy) → harus ganti DB ke Vercel Postgres/Neon + Prisma. Langkahnya beda total dan butuh refactor `lib/db.js`. Pilih ini hanya jika:

- Kamu tidak mau urus VPS, dan
- Siap belajar Postgres.

Untuk saat ini (UMKM, 1 admin, ingin paham Docker) → **tetap Opsi A**.

---

## 8. TROUBLESHOOTING <a id="8-trouble"></a>

| Gejala | Penyebab umum | Solusi |
|---|---|---|
| `docker: command not found` | Docker belum terinstall | Ulangi Langkah 2 |
| `port 3000 already in use` | Ada container lama | `docker compose down` lalu `up` lagi |
| Build gagal di `better-sqlite3` | butuh python/make/g++ | Dockerfile sudah install otomatis — pastikan tidak menghapus baris `apt-get install python3 make g++` |
| `/admin` selalu balik ke login | `ADMIN_SECRET` berubah / cookie expired | Login ulang; pastikan `.env` tidak berubah-ubah |
| Gambar logo rusak | file belum di `public/` | pastikan `public/logo.jpeg` ada & ter-copy di Dockerfile |
| Domain tidak bisa dibuka | DNS belum propagasi / Nginx salah | `ping domain`, `nginx -t`, `systemctl status nginx` |
| HTTPS error | port 80 tertutup / domain belum mengarah | buka `ufw allow 80,443/tcp`, tunggu DNS 1 jam |

Masih buntu? Kirim ke saya: screenshot + output `docker compose logs --tail=100`.

---

## RINGKASAN 5 PERINTAH INTI (tempel di catatan)

```bash
docker compose up -d --build   # jalan/update
docker compose logs -f         # lihat log
docker compose ps              # status
docker compose down            # stop
cp data/ilotech.db data/backup-$(date +%F).db  # backup DB
```

Selamat! Setelah lewat panduan ini kamu sudah paham alur **ngoding lokal → Docker → VPS → domain → HTTPS** — skill yang kepakai untuk semua project Next.js berikutnya. 🚀
