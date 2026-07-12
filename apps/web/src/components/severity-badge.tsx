import { Badge, cn } from '@repo/ui';

type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

const severityConfig: Record<Severity, { className: string; label: string }> = {
  LOW: {
    className:
      'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-300',
    label: 'Low',
  },
  MEDIUM: {
    className:
      'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300',
    label: 'Medium',
  },
  HIGH: {
    className:
      'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-300',
    label: 'High',
  },
  CRITICAL: {
    className:
      'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300',
    label: 'Critical',
  },
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  const config = severityConfig[severity] ?? severityConfig.LOW;
  return (
    <Badge variant="outline" className={cn('text-xs font-medium', config.className)}>
      {config.label}
    </Badge>
  );
}
