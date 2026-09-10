'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  return (
    <header className="nav">
      <div className="wrap nav-in">
        <Link href="/" className="brand">
          <img src="/logo.jpeg" alt="Logo IloTech Solution" />
          <span>
            Ilo<em>Tech</em> Solution
          </span>
        </Link>
        <nav className={`menu ${open ? 'open' : ''}`}>
          <Link href="/" onClick={() => setOpen(false)}>Beranda</Link>
          <Link href="/#jasa" onClick={() => setOpen(false)}>Jasa</Link>
          <Link href="/#service" onClick={() => setOpen(false)}>Service</Link>
          <Link href="/#harga" onClick={() => setOpen(false)}>Harga</Link>
          <Link href="/order" onClick={() => setOpen(false)}>Order</Link>
          <Link href="/lacak" onClick={() => setOpen(false)}>Lacak Order</Link>
          <Link href="/#kontak" onClick={() => setOpen(false)} className="btn btn-sm" style={{background:'var(--cy)',color:'#04222a'}}>
            Hubungi Kami
          </Link>
        </nav>
        <button className="burger" onClick={() => setOpen(!open)} aria-label="Buka menu">
          ☰
        </button>
      </div>
    </header>
  );
}
