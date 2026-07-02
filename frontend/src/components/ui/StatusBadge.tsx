import { STATUS_META } from '../../lib/status';
import type { ReportStatus } from '../../types';

export default function StatusBadge({ status }: { status: ReportStatus }) {
  const meta = STATUS_META[status] ?? STATUS_META.Reported;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${meta.badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {status}
    </span>
  );
}
