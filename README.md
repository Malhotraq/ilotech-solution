# IloTech Solution — Website + Sistem Order & Tracking

Website jasa & service (migrasi dari HTML statis lama ke **Next.js 14**) + fitur:

- 🏠 **Landing page** (Beranda, Jasa, Service, Tentang, Kontak) — desain lama dipertahankan
- 📝 **/order** — konsumen isi form order, langsung dapat **kode tracking `ILS-XXXXXX`**
- 🔍 **/lacak** — cek progres pakai kode / no. WA
- 🔍 **/lacak/[kode]** — detail + timeline: Diterima → Diagnosa → Menunggu Persetujuan → Dikerjakan → Selesai → Diambil
- 🔐 **/admin** — login + **/admin/dashboard** untuk kelola order, update status, biaya, catatan (langsung terlihat pelanggan)
- 📷 **Upload foto kerusakan** (maks 3, JPG/PNG/WebP) — tampil di halaman lacak & dashboard admin
- 💬 **Notifikasi WA otomatis** via Fonnte: admin dapat info order baru, pelanggan dapat info tiap status berubah (opsional, aktif bila `FONNTE_TOKEN` diisi)
- ✅ **Persetujuan biaya via tombol** di `/lacak/[kode]` — Setuju → otomatis DIKERJAKAN, Tolak → kembali DIAGNOSA
- ⭐ **Rating & ulasan** setelah selesai — tampil sebagai Testimoni di landing page
- 🖨️ **/nota/[kode]** — nota siap cetak / simpan PDF
- 📊 **Dashboard+**: aksi cepat ➡️ per baris, kartu Order Aktif / Perlu Perhatian / Omzet Bulan Ini, **Export CSV**, hapus order, riwayat actor (👤 = aksi pelanggan)
- 🔍 **SEO lokal**: metadata + sitemap + robots + schema Google Business (Tilango, Gorontalo)
- 🌟 **Tombol review Google** otomatis muncul setelah pelanggan rating (isi `NEXT_PUBLIC_GOOGLE_REVIEW_URL` — ambil dari Google Business Profile → Bagikan → link review)
- 💾 Database **Postgres 16** (service `db` di Docker, volume `pgdata`) — aman untuk produksi & mudah di-backup
- 🐳 **Docker + docker-compose** siap deploy ke VPS

Stack: **Next.js saja** (frontend + API Routes backend dalam 1 project). Tanpa backend terpisah.

---

## 1. Struktur folder (hasil migrasi)

```
IloTechSolution/
├── app/
│   ├── layout.js            # layout global + metadata
│   ├── globals.css          # semua CSS (pindahan css/style.css lama + tambahan)
│   ├── page.js              # landing page /
│   ├── order/page.js        # form order
│   ├── lacak/page.js        # halaman cari order
│   ├── lacak/[kode]/page.js # detail + timeline order
│   ├── admin/page.js        # login admin
│   ├── admin/dashboard/page.js
│   └── api/
│       ├── orders/route.js          # POST buat order, GET cari
│       ├── orders/[kode]/route.js   # GET detail JSON
│       └── admin/
│           ├── login/route.js
│           ├── logout/route.js
│           ├── orders/route.js      # GET list + statistik
│           └── orders/[id]/route.js # GET/PATCH/DELETE satu order
├── components/
│   ├── Navbar.js  Footer.js  OrderUI.js
├── lib/
│   ├── db.js      # Postgres (pg pool) + skema + helper
│   ├── auth.js    # login single-password + cookie HMAC
│   └── status.js  # daftar status order
├── public/
│   ├── logo.jpeg  # pindahan dari assets/
│   └── qr-wa.png
├── data/          # foto upload (./data/uploads) — di-mount sebagai volume Docker
├── middleware.js  # jaga /admin/dashboard harus login
├── Dockerfile
├── docker-compose.yml
├── .env.example   # contoh config → copy jadi .env
├── package.json
├── next.config.js # output: standalone (untuk Docker)
├── index.html, css/, js/, assets/  # file STATIS LAMA (arsip, boleh dihapus setelah yakin)
└── DEPLOY.md      # panduan online langkah-demi-langkah (baca ini!)
```

**Dari mana pindah ke mana (web lama → baru):**

