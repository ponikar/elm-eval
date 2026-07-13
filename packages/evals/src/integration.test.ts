import { createCorrection, createDatabase, listEvalCases, seedReviewWorkspace } from '@repo/db';
import {
  appendEvaluationTrace,
  claimEvaluationRun,
  claimTestExecution,
  completeEvaluationRun,
  completeTestExecution,
  createEvaluationRun,
  failEvaluationRun,
  failTestExecution,
  freezeEvalSuite,
  getEvaluationRunDetails,
  getEvaluationRunPlan,
} from '@repo/db/eval-store';
import type { AuditFinding, FrozenEvalCase } from '@repo/domain';
import {
  MOCK_FINDINGS,
  SEED_AGENT_VERSIONS,
  SEED_AUDIT,
  SEED_EVAL_CASES,
  SEED_RULEBOOK,
  SEED_RULES,
} from '@repo/test-fixtures';
import { describe, expect, it } from 'vitest';
import { runEvaluation } from './runner.js';

const timestamp = '2026-07-13T00:00:00.000Z';

function findingForCase(evalCase: FrozenEvalCase, agentVersionId: string): AuditFinding[] {
  return evalCase.expected.flatMap((expected, index) => {
    if (!expected.findingShouldExist) return [];
    if (!expected.auditEvidence || !expected.applicableRule)
      throw new Error(`Positive case ${evalCase.id} lacks deterministic matching anchors`);
    const page = evalCase.input.auditPages.find(
      (item) => item.pageNumber === expected.auditEvidence?.pageNumber,
    );
    if (!page) throw new Error(`Case ${evalCase.id} references a missing audit page`);
    const requiredFacts = expected.requiredCorrectiveActionFacts ?? [];
    return [
      {
        id: `${evalCase.id}:finding:${index}`,
        auditId: `evaluation:${evalCase.id}`,
        agentVersionId,
        title: `Expected finding for ${evalCase.name}`,
        description: `Deterministic scripted output for ${evalCase.name}.`,
        category: expected.category ?? evalCase.category,
        severity: expected.severity ?? 'LOW',
        auditEvidence: { pageNumber: page.pageNumber, quote: page.text },
        applicableRule: expected.applicableRule,
        confidence: 1,
        correctiveAction: {
          action:
            requiredFacts.length > 0
              ? requiredFacts.join('; ')
              : 'Complete the required corrective action.',
          ownerRole: 'Compliance owner',
          deadlineDays: 1,
          verificationMethod: 'Verify the corrective action with documented evidence.',
          priority: expected.severity === 'CRITICAL' ? 'URGENT' : 'MEDIUM',
        },
        reviewStatus: 'PENDING',
      },
    ];
  });
}

describe('evaluation engine integration', () => {
  it('runs a frozen suite of ten genuinely trusted cases end to end', async () => {
    const database = createDatabase(':memory:');
    seedReviewWorkspace(
      {
        audit: SEED_AUDIT,
        findings: MOCK_FINDINGS,
        rulebook: SEED_RULEBOOK,
        rules: SEED_RULES,
        agentVersions: SEED_AGENT_VERSIONS,
        evalCases: SEED_EVAL_CASES,
      },
      database,
    );
    const finding = MOCK_FINDINGS[0];
    if (!finding) throw new Error('Expected a seeded finding');
    createCorrection(
      {
        findingId: finding.id,
        failureType: 'WRONG_SEVERITY',
        reason: 'Reviewer explicitly approved this corrected regression expectation.',
        corrected: {
          title: finding.title,
          description: finding.description,
          category: finding.category,
          severity: finding.severity,
          auditEvidence: finding.auditEvidence,
          applicableRule: finding.applicableRule,
          confidence: finding.confidence,
          correctiveAction: finding.correctiveAction,
        },
        saveAsRegressionTest: true,
      },
      database,
    );
    const trustedIds = (await listEvalCases(database))
      .filter((item) => item.status === 'TRUSTED')
      .map((item) => item.id);
    expect(trustedIds).toHaveLength(10);
    const suite = await freezeEvalSuite(
      {
        id: 'suite-10',
        name: 'Ten trusted cases',
        version: 1,
        caseIds: trustedIds,
        frozenAt: timestamp,
      },
      database,
    );
    const plan = await createEvaluationRun(
      {
        id: 'run-10',
        suiteId: suite.id,
        agentVersionId: 'agent-v1',
        idempotencyKey: `${suite.contentHash}:agent-v1`,
        createdAt: timestamp,
        createExecutionId: (caseId) => `execution:${caseId}`,
      },
      database,
    );

    let clockTick = 0;
    const result = await runEvaluation(plan.run.id, {
      repository: {
        getRunPlan: (runId) => getEvaluationRunPlan(runId, database),
        claimRun: (runId, startedAt) => claimEvaluationRun(runId, startedAt, database),
        claimExecution: (executionId, startedAt) =>
          claimTestExecution(executionId, startedAt, database),
        appendTrace: (trace) => appendEvaluationTrace(trace, database),
        completeExecution: (input) => completeTestExecution(input, database),
        failExecution: (input) => failTestExecution(input, database),
        completeRun: (runId, completedAt) => completeEvaluationRun(runId, completedAt, database),
        failRun: (input) => failEvaluationRun(input, database),
      },
      executor: {
        execute: async ({ run, evalCase }) => ({
          output: {
            findings: findingForCase(evalCase, run.agentVersionId),
            rejectedFindings: [],
          },
          usage: {
            agentCostUsd: 0.01,
            evaluatorCostUsd: 0,
            tokenInput: 100,
            tokenOutput: 20,
            latencyMs: 25,
          },
          traces: [
            {
              stage: 'DETERMINISTIC_VALIDATION',
              eventType: 'COMPLETED',
              sequence: 1,
              startedAt: timestamp,
              completedAt: timestamp,
              durationMs: 1,
            },
          ],
        }),
      },
      clock: { now: () => new Date(Date.parse(timestamp) + clockTick++ * 100) },
      ids: {
        graderResult: (executionId) => `grader:${executionId}`,
        trace: (executionId, sequence) => `trace:${executionId}:${sequence}`,
      },
    });

    expect(result).toEqual({
      runId: plan.run.id,
      claimed: true,
      completedCases: 10,
      failedCases: 0,
    });
    const details = await getEvaluationRunDetails(plan.run.id, database);
    expect(details.run.status).toBe('COMPLETED');
    expect(
      details.cases
        .filter((item) => item.grader?.passed !== true)
        .map((item) => ({ id: item.evalCase.id, failures: item.grader?.failureTypes })),
    ).toEqual([]);
    expect(details.progress).toEqual({
      total: 10,
      pending: 0,
      running: 0,
      completed: 10,
      failed: 0,
      passed: 10,
    });
    expect(details.cases.every((item) => item.grader?.passed === true)).toBe(true);
    expect(details.cases.every((item) => item.execution.agentCostUsd === 0.01)).toBe(true);
    expect(details.cases.every((item) => item.execution.evaluatorCostUsd === 0)).toBe(true);
  });
});
