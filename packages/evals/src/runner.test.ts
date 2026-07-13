import type { EvaluationAgentOutput, FrozenEvalCase } from '@repo/domain';
import { describe, expect, it } from 'vitest';
import {
  CaseExecutionError,
  type CaseExecutionResult,
  type CompleteExecutionInput,
  type EvaluationRepository,
  type EvaluationRunPlan,
  type FailExecutionInput,
  type FailRunInput,
  runEvaluation,
} from './runner.js';

function evalCase(id: string, findingShouldExist = false): FrozenEvalCase {
  return {
    id,
    name: `Case ${id}`,
    category: 'ENVIRONMENT',
    criticality: 'NORMAL',
    input: {
      auditPages: [{ pageNumber: 1, text: 'All permits were current.' }],
      rulebookVersionId: 'rulebook-1',
    },
    expected: [
      findingShouldExist
        ? {
            findingShouldExist: true,
            category: 'ENVIRONMENT',
            severity: 'HIGH',
            auditEvidence: { pageNumber: 1, textContains: 'expired permit' },
            applicableRule: { ruleId: 'ENV_PERMIT', rulebookVersion: '8.0' },
          }
        : { findingShouldExist: false, forbiddenClaims: ['permit violation'] },
    ],
    source: 'HUMAN_CREATED',
    status: 'TRUSTED',
  };
}

function plan(cases: FrozenEvalCase[]): EvaluationRunPlan {
  const suiteSnapshot = {
    id: 'suite-1',
    name: 'Release suite',
    version: 1,
    contentHash: 'suite-hash',
    cases,
    frozenAt: '2026-07-13T00:00:00.000Z',
  };
  return {
    run: {
      id: 'run-1',
      agentVersionId: 'agent-1',
      suiteId: suiteSnapshot.id,
      rulebookVersionId: 'rulebook-1',
      idempotencyKey: 'suite-1:agent-1',
      suiteContentHash: suiteSnapshot.contentHash,
      suiteSnapshot,
      agentVersionSnapshot: {
        id: 'agent-1',
        name: 'Agent V1',
        model: 'scripted',
        promptVersion: 'prompt-1',
        systemPrompt: 'Evaluate supplier audits.',
        temperature: 0,
        rulebookVersionId: 'rulebook-1',
        retrievalTopK: 5,
        extractionSchemaVersion: 'schema-1',
        correctiveActionPromptVersion: 'cap-1',
        timeoutMs: 1000,
        maxRetries: 1,
        createdAt: '2026-07-13T00:00:00.000Z',
        type: 'baseline',
      },
      status: 'PENDING',
      createdAt: '2026-07-13T00:00:00.000Z',
    },
    cases: cases.map((item) => ({ executionId: `execution:${item.id}`, evalCase: item })),
  };
}

const emptyOutput: EvaluationAgentOutput = { findings: [], rejectedFindings: [] };

function success(overrides: Partial<CaseExecutionResult> = {}): CaseExecutionResult {
  return {
    output: emptyOutput,
    usage: {
      agentCostUsd: 0.04,
      evaluatorCostUsd: 0,
      tokenInput: 100,
      tokenOutput: 20,
      latencyMs: 250,
    },
    ...overrides,
  };
}

class RecordingRepository implements EvaluationRepository {
  readonly events: string[] = [];
  readonly completed: CompleteExecutionInput[] = [];
  readonly failed: FailExecutionInput[] = [];
  readonly traces: Parameters<EvaluationRepository['appendTrace']>[0][] = [];
  readonly failedRuns: FailRunInput[] = [];
  claimRunResult = true;
  throwOnCompleteExecution = false;

  constructor(readonly plan: EvaluationRunPlan) {}

  getRunPlan(runId: string): EvaluationRunPlan {
    this.events.push(`plan:${runId}`);
    return this.plan;
  }

  claimRun(runId: string): boolean {
    this.events.push(`claim-run:${runId}`);
    return this.claimRunResult;
  }

  claimExecution(executionId: string): boolean {
    this.events.push(`claim:${executionId}`);
    return true;
  }

  appendTrace(trace: Parameters<EvaluationRepository['appendTrace']>[0]): void {
    this.events.push(`trace:${trace.executionId}:${trace.sequence}`);
    this.traces.push(trace);
  }

  completeExecution(input: CompleteExecutionInput): void {
    this.events.push(`complete:${input.executionId}`);
    if (this.throwOnCompleteExecution) throw new Error('database write failed');
    this.completed.push(input);
  }

  failExecution(input: FailExecutionInput): void {
    this.events.push(`fail:${input.executionId}`);
    this.failed.push(input);
  }

  completeRun(runId: string): void {
    this.events.push(`complete-run:${runId}`);
  }

  failRun(input: FailRunInput): void {
    this.events.push(`fail-run:${input.runId}`);
    this.failedRuns.push(input);
  }
}

function clock() {
  let tick = 0;
  return {
    now: () => new Date(Date.UTC(2026, 6, 13, 0, 0, tick++)),
  };
}

const ids = {
  graderResult: (executionId: string) => `grader:${executionId}`,
  trace: (executionId: string, sequence: number) => `trace:${executionId}:${sequence}`,
};

