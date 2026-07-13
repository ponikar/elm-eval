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

async function freezeFirstCase(database: ReturnType<typeof seededDatabase>) {
  const first = SEED_EVAL_CASES.find((item) => item.status === 'TRUSTED');
  if (!first) throw new Error('Expected one trusted seed case');
  return await freezeEvalSuite(
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

async function createRun(database: ReturnType<typeof seededDatabase>) {
  await freezeFirstCase(database);
  return await createEvaluationRun(
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
  it('freezes only trusted cases and preserves their snapshots', async () => {
    const database = seededDatabase();
    const trustedIds = SEED_EVAL_CASES.filter((item) => item.status === 'TRUSTED').map(
      (item) => item.id,
    );
    expect(trustedIds).toHaveLength(9);
    await expect(
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
    ).rejects.toThrow();

    const snapshot = await freezeEvalSuite(
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
    await database
      .update(evalCase)
      .set({ name: 'Changed after freezing' })
      .where(eq(evalCase.id, trustedIds[0] ?? ''));
    const reloaded = await loadSuiteSnapshot(snapshot.id, database);
    expect(reloaded.cases[0]?.name).toBe(originalName);
  });

  it('creates one idempotent run with one execution per frozen case', async () => {
    const database = seededDatabase();
    const first = await createRun(database);
    const second = await createEvaluationRun(
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
    expect(await getTestExecutions(first.run.id, database)).toHaveLength(1);
    await expect(
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
    ).rejects.toThrow('idempotency key was reused with different inputs');
  });

  it('atomically stores output, grader result, usage, and execution traces', async () => {
    const database = seededDatabase();
    const plan = await createRun(database);
    const executionId = plan.cases[0]?.executionId ?? '';
    expect(await claimEvaluationRun(plan.run.id, '2026-07-13T00:03:00.000Z', database)).toBe(true);
    expect(await claimEvaluationRun(plan.run.id, '2026-07-13T00:03:00.000Z', database)).toBe(false);
    expect(await claimTestExecution(executionId, '2026-07-13T00:03:01.000Z', database)).toBe(true);
    await appendEvaluationTrace(
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
    await completeTestExecution(
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
    await completeEvaluationRun(plan.run.id, '2026-07-13T00:03:03.000Z', database);

    const executions = await getTestExecutions(plan.run.id, database);
    expect(executions[0]).toMatchObject({
      status: 'COMPLETED',
      passed: true,
      agentCostUsd: 0.04,
      evaluatorCostUsd: 0,
      tokenInput: 100,
      tokenOutput: 20,
    });
    expect(await database.select().from(graderResult)).toHaveLength(1);
    expect(await database.select().from(traceEvent)).toHaveLength(1);
    const planAfterComplete = await getEvaluationRunPlan(plan.run.id, database);
    expect(planAfterComplete.run.status).toBe('COMPLETED');
    expect(await listEvaluationRuns(database)).toHaveLength(1);
    const details = await getEvaluationRunDetails(plan.run.id, database);
    expect(details).toMatchObject({
      progress: { total: 1, completed: 1, failed: 0, passed: 1 },
      cases: [{ execution: { id: executionId }, grader: { id: 'grader-1' } }],
    });
  });

  it('allows a run to complete when an individual case fails', async () => {
    const database = seededDatabase();
    const plan = await createRun(database);
    const executionId = plan.cases[0]?.executionId ?? '';
    await claimEvaluationRun(plan.run.id, '2026-07-13T00:03:00.000Z', database);
    await claimTestExecution(executionId, '2026-07-13T00:03:01.000Z', database);
    await failTestExecution(
      {
        executionId,
        errorCode: 'MODEL_TIMEOUT',
        errorMessage: 'Timed out after retries',
        latencyMs: 30_000,
        completedAt: '2026-07-13T00:03:31.000Z',
      },
      database,
    );
    await completeEvaluationRun(plan.run.id, '2026-07-13T00:03:32.000Z', database);
    const executions = await getTestExecutions(plan.run.id, database);
    expect(executions[0]).toMatchObject({
      status: 'FAILED',
      passed: false,
      errorCode: 'MODEL_TIMEOUT',
    });
    const runRows = await database
      .select()
      .from(evaluationRun)
      .where(eq(evaluationRun.id, plan.run.id));
    expect(runRows[0]).toMatchObject({
      status: 'COMPLETED',
    });
  });
});
