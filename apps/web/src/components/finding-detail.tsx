import { Card, CardContent, CardHeader, CardTitle, Separator } from "@repo/ui";
import { SeverityBadge } from "./severity-badge";
import { ReviewStatusBadge } from "./review-status-badge";
import { CategoryBadge } from "./category-badge";

interface FindingDetailProps {
  finding: {
    id: string;
    title: string;
    description: string;
    category: string;
    severity: string;
    confidence: number;
    reviewStatus: string;
    auditEvidence: { pageNumber: number; quote: string };
    applicableRule: { ruleId: string; rulebookVersion: string };
    correctiveAction: {
      action: string;
      ownerRole: string;
      deadlineDays: number;
      verificationMethod: string;
      priority: string;
    };
  };
}

export function FindingDetail({ finding }: FindingDetailProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base">{finding.title}</CardTitle>
            <ReviewStatusBadge status={finding.reviewStatus as never} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <CategoryBadge category={finding.category as never} />
            <SeverityBadge severity={finding.severity as never} />
          </div>

          <p className="text-sm text-muted-foreground">{finding.description}</p>

          <Separator />

          <div>
            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
              Audit Evidence
            </h4>
            <div className="rounded-md bg-muted p-3 text-sm">
              <span className="text-xs text-muted-foreground">
                Page {finding.auditEvidence.pageNumber}
              </span>
              <p className="mt-1 italic">&ldquo;{finding.auditEvidence.quote}&rdquo;</p>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
              Applicable Rule
            </h4>
            <p className="text-sm">
              {finding.applicableRule.ruleId} (v{finding.applicableRule.rulebookVersion})
            </p>
          </div>

          <Separator />

          <div>
            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
              Corrective Action
            </h4>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Action:</span>{" "}
                {finding.correctiveAction.action}
              </div>
              <div>
                <span className="font-medium">Owner:</span>{" "}
                {finding.correctiveAction.ownerRole}
              </div>
              <div>
                <span className="font-medium">Deadline:</span>{" "}
                {finding.correctiveAction.deadlineDays} days
              </div>
              <div>
                <span className="font-medium">Verification:</span>{" "}
                {finding.correctiveAction.verificationMethod}
              </div>
              <div>
                <span className="font-medium">Priority:</span>{" "}
                {finding.correctiveAction.priority}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
