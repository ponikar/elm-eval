import { Badge } from "@repo/ui";

type FindingCategory =
  | "HEALTH_AND_SAFETY"
  | "WORKING_HOURS"
  | "WAGES_AND_BENEFITS"
  | "FORCED_LABOR"
  | "CHILD_LABOR"
  | "ENVIRONMENT"
  | "ETHICS"
  | "MANAGEMENT_SYSTEM";

const categoryLabels: Record<FindingCategory, string> = {
  HEALTH_AND_SAFETY: "Health & Safety",
  WORKING_HOURS: "Working Hours",
  WAGES_AND_BENEFITS: "Wages & Benefits",
  FORCED_LABOR: "Forced Labor",
  CHILD_LABOR: "Child Labor",
  ENVIRONMENT: "Environment",
  ETHICS: "Ethics",
  MANAGEMENT_SYSTEM: "Management System",
};

export function CategoryBadge({ category }: { category: FindingCategory }) {
  return (
    <Badge variant="secondary" className="text-xs">
      {categoryLabels[category] ?? category}
    </Badge>
  );
}