describe('runEvaluation', () => {
  it('claims once, executes cases sequentially, and finalizes after every case', async () => {
    const repository = new RecordingRepository(plan([evalCase('a'), evalCase('b')]));
    let active = false;
    const executorOrder: string[] = [];

    const result = await runEvaluation('run-1', {
      repository,
      clock: clock(),
      ids,
      executor: {
        execute: async ({ executionId }) => {
          expect(active).toBe(false);
          active = true;
          executorOrder.push(executionId);
          await Promise.resolve();
          active = false;
          return success();
        },
      },
    });

    expect(result).toEqual({ runId: 'run-1', claimed: true, completedCases: 2, failedCases: 0 });
    expect(executorOrder).toEqual(['execution:a', 'execution:b']);
    expect(repository.events).toEqual([
      'claim-run:run-1',
      'plan:run-1',
      'claim:execution:a',
      'complete:execution:a',
      'claim:execution:b',
      'complete:execution:b',
      'complete-run:run-1',
    ]);
  });

  it('persists a case failure and trace, then continues with the next case', async () => {
    const repository = new RecordingRepository(plan([evalCase('a'), evalCase('b')]));

    const result = await runEvaluation('run-1', {
      repository,
      clock: clock(),
      ids,
      executor: {
        execute: async ({ executionId }) => {
          if (executionId === 'execution:a') {
            throw new CaseExecutionError('MODEL_TIMEOUT', 'Timed out after retries', {
              latencyMs: 30_000,
              traces: [
                {
                  stage: 'FINDING_COMPLETION',
                  eventType: 'FAILED',
                  sequence: 1,
                  startedAt: '2026-07-13T00:00:01.000Z',
                  completedAt: '2026-07-13T00:00:31.000Z',
                  durationMs: 30_000,
                  errorCode: 'MODEL_TIMEOUT',
                },
              ],
            });
          }
          return success();
        },
      },
    });

    expect(result).toEqual({ runId: 'run-1', claimed: true, completedCases: 1, failedCases: 1 });
    expect(repository.failed).toEqual([
      expect.objectContaining({
        executionId: 'execution:a',
        errorCode: 'MODEL_TIMEOUT',
        latencyMs: 30_000,
      }),
    ]);
    expect(repository.traces[0]).toMatchObject({
      id: 'trace:execution:a:1',
      executionId: 'execution:a',
      sequence: 1,
    });
    expect(repository.completed).toHaveLength(1);
    expect(repository.events.at(-1)).toBe('complete-run:run-1');
  });

  it('does no case work or finalization when the run claim is refused', async () => {
    const repository = new RecordingRepository(plan([evalCase('a')]));
    repository.claimRunResult = false;
    let executions = 0;

    const result = await runEvaluation('run-1', {
      repository,
      clock: clock(),
      ids,
      executor: {
        execute: async () => {
          executions += 1;
          return success();
        },
      },
    });

    expect(result).toEqual({ runId: 'run-1', claimed: false, completedCases: 0, failedCases: 0 });
    expect(executions).toBe(0);
    expect(repository.events).toEqual(['claim-run:run-1']);
  });

  it('propagates provider usage and runner-generated IDs to persistence', async () => {
    const repository = new RecordingRepository(plan([evalCase('a')]));
    await runEvaluation('run-1', {
      repository,
      clock: clock(),
      ids,
      executor: {
        execute: async () =>
          success({
            usage: {
              agentCostUsd: 0.125,
              evaluatorCostUsd: 0.005,
              tokenInput: 321,
              tokenOutput: 87,
              latencyMs: 999,
            },
            traces: [
              {
                stage: 'CANDIDATE_EXTRACTION',
                eventType: 'COMPLETED',
                sequence: 4,
                startedAt: '2026-07-13T00:00:01.000Z',
                tokenUsage: { input: 321, output: 87 },
                costUsd: 0.125,
              },
            ],
          }),
      },
    });

    expect(repository.completed[0]).toMatchObject({
      executionId: 'execution:a',
      agentCostUsd: 0.125,
      evaluatorCostUsd: 0.005,
      tokenInput: 321,
      tokenOutput: 87,
      latencyMs: 999,
      grader: { id: 'grader:execution:a', executionId: 'execution:a' },
    });
    expect(repository.traces[0]).toMatchObject({
      id: 'trace:execution:a:4',
      tokenUsage: { input: 321, output: 87 },
      costUsd: 0.125,
    });
  });

  it('persists grading failures as completed executions and completes the run', async () => {
    const repository = new RecordingRepository(plan([evalCase('positive', true)]));

    const result = await runEvaluation('run-1', {
      repository,
      clock: clock(),
      ids,
      executor: { execute: async () => success() },
    });

    expect(result).toMatchObject({ claimed: true, completedCases: 1, failedCases: 0 });
    expect(repository.completed[0]?.grader).toMatchObject({
      passed: false,
      deterministicPassed: false,
      failureTypes: ['MISSED_FINDING'],
    });
    expect(repository.failed).toHaveLength(0);
    expect(repository.events.at(-1)).toBe('complete-run:run-1');
  });

  it('fails the run and stops when persistence infrastructure fails', async () => {
    const repository = new RecordingRepository(plan([evalCase('a'), evalCase('b')]));
    repository.throwOnCompleteExecution = true;
    const executed: string[] = [];

    await expect(
      runEvaluation('run-1', {
        repository,
        clock: clock(),
        ids,
        executor: {
          execute: async ({ executionId }) => {
            executed.push(executionId);
            return success();
          },
        },
      }),
    ).rejects.toThrow('database write failed');

    expect(executed).toEqual(['execution:a']);
    expect(repository.failedRuns).toEqual([
      expect.objectContaining({
        runId: 'run-1',
        errorCode: 'RUNNER_INFRASTRUCTURE_ERROR',
        errorMessage: 'database write failed',
      }),
    ]);
    expect(repository.events.at(-1)).toBe('fail-run:run-1');
  });
});
