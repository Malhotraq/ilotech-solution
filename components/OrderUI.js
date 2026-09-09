import { STATUS_LABEL } from '@/lib/status';

export function StatusBadge({ status }) {
  return <span className={`badge ${status}`}>{STATUS_LABEL[status] || status}</span>;
}

export function formatRupiah(n) {
  if (!n) return '—';
  return 'Rp ' + Number(n).toLocaleString('id-ID');
}
