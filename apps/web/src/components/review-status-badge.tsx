import { Badge, cn } from '@repo/ui';

type ReviewStatus = 'PENDING' | 'APPROVED' | 'CORRECTED' | 'REJECTED';

const statusConfig: Record<ReviewStatus, { className: string; label: string }> = {
  PENDING: {
    className: '',
    label: 'Pending',
  },
  APPROVED: {
    className:
      'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
    label: 'Approved',
  },
  CORRECTED: {
    className:
      'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-300',
    label: 'Corrected',
  },
  REJECTED: {
    className:
      'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300',
    label: 'Rejected',
  },
};

export function ReviewStatusBadge({ status }: { status: ReviewStatus }) {
  const config = statusConfig[status] ?? statusConfig.PENDING;
  return (
    <Badge variant="outline" className={cn('text-xs font-medium', config.className)}>
      {config.label}
    </Badge>
  );
}
