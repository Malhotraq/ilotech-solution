# IloTech Solution — Website + Sistem Order & Tracking

Website jasa & service (migrasi dari HTML statis lama ke **Next.js 14**) + fitur:

- 🏠 **Landing page** (Beranda, Jasa, Service, Tentang, Kontak) — desain lama dipertahankan
- 📝 **/order** — konsumen isi form order, langsung dapat **kode tracking `ILS-XXXXXX`**
- 🔍 **/lacak** — cek progres pakai kode / no. WA
- 🔍 **/lacak/[kode]** — detail + timeline: Diterima → Diagnosa → Menunggu Persetujuan → Dikerjakan → Selesai → Diambil
- 🔐 **/admin** — login + **/admin/dashboard** untuk kelola order, update status, biaya, catatan (langsung terlihat pelanggan)
- 💾 Database **SQLite** (1 file, tanpa server DB tambahan) — cocok untuk UMKM
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
│   ├── db.js      # SQLite + schema + helper
│   ├── auth.js    # login single-password + cookie HMAC
│   └── status.js  # daftar status order
├── public/
│   ├── logo.jpeg  # pindahan dari assets/
│   └── qr-wa.png
├── data/          # database SQLite (ilotech.db) — di-mount sebagai volume Docker
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

## 2. Cara jalan di laptop (tanpa Docker — untuk ngoding)

Butuh **Node.js 20+**.

```powershell
# 1. masuk folder
cd C:\xampp\htdocs\IloTechSolution

# 2. install
npm.cmd install

# 3. bikin .env
copy .env.example .env
# lalu edit .env: ganti ADMIN_PASSWORD & ADMIN_SECRET

# 4. jalan dev
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
# edit .env dulu!

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

Database tersimpan di folder `./data/ilotech.db` (di-mount sebagai volume) → **tidak hilang** walau container dihapus/dibuild ulang. Backup cukup copy file itu.

---

## 4. Alur pakai (konsumen vs admin)

**Konsumen:**

1. Buka `/order` → isi nama, WA, layanan, keluhan → Kirim
2. Dapat kode misal `ILS-A8K2QP` → screenshot!
3. Buka `/lacak` → masukkan kode → lihat timeline progres
4. Chat WA bila ada yang kurang jelas

**Kamu (admin):**

1. Buka `/admin` → login
2. Dashboard: lihat order masuk, filter status / cari nama
3. Klik **Kelola** → ubah status (misal DITERIMA → DIAGNOSA), isi estimasi biaya + catatan → Simpan
4. Pelanggan otomatis lihat update di `/lacak/[kode]`
5. Saat selesai: status SELESAI + isi biaya akhir → pelanggan datang ambil → status DIAMBIL

Status resmi: `DITERIMA → DIAGNOSA → MENUNGGU_PERSETUJUAN → DIKERJAKAN → SELESAI → DIAMBIL` (+ `DIBATALKAN` bila batal).

---

## 5. Konfigurasi (.env)

| Key | Isi | Contoh |
|---|---|---|
| `ADMIN_PASSWORD` | password login `/admin` | `Ilotech2026!` (yang kuat!) |
| `ADMIN_SECRET` | string acak 32+ karakter untuk tanda tangan cookie | hasil `openssl rand -hex 32` |
| `DB_PATH` | lokasi DB | `./data/ilotech.db` (lokal) / `/app/data/ilotech.db` (docker) |
| `ADMIN_WA` | no WA admin | `62895803366608` |

> Setelah online ke VPS: **wajib** ganti `ADMIN_PASSWORD` & `ADMIN_SECRET` dengan yang kuat & berbeda dari contoh.

---

## 6. Mau online? → baca DEPLOY.md

Panduan lengkap bahasa Indonesia ada di **`DEPLOY.md`**:

- Opsi A: VPS + Docker (disarankan, murah ±Rp 60–100rb/bln) — dari beli VPS, install Docker, upload project, jalan `docker compose`, pasang domain + HTTPS gratis
- Opsi B: Vercel (tanpa Docker, paling gampang, tapi DB SQLite perlu diganti)
- Checklist keamanan + backup + update rutin

XAMPP **tidak dipakai lagi** setelah pindah ke Next.js (XAMPP hanya untuk PHP). Next.js jalan via `node` / Docker.

---

## 7. Roadmap (ide pengembangan)

- Upload foto kerusakan (saat ini baru deskripsi teks)
- Notifikasi WA otomatis saat status berubah (integrasi Fonnte/Wablas)
- Cetak nota / invoice PDF + QR kode tracking
- Multi-admin + peran (teknisi vs kasir)
- Ganti SQLite → Postgres bila order > puluhan ribu
