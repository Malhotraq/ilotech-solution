import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { waLink, formatWaDisplay } from '@/lib/site';
import { getTestimoni } from '@/lib/db';
import { HARGA } from '@/lib/harga';
import { formatRupiah } from '@/components/OrderUI';

// Testimoni dibaca langsung dari DB tiap request agar rating baru langsung tampil.
export const dynamic = 'force-dynamic';

// Link ke /order pakai objek { pathname, query } agar Next.js otomatis
// meng-encode nilai (penting untuk layanan berkarakter '&' seperti
// "Laptop & Komputer" — versi string mentah "?layanan=Laptop & Komputer"
// akan terpotong menjadi "Layanan=Laptop " oleh browser).
const orderHref = (kategori, layanan) => ({ pathname: '/order', query: { kategori, layanan } });

export default async function Home() {
  // Bila DB sedang mati, landing tetap tampil (tanpa testimoni) alih-alih 500.
  const testi = await getTestimoni().catch(() => ({ count: 0, avg: 0, rows: [] }));
  return (
    <>
      <Navbar />

      {/* HERO */}
      <section className="hero" id="beranda">
        <div className="wrap hero-in">
          <div className="hero-txt">
            <span className="pill">SERVICE • REPAIR • DEVELOPMENT</span>
            <h1>
              Jasa & Service <span className="cy">Teknologi</span> Terpercaya di{' '}
              <span className="or">Gorontalo</span>
            </h1>
            <p>
              Pembuatan website & aplikasi, upgrade laptop/komputer, serta perbaikan HP, laptop,
              komputer & printer. Diagnosa <b>gratis</b>, pengerjaan cepat, harga bersahabat,
              bergaransi. Sekarang bisa <b>order online & lacak progres</b> langsung dari website.
            </p>
            <div className="cta-row">
              <Link className="btn cy" href="/order">📝 Buat Order Sekarang</Link>
              <Link className="btn ghost" href="/lacak">🔍 Lacak Order</Link>
              <a
                className="btn wa"
                href={waLink('Halo IloTech Solution, saya mau konsultasi service/jasa.')}
                target="_blank"
                rel="noopener"
              >
                💬 Chat WhatsApp
              </a>
            </div>
            <div className="mini">
              <div>
                <b>{formatWaDisplay()}</b>
                <small>WhatsApp / Telepon</small>
              </div>
              <div>
                <b>Tilango, Gorontalo</b>
                <small>Terima antar-jemput</small>
              </div>
            </div>
          </div>
          <div className="hero-img">
            <img src="/logo.jpeg" alt="IloTech Solution — Service, Repair & Development" />
          </div>
        </div>
        <div className="chips wrap">
          <span>🌐 Website</span>
          <span>📱 Aplikasi</span>
          <span>💻 Upgrade PC</span>
          <span>📲 Service HP</span>
          <span>🛠️ Service Laptop</span>
          <span>🖨️ Service Printer</span>
        </div>
      </section>

      {/* CARA ORDER */}
      <section className="sec" style={{ paddingBottom: 20 }}>
        <div className="wrap">
          <p className="kicker cy">ORDER ONLINE — BARU</p>
          <h2>Pesan Tanpa Harus ke Tempat, Pantau Sampai Beres</h2>
          <p className="sub">
            Isi form order 1 menit, dapat <b>kode tracking (contoh: ILS-A8K2QP)</b>. Cek status
            kapan saja di menu Lacak Order — Diterima → Diagnosa → Dikerjakan → Selesai.
          </p>
          <div className="steps">
            <div className="step"><span>1</span><b>Isi Form Order</b><p> Pilih layanan & ceritakan keluhan</p></div>
            <div className="step"><span>2</span><b>Dapat Kode</b><p>Simpan kode ILS-XXXXXX kamu</p></div>
            <div className="step"><span>3</span><b>Lacak Progres</b><p>Cek di /lacak kapan saja</p></div>
            <div className="step"><span>4</span><b>Beres + Garansi</b><p>Bayar setelah dites oke</p></div>
          </div>
        </div>
      </section>

      {/* JASA */}
      <section className="sec" id="jasa">
        <div className="wrap">
          <p className="kicker cy">01 — JASA</p>
          <h2>Solusi Digital untuk Bisnis & Kebutuhan Anda</h2>
          <div className="grid3">
            <article className="card neon-cy">
              <div className="ic">🌐</div>
              <h3>Pembuatan Website</h3>
              <ul>
                <li>Company profile & UMKM</li>
                <li>Toko online / e-commerce</li>
                <li>Web aplikasi custom</li>
                <li>Responsif HP & laptop</li>
                <li>Maintenance lanjutan</li>
              </ul>
              <Link className="card-cta" href={orderHref('JASA', 'Pembuatan Website')}>
                Order jasa ini →
              </Link>
            </article>
            <article className="card neon-cy">
              <div className="ic">📱</div>
              <h3>Pembuatan Aplikasi</h3>
              <ul>
                <li>Aplikasi Android & iOS</li>
                <li>Aplikasi kasir / desktop</li>
                <li>Aplikasi berbasis web</li>
                <li>Integrasi sistem & database</li>
                <li>Update & support</li>
              </ul>
              <Link className="card-cta" href={orderHref('JASA', 'Pembuatan Aplikasi')}>
                Order jasa ini →
              </Link>
            </article>
            <article className="card neon-cy">
              <div className="ic">💻</div>
              <h3>Upgrade Laptop & Komputer</h3>
              <ul>
                <li>Upgrade RAM & SSD biar ngebut</li>
                <li>Install ulang & software</li>
                <li>Pembersihan & optimasi</li>
                <li>Rakit PC kantor / gaming</li>
                <li>Konsultasi spek gratis</li>
              </ul>
              <Link className="card-cta" href={orderHref('JASA', 'Upgrade Laptop & Komputer')}>
                Order jasa ini →
              </Link>
            </article>
          </div>
        </div>
      </section>

      {/* SERVICE */}
      <section className="sec alt" id="service">
        <div className="wrap">
          <p className="kicker or">02 — SERVICE / PERBAIKAN</p>
          <h2>Perangkat Rusak? Kami Perbaiki Sampai Beres</h2>
          <div className="grid3">
            <article className="card neon-or">
              <div className="ic">📲</div>
              <h3>Service HP</h3>
              <ul>
                <li>Ganti LCD / touchscreen</li>
                <li>Baterai & konektor cas</li>
                <li>Mati total / bootloop</li>
                <li>Flashing & lupa pola</li>
                <li>Backup & pindah data</li>
              </ul>
              <Link className="card-cta" href={orderHref('SERVICE', 'Service HP')}>
                Order service ini →
              </Link>
            </article>
            <article className="card neon-or">
              <div className="ic">🛠️</div>
              <h3>Laptop & Komputer</h3>
              <ul>
                <li>Mati total / no display</li>
                <li>Keyboard, engsel & layar</li>
                <li>Overheat & mati mendadak</li>
                <li>Virus, lemot & data hilang</li>
                <li>Sparepart ori / sesuai budget</li>
              </ul>
              <Link className="card-cta" href={orderHref('SERVICE', 'Laptop & Komputer')}>
                Order service ini →
              </Link>
            </article>
            <article className="card neon-or">
              <div className="ic">🖨️</div>
              <h3>Service Printer</h3>
              <ul>
                <li>Paper jam / tidak narik kertas</li>
                <li>Hasil bergaris / blank</li>
                <li>Reset, infus & cartridge</li>
                <li>Sharing jaringan / WiFi</li>
                <li>Maintenance kantor & sekolah</li>
              </ul>
              <Link className="card-cta" href={orderHref('SERVICE', 'Service Printer')}>
                Order service ini →
              </Link>
            </article>
          </div>
        </div>
      </section>

      {/* HARGA */}
      <section className="sec" id="harga">
        <div className="wrap">
          <p className="kicker cy">03 — DAFTAR HARGA</p>
          <h2>Harga Transparan, Mulai Dari</h2>
          <p className="sub">
            Harga final selalu dikonfirmasi setelah <b>diagnosa gratis</b> — tidak ada biaya siluman.
            Kamu tekan Setuju dulu, baru teknisi mengerjakan.
          </p>
          <div className="grid3">
            {HARGA.map((g) => (
              <article key={g.grup} className="card">
                <h3>{g.grup}</h3>
                <ul className="harga-list">
                  {g.items.map((h) => (
                    <li key={h.nama}>
                      <span>{h.nama}{h.catatan && <small> ({h.catatan})</small>}</span>
                      <b>{h.mulai ? 'mulai ' + formatRupiah(h.mulai) : 'Tanya WA'}</b>
                    </li>
                  ))}
                </ul>
                <Link className="card-cta" href={orderHref(g.kategori, g.layanan)}>
                  Order {g.grup} →
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* TENTANG */}
      <section className="sec" id="tentang">
        <div className="wrap">
          <p className="kicker cy">04 — KENAPA ILOTECH</p>
          <h2>Kenapa Pelanggan Percaya Kami</h2>
          <div className="grid4">
            <div className="why"><b>🔍 Diagnosa Transparan</b><p>Cek kerusakan gratis. Biaya disetujui dulu sebelum dikerjakan.</p></div>
            <div className="why"><b>⚡ Cepat & Tepat</b><p>Service ringan 1 hari jadi. Upgrade & install bisa ditunggu.</p></div>
            <div className="why"><b>💰 Harga Bersahabat</b><p>Harga pelajar, mahasiswa & UMKM. Sparepart ori / sesuai budget.</p></div>
            <div className="why"><b>🛡️ Garansi Service</b><p>Garansi pengerjaan dan privasi data pelanggan terjaga.</p></div>
          </div>
        </div>
      </section>

      {/* TESTIMONI */}
      <section className="sec" id="testimoni">
        <div className="wrap">
          <p className="kicker or">05 — TESTIMONI</p>
          <h2>Kata Pelanggan Kami</h2>
          {testi.count > 0 ? (
            <>
              <p className="sub">
                ⭐ <b>{testi.avg.toFixed(1).replace('.', ',')}/5</b> dari <b>{testi.count}</b> penilaian terverifikasi (dari order asli).
              </p>
              {testi.rows.length > 0 && (
                <div className="grid3">
                  {testi.rows.map((t, i) => (
                    <article key={i} className="card">
                      <div>{'⭐'.repeat(Math.min(5, t.rating))}</div>
                      <p>“{t.ulasan}”</p>
                      <small style={{ color: 'var(--mut)' }}>{t.nama} • {t.layanan}</small>
                    </article>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="sub">
              Jadilah yang pertama memberi penilaian setelah order selesai — ratingmu tampil di sini.
            </p>
          )}
        </div>
      </section>

      {/* KONTAK */}
      <section className="sec alt" id="kontak">
        <div className="wrap">
          <p className="kicker or">06 — KONTAK</p>
          <h2>Hubungi Kami Sekarang</h2>
          <div className="kontak-grid">
            <div className="kontak-info">
              <div className="krow"><span>📲</span><div><small>WHATSAPP / TELEPON</small><br /><a href={waLink('Halo IloTech Solution, saya mau konsultasi.')} target="_blank" rel="noopener">{formatWaDisplay()}</a></div></div>
              <div className="krow"><span>✉️</span><div><small>EMAIL</small><br /><a href="mailto:IloTechSolution1@gmail.com">IloTechSolution1@gmail.com</a></div></div>
              <div className="krow"><span>📍</span><div><small>ALAMAT</small><p>Desa Ilotidea, Kecamatan Tilango,<br />Kabupaten Gorontalo 96182</p></div></div>
              <div className="krow"><span>⏰</span><div><small>JAM OPERASIONAL</small><p>Senin – Sabtu: 08.00 – 21.00 WITA<br />Home-service area Tilango & Kota Gorontalo</p></div></div>
              <div className="cta-row">
                <a className="btn wa" href={waLink('Halo IloTech Solution, saya mau konsultasi.')} target="_blank" rel="noopener">💬 Chat Sekarang</a>
                <a className="btn ghost" href="https://maps.app.goo.gl/WTq1CyDcs4xE11yv5" target="_blank" rel="noopener">📍 Lihat Maps</a>
              </div>
            </div>
            <div className="kontak-qr">
              <img src="/qr-wa.png" alt="QR WhatsApp IloTech Solution" />
              <p><b>SCAN UNTUK CHAT LANGSUNG</b><br />Arahkan kamera HP ke QR ini</p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
