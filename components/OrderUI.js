import { STATUS_LABEL } from '@/lib/status';

export function StatusBadge({ status }) {
  return <span className={`badge ${status}`}>{STATUS_LABEL[status] || status}</span>;
}

export function formatRupiah(n) {
  if (n === null || n === undefined || n === '') return '—';
  if (Number(n) === 0) return 'Rp 0';
  if (!n) return '—';
  return 'Rp ' + Number(n).toLocaleString('id-ID');
}
