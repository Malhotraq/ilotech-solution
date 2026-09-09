import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function NotFound() {
  return (
    <>
      <Navbar />
      <div className="wrap" style={{ padding: '80px 0', textAlign: 'center' }}>
        <h1>Order tidak ditemukan 😢</h1>
        <p style={{ color: 'var(--mut)', margin: '10px 0 20px' }}>
          Kode salah atau sudah dihapus. Cek lagi hurufnya (contoh: ILS-A8K2QP).
        </p>
        <Link className="btn cy" href="/lacak">Coba Lagi</Link>
      </div>
      <Footer />
    </>
  );
}
