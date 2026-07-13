import type { AuditFinding, EvalCase, EvaluationAgentOutput } from '@repo/domain';
import { describe, expect, it } from 'vitest';
import { DETERMINISTIC_GRADER_VERSION, gradeEvaluationCase } from './grader.js';

const baseCase: EvalCase = {
  id: 'case-1',
  name: 'Blocked emergency exit',
  category: 'HEALTH_AND_SAFETY',
  criticality: 'CRITICAL',
  input: {
    auditPages: [
      {
        pageNumber: 18,
        text: 'Cartons and finished goods were observed in front of Emergency Exit B.',
      },
    ],
    rulebookVersionId: 'rulebook-1',
  },
  expected: [
    {
      findingShouldExist: true,
      category: 'HEALTH_AND_SAFETY',
      severity: 'CRITICAL',
      auditEvidence: { pageNumber: 18, textContains: 'Emergency Exit B' },
      applicableRule: {
        ruleId: 'HEALTH_SAFETY_EMERGENCY_EXIT',
        rulebookVersion: '8.0',
      },
      requiredCorrectiveActionFacts: ['remove obstruction', 'inspect emergency exits'],
      forbiddenClaims: ['fire alarm was broken'],
    },
  ],
  source: 'HUMAN_CREATED',
  status: 'TRUSTED',
};

function finding(overrides: Partial<AuditFinding> = {}): AuditFinding {
  return {
    id: 'finding-1',
    auditId: 'audit-1',
    agentVersionId: 'agent-1',
    title: 'Emergency Exit B was obstructed',
    description: 'Cartons obstructed the emergency exit and prevented safe evacuation.',
    category: 'HEALTH_AND_SAFETY',
    severity: 'CRITICAL',
    auditEvidence: {
      pageNumber: 18,
      quote: 'cartons and finished goods were observed in front of Emergency Exit B',
    },
    applicableRule: {
      ruleId: 'HEALTH_SAFETY_EMERGENCY_EXIT',
      rulebookVersion: '8.0',
    },
    confidence: 0.98,
    correctiveAction: {
      action: 'Remove obstruction and inspect emergency exits every day.',
      ownerRole: 'Safety manager',
      deadlineDays: 1,
      verificationMethod: 'Photographic evidence and follow-up inspection',
      priority: 'URGENT',
    },
    reviewStatus: 'PENDING',
    ...overrides,
  };
}

function output(findings: AuditFinding[]): EvaluationAgentOutput {
  return { findings, rejectedFindings: [] };
}

function grade(evalCase: EvalCase, agentOutput: EvaluationAgentOutput | unknown) {
  return gradeEvaluationCase({
    evalCase,
    agentOutput,
    executionId: 'execution-1',
    resultId: 'grader-result-1',
    createdAt: '2026-07-13T07:00:00.000Z',
  });
}

