import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@repo/ui";

export default function RunsPage() {
  return (
    <div>
      <PageHeader
        title="Eval Run"
        description="Track evaluation run progress and results"
      />
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Coming soon. This screen will display cases completed, passed,
              failed, cost, latency, and pipeline status.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
