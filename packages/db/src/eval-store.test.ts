import {
  MOCK_FINDINGS,
  SEED_AGENT_VERSIONS,
  SEED_AUDIT,
  SEED_EVAL_CASES,
  SEED_RULEBOOK,
  SEED_RULES,
} from '@repo/test-fixtures';
import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import {
  appendEvaluationTrace,
  claimEvaluationRun,
  claimTestExecution,
  completeEvaluationRun,
  completeTestExecution,
  createEvaluationRun,
  failTestExecution,
  freezeEvalSuite,
  getEvaluationRunDetails,
  getEvaluationRunPlan,
  getTestExecutions,
  listEvaluationRuns,
  loadSuiteSnapshot,
} from './eval-store.js';
import { createDatabase } from './index.js';
import { seedReviewWorkspace } from './review-store.js';
import { evalCase, evaluationRun, graderResult, traceEvent } from './schema.js';

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

function freezeFirstCase(database: ReturnType<typeof seededDatabase>) {
  const first = SEED_EVAL_CASES.find((item) => item.status === 'TRUSTED');
  if (!first) throw new Error('Expected one trusted seed case');
  return freezeEvalSuite(
    {
      id: 'suite-1',
      name: 'Release suite',
      version: 1,
      caseIds: [first.id],
      frozenAt: '2026-07-13T00:00:00.000Z',
    },
    database,
  );
}

function createRun(database: ReturnType<typeof seededDatabase>) {
  freezeFirstCase(database);
  return createEvaluationRun(
    {
      id: 'run-1',
      suiteId: 'suite-1',
      agentVersionId: 'agent-v1',
      idempotencyKey: 'suite-1:agent-v1',
      createdAt: '2026-07-13T00:01:00.000Z',
      createExecutionId: (caseId) => `execution:${caseId}`,
    },
    database,
  );
}

