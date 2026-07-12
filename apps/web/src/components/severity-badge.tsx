import { cn, Badge } from "@repo/ui";

type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

const severityConfig: Record<
  Severity,
  { className: string; label: string }
> = {
  LOW: {
    className: "bg-blue-100 text-blue-800 border-blue-200",
    label: "Low",
  },
  MEDIUM: {
    className: "bg-yellow-100 text-yellow-800 border-yellow-200",
    label: "Medium",
  },
  HIGH: {
    className: "bg-orange-100 text-orange-800 border-orange-200",
    label: "High",
  },
  CRITICAL: {
    className: "bg-red-100 text-red-800 border-red-200",
    label: "Critical",
  },
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  const config = severityConfig[severity] ?? severityConfig.LOW;
  return (
    <Badge variant="outline" className={cn("text-xs font-medium", config.className)}>
      {config.label}
    </Badge>
  );
}
