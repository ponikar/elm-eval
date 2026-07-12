import { cn, Badge } from "@repo/ui";

type ReviewStatus = "PENDING" | "APPROVED" | "CORRECTED" | "REJECTED";

const statusConfig: Record<
  ReviewStatus,
  { className: string; label: string }
> = {
  PENDING: {
    className: "bg-gray-100 text-gray-800 border-gray-200",
    label: "Pending",
  },
  APPROVED: {
    className: "bg-green-100 text-green-800 border-green-200",
    label: "Approved",
  },
  CORRECTED: {
    className: "bg-purple-100 text-purple-800 border-purple-200",
    label: "Corrected",
  },
  REJECTED: {
    className: "bg-red-100 text-red-800 border-red-200",
    label: "Rejected",
  },
};

export function ReviewStatusBadge({ status }: { status: ReviewStatus }) {
  const config = statusConfig[status] ?? statusConfig.PENDING;
  return (
    <Badge variant="outline" className={cn("text-xs font-medium", config.className)}>
      {config.label}
    </Badge>
  );
}
