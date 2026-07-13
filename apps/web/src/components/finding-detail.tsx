import type { AuditFinding } from '@repo/domain';
import { Card, CardContent, CardHeader, CardTitle, Separator } from '@repo/ui';
import { AlertTriangle, CheckCircle, Clock, FileText, Scale, User } from 'lucide-react';
import { CategoryBadge } from './category-badge';
import { FindingReviewActions } from './finding-review-actions';
import { ReviewStatusBadge } from './review-status-badge';
import { SeverityBadge } from './severity-badge';

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
    <div className="space-y-5">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base">{finding.title}</CardTitle>
            <ReviewStatusBadge status={finding.reviewStatus as never} />
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex gap-2">
            <CategoryBadge category={finding.category as never} />
            <SeverityBadge severity={finding.severity as never} />
          </div>

          <p className="text-sm leading-relaxed text-muted-foreground">{finding.description}</p>

          <Separator />

          <div>
            <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
              <FileText className="h-3 w-3" />
              Audit Evidence
            </h4>
            <div className="rounded-lg border bg-muted/50 p-4">
              <span className="text-[11px] font-medium text-muted-foreground/70">
                Page {finding.auditEvidence.pageNumber}
              </span>
              <p className="mt-1 text-sm italic leading-relaxed">
                &ldquo;{finding.auditEvidence.quote}&rdquo;
              </p>
            </div>
          </div>

          <div>
            <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
              <Scale className="h-3 w-3" />
              Applicable Rule
            </h4>
            <div className="flex items-center gap-2">
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium">
                {finding.applicableRule.ruleId}
              </code>
              <span className="text-xs text-muted-foreground">
                v{finding.applicableRule.rulebookVersion}
              </span>
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
              <AlertTriangle className="h-3 w-3" />
              Corrective Action
            </h4>
            <div className="space-y-3 rounded-lg border p-5">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground/70">Action</p>
                <p className="text-sm">{finding.correctiveAction.action}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground/70">
                    <User className="h-3 w-3" />
                    Owner
                  </p>
                  <p className="text-sm">{finding.correctiveAction.ownerRole}</p>
                </div>
                <div>
                  <p className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground/70">
                    <Clock className="h-3 w-3" />
                    Deadline
                  </p>
                  <p className="text-sm">{finding.correctiveAction.deadlineDays} days</p>
                </div>
              </div>
              <div>
                <p className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground/70">
                  <CheckCircle className="h-3 w-3" />
                  Verification
                </p>
                <p className="text-sm">{finding.correctiveAction.verificationMethod}</p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-muted-foreground/70">Priority</p>
                <p className="text-sm font-medium">{finding.correctiveAction.priority}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <FindingReviewActions finding={finding as AuditFinding} />
    </div>
  );
}
