import {
  MOCK_FINDINGS,
  SEED_AGENT_VERSIONS,
  SEED_AUDIT,
  SEED_EVAL_CASES,
  SEED_RULEBOOK,
  SEED_RULES,
} from '@repo/test-fixtures';
import { describe, expect, it } from 'vitest';
import {
  createRunComparison,
  getLatestRunComparison,
  getRunComparison,
  listRunComparisons,
} from './comparison-store.js';
import {
  claimEvaluationRun,
  claimTestExecution,
  completeEvaluationRun,
  completeTestExecution,
  createEvaluationRun,
  failTestExecution,
  freezeEvalSuite,
} from './eval-store.js';
import { createDatabase } from './index.js';
import { seedReviewWorkspace } from './review-store.js';

const seed = {
  audit: SEED_AUDIT,
  findings: MOCK_FINDINGS,
  rulebook: SEED_RULEBOOK,
  rules: SEED_RULES,
  agentVersions: SEED_AGENT_VERSIONS,
  evalCases: SEED_EVAL_CASES,
};

function seededDatabase() {
  const database = createDatabase(':memory:');
  seedReviewWorkspace(seed, database);
  return database;
}

async function createTrustedSuite(database: ReturnType<typeof seededDatabase>) {
  const critical = SEED_EVAL_CASES.find(
    (item) => item.status === 'TRUSTED' && item.criticality === 'CRITICAL',
  );
  const normal = SEED_EVAL_CASES.find(
    (item) => item.status === 'TRUSTED' && item.criticality === 'NORMAL',
  );
  const trustedIds = [normal?.id, critical?.id].filter((item): item is string => Boolean(item));

  return await freezeEvalSuite(
    {
      id: 'suite-compare',
      name: 'Trusted compare suite',
      version: 1,
      caseIds: trustedIds,
      frozenAt: '2026-07-13T01:00:00.000Z',
    },
    database,
  );
}

async function createCompletedRun(
  database: ReturnType<typeof seededDatabase>,
  input: {
    runId: string;
    agentVersionId: string;
    idempotencyKey: string;
    failSecondCase?: boolean;
  },
) {
  const suite = await createTrustedSuite(database);
  const plan = await createEvaluationRun(
    {
      id: input.runId,
      suiteId: suite.id,
      agentVersionId: input.agentVersionId,
      idempotencyKey: input.idempotencyKey,
      createdAt: '2026-07-13T01:01:00.000Z',
      createExecutionId: (caseId) => `${input.runId}:${caseId}`,
    },
    database,
  );

  await claimEvaluationRun(plan.run.id, '2026-07-13T01:02:00.000Z', database);

  for (const [index, item] of plan.cases.entries()) {
    await claimTestExecution(item.executionId, `2026-07-13T01:02:0${index}.000Z`, database);
    if (index === 1 && input.failSecondCase) {
      await failTestExecution(
        {
          executionId: item.executionId,
          errorCode: 'PIPELINE_ERROR',
          errorMessage: 'Candidate failed the second critical case.',
          latencyMs: 900,
          completedAt: '2026-07-13T01:02:59.000Z',
        },
        database,
      );
      continue;
    }

    const finding = MOCK_FINDINGS[index] ?? MOCK_FINDINGS[0];
    if (!finding) throw new Error('Expected seeded finding for test execution');
    await completeTestExecution(
      {
        executionId: item.executionId,
        output: {
          findings: [finding],
          rejectedFindings: [],
        },
        grader: {
          id: `${item.executionId}:grader`,
          executionId: item.executionId,
          graderVersion: 'deterministic-v1',
          passed: true,
          deterministicPassed: true,
          findingRecall: 1,
          criticalFindingRecall: 1,
          findingPrecision: 1,
          categoryAccuracy: 1,
          severityAccuracy: 1,
          criticalUnderclassificationCount: 0,
          auditCitationPrecision: 1,
          ruleReferenceAccuracy: 1,
          hallucinatedFindingRate: 0,
          correctiveActionCompleteness: 1,
          schemaValidity: 1,
          failureTypes: [],
          details: {
            counts: {
              expectedFindingCount: 1,
              expectedCriticalFindingCount: item.evalCase.criticality === 'CRITICAL' ? 1 : 0,
              actualFindingCount: 1,
              matchedFindingCount: 1,
              matchedCriticalFindingCount: item.evalCase.criticality === 'CRITICAL' ? 1 : 0,
              correctCategoryCount: 1,
              correctSeverityCount: 1,
              criticalUnderclassificationCount: 0,
              supportedCitationCount: 1,
              correctRuleReferenceCount: 1,
              completeCorrectiveActionCount: 1,
              hallucinatedFindingCount: 0,
              schemaValidOutputCount: 1,
              outputCount: 1,
            },
            messages: [],
            matches: [{ expectedIndex: 0, actualFindingId: MOCK_FINDINGS[index]?.id ?? 'finding' }],
          },
          createdAt: '2026-07-13T01:03:00.000Z',
        },
        agentCostUsd: 0.01 + index * 0.01,
        evaluatorCostUsd: 0.001,
        tokenInput: 100 + index,
        tokenOutput: 20 + index,
        latencyMs: 500 + index * 100,
        completedAt: '2026-07-13T01:03:00.000Z',
      },
      database,
    );
  }

  await completeEvaluationRun(plan.run.id, '2026-07-13T01:04:00.000Z', database);
  return plan.run.id;
}

