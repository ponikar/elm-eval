'use client';

import { Button, Card, CardContent, CardHeader, CardTitle, Separator } from '@repo/ui';
import { AlertTriangle, CheckCircle, Clock, FileText, Save, Scale, User, X } from 'lucide-react';
import { useState } from 'react';
import { CategoryBadge } from './category-badge';
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
  onApprove?: (findingId: string) => void;
  onReject?: (findingId: string) => void;
  onCorrect?: (findingId: string, fields: CorrectFields) => void;
  isPending?: boolean;
}

export interface CorrectFields {
  title: string;
  description: string;
  category: string;
  severity: string;
  evidencePage: number;
  evidenceQuote: string;
  ruleId: string;
}

export function FindingDetail({
  finding,
  onApprove,
  onReject,
  onCorrect,
  isPending = true,
}: FindingDetailProps) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<CorrectFields>({
    title: finding.title,
    description: finding.description,
    category: finding.category,
    severity: finding.severity,
    evidencePage: finding.auditEvidence.pageNumber,
    evidenceQuote: finding.auditEvidence.quote,
    ruleId: finding.applicableRule.ruleId,
  });

  function handleSave() {
    onCorrect?.(finding.id, form);
    setEditing(false);
  }

  function handleCancel() {
    setForm({
      title: finding.title,
      description: finding.description,
      category: finding.category,
      severity: finding.severity,
      evidencePage: finding.auditEvidence.pageNumber,
      evidenceQuote: finding.auditEvidence.quote,
      ruleId: finding.applicableRule.ruleId,
    });
    setEditing(false);
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base">
              {editing ? (
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full rounded border bg-background px-2 py-1 text-sm font-semibold"
                />
              ) : (
                finding.title
              )}
            </CardTitle>
            <ReviewStatusBadge status={finding.reviewStatus as never} />
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex gap-2">
            {editing ? (
              <>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="rounded border bg-background px-2 py-1 text-xs"
                >
                  <option value="HEALTH_AND_SAFETY">Health & Safety</option>
                  <option value="WORKING_HOURS">Working Hours</option>
                  <option value="WAGES_AND_BENEFITS">Wages & Benefits</option>
                  <option value="FORCED_LABOR">Forced Labor</option>
                  <option value="CHILD_LABOR">Child Labor</option>
                  <option value="ENVIRONMENT">Environment</option>
                  <option value="ETHICS">Ethics</option>
                  <option value="MANAGEMENT_SYSTEM">Management System</option>
                </select>
                <select
                  value={form.severity}
                  onChange={(e) => setForm({ ...form, severity: e.target.value })}
                  className="rounded border bg-background px-2 py-1 text-xs"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </>
            ) : (
              <>
                <CategoryBadge category={finding.category as never} />
                <SeverityBadge severity={finding.severity as never} />
              </>
            )}
          </div>

          {editing ? (
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full rounded border bg-background px-2 py-1 text-sm leading-relaxed"
            />
          ) : (
            <p className="text-sm leading-relaxed text-muted-foreground">{finding.description}</p>
          )}

          <Separator />

          <div>
            <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
              <FileText className="h-3 w-3" />
              Audit Evidence
            </h4>
            <div className="rounded-lg border bg-muted/50 p-4">
              {editing ? (
                <div className="space-y-2">
                  <input
                    type="number"
                    value={form.evidencePage}
                    onChange={(e) => setForm({ ...form, evidencePage: Number(e.target.value) })}
                    className="w-20 rounded border bg-background px-2 py-1 text-xs"
                    placeholder="Page"
                  />
                  <textarea
                    value={form.evidenceQuote}
                    onChange={(e) => setForm({ ...form, evidenceQuote: e.target.value })}
                    rows={2}
                    className="w-full rounded border bg-background px-2 py-1 text-sm italic"
                  />
                </div>
              ) : (
                <>
                  <span className="text-[11px] font-medium text-muted-foreground/70">
                    Page {finding.auditEvidence.pageNumber}
                  </span>
                  <p className="mt-1 text-sm italic leading-relaxed">
                    &ldquo;{finding.auditEvidence.quote}&rdquo;
                  </p>
                </>
              )}
            </div>
          </div>

          <div>
            <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
              <Scale className="h-3 w-3" />
              Applicable Rule
            </h4>
            {editing ? (
              <input
                value={form.ruleId}
                onChange={(e) => setForm({ ...form, ruleId: e.target.value })}
                className="w-full rounded border bg-background px-2 py-1 text-xs font-mono"
              />
            ) : (
              <div className="flex items-center gap-2">
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium">
                  {finding.applicableRule.ruleId}
                </code>
                <span className="text-xs text-muted-foreground">
                  v{finding.applicableRule.rulebookVersion}
                </span>
              </div>
            )}
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

          {isPending && (
            <>
              <Separator />
              <div className="flex items-center gap-2">
                {editing ? (
                  <>
                    <Button size="sm" onClick={handleSave} className="gap-1">
                      <Save className="h-3 w-3" />
                      Save correction
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleCancel} className="gap-1">
                      <X className="h-3 w-3" />
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => onApprove?.(finding.id)}
                      className="gap-1 bg-emerald-600 hover:bg-emerald-700"
                    >
                      <CheckCircle className="h-3 w-3" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => onReject?.(finding.id)}
                      className="gap-1"
                    >
                      <X className="h-3 w-3" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditing(true)}
                      className="gap-1"
                    >
                      Correct
                    </Button>
                  </>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