| Lama | Baru | Keterangan |
|---|---|---|
| `index.html` | `app/page.js` | section hero/jasa/service/tentang/kontak dipindah jadi komponen React |
| `css/style.css` | `app/globals.css` | 100% dibawa + tambahan CSS form/tracking/admin |
| `js/main.js` (burger menu) | `components/Navbar.js` (`useState`) | tidak perlu file JS terpisah lagi |
| `assets/logo.jpeg`, `qr-wa.png` | `public/logo.jpeg`, `qr-wa.png` | di Next.js file publik wajib di `public/` |
| link WA `wa.me/...` | tetap, + tombol Order/Lacak | tiap kartu jasa sekarang link ke `/order?kategori=...` |

---

## 2. Cara jalan di laptop

**Cara termudah (disarankan): Docker** — lihat bagian 3, cukup `docker compose up -d --build`, buka `http://localhost:3000`. Di mesin ini Docker jalan di dalam WSL2, jadi pakai helper:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start.ps1
# buka http://localhost:3000
```

**Tanpa Docker (untuk ngoding):** butuh **Node.js 20+** + database Postgres (pilih satu):

- Opsi 1: `docker compose up -d db` (hanya databasenya), lalu jalankan web-nya native:
  ```powershell
  $env:DATABASE_URL = 'postgres://ilotech:PASSWORDMU@localhost:5432/ilotech'
  npm.cmd run dev
  ```
- Opsi 2: Postgres cloud gratis (Neon/Supabase) → isi `DATABASE_URL` di `.env`.

```powershell
# 1. masuk folder
cd C:\xampp\htdocs\IloTechSolution

# 2. install (pg = pure-JS, tanpa native build / approve-scripts)
npm.cmd install

# 3. bikin .env
copy .env.example .env
# lalu edit .env: ganti ADMIN_PASSWORD, ADMIN_SECRET, POSTGRES_PASSWORD (+ DATABASE_URL bila tanpa Docker)

# 4. jalan dev (pastikan DATABASE_URL menunjuk Postgres yang hidup)
npm.cmd run dev
# buka http://localhost:3000
```

Halaman penting:

- `http://localhost:3000/` — landing
- `http://localhost:3000/order` — form order
- `http://localhost:3000/lacak` — tracking
- `http://localhost:3000/admin` — login admin (password dari `.env`)

---

## 3. Cara jalan pakai Docker (mirip production)

```powershell
copy .env.example .env
# edit .env dulu! (wajib: ADMIN_PASSWORD, ADMIN_SECRET, POSTGRES_PASSWORD)

docker compose up -d --build
docker compose logs -f
# buka http://localhost:3000
```

Perintah berguna:

```powershell
docker compose ps            # lihat status
docker compose logs -f web   # lihat log
docker compose down          # matikan
docker compose up -d --build # update setelah edit kode
```

Database Postgres tersimpan di volume `pgdata` → **tidak hilang** walau container dihapus/dibuild ulang. Foto upload di `./data/uploads` (volume juga). Backup: `.\scripts\backup.ps1` (Windows) / `./scripts/backup.sh` (VPS) — lihat **Backup** di bawah.

---

## 4. Alur pakai (konsumen vs admin)

**Konsumen:**

1. Buka `/order` → isi nama, WA, layanan, keluhan → Kirim
2. Dapat kode misal `ILS-A8K2QP` → screenshot!
3. Buka `/lacak` → masukkan kode → lihat timeline progres
4. Chat WA bila ada yang kurang jelas

**Kamu (admin):**

1. Buka `/admin` → login
2. Dashboard: lihat order masuk, filter status / cari nama — atau tekan ➡️ untuk majukan status 1 langkah
3. Klik **Kelola** → ubah status (misal DITERIMA → DIAGNOSA), isi estimasi biaya + catatan → Simpan (pelanggan otomatis dapat WA bila Fonnte aktif)
4. Saat status MENUNGGU_PERSETUJUAN: pelanggan tekan **Setuju** (otomatis DIKERJAKAN) / **Tolak** (kembali DIAGNOSA) di halaman lacak
5. Saat selesai: status SELESAI + isi biaya akhir → pelanggan datang ambil → status DIAMBIL → pelanggan bisa kasih ⭐ rating
6. **Export CSV** untuk laporan, **Nota** untuk dicetak saat serah terima

Status resmi: `DITERIMA → DIAGNOSA → MENUNGGU_PERSETUJUAN → DIKERJAKAN → SELESAI → DIAMBIL` (+ `DIBATALKAN` bila batal).