describe('comparison store', () => {
  it('persists classifications, deltas, and a blocked gate for a critical regression', async () => {
    const database = seededDatabase();
    const baselineRunId = await createCompletedRun(database, {
      runId: 'baseline-run',
      agentVersionId: 'agent-v1',
      idempotencyKey: 'suite:baseline',
    });
    const candidateRunId = await createCompletedRun(database, {
      runId: 'candidate-run',
      agentVersionId: 'agent-v2',
      idempotencyKey: 'suite:candidate',
      failSecondCase: true,
    });

    const comparison = await createRunComparison(
      {
        baselineRunId,
        candidateRunId,
        comparisonId: 'comparison-1',
        gateEvaluationId: 'gate-eval-1',
        createdAt: '2026-07-13T01:05:00.000Z',
      },
      database,
    );

    expect(comparison.summary.stablePassCount).toBe(1);
    expect(comparison.summary.regressionCount).toBe(1);
    expect(comparison.summary.criticalRegressionCount).toBe(1);
    expect(comparison.qualityGate.decision).toBe('BLOCKED');
    expect(
      comparison.qualityGate.reasons.some((reason) => reason.includes('critical regressions')),
    ).toBe(true);

    const reloaded = await getRunComparison(comparison.id, database);
    expect(reloaded.cases).toHaveLength(2);
    expect(
      reloaded.cases.find((item) => item.classification === 'REGRESSION')?.failureTypes,
    ).toEqual(['PIPELINE_ERROR']);
  });

  it('returns the existing comparison for the same baseline/candidate pair', async () => {
    const database = seededDatabase();
    const baselineRunId = await createCompletedRun(database, {
      runId: 'baseline-run',
      agentVersionId: 'agent-v1',
      idempotencyKey: 'suite:baseline',
    });
    const candidateRunId = await createCompletedRun(database, {
      runId: 'candidate-run',
      agentVersionId: 'agent-v2',
      idempotencyKey: 'suite:candidate',
    });

    const first = await createRunComparison(
      {
        baselineRunId,
        candidateRunId,
        comparisonId: 'comparison-1',
        gateEvaluationId: 'gate-eval-1',
        createdAt: '2026-07-13T01:05:00.000Z',
      },
      database,
    );
    const second = await createRunComparison(
      {
        baselineRunId,
        candidateRunId,
        comparisonId: 'comparison-ignored',
        gateEvaluationId: 'gate-eval-ignored',
        createdAt: '2026-07-13T01:06:00.000Z',
      },
      database,
    );

    expect(second.id).toBe(first.id);
    expect((await listRunComparisons(database))[0]?.id).toBe(first.id);
    expect((await getLatestRunComparison(database))?.id).toBe(first.id);
    expect(second.qualityGate.decision).toBe('APPROVED');
  });
});
