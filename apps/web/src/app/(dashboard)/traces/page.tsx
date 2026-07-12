import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@repo/ui";

export default function TracesPage() {
  return (
    <div>
      <PageHeader
        title="Failure Trace"
        description="Investigate pipeline stage failures and model outputs"
      />
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Coming soon. This screen will display input pages, retrieved rules,
              actual vs expected output, grader results, token usage, cost,
              stage latency, and failure category.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
