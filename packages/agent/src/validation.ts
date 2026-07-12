import type { AuditFinding, AuditPage, ComplianceRule } from '@repo/domain';
import { AuditFindingSchema } from '@repo/domain';
export type FindingRejectionCode =
  | 'INVALID_AUDIT_CITATION'
  | 'INVALID_RULE_REFERENCE'
  | 'INCOMPLETE_CAP'
  | 'DUPLICATE_FINDING'
  | 'SCHEMA_ERROR';
export interface FindingRejection {
  code: FindingRejectionCode;
  message: string;
  title?: string;
}
export function normalizeEvidence(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/([\p{L}\p{N}])-\s*\n\s*([\p{L}\p{N}])/gu, '$1$2')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('en');
}
export function validateFinding(
  input: unknown,
  pages: AuditPage[],
  rules: ComplianceRule[],
  retrievedRuleIds: ReadonlySet<string>,
): { finding?: AuditFinding; rejection?: FindingRejection } {
  const parsed = AuditFindingSchema.safeParse(input);
  if (!parsed.success)
    return { rejection: { code: 'SCHEMA_ERROR', message: parsed.error.message } };
  const finding = parsed.data;
  const page = pages.find((p) => p.pageNumber === finding.auditEvidence.pageNumber);
  if (
    !page ||
    !normalizeEvidence(page.text).includes(normalizeEvidence(finding.auditEvidence.quote))
  )
    return {
      rejection: {
        code: 'INVALID_AUDIT_CITATION',
        message: 'Evidence quote is not a contiguous match on the cited page',
        title: finding.title,
      },
    };
  const rule = rules.find(
    (r) =>
      r.id === finding.applicableRule.ruleId &&
      r.rulebookVersion === finding.applicableRule.rulebookVersion,
  );
  if (!rule || !retrievedRuleIds.has(rule.id))
    return {
      rejection: {
        code: 'INVALID_RULE_REFERENCE',
        message: 'Applicable rule was not retrieved from the selected rulebook version',
        title: finding.title,
      },
    };
  if (finding.severity === 'CRITICAL' && finding.correctiveAction.priority !== 'URGENT')
    return {
      rejection: {
        code: 'INCOMPLETE_CAP',
        message: 'Critical findings require URGENT corrective-action priority',
        title: finding.title,
      },
    };
  return { finding };
}
export function findingDedupeKey(
  finding: Pick<AuditFinding, 'category' | 'auditEvidence' | 'applicableRule'>,
): string {
  return [
    finding.category,
    finding.auditEvidence.pageNumber,
    normalizeEvidence(finding.auditEvidence.quote),
    finding.applicableRule.ruleId,
  ].join('|');
}
