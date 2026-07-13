import type {
  EvaluationAgentOutput,
  EvaluationRun,
  FrozenEvalCase,
  GraderResult,
  TestExecution,
  TraceEvent,
} from '@repo/domain';
import {
  EvaluationAgentOutputSchema,
  EvaluationRunSchema,
  FrozenEvalCaseSchema,
  GraderResultSchema,
  TestExecutionSchema,
  TraceEventSchema,
} from '@repo/domain';
import { asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from './index.js';
import { evaluationRun, graderResult, testExecution, traceEvent } from './schema.js';

type TraceDatabase = typeof db;

export interface TraceRunSummary {
  run: EvaluationRun;
  progress: {
    total: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
    passed: number;
  };
  latestFailureAt?: string;
}

export interface TraceRunCaseSummary {
  evalCase: FrozenEvalCase;
  execution: TestExecution;
  grader?: GraderResult;
  traceCount: number;
}

export interface TraceRunOverview {
  run: EvaluationRun;
  progress: TraceRunSummary['progress'];
  cases: TraceRunCaseSummary[];
}

export interface ExecutionTraceDetails {
  run: EvaluationRun;
  evalCase: FrozenEvalCase;
  execution: TestExecution;
  grader?: GraderResult;
  traces: TraceEvent[];
}

function parseStoredJson<T>(value: unknown): T {
  if (typeof value === 'string') return JSON.parse(value) as T;
  return value as T;
}

function parseEvaluationRun(row: typeof evaluationRun.$inferSelect): EvaluationRun {
  return EvaluationRunSchema.parse({
    id: row.id,
    agentVersionId: row.agentVersionId,
    suiteId: row.suiteId,
    rulebookVersionId: row.rulebookVersionId,
    idempotencyKey: row.idempotencyKey,
    suiteContentHash: row.suiteContentHash,
    suiteSnapshot: parseStoredJson(row.suiteSnapshotJson),
    agentVersionSnapshot: parseStoredJson(row.agentVersionSnapshotJson),
    status: row.status,
    errorCode: row.errorCode ?? undefined,
    errorMessage: row.errorMessage ?? undefined,
    createdAt: row.createdAt,
    startedAt: row.startedAt ?? undefined,
    completedAt: row.completedAt ?? undefined,
  });
}

function parseExecution(row: typeof testExecution.$inferSelect): TestExecution {
  return TestExecutionSchema.parse({
    id: row.id,
    runId: row.runId,
    evalCaseId: row.evalCaseId,
    status: row.status,
    agentOutput: row.agentOutput
      ? EvaluationAgentOutputSchema.parse(parseStoredJson<EvaluationAgentOutput>(row.agentOutput))
      : undefined,
    passed: row.passed ?? undefined,
    agentCostUsd: row.agentCostUsd,
    evaluatorCostUsd: row.evaluatorCostUsd,
    tokenInput: row.tokenInput,
    tokenOutput: row.tokenOutput,
    latencyMs: row.latencyMs,
    errorCode: row.errorCode ?? undefined,
    errorMessage: row.errorMessage ?? undefined,
    createdAt: row.createdAt,
    startedAt: row.startedAt ?? undefined,
    completedAt: row.completedAt ?? undefined,
  });
}

function parseGrader(row: typeof graderResult.$inferSelect): GraderResult {
  return GraderResultSchema.parse({
    id: row.id,
    executionId: row.executionId,
    graderVersion: row.graderVersion,
    passed: row.passed,
    deterministicPassed: row.deterministicPassed,
    findingRecall: row.findingRecall ?? undefined,
    criticalFindingRecall: row.criticalFindingRecall ?? undefined,
    findingPrecision: row.findingPrecision ?? undefined,
    categoryAccuracy: row.categoryAccuracy ?? undefined,
    severityAccuracy: row.severityAccuracy ?? undefined,
    criticalUnderclassificationCount: row.criticalUnderclassificationCount,
    auditCitationPrecision: row.auditCitationPrecision ?? undefined,
    ruleReferenceAccuracy: row.ruleReferenceAccuracy ?? undefined,
    hallucinatedFindingRate: row.hallucinatedFindingRate ?? undefined,
    correctiveActionCompleteness: row.correctiveActionCompleteness ?? undefined,
    schemaValidity: row.schemaValidity ?? undefined,
    failureTypes: parseStoredJson(row.failureTypesJson),
    details: parseStoredJson(row.detailsJson),
    judgeModel: row.judgeModel ?? undefined,
    createdAt: row.createdAt,
  });
}

function parseTrace(row: typeof traceEvent.$inferSelect): TraceEvent {
  return TraceEventSchema.parse({
    id: row.id,
    executionId: row.executionId ?? undefined,
    pipelineJobId: row.pipelineJobId ?? undefined,
    stage: row.stage,
    eventType: row.eventType,
    sequence: row.sequence,
    attempt: row.attempt ?? undefined,
    startedAt: row.startedAt,
    completedAt: row.completedAt ?? undefined,
    durationMs: row.durationMs ?? undefined,
    inputSummary: row.inputSummary ? parseStoredJson(row.inputSummary) : undefined,
    outputSummary: row.outputSummary ? parseStoredJson(row.outputSummary) : undefined,
    errorCode: row.errorCode ?? undefined,
    tokenUsage:
      row.tokenInput === null || row.tokenOutput === null
        ? undefined
        : { input: row.tokenInput, output: row.tokenOutput },
    costUsd: row.costUsd ?? undefined,
  });
}

function progressForExecutions(executions: TestExecution[]) {
  return {
    total: executions.length,
    pending: executions.filter((item) => item.status === 'PENDING').length,
    running: executions.filter((item) => item.status === 'RUNNING').length,
    completed: executions.filter((item) => item.status === 'COMPLETED').length,
    failed: executions.filter((item) => item.status === 'FAILED').length,
    passed: executions.filter((item) => item.passed === true).length,
  };
}

function suiteCaseMap(run: EvaluationRun) {
  return new Map(
    run.suiteSnapshot.cases.map((item) => [item.id, FrozenEvalCaseSchema.parse(item)]),
  );
}

export async function listTraceRuns(database: TraceDatabase = db): Promise<TraceRunSummary[]> {
  const runRows = await database
    .select()
    .from(evaluationRun)
    .orderBy(desc(evaluationRun.createdAt));
  if (runRows.length === 0) return [];

  const runs = runRows.map(parseEvaluationRun);
  const runIds = runs.map((item) => item.id);
  const executionRows = await database
    .select()
    .from(testExecution)
    .where(inArray(testExecution.runId, runIds));
  const executions = executionRows.map(parseExecution);
  const executionsByRun = new Map<string, TestExecution[]>();

  for (const execution of executions) {
    const list = executionsByRun.get(execution.runId);
    if (list) list.push(execution);
    else executionsByRun.set(execution.runId, [execution]);
  }

  return runs.map((run) => {
    const runExecutions = executionsByRun.get(run.id) ?? [];
    const failures = runExecutions
      .filter((item) => item.status === 'FAILED')
      .map((item) => item.completedAt)
      .filter((item): item is string => Boolean(item))
      .sort()
      .at(-1);
    return {
      run,
      progress: progressForExecutions(runExecutions),
      latestFailureAt: failures,
    };
  });
}

export async function getTraceRunOverview(
  runId: string,
  database: TraceDatabase = db,
): Promise<TraceRunOverview> {
  const runRows = await database.select().from(evaluationRun).where(eq(evaluationRun.id, runId));
  const runRow = runRows[0];
  if (!runRow) throw new Error(`Evaluation run ${runId} does not exist`);

  const run = parseEvaluationRun(runRow);
  const executionRows = await database
    .select()
    .from(testExecution)
    .where(eq(testExecution.runId, runId));
  const executions = executionRows.map(parseExecution);
  const executionIds = executions.map((item) => item.id);

  const [graderRows, traceRows] = await Promise.all([
    executionIds.length === 0
      ? Promise.resolve([])
      : database.select().from(graderResult).where(inArray(graderResult.executionId, executionIds)),
    executionIds.length === 0
      ? Promise.resolve([])
      : database
          .select({
            executionId: traceEvent.executionId,
            id: traceEvent.id,
          })
          .from(traceEvent)
          .where(inArray(traceEvent.executionId, executionIds)),
  ]);

  const graderByExecution = new Map(graderRows.map((row) => [row.executionId, parseGrader(row)]));
  const traceCountByExecution = new Map<string, number>();
  for (const row of traceRows) {
    if (!row.executionId) continue;
    traceCountByExecution.set(
      row.executionId,
      (traceCountByExecution.get(row.executionId) ?? 0) + 1,
    );
  }

  const casesById = suiteCaseMap(run);
  const cases: TraceRunCaseSummary[] = [];

  for (const execution of executions) {
    const evalCase = casesById.get(execution.evalCaseId);
    if (!evalCase) continue;
    cases.push({
      evalCase,
      execution,
      grader: graderByExecution.get(execution.id),
      traceCount: traceCountByExecution.get(execution.id) ?? 0,
    });
  }

  cases.sort((left, right) => {
    const leftPriority =
      left.execution.status === 'FAILED' ? 0 : left.execution.passed === false ? 1 : 2;
    const rightPriority =
      right.execution.status === 'FAILED' ? 0 : right.execution.passed === false ? 1 : 2;
    if (leftPriority !== rightPriority) return leftPriority - rightPriority;
    return left.evalCase.name.localeCompare(right.evalCase.name);
  });

  return {
    run,
    progress: progressForExecutions(executions),
    cases,
  };
}

export async function getExecutionTraceDetails(
  executionId: string,
  database: TraceDatabase = db,
): Promise<ExecutionTraceDetails> {
  const executionRows = await database
    .select()
    .from(testExecution)
    .where(eq(testExecution.id, executionId));
  const executionRow = executionRows[0];
  if (!executionRow) throw new Error(`Test execution ${executionId} does not exist`);

  const execution = parseExecution(executionRow);
  const runRows = await database
    .select()
    .from(evaluationRun)
    .where(eq(evaluationRun.id, execution.runId));
  const runRow = runRows[0];
  if (!runRow) throw new Error(`Evaluation run ${execution.runId} does not exist`);

  const run = parseEvaluationRun(runRow);
  const evalCase = suiteCaseMap(run).get(execution.evalCaseId);
  if (!evalCase)
    throw new Error(`Evaluation run ${run.id} is missing case ${execution.evalCaseId}`);

  const [graderRows, traceRows] = await Promise.all([
    database.select().from(graderResult).where(eq(graderResult.executionId, executionId)),
    database
      .select()
      .from(traceEvent)
      .where(eq(traceEvent.executionId, executionId))
      .orderBy(asc(traceEvent.sequence)),
  ]);

  return {
    run,
    evalCase,
    execution,
    grader: graderRows[0] ? parseGrader(graderRows[0]) : undefined,
    traces: traceRows.map(parseTrace),
  };
}

export async function countFailedTraceRuns(database: TraceDatabase = db) {
  const result = await database
    .select({ count: sql<number>`cast(count(distinct ${evaluationRun.id}) as int)` })
    .from(evaluationRun)
    .innerJoin(testExecution, eq(evaluationRun.id, testExecution.runId))
    .where(eq(testExecution.status, 'FAILED'));
  return result[0]?.count ?? 0;
}
