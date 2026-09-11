import './globals.css';
import { ADMIN_WA } from '@/lib/site';

const SITE = (process.env.SITE_URL || '').startsWith('http')
  ? process.env.SITE_URL.replace(/\/$/, '')
  : null;

const JUDUL = 'IloTech Solution — Jasa & Service Teknologi Terpercaya | Gorontalo';
const DESKRIPSI =
  'IloTech Solution: jasa pembuatan website & aplikasi, upgrade laptop/komputer, serta service HP, laptop, komputer & printer di Tilango, Gorontalo. Harga transparan, order online & lacak progres.';

export const metadata = {
  title: JUDUL,
  description: DESKRIPSI,
  manifest: '/manifest.webmanifest',
  themeColor: '#05080f',
  appleWebApp: {
    capable: true,
    title: 'IloTech Solution',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: '/icon-192.png',
    apple: '/apple-touch-icon.png',
  },
  keywords: [
    'service HP Gorontalo',
    'service laptop Gorontalo',
    'service printer Tilango',
    'pembuatan website Gorontalo',
    'upgrade laptop Gorontalo',
    'IloTech Solution',
  ],
  ...(SITE
    ? {
        metadataBase: new URL(SITE),
        alternates: { canonical: '/' },
      }
    : {}),
  openGraph: {
    title: JUDUL,
    description: DESKRIPSI,
    type: 'website',
    locale: 'id_ID',
    siteName: 'IloTech Solution',
    ...(SITE ? { url: SITE, images: [`${SITE}/logo.jpeg`] } : {}),
  },
};

// Schema.org agar Google paham ini bisnis lokal (syarat tampil di Maps/pencarian lokal).
const JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'ProfessionalService',
  name: 'IloTech Solution',
  description: DESKRIPSI,
  telephone: '+62' + ADMIN_WA.replace(/^62/, ''),
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Desa Ilotidea, Kecamatan Tilango',
    addressLocality: 'Gorontalo',
    postalCode: '96182',
    addressCountry: 'ID',
  },
  areaServed: ['Tilango', 'Kota Gorontalo', 'Kabupaten Gorontalo'],
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      opens: '08:00',
      closes: '21:00',
    },
  ],
  priceRange: 'Rp50.000+',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSONLD) }} />
        {children}
      </body>
    </html>
  );
}