describe('gradeEvaluationCase', () => {
  it('returns a complete passing result for a supported critical finding', () => {
    const result = grade(baseCase, output([finding()]));

    expect(result).toMatchObject({
      id: 'grader-result-1',
      executionId: 'execution-1',
      graderVersion: DETERMINISTIC_GRADER_VERSION,
      createdAt: '2026-07-13T07:00:00.000Z',
      passed: true,
      deterministicPassed: true,
      findingRecall: 1,
      criticalFindingRecall: 1,
      findingPrecision: 1,
      categoryAccuracy: 1,
      severityAccuracy: 1,
      auditCitationPrecision: 1,
      ruleReferenceAccuracy: 1,
      hallucinatedFindingRate: 0,
      correctiveActionCompleteness: 1,
      schemaValidity: 1,
      failureTypes: [],
    });
    expect(result.details.counts).toMatchObject({
      expectedFindingCount: 1,
      expectedCriticalFindingCount: 1,
      actualFindingCount: 1,
      matchedFindingCount: 1,
      matchedCriticalFindingCount: 1,
      supportedCitationCount: 1,
      completeCorrectiveActionCount: 1,
    });
    expect(result.details.matches).toEqual([{ expectedIndex: 0, actualFindingId: 'finding-1' }]);
  });

  it('matches by finding identity while independently failing wrong grading fields', () => {
    const result = grade(
      baseCase,
      output([
        finding({
          category: 'ENVIRONMENT',
          severity: 'HIGH',
          auditEvidence: { pageNumber: 18, quote: 'Cartons and finished goods' },
          applicableRule: {
            ruleId: 'HEALTH_SAFETY_EMERGENCY_EXIT',
            rulebookVersion: '7.0',
          },
          correctiveAction: {
            action: 'Move the cartons elsewhere.',
            ownerRole: 'Manager',
            deadlineDays: 30,
            verificationMethod: 'Manager review',
            priority: 'LOW',
          },
        }),
      ]),
    );

    expect(result.details.counts.matchedFindingCount).toBe(1);
    expect(result.failureTypes).toEqual(
      expect.arrayContaining([
        'WRONG_CATEGORY',
        'WRONG_SEVERITY',
        'CRITICAL_UNDERCLASSIFICATION',
        'INVALID_AUDIT_CITATION',
        'INVALID_RULE_REFERENCE',
        'INCOMPLETE_CAP',
      ]),
    );
    expect(result.criticalUnderclassificationCount).toBe(1);
    expect(result.passed).toBe(false);
  });

  it('treats a clean negative case as a perfect deterministic pass', () => {
    const negativeCase: EvalCase = {
      ...baseCase,
      criticality: 'NORMAL',
      expected: [
        {
          findingShouldExist: false,
          forbiddenClaims: ['environmental violation', 'permit violation'],
        },
      ],
    };

    const result = grade(negativeCase, output([]));

    expect(result.passed).toBe(true);
    expect(result.findingRecall).toBe(1);
    expect(result.criticalFindingRecall).toBe(1);
    expect(result.findingPrecision).toBe(1);
    expect(result.categoryAccuracy).toBe(1);
    expect(result.severityAccuracy).toBe(1);
    expect(result.auditCitationPrecision).toBe(1);
    expect(result.ruleReferenceAccuracy).toBe(1);
    expect(result.correctiveActionCompleteness).toBe(1);
    expect(result.hallucinatedFindingRate).toBe(0);
  });

  it('fails a negative case when the output contains a forbidden false positive', () => {
    const negativeCase: EvalCase = {
      ...baseCase,
      criticality: 'NORMAL',
      expected: [
        {
          findingShouldExist: false,
          forbiddenClaims: ['environmental violation'],
        },
      ],
    };
    const falsePositive = finding({
      title: 'Environmental violation identified',
      description: 'An environmental violation was identified in the supplied audit evidence.',
    });

    const result = grade(negativeCase, output([falsePositive]));

    expect(result.failureTypes).toEqual(
      expect.arrayContaining(['FALSE_POSITIVE_FINDING', 'UNSUPPORTED_FINDING']),
    );
    expect(result.findingPrecision).toBe(0);
    expect(result.ruleReferenceAccuracy).toBe(0);
    expect(result.hallucinatedFindingRate).toBe(1);
    expect(result.details.counts.hallucinatedFindingCount).toBe(1);
  });

  it('allows one actual finding to satisfy only one expected finding', () => {
    const twoExpected: EvalCase = {
      ...baseCase,
      expected: [
        baseCase.expected[0] ?? { findingShouldExist: true },
        baseCase.expected[0] ?? { findingShouldExist: true },
      ],
    };

    const result = grade(twoExpected, output([finding()]));

    expect(result.details.counts.matchedFindingCount).toBe(1);
    expect(result.findingRecall).toBe(0.5);
    expect(result.failureTypes).toContain('MISSED_FINDING');
  });

  it('maximizes one-to-one matches when one expected finding has fewer candidates', () => {
    const evalCase: EvalCase = {
      ...baseCase,
      criticality: 'NORMAL',
      input: {
        ...baseCase.input,
        auditPages: [
          {
            pageNumber: 18,
            text: 'Common evidence with specific hazard. Common evidence with alternative hazard.',
          },
        ],
      },
      expected: [
        {
          findingShouldExist: true,
          auditEvidence: { pageNumber: 18, textContains: 'common evidence' },
          applicableRule: { ruleId: 'RULE_A', rulebookVersion: '8.0' },
        },
        {
          findingShouldExist: true,
          auditEvidence: { pageNumber: 18, textContains: 'specific hazard' },
        },
      ],
    };
    const versatile = finding({
      id: 'finding-versatile',
      auditEvidence: { pageNumber: 18, quote: 'Common evidence with specific hazard' },
      applicableRule: { ruleId: 'RULE_A', rulebookVersion: '8.0' },
    });
    const alternative = finding({
      id: 'finding-alternative',
      auditEvidence: { pageNumber: 18, quote: 'Common evidence with alternative hazard' },
      applicableRule: { ruleId: 'RULE_B', rulebookVersion: '8.0' },
    });

    const result = grade(evalCase, output([versatile, alternative]));

    expect(result.findingRecall).toBe(1);
    expect(result.details.counts.matchedFindingCount).toBe(2);
    expect(result.details.matches).toEqual([
      { expectedIndex: 0, actualFindingId: 'finding-alternative' },
      { expectedIndex: 1, actualFindingId: 'finding-versatile' },
    ]);
  });

  it('penalizes a duplicate output instead of matching it twice', () => {
    const result = grade(baseCase, output([finding(), finding({ id: 'finding-2' })]));

    expect(result.details.counts.matchedFindingCount).toBe(1);
    expect(result.findingPrecision).toBe(0.5);
    expect(result.hallucinatedFindingRate).toBe(0.5);
    expect(result.failureTypes).toEqual(
      expect.arrayContaining(['DUPLICATE_FINDING', 'FALSE_POSITIVE_FINDING']),
    );
  });

  it('validates citations against normalized frozen page text', () => {
    const evalCase: EvalCase = {
      ...baseCase,
      input: {
        ...baseCase.input,
        auditPages: [
          {
            pageNumber: 18,
            text: 'Emergency Exit B — cartons\n and finished goods blocked access.',
          },
        ],
      },
      expected: [
        {
          ...(baseCase.expected[0] ?? { findingShouldExist: true }),
          auditEvidence: { pageNumber: 18, textContains: 'cartons and finished goods' },
        },
      ],
    };
    const supported = finding({
      auditEvidence: {
        pageNumber: 18,
        quote: 'Emergency Exit B: cartons and finished goods blocked access',
      },
    });

    expect(grade(evalCase, output([supported])).auditCitationPrecision).toBe(1);

    const unsupported = finding({
      auditEvidence: { pageNumber: 99, quote: 'Emergency Exit B was obstructed' },
    });
    const unsupportedResult = grade(evalCase, output([unsupported]));
    expect(unsupportedResult.auditCitationPrecision).toBe(0);
    expect(unsupportedResult.failureTypes).toContain('INVALID_AUDIT_CITATION');
  });

  it('matches trusted evidence anchor terms even when intervening source words differ', () => {
    const evalCase: EvalCase = {
      ...baseCase,
      input: {
        auditPages: [
          {
            pageNumber: 3,
            text: 'The secondary emergency exit on the east side of Building B was blocked.',
          },
        ],
        rulebookVersionId: baseCase.input.rulebookVersionId,
      },
      expected: [
        {
          findingShouldExist: true,
          category: 'HEALTH_AND_SAFETY',
          severity: 'CRITICAL',
          auditEvidence: { pageNumber: 3, textContains: 'Emergency Exit B' },
          applicableRule: {
            ruleId: 'HEALTH_SAFETY_EMERGENCY_EXIT',
            rulebookVersion: '8.0',
          },
        },
      ],
    };
    const result = grade(
      evalCase,
      output([
        finding({
          auditEvidence: {
            pageNumber: 3,
            quote: 'The secondary emergency exit on the east side of Building B was blocked.',
          },
        }),
      ]),
    );
    expect(result.findingRecall).toBe(1);
    expect(result.failureTypes).not.toContain('INVALID_AUDIT_CITATION');
  });

  it('uses failing zero-denominator semantics when a positive case produces no findings', () => {
    const result = grade(baseCase, output([]));

    expect(result.findingRecall).toBe(0);
    expect(result.criticalFindingRecall).toBe(0);
    expect(result.findingPrecision).toBe(0);
    expect(result.categoryAccuracy).toBe(0);
    expect(result.auditCitationPrecision).toBe(0);
    expect(result.ruleReferenceAccuracy).toBe(0);
    expect(result.correctiveActionCompleteness).toBe(0);
    expect(result.failureTypes).toContain('MISSED_FINDING');
  });

  it('returns a schema failure instead of throwing for malformed agent output', () => {
    const result = grade(baseCase, { findings: [{ invalid: true }], rejectedFindings: [] });

    expect(result.schemaValidity).toBe(0);
    expect(result.details.counts.schemaValidOutputCount).toBe(0);
    expect(result.details.counts.outputCount).toBe(1);
    expect(result.failureTypes).toEqual(expect.arrayContaining(['SCHEMA_ERROR', 'MISSED_FINDING']));
    expect(result.passed).toBe(false);
  });

  it('preserves deterministic pipeline rejection reasons in the grade', () => {
    const result = grade(baseCase, {
      findings: [],
      rejectedFindings: [
        {
          code: 'INVALID_AUDIT_CITATION',
          message: 'The quoted evidence was not present on the cited page.',
          title: 'Unsupported exit finding',
        },
      ],
    });
    expect(result.passed).toBe(false);
    expect(result.failureTypes).toEqual(
      expect.arrayContaining(['MISSED_FINDING', 'INVALID_AUDIT_CITATION']),
    );
    expect(result.details.counts.actualFindingCount).toBe(1);
    expect(result.findingPrecision).toBe(0);
    expect(result.auditCitationPrecision).toBe(0);
  });
});
