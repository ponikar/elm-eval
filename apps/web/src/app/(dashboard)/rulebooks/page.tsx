import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@repo/ui";

export default function RulebooksPage() {
  return (
    <div>
      <PageHeader
        title="Rulebook"
        description="Browse compliance rules and rulebook versions"
      />
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Coming soon. This screen will display rulebook versions, sections,
              structured rules, source pages, and index status.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
