import './globals.css';

export const metadata = {
  title: 'IloTech Solution — Jasa & Service Teknologi Terpercaya | Gorontalo',
  description:
    'IloTech Solution: jasa pembuatan website & aplikasi, upgrade laptop/komputer, serta service HP, laptop, komputer & printer di Tilango, Gorontalo. Order online & lacak progres.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
