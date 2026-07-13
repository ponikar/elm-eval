import {
  MOCK_FINDINGS,
  SEED_AGENT_VERSIONS,
  SEED_AUDIT,
  SEED_EVAL_CASES,
  SEED_RULEBOOK,
  SEED_RULES,
} from '@repo/test-fixtures';
import { describe, expect, it } from 'vitest';
import { createDatabase } from './index.js';
import {
  CorrectionValidationError,
  convertCorrectionToRegressionTest,
  createCorrection,
  getAuditFindings,
  listEvalCases,
  seedReviewWorkspace,
  setFindingReviewStatus,
} from './review-store.js';
import { complianceRule, rulebook } from './schema.js';

const seed = {
  audit: SEED_AUDIT,
  findings: MOCK_FINDINGS,
  rulebook: SEED_RULEBOOK,
  rules: SEED_RULES,
  agentVersions: SEED_AGENT_VERSIONS,
  evalCases: SEED_EVAL_CASES,
};

function correctedFinding() {
  const finding = MOCK_FINDINGS[0];
  if (!finding) throw new Error('Expected seeded finding');
  return {
    title: finding.title,
    description: finding.description,
    category: finding.category,
    severity: finding.severity,
    auditEvidence: finding.auditEvidence,
    applicableRule: finding.applicableRule,
    confidence: finding.confidence,
    correctiveAction: finding.correctiveAction,
  };
}

describe('review store', () => {
  it('seeds the persisted workspace idempotently', () => {
    const database = createDatabase(':memory:');
    seedReviewWorkspace(seed, database);
    seedReviewWorkspace(seed, database);
    expect(getAuditFindings(SEED_AUDIT.id, database)).toHaveLength(MOCK_FINDINGS.length);
    expect(listEvalCases(database)).toHaveLength(SEED_EVAL_CASES.length);
    const findingId = MOCK_FINDINGS[0]?.id ?? '';
    expect(setFindingReviewStatus(findingId, 'APPROVED', database).reviewStatus).toBe('APPROVED');
    expect(setFindingReviewStatus(findingId, 'REJECTED', database).reviewStatus).toBe('REJECTED');
  });

  it('atomically creates a correction and one trusted regression case', () => {
    const database = createDatabase(':memory:');
    seedReviewWorkspace(seed, database);
    const input = {
      findingId: MOCK_FINDINGS[0]?.id ?? '',
      failureType: 'WRONG_SEVERITY' as const,
      reason: 'Reviewer confirmed the corrected expected result.',
      corrected: correctedFinding(),
      saveAsRegressionTest: true,
    };
    const first = createCorrection(input, database);
    expect(first.regressionEvalCaseId).toBeDefined();
    const cases = listEvalCases(database);
    expect(cases).toHaveLength(SEED_EVAL_CASES.length + 1);
    expect(cases.find((item) => item.id === first.regressionEvalCaseId)).toMatchObject({
      source: 'HUMAN_CORRECTION',
      status: 'TRUSTED',
    });
    expect(cases.find((item) => item.id === first.regressionEvalCaseId)?.input.auditPages).toEqual(
      SEED_AUDIT.pages,
    );
    expect(getAuditFindings(SEED_AUDIT.id, database)[0]?.reviewStatus).toBe('CORRECTED');
  });

  it('rolls back an invalid citation without changing the finding or cases', () => {
    const database = createDatabase(':memory:');
    seedReviewWorkspace(seed, database);
    const before = getAuditFindings(SEED_AUDIT.id, database)[0];
    expect(() =>
      createCorrection(
        {
          findingId: before?.id ?? '',
          failureType: 'INVALID_AUDIT_CITATION',
          reason: 'The citation must be corrected.',
          corrected: {
            ...correctedFinding(),
            auditEvidence: { pageNumber: 1, quote: 'This quote does not exist on the page.' },
          },
          saveAsRegressionTest: true,
        },
        database,
      ),
    ).toThrow(CorrectionValidationError);
    expect(getAuditFindings(SEED_AUDIT.id, database)[0]).toEqual(before);
    expect(listEvalCases(database)).toHaveLength(SEED_EVAL_CASES.length);
  });

  it('converts a saved correction to a trusted case idempotently', () => {
    const database = createDatabase(':memory:');
    seedReviewWorkspace(seed, database);
    const correction = createCorrection(
      {
        findingId: MOCK_FINDINGS[0]?.id ?? '',
        failureType: 'WRONG_SEVERITY',
        reason: 'Save this correction before approving it as a test.',
        corrected: correctedFinding(),
        saveAsRegressionTest: false,
      },
      database,
    );
    const first = convertCorrectionToRegressionTest(correction.id, database);
    const second = convertCorrectionToRegressionTest(correction.id, database);
    expect(second.id).toBe(first.id);
    expect(first).toMatchObject({ source: 'HUMAN_CORRECTION', status: 'TRUSTED' });
    expect(listEvalCases(database)).toHaveLength(SEED_EVAL_CASES.length + 1);
  });

  it('rejects a rule outside the finding agent version rulebook snapshot', () => {
    const database = createDatabase(':memory:');
    seedReviewWorkspace(seed, database);
    const timestamp = new Date().toISOString();
    database
      .insert(rulebook)
      .values({
        id: 'rulebook-other',
        name: 'Other rules',
        version: '8.0',
        standard: 'CUSTOM',
        effectiveFrom: '2025-01-01',
        language: 'en',
        indexStatus: 'INDEXED',
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .run();
    database
      .insert(complianceRule)
      .values({
        id: 'OTHER_RULE',
        rulebookId: 'rulebook-other',
        rulebookVersion: '8.0',
        sectionId: 'X-1',
        sectionTitle: 'Other',
        category: 'HEALTH_AND_SAFETY',
        requirementText: 'Unrelated rule.',
        sourcePage: 1,
      })
      .run();
    expect(() =>
      createCorrection(
        {
          findingId: MOCK_FINDINGS[0]?.id ?? '',
          failureType: 'INVALID_RULE_REFERENCE',
          reason: 'This rule comes from the wrong rulebook.',
          corrected: {
            ...correctedFinding(),
            applicableRule: { ruleId: 'OTHER_RULE', rulebookVersion: '8.0' },
          },
          saveAsRegressionTest: true,
        },
        database,
      ),
    ).toThrow(CorrectionValidationError);
    expect(listEvalCases(database)).toHaveLength(SEED_EVAL_CASES.length);
  });
});
