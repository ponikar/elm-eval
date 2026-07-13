import type {
  EvalCase,
  EvaluationAgentOutput,
  EvaluationRun,
  FrozenEvalCase,
  GraderResult,
  TraceEvent,
} from '@repo/domain';
import { gradeEvaluationCase } from './grader.js';

type MaybePromise<T> = T | Promise<T>;

export interface EvaluationRunPlan {
  run: EvaluationRun;
  cases: Array<{ executionId: string; evalCase: FrozenEvalCase }>;
}

export interface CaseUsage {
  agentCostUsd: number;
  evaluatorCostUsd: number;
  tokenInput: number;
  tokenOutput: number;
  latencyMs: number;
}

export type CaseTrace = Omit<TraceEvent, 'id' | 'executionId' | 'pipelineJobId'>;

export interface CaseExecutionResult {
  output: EvaluationAgentOutput;
  usage: CaseUsage;
  traces?: CaseTrace[];
}

export interface CaseExecutionContext {
  run: EvaluationRun;
  evalCase: FrozenEvalCase;
  executionId: string;
}

export interface CaseExecutor {
  execute(context: CaseExecutionContext): Promise<CaseExecutionResult>;
}

export interface CompleteExecutionInput extends CaseUsage {
  executionId: string;
  output: EvaluationAgentOutput;
  grader: GraderResult;
  completedAt: string;
}

export interface FailExecutionInput {
  executionId: string;
  errorCode: string;
  errorMessage: string;
  latencyMs: number;
  completedAt: string;
}

export interface FailRunInput {
  runId: string;
  errorCode: string;
  errorMessage: string;
  completedAt: string;
}

export interface EvaluationRepository {
  getRunPlan(runId: string): MaybePromise<EvaluationRunPlan>;
  claimRun(runId: string, startedAt: string): MaybePromise<boolean>;
  claimExecution(executionId: string, startedAt: string): MaybePromise<boolean>;
  appendTrace(trace: TraceEvent & { executionId: string }): MaybePromise<void>;
  completeExecution(input: CompleteExecutionInput): MaybePromise<void>;
  failExecution(input: FailExecutionInput): MaybePromise<void>;
  completeRun(runId: string, completedAt: string): MaybePromise<void>;
  failRun(input: FailRunInput): MaybePromise<void>;
}

export interface EvaluationRunnerClock {
  now(): Date;
}

export interface EvaluationRunnerIds {
  graderResult(executionId: string): string;
  trace(executionId: string, sequence: number): string;
}

export interface RunEvaluationResult {
  runId: string;
  claimed: boolean;
  completedCases: number;
  failedCases: number;
}

export interface EvaluationRunnerDependencies {
  repository: EvaluationRepository;
  executor: CaseExecutor;
  clock: EvaluationRunnerClock;
  ids: EvaluationRunnerIds;
}

export class CaseExecutionError extends Error {
  readonly code: string;
  readonly latencyMs?: number;
  readonly traces: CaseTrace[];

  constructor(
    code: string,
    message: string,
    options: { latencyMs?: number; traces?: CaseTrace[]; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = 'CaseExecutionError';
    this.code = code;
    this.latencyMs = options.latencyMs;
    this.traces = options.traces ?? [];
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function caseFailure(error: unknown, fallbackLatencyMs: number): CaseExecutionError {
  return error instanceof CaseExecutionError
    ? error
    : new CaseExecutionError('PIPELINE_ERROR', errorMessage(error), {
        latencyMs: fallbackLatencyMs,
        cause: error,
      });
}

async function appendTraces(
  repository: EvaluationRepository,
  ids: EvaluationRunnerIds,
  executionId: string,
  traces: CaseTrace[],
): Promise<void> {
  for (const trace of traces) {
    await repository.appendTrace({
      ...trace,
      id: ids.trace(executionId, trace.sequence),
      executionId,
    });
  }
}

function grade(
  evalCase: EvalCase,
  output: EvaluationAgentOutput,
  executionId: string,
  ids: EvaluationRunnerIds,
  createdAt: string,
): GraderResult {
  return gradeEvaluationCase({
    evalCase,
    agentOutput: output,
    executionId,
    resultId: ids.graderResult(executionId),
    createdAt,
  });
}

export async function runEvaluation(
  runId: string,
  dependencies: EvaluationRunnerDependencies,
): Promise<RunEvaluationResult> {
  const { repository, executor, clock, ids } = dependencies;
  const runStartedAt = clock.now().toISOString();
  const claimed = await repository.claimRun(runId, runStartedAt);
  if (!claimed) return { runId, claimed: false, completedCases: 0, failedCases: 0 };

  let completedCases = 0;
  let failedCases = 0;
  try {
    const plan = await repository.getRunPlan(runId);
    for (const { executionId, evalCase } of plan.cases) {
      const caseStarted = clock.now();
      const executionClaimed = await repository.claimExecution(
        executionId,
        caseStarted.toISOString(),
      );
      if (!executionClaimed) {
        throw new Error(`Test execution ${executionId} could not be claimed`);
      }

      let executionResult: CaseExecutionResult;
      try {
        executionResult = await executor.execute({ run: plan.run, evalCase, executionId });
      } catch (error) {
        const caseCompleted = clock.now();
        const measuredLatencyMs = Math.max(0, caseCompleted.getTime() - caseStarted.getTime());
        const failure = caseFailure(error, measuredLatencyMs);
        await appendTraces(repository, ids, executionId, failure.traces);
        await repository.failExecution({
          executionId,
          errorCode: failure.code,
          errorMessage: failure.message,
          latencyMs: failure.latencyMs ?? measuredLatencyMs,
          completedAt: caseCompleted.toISOString(),
        });
        failedCases += 1;
        continue;
      }

      const caseCompletedAt = clock.now().toISOString();
      await appendTraces(repository, ids, executionId, executionResult.traces ?? []);
      const grader = grade(evalCase, executionResult.output, executionId, ids, caseCompletedAt);
      await repository.completeExecution({
        executionId,
        output: executionResult.output,
        grader,
        ...executionResult.usage,
        completedAt: caseCompletedAt,
      });
      completedCases += 1;
    }

    await repository.completeRun(runId, clock.now().toISOString());
    return { runId, claimed: true, completedCases, failedCases };
  } catch (error) {
    const failureMessage = errorMessage(error);
    try {
      await repository.failRun({
        runId,
        errorCode: 'RUNNER_INFRASTRUCTURE_ERROR',
        errorMessage: failureMessage,
        completedAt: clock.now().toISOString(),
      });
    } catch (failRunError) {
      throw new AggregateError(
        [error, failRunError],
        `Evaluation run ${runId} failed and its failure state could not be persisted`,
      );
    }
    throw error;
  }
}
