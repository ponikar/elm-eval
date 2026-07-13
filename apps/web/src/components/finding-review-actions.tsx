'use client';

import type { AuditFinding, FailureType, FindingCategory, Severity } from '@repo/domain';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@repo/ui';
import { useId, useState } from 'react';
import { trpc } from '@/trpc/react';

const categories: FindingCategory[] = [
  'HEALTH_AND_SAFETY',
  'WORKING_HOURS',
  'WAGES_AND_BENEFITS',
  'FORCED_LABOR',
  'CHILD_LABOR',
  'ENVIRONMENT',
  'ETHICS',
  'MANAGEMENT_SYSTEM',
];
const severities: Severity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const failures: FailureType[] = [
  'MISSED_FINDING',
  'FALSE_POSITIVE_FINDING',
  'WRONG_CATEGORY',
  'WRONG_SEVERITY',
  'CRITICAL_UNDERCLASSIFICATION',
  'INVALID_AUDIT_CITATION',
  'INVALID_RULE_REFERENCE',
  'UNSUPPORTED_FINDING',
  'DUPLICATE_FINDING',
  'INCOMPLETE_CAP',
  'IRRELEVANT_CAP',
  'SCHEMA_ERROR',
  'MODEL_TIMEOUT',
  'PIPELINE_ERROR',
];
const priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
const field =
  'w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring';

export function FindingReviewActions({ finding }: { finding: AuditFinding }) {
  const utils = trpc.useUtils();
  const [editing, setEditing] = useState(false);
  const [failureType, setFailureType] = useState<FailureType>('WRONG_SEVERITY');
  const [reason, setReason] = useState('');
  const [createRegression, setCreateRegression] = useState(true);
  const [draft, setDraft] = useState(finding);
  const refresh = async () => {
    await Promise.all([utils.audit.getFindings.invalidate(), utils.evalCase.list.invalidate()]);
  };
  const approve = trpc.audit.approveFinding.useMutation({ onSuccess: refresh });
  const reject = trpc.audit.rejectFinding.useMutation({ onSuccess: refresh });
  const correct = trpc.correction.create.useMutation({
    onSuccess: async () => {
      await refresh();
      setEditing(false);
    },
  });
  const pending = approve.isPending || reject.isPending || correct.isPending;

  if (!editing)
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Reviewer decision</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button
            type="button"
            disabled={pending}
            onClick={() => approve.mutate({ findingId: finding.id })}
          >
            Approve
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => setEditing(true)}
          >
            Correct
          </Button>
          {(approve.error || reject.error) && (
            <p className="w-full text-sm text-destructive">
              {approve.error?.message ?? reject.error?.message}
            </p>
          )}
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={() => reject.mutate({ findingId: finding.id })}
          >
            Reject
          </Button>
        </CardContent>
      </Card>
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Correct finding</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            correct.mutate({
              findingId: finding.id,
              failureType,
              reason,
              saveAsRegressionTest: createRegression,
              corrected: {
                title: draft.title,
                description: draft.description,
                category: draft.category,
                severity: draft.severity,
                auditEvidence: draft.auditEvidence,
                applicableRule: draft.applicableRule,
                confidence: draft.confidence,
                correctiveAction: draft.correctiveAction,
              },
            });
          }}
        >
          <TextField
            label="Title"
            value={draft.title}
            onChange={(title) => setDraft({ ...draft, title })}
          />
          <TextField
            label="Description"
            value={draft.description}
            multiline
            onChange={(description) => setDraft({ ...draft, description })}
          />
          <div className="grid grid-cols-2 gap-3">
            <SelectField
              label="Category"
              value={draft.category}
              options={categories}
              onChange={(category) => setDraft({ ...draft, category: category as FindingCategory })}
            />
            <SelectField
              label="Severity"
              value={draft.severity}
              options={severities}
              onChange={(severity) => setDraft({ ...draft, severity: severity as Severity })}
            />
          </div>
          <label className="block space-y-1 text-sm">
            <span>Deadline days</span>
            <input
              className={field}
              type="number"
              min={1}
              value={draft.correctiveAction.deadlineDays}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  correctiveAction: {
                    ...draft.correctiveAction,
                    deadlineDays: Number(event.target.value),
                  },
                })
              }
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span>Evidence page</span>
            <input
              className={field}
              type="number"
              min={1}
              value={draft.auditEvidence.pageNumber}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  auditEvidence: { ...draft.auditEvidence, pageNumber: Number(event.target.value) },
                })
              }
            />
          </label>
          <TextField
            label="Evidence quote"
            value={draft.auditEvidence.quote}
            multiline
            onChange={(quote) =>
              setDraft({ ...draft, auditEvidence: { ...draft.auditEvidence, quote } })
            }
          />
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="Rule ID"
              value={draft.applicableRule.ruleId}
              onChange={(ruleId) =>
                setDraft({ ...draft, applicableRule: { ...draft.applicableRule, ruleId } })
              }
            />
            <TextField
              label="Rulebook version"
              value={draft.applicableRule.rulebookVersion}
              onChange={(rulebookVersion) =>
                setDraft({ ...draft, applicableRule: { ...draft.applicableRule, rulebookVersion } })
              }
            />
          </div>
          <TextField
            label="Corrective action"
            value={draft.correctiveAction.action}
            multiline
            onChange={(action) =>
              setDraft({ ...draft, correctiveAction: { ...draft.correctiveAction, action } })
            }
          />
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="Owner"
              value={draft.correctiveAction.ownerRole}
              onChange={(ownerRole) =>
                setDraft({ ...draft, correctiveAction: { ...draft.correctiveAction, ownerRole } })
              }
            />
            <SelectField
              label="Priority"
              value={draft.correctiveAction.priority}
              options={[...priorities]}
              onChange={(priority) =>
                setDraft({
                  ...draft,
                  correctiveAction: {
                    ...draft.correctiveAction,
                    priority: priority as (typeof priorities)[number],
                  },
                })
              }
            />
          </div>
          <TextField
            label="Verification method"
            value={draft.correctiveAction.verificationMethod}
            onChange={(verificationMethod) =>
              setDraft({
                ...draft,
                correctiveAction: { ...draft.correctiveAction, verificationMethod },
              })
            }
          />
          <SelectField
            label="Failure type"
            value={failureType}
            options={failures}
            onChange={(value) => setFailureType(value as FailureType)}
          />
          <TextField label="Reason" value={reason} multiline onChange={setReason} />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={createRegression}
              onChange={(event) => setCreateRegression(event.target.checked)}
            />
            Save as trusted regression test
          </label>
          {correct.error && <p className="text-sm text-destructive">{correct.error.message}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={pending || reason.trim().length < 3}>
              Save correction
            </Button>
            <Button type="button" variant="outline" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function TextField({
  label,
  value,
  multiline = false,
  onChange,
}: {
  label: string;
  value: string;
  multiline?: boolean;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <label className="block space-y-1 text-sm" htmlFor={id}>
      <span>{label}</span>
      {multiline ? (
        <textarea
          id={id}
          className={field}
          rows={2}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          id={id}
          className={field}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <label className="block space-y-1 text-sm" htmlFor={id}>
      <span>{label}</span>
      <select
        id={id}
        className={field}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}
