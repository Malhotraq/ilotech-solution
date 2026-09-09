import Link from 'next/link';

const WA = `https://wa.me/${process.env.NEXT_PUBLIC_ADMIN_WA || '62895803366608'}?text=Halo%20IloTech%20Solution%2C%20saya%20mau%20konsultasi%20service%2Fjasa.`;

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