---

## 5. Konfigurasi (.env)

| Key | Isi | Contoh |
|---|---|---|
| `ADMIN_PASSWORD` | password login `/admin` | `Ilotech2026!` (yang kuat!) |
| `ADMIN_SECRET` | string acak 32+ karakter untuk tanda tangan cookie | hasil `openssl rand -hex 32` |
| `DB_PATH` | (dihapus — peninggalan SQLite, abaikan bila masih ada di `.env` lamamu) | — |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | kredensial database | ganti password di produksi! |
| `DATABASE_URL` | koneksi database (Docker: dibentuk otomatis dari 3 var di atas) | `postgres://ilotech:xxx@db:5432/ilotech` |
| `ADMIN_WA` | no WA admin | `62895803366608` |
| `NEXT_PUBLIC_ADMIN_WA` | no WA yang SAMA, untuk tombol WA di browser | `62895803366608` (wajib rebuild setelah ganti!) |
| `COOKIE_SECURE` | paksa cookie admin Secure / tidak (opsional, default otomatis ikut `X-Forwarded-Proto`) | `true` bila TLS di-terminate di luar Nginx |
| `SITE_URL` | URL publik website (untuk link di notifikasi WA) | `https://domainmilikmu.id` (produksi) |
| `FONNTE_TOKEN` | token Fonnte untuk WA otomatis (opsional, kosongkan = mati) | dari dashboard https://fonnte.com |
| `UPLOAD_DIR` | folder foto upload (opsional) | `./data/uploads` (lokal) / `/app/data/uploads` (docker) |
| `NEXT_PUBLIC_GOOGLE_REVIEW_URL` | link review Google (opsional, kosongkan = tombol disembunyikan, wajib rebuild) | dari Google Business → Bagikan |

> Setelah online ke VPS: **wajib** ganti `ADMIN_PASSWORD` & `ADMIN_SECRET` dengan yang kuat & berbeda dari contoh.

---

## 6. Mau online? → baca DEPLOY.md

Panduan lengkap bahasa Indonesia ada di **`DEPLOY.md`**:

- Opsi A: VPS + Docker (disarankan, murah ±Rp 60–100rb/bln) — dari beli VPS, install Docker, upload project, jalan `docker compose`, pasang domain + HTTPS gratis
- Opsi B: Vercel (tanpa Docker, paling gampang) + database Neon/Supabase — cukup isi `DATABASE_URL`, tanpa refactor (skema dibuat otomatis saat start)
- Checklist keamanan + backup + update rutin

XAMPP **tidak dipakai lagi** setelah pindah ke Next.js (XAMPP hanya untuk PHP). Next.js jalan via `node` / Docker.

---

## 7. Backup (database + foto)

Backup manual cukup 1 perintah (dari folder project, saat container jalan):

```powershell
# Windows (script butuh Bypass sekali saja):
powershell -ExecutionPolicy Bypass -File .\scripts\backup.ps1
# hasil di folder backups/
./scripts/backup.sh         # Linux/VPS — hasil di folder backups/, retensi 14 hari
```

Isi backup: `ilotech-YYYY-MM-DD-HHMM.dump` (database via `pg_dump -Fc`, terkompresi) + `uploads-....tar.gz` (foto).
Restore database:

```bash
docker cp backups/ilotech-2026-09-10-1200.dump ilotech-db:/tmp/restore.dump
docker compose exec -T db pg_restore -U ilotech -d ilotech --clean /tmp/restore.dump
```

Jadwalkan otomatis di VPS (tiap jam 2 pagi):

```bash
crontab -e
# tambah baris:
0 2 * * * cd /root/ilotech && ./scripts/backup.sh >> backups/cron.log 2>&1
```

---

## 8. Roadmap (ide pengembangan)

- [x] Upload foto kerusakan (selesai — maks 3, tersimpan di volume Docker)
- [x] Notifikasi WA otomatis saat status berubah (selesai — via Fonnte, opsional)
- [x] Cetak nota / invoice + QR kode tracking (selesai — `/nota/[kode]`, siap print/PDF)
- [ ] Multi-admin + peran (teknisi vs kasir)
- [x] Ganti SQLite → Postgres (selesai — Postgres 16 via Docker + `pg`)
- [ ] Pengingat otomatis bila order terlalu lama di satu status (SLA)
