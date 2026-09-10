// lib/harga.js
// DAFTAR HARGA — tampil otomatis di landing (#harga).
// ⚠️ WAJIB REVIEW: angka di bawah adalah tebakan awal agar halaman tidak kosong.
// Sesuaikan dengan tarif resmi IloTech sebelum promosi! Format: harga "mulai dari" (Rp).
// `mulai: null` -> tampil "Tanya WA" (untuk jasa yang sangat variatif).

export const HARGA = [
  {
    grup: 'Service HP',
    kategori: 'SERVICE',
    layanan: 'Service HP',
    items: [
      { nama: 'Flashing / lupa pola / bootloop', mulai: 50000 },
      { nama: 'Ganti konektor cas', mulai: 100000 },
      { nama: 'Ganti baterai', mulai: 150000, catatan: 'tergantung tipe' },
      { nama: 'Ganti LCD / touchscreen', mulai: 300000, catatan: 'tergantung tipe' },
      { nama: 'Mati total (diagnosa dulu, gratis)', mulai: null },
      { nama: 'Backup / pindah data', mulai: 50000 },
    ],
  },
  {
    grup: 'Laptop & Komputer',
    kategori: 'SERVICE',
    layanan: 'Laptop & Komputer',
    items: [
      { nama: 'Install ulang + software', mulai: 75000 },
      { nama: 'Cleaning overheat / lemot', mulai: 100000 },
      { nama: 'Upgrade SSD / RAM (termasuk sparepart)', mulai: 350000, catatan: 'tergantung kapasitas' },
      { nama: 'Ganti keyboard / layar / engsel', mulai: 250000, catatan: 'tergantung tipe' },
      { nama: 'Recovery data hilang', mulai: 150000 },
    ],
  },
  {
    grup: 'Service Printer',
    kategori: 'SERVICE',
    layanan: 'Service Printer',
    items: [
      { nama: 'Paper jam / tidak narik kertas', mulai: 50000 },
      { nama: 'Cleaning / reset / cartridge', mulai: 75000 },
      { nama: 'Pasang infus', mulai: 150000 },
      { nama: 'Sharing jaringan / WiFi', mulai: 100000 },
      { nama: 'Maintenance kantor & sekolah (kontrak)', mulai: null },
    ],
  },
  {
    grup: 'Jasa Website & Aplikasi',
    kategori: 'JASA',
    layanan: 'Pembuatan Website',
    items: [
      { nama: 'Website company profile / UMKM', mulai: 1500000 },
      { nama: 'Toko online / e-commerce', mulai: 2500000 },
      { nama: 'Web aplikasi custom', mulai: null },
      { nama: 'Aplikasi Android / kasir', mulai: 5000000 },
      { nama: 'Rakit PC (jasa, di luar sparepart)', mulai: 200000 },
    ],
  },
];
