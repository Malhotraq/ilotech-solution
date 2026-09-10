'use client';

// Tombol cetak nota (window.print hanya ada di browser).
export default function PrintBtn() {
  return (
    <button className="btn cy no-print" onClick={() => window.print()}>
      🖨️ Cetak / Simpan PDF
    </button>
  );
}
