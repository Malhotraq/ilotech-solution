import Link from 'next/link';
import { waLink } from '@/lib/site';

const WA = waLink('Halo IloTech Solution, saya mau konsultasi service/jasa.');

export default function Footer() {
  return (
    <>
      <footer>
        <div className="wrap foot-in">
          <div className="brand">
            <img src="/logo.jpeg" alt="Logo IloTech Solution" />
            <span>
              Ilo<em>Tech</em> Solution
            </span>
          </div>
          <p>
            SERVICE, REPAIR & DEVELOPMENT — Website • Aplikasi • Upgrade • Service HP • Laptop • Printer
            <br />
            <Link href="/order">Buat Order</Link> • <Link href="/lacak">Lacak Order</Link> •{' '}
            <Link href="/admin">Admin</Link>
          </p>
          <small>© 2026 IloTech Solution — Desa Ilotidea, Tilango, Gorontalo</small>
        </div>
      </footer>
      <a className="float-wa" href={WA} target="_blank" rel="noopener" aria-label="Chat WhatsApp">
        💬
      </a>
    </>
  );
}