describe('evaluation store', () => {
  it('freezes only trusted cases and preserves their snapshots', () => {
    const database = seededDatabase();
    const trustedIds = SEED_EVAL_CASES.filter((item) => item.status === 'TRUSTED').map(
      (item) => item.id,
    );
    expect(trustedIds).toHaveLength(9);
    expect(() =>
      freezeEvalSuite(
        {
          id: 'invalid-suite',
          name: 'Invalid',
          version: 1,
          caseIds: ['eval-010'],
          frozenAt: '2026-07-13T00:00:00.000Z',
        },
        database,
      ),
    ).toThrow();

    const snapshot = freezeEvalSuite(
      {
        id: 'trusted-suite',
        name: 'Trusted suite',
        version: 1,
        caseIds: trustedIds,
        frozenAt: '2026-07-13T00:00:00.000Z',
      },
      database,
    );
    expect(snapshot.cases).toHaveLength(9);
    const originalName = snapshot.cases[0]?.name;
    database
      .update(evalCase)
      .set({ name: 'Changed after freezing' })
      .where(eq(evalCase.id, trustedIds[0] ?? ''))
      .run();
    expect(loadSuiteSnapshot(snapshot.id, database).cases[0]?.name).toBe(originalName);
  });

  it('creates one idempotent run with one execution per frozen case', () => {
    const database = seededDatabase();
    const first = createRun(database);
    const second = createEvaluationRun(
      {
        id: 'ignored-new-id',
        suiteId: 'suite-1',
        agentVersionId: 'agent-v1',
        idempotencyKey: 'suite-1:agent-v1',
        createdAt: '2026-07-13T00:02:00.000Z',
      },
      database,
    );
    expect(second.run.id).toBe(first.run.id);
    expect(second.cases).toEqual(first.cases);
    expect(getTestExecutions(first.run.id, database)).toHaveLength(1);
    expect(() =>
      createEvaluationRun(
        {
          id: 'different-input',
          suiteId: 'suite-1',
          agentVersionId: 'agent-v2',
          idempotencyKey: 'suite-1:agent-v1',
          createdAt: '2026-07-13T00:02:00.000Z',
        },
        database,
      ),
    ).toThrow('idempotency key was reused with different inputs');
  });

  it('atomically stores output, grader result, usage, and execution traces', () => {
    const database = seededDatabase();
    const plan = createRun(database);
    const executionId = plan.cases[0]?.executionId ?? '';
    expect(claimEvaluationRun(plan.run.id, '2026-07-13T00:03:00.000Z', database)).toBe(true);
    expect(claimEvaluationRun(plan.run.id, '2026-07-13T00:03:00.000Z', database)).toBe(false);
    expect(claimTestExecution(executionId, '2026-07-13T00:03:01.000Z', database)).toBe(true);
    appendEvaluationTrace(
      {
        id: 'trace-1',
        executionId,
        stage: 'CANDIDATE_EXTRACTION',
        eventType: 'COMPLETED',
        sequence: 1,
        startedAt: '2026-07-13T00:03:01.000Z',
        completedAt: '2026-07-13T00:03:02.000Z',
        durationMs: 1000,
      },
      database,
    );
    completeTestExecution(
      {
        executionId,
        output: {
          findings: [MOCK_FINDINGS[0]].filter((item) => item !== undefined),
          rejectedFindings: [],
        },
        grader: {
          id: 'grader-1',
          executionId,
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
              expectedCriticalFindingCount: 1,
              actualFindingCount: 1,
              matchedFindingCount: 1,
              matchedCriticalFindingCount: 1,
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
            matches: [{ expectedIndex: 0, actualFindingId: MOCK_FINDINGS[0]?.id ?? '' }],
          },
          createdAt: '2026-07-13T00:03:02.000Z',
        },
        agentCostUsd: 0.04,
        evaluatorCostUsd: 0,
        tokenInput: 100,
        tokenOutput: 20,
        latencyMs: 1000,
        completedAt: '2026-07-13T00:03:02.000Z',
      },
      database,
    );
    completeEvaluationRun(plan.run.id, '2026-07-13T00:03:03.000Z', database);

    expect(getTestExecutions(plan.run.id, database)[0]).toMatchObject({
      status: 'COMPLETED',
      passed: true,
      agentCostUsd: 0.04,
      evaluatorCostUsd: 0,
      tokenInput: 100,
      tokenOutput: 20,
    });
    expect(database.select().from(graderResult).all()).toHaveLength(1);
    expect(database.select().from(traceEvent).all()).toHaveLength(1);
    expect(getEvaluationRunPlan(plan.run.id, database).run.status).toBe('COMPLETED');
    expect(listEvaluationRuns(database)).toHaveLength(1);
    expect(getEvaluationRunDetails(plan.run.id, database)).toMatchObject({
      progress: { total: 1, completed: 1, failed: 0, passed: 1 },
      cases: [{ execution: { id: executionId }, grader: { id: 'grader-1' } }],
    });
  });

  it('allows a run to complete when an individual case fails', () => {
    const database = seededDatabase();
    const plan = createRun(database);
    const executionId = plan.cases[0]?.executionId ?? '';
    claimEvaluationRun(plan.run.id, '2026-07-13T00:03:00.000Z', database);
    claimTestExecution(executionId, '2026-07-13T00:03:01.000Z', database);
    failTestExecution(
      {
        executionId,
        errorCode: 'MODEL_TIMEOUT',
        errorMessage: 'Timed out after retries',
        latencyMs: 30_000,
        completedAt: '2026-07-13T00:03:31.000Z',
      },
      database,
    );
    completeEvaluationRun(plan.run.id, '2026-07-13T00:03:32.000Z', database);
    expect(getTestExecutions(plan.run.id, database)[0]).toMatchObject({
      status: 'FAILED',
      passed: false,
      errorCode: 'MODEL_TIMEOUT',
    });
    expect(
      database.select().from(evaluationRun).where(eq(evaluationRun.id, plan.run.id)).get(),
    ).toMatchObject({
      status: 'COMPLETED',
    });
  });
});
