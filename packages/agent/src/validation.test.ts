import { describe, expect, it } from 'vitest';
import type { AuditFinding, AuditPage, ComplianceRule } from '@repo/domain';
import { normalizeEvidence, validateFinding } from './validation.js';
const pages: AuditPage[] = [
  { pageNumber: 3, text: 'The emer-\ngency exit was blocked\u00a0by cartons.' },
];
const rules: ComplianceRule[] = [
  {
    id: 'EXIT',
    rulebookId: 'rb',
    rulebookVersion: '8',
    sectionId: '1',
    sectionTitle: 'Exit',
    category: 'HEALTH_AND_SAFETY',
    requirementText: 'Clear exits',
    sourcePage: 1,
  },
];
const finding: AuditFinding = {
  id: 'f',
  auditId: 'a',
  agentVersionId: 'v',
  title: 'Emergency exit blocked',
  description: 'Emergency exit blocked by cartons during audit.',
  category: 'HEALTH_AND_SAFETY',
  severity: 'CRITICAL',
  auditEvidence: { pageNumber: 3, quote: 'The emergency exit was blocked by cartons.' },
  applicableRule: { ruleId: 'EXIT', rulebookVersion: '8' },
  confidence: 0.9,
  correctiveAction: {
    action: 'Remove cartons immediately.',
    ownerRole: 'Safety manager',
    deadlineDays: 1,
    verificationMethod: 'Photo and inspection',
    priority: 'URGENT',
  },
  reviewStatus: 'PENDING',
};
describe('validation', () => {
  it('normalizes PDF hyphenation and Unicode whitespace', () => {
    expect(normalizeEvidence(pages[0]!.text)).toContain(
      'the emergency exit was blocked by cartons.',
    );
    expect(validateFinding(finding, pages, rules, new Set(['EXIT'])).finding).toEqual(finding);
  });
  it('rejects an unretrieved rule', () =>
    expect(validateFinding(finding, pages, rules, new Set()).rejection?.code).toBe(
      'INVALID_RULE_REFERENCE',
    ));
  it('requires urgent critical actions', () =>
    expect(
      validateFinding(
        { ...finding, correctiveAction: { ...finding.correctiveAction, priority: 'HIGH' } },
        pages,
        rules,
        new Set(['EXIT']),
      ).rejection?.code,
    ).toBe('INCOMPLETE_CAP'));
});
