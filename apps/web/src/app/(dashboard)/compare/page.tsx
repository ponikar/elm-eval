import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@repo/ui";

export default function ComparePage() {
  return (
    <div>
      <PageHeader
        title="Version Compare"
        description="Compare baseline vs candidate agent performance"
      />
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Coming soon. This screen will display improvements, regressions,
              critical regressions, evaluation metrics, and quality gate result.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
