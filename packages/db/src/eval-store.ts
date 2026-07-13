import { createHash, randomUUID } from 'node:crypto';
import type {
  AgentVersion,
  EvalCase,
  EvalSuiteSnapshot,
  EvaluationAgentOutput,
  EvaluationRun,
  FrozenEvalCase,
  GraderResult,
  TestExecution,
  TraceEvent,
} from '@repo/domain';
import {
  AgentVersionSchema,
  EvalCaseSchema,
  EvalSuiteSnapshotSchema,
  EvaluationAgentOutputSchema,
  EvaluationRunSchema,
  FrozenEvalCaseSchema,
  GraderResultSchema,
  TestExecutionSchema,
  TraceEventSchema,
} from '@repo/domain';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { db } from './index.js';
import {
  agentVersion,
  evalCase,
  evalSuite,
  evalSuiteCase,
  evaluationRun,
  graderResult,
  testExecution,
  traceEvent,
} from './schema.js';

type EvalDatabase = typeof db;
type EvalReader = Pick<EvalDatabase, 'select'>;

export interface FreezeEvalSuiteInput {
  id: string;
  name: string;
  version: number;
  description?: string;
  caseIds: string[];
  frozenAt: string;
}

export interface CreateEvaluationRunInput {
  id: string;
  suiteId: string;
  agentVersionId: string;
  idempotencyKey: string;
  createdAt: string;
  createExecutionId?: (evalCaseId: string) => string;
}

export interface EvaluationRunPlan {
  run: EvaluationRun;
  cases: Array<{ executionId: string; evalCase: FrozenEvalCase }>;
}

export interface CompleteExecutionInput {
  executionId: string;
  output: EvaluationAgentOutput;
  grader: GraderResult;
  agentCostUsd: number;
  evaluatorCostUsd: number;
  tokenInput: number;
  tokenOutput: number;
  latencyMs: number;
  completedAt: string;
}

export interface EvaluationRunDetails {
  run: EvaluationRun;
  progress: {
    total: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
    passed: number;
  };
  cases: Array<{
    evalCase: FrozenEvalCase;
    execution: TestExecution;
    grader?: GraderResult;
  }>;
}

function canonicalize(value: unknown): string {
  if (value === undefined) return 'null';
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .filter((key) => record[key] !== undefined)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalize(record[key])}`)
    .join(',')}}`;
}

function contentHash(cases: FrozenEvalCase[]): string {
  return createHash('sha256').update(canonicalize(cases)).digest('hex');
}

function parseEvalCase(row: typeof evalCase.$inferSelect): EvalCase {
  return EvalCaseSchema.parse({
    id: row.id,
    name: row.name,
    category: row.category,
    criticality: row.criticality,
    input: {
      auditPages: JSON.parse(row.inputAuditPages),
      rulebookVersionId: row.inputRulebookVersionId,
    },
    expected: JSON.parse(row.expectedJson),
    source: row.source,
    status: row.status,
    parentCaseId: row.parentCaseId ?? undefined,
  });
}

function parseAgentVersion(row: typeof agentVersion.$inferSelect): AgentVersion {
  return AgentVersionSchema.parse(row);
}

function parseRun(row: typeof evaluationRun.$inferSelect): EvaluationRun {
  return EvaluationRunSchema.parse({
    id: row.id,
    agentVersionId: row.agentVersionId,
    suiteId: row.suiteId,
    rulebookVersionId: row.rulebookVersionId,
    idempotencyKey: row.idempotencyKey,
    suiteContentHash: row.suiteContentHash,
    suiteSnapshot: JSON.parse(row.suiteSnapshotJson),
    agentVersionSnapshot: JSON.parse(row.agentVersionSnapshotJson),
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
    agentOutput: row.agentOutput ? JSON.parse(row.agentOutput) : undefined,
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
    failureTypes: JSON.parse(row.failureTypesJson as string),
    details: JSON.parse(row.detailsJson as string),
    judgeModel: row.judgeModel ?? undefined,
    createdAt: row.createdAt,
  });
}

export async function freezeEvalSuite(
  input: FreezeEvalSuiteInput,
  database: EvalDatabase = db,
): Promise<EvalSuiteSnapshot> {
  if (input.caseIds.length === 0) throw new Error('An evaluation suite requires at least one case');
  if (new Set(input.caseIds).size !== input.caseIds.length)
    throw new Error('An evaluation suite cannot contain duplicate cases');

  return await database.transaction(async (tx) => {
    const rows = await tx.select().from(evalCase).where(inArray(evalCase.id, input.caseIds));
    const byId = new Map(rows.map((row) => [row.id, row]));
    const cases = input.caseIds.map((id) => {
      const row = byId.get(id);
      if (!row) throw new Error(`Evaluation case ${id} does not exist`);
      return FrozenEvalCaseSchema.parse(parseEvalCase(row));
    });
    const rulebookIds = new Set(cases.map((item) => item.input.rulebookVersionId));
    if (rulebookIds.size !== 1)
      throw new Error('All cases in a frozen suite must use the same rulebook version');

    const hash = contentHash(cases);
    const existingRows = await tx
      .select()
      .from(evalSuite)
      .where(and(eq(evalSuite.name, input.name), eq(evalSuite.version, input.version)));
    const existing = existingRows[0];
    if (existing) {
      if (existing.contentHash !== hash)
        throw new Error(`Evaluation suite ${input.name} v${input.version} is already frozen`);
      return await loadSuiteSnapshot(existing.id, tx);
    }

    await tx.insert(evalSuite).values({
      id: input.id,
      name: input.name,
      version: input.version,
      description: input.description,
      status: 'FROZEN',
      contentHash: hash,
      createdAt: input.frozenAt,
      frozenAt: input.frozenAt,
    });
    await tx.insert(evalSuiteCase).values(
      cases.map((item, ordinal) => ({
        suiteId: input.id,
        evalCaseId: item.id,
        ordinal,
        caseContentHash: createHash('sha256').update(canonicalize(item)).digest('hex'),
        caseSnapshotJson: canonicalize(item),
        addedAt: input.frozenAt,
      })),
    );
    return EvalSuiteSnapshotSchema.parse({
      id: input.id,
      name: input.name,
      version: input.version,
      contentHash: hash,
      cases,
      frozenAt: input.frozenAt,
    });
  });
}

export async function loadSuiteSnapshot(
  suiteId: string,
  database: EvalReader = db,
): Promise<EvalSuiteSnapshot> {
  const suiteRows = await database.select().from(evalSuite).where(eq(evalSuite.id, suiteId));
  const suite = suiteRows[0];
  if (suite?.status !== 'FROZEN' || !suite.frozenAt)
    throw new Error(`Frozen evaluation suite ${suiteId} does not exist`);
  const memberships = await database
    .select()
    .from(evalSuiteCase)
    .where(eq(evalSuiteCase.suiteId, suiteId))
    .orderBy(asc(evalSuiteCase.ordinal));
  const cases = memberships.map((membership) =>
    FrozenEvalCaseSchema.parse(JSON.parse(membership.caseSnapshotJson)),
  );
  if (cases.length === 0) throw new Error(`Frozen evaluation suite ${suiteId} has no cases`);
  if (contentHash(cases) !== suite.contentHash)
    throw new Error(`Frozen evaluation suite ${suiteId} failed its content hash check`);
  return EvalSuiteSnapshotSchema.parse({
    id: suite.id,
    name: suite.name,
    version: suite.version,
    contentHash: suite.contentHash,
    cases,
    frozenAt: suite.frozenAt,
  });
}

export async function createEvaluationRun(
  input: CreateEvaluationRunInput,
  database: EvalDatabase = db,
): Promise<EvaluationRunPlan> {
  return await database.transaction(async (tx) => {
    const existingRows = await tx
      .select()
      .from(evaluationRun)
      .where(eq(evaluationRun.idempotencyKey, input.idempotencyKey));
    const existing = existingRows[0];
    if (existing) {
      if (existing.suiteId !== input.suiteId || existing.agentVersionId !== input.agentVersionId)
        throw new Error('Evaluation run idempotency key was reused with different inputs');
      return await getEvaluationRunPlan(existing.id, tx);
    }

    const suite = await loadSuiteSnapshot(input.suiteId, tx);
    const agentRows = await tx
      .select()
      .from(agentVersion)
      .where(eq(agentVersion.id, input.agentVersionId));
    const agentRow = agentRows[0];
    if (!agentRow) throw new Error(`Agent version ${input.agentVersionId} does not exist`);
    const agent = parseAgentVersion(agentRow);
    const rulebookIds = new Set(suite.cases.map((item) => item.input.rulebookVersionId));
    if (rulebookIds.size !== 1 || !rulebookIds.has(agent.rulebookVersionId))
      throw new Error('Agent version and frozen suite must use the same rulebook version');

    await tx.insert(evaluationRun).values({
      id: input.id,
      agentVersionId: agent.id,
      suiteId: suite.id,
      rulebookVersionId: agent.rulebookVersionId,
      idempotencyKey: input.idempotencyKey,
      suiteContentHash: suite.contentHash,
      suiteSnapshotJson: canonicalize(suite),
      agentVersionSnapshotJson: canonicalize(agent),
      status: 'PENDING',
      createdAt: input.createdAt,
    });
    const createExecutionId = input.createExecutionId ?? (() => randomUUID());
    await tx.insert(testExecution).values(
      suite.cases.map((item) => ({
        id: createExecutionId(item.id),
        runId: input.id,
        evalCaseId: item.id,
        status: 'PENDING',
        createdAt: input.createdAt,
      })),
    );
    return await getEvaluationRunPlan(input.id, tx);
  });
}

export async function getEvaluationRunPlan(
  runId: string,
  database: EvalReader = db,
): Promise<EvaluationRunPlan> {
  const runRows = await database.select().from(evaluationRun).where(eq(evaluationRun.id, runId));
  const row = runRows[0];
  if (!row) throw new Error(`Evaluation run ${runId} does not exist`);
  const run = parseRun(row);
  const executions = await database
    .select()
    .from(testExecution)
    .where(eq(testExecution.runId, runId));
  const executionByCase = new Map(executions.map((execution) => [execution.evalCaseId, execution]));
  return {
    run,
    cases: run.suiteSnapshot.cases.map((item) => {
      const execution = executionByCase.get(item.id);
      if (!execution) throw new Error(`Evaluation run ${runId} is missing case ${item.id}`);
      return { executionId: execution.id, evalCase: item };
    }),
  };
}

export async function getTestExecutions(
  runId: string,
  database: EvalDatabase = db,
): Promise<TestExecution[]> {
  const rows = await database.select().from(testExecution).where(eq(testExecution.runId, runId));
  return rows.map(parseExecution);
}

export async function listEvaluationRuns(database: EvalDatabase = db): Promise<EvaluationRun[]> {
  const rows = await database.select().from(evaluationRun).orderBy(asc(evaluationRun.createdAt));
  return rows.map(parseRun);
}

export interface RunSummary {
  id: string;
  status: string;
  createdAt: string;
  startedAt: string | undefined;
  completedAt: string | undefined;
  errorCode: string | undefined;
  errorMessage: string | undefined;
  agentVersionId: string;
  agentVersionName: string;
  agentVersionModel: string;
  agentVersionType: string;
  suiteName: string;
  suiteVersion: number;
  progress: {
    total: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
    passed: number;
  };
  totalAgentCostUsd: number;
  totalEvaluatorCostUsd: number;
  totalTokenInput: number;
  totalTokenOutput: number;
  avgLatencyMs: number;
}

export async function listRunSummaries(database: EvalDatabase = db): Promise<RunSummary[]> {
  const runs = await listEvaluationRuns(database);
  if (runs.length === 0) return [];

  const runIds = runs.map((r) => r.id);
  const allExecutions = await database
    .select()
    .from(testExecution)
    .where(inArray(testExecution.runId, runIds));
  const executionsByRun = new Map<string, typeof allExecutions>();
  for (const exec of allExecutions) {
    const list = executionsByRun.get(exec.runId) ?? [];
    list.push(exec);
    executionsByRun.set(exec.runId, list);
  }

  return runs.map((run) => {
    const execs = executionsByRun.get(run.id) ?? [];
    const completed = execs.filter((e) => e.status === 'COMPLETED');
    const totalLatency = execs.reduce((sum, e) => sum + (e.latencyMs ?? 0), 0);
    const completedCount = execs.filter((e) => e.latencyMs > 0).length;

    return {
      id: run.id,
      status: run.status,
      createdAt: run.createdAt,
      startedAt: run.startedAt,
      completedAt: run.completedAt,
      errorCode: run.errorCode,
      errorMessage: run.errorMessage,
      agentVersionId: run.agentVersionSnapshot.id,
      agentVersionName: run.agentVersionSnapshot.name,
      agentVersionModel: run.agentVersionSnapshot.model,
      agentVersionType: run.agentVersionSnapshot.type ?? 'unknown',
      suiteName: run.suiteSnapshot.name,
      suiteVersion: run.suiteSnapshot.version,
      progress: {
        total: execs.length,
        pending: execs.filter((e) => e.status === 'PENDING').length,
        running: execs.filter((e) => e.status === 'RUNNING').length,
        completed: completed.length,
        failed: execs.filter((e) => e.status === 'FAILED').length,
        passed: execs.filter((e) => e.passed === true).length,
      },
      totalAgentCostUsd: execs.reduce((sum, e) => sum + (e.agentCostUsd ?? 0), 0),
      totalEvaluatorCostUsd: execs.reduce((sum, e) => sum + (e.evaluatorCostUsd ?? 0), 0),
      totalTokenInput: execs.reduce((sum, e) => sum + (e.tokenInput ?? 0), 0),
      totalTokenOutput: execs.reduce((sum, e) => sum + (e.tokenOutput ?? 0), 0),
      avgLatencyMs: completedCount > 0 ? Math.round(totalLatency / completedCount) : 0,
    };
  });
}

export async function getEvaluationRunDetails(
  runId: string,
  database: EvalDatabase = db,
): Promise<EvaluationRunDetails> {
  const plan = await getEvaluationRunPlan(runId, database);
  const executions = await getTestExecutions(runId, database);
  const executionIds = executions.map((item) => item.id);
  const graderRows =
    executionIds.length === 0
      ? []
      : await database
          .select()
          .from(graderResult)
          .where(inArray(graderResult.executionId, executionIds));
  const graders = graderRows.map(parseGrader);
  const executionByCase = new Map(executions.map((item) => [item.evalCaseId, item]));
  const graderByExecution = new Map(graders.map((item) => [item.executionId, item]));
  const cases = plan.run.suiteSnapshot.cases.map((item) => {
    const execution = executionByCase.get(item.id);
    if (!execution) throw new Error(`Evaluation run ${runId} is missing case ${item.id}`);
    return { evalCase: item, execution, grader: graderByExecution.get(execution.id) };
  });
  return {
    run: plan.run,
    progress: {
      total: executions.length,
      pending: executions.filter((item) => item.status === 'PENDING').length,
      running: executions.filter((item) => item.status === 'RUNNING').length,
      completed: executions.filter((item) => item.status === 'COMPLETED').length,
      failed: executions.filter((item) => item.status === 'FAILED').length,
      passed: executions.filter((item) => item.passed === true).length,
    },
    cases,
  };
}

export async function claimEvaluationRun(
  runId: string,
  startedAt: string,
  database: EvalDatabase = db,
): Promise<boolean> {
  const rows = await database
    .update(evaluationRun)
    .set({ status: 'RUNNING', startedAt, errorCode: null, errorMessage: null })
    .where(and(eq(evaluationRun.id, runId), eq(evaluationRun.status, 'PENDING')))
    .returning({ id: evaluationRun.id });
  return rows.length > 0;
}

export async function claimTestExecution(
  executionId: string,
  startedAt: string,
  database: EvalDatabase = db,
): Promise<boolean> {
  const rows = await database
    .update(testExecution)
    .set({ status: 'RUNNING', startedAt, errorCode: null, errorMessage: null })
    .where(and(eq(testExecution.id, executionId), eq(testExecution.status, 'PENDING')))
    .returning({ id: testExecution.id });
  return rows.length > 0;
}

export async function appendEvaluationTrace(
  input: TraceEvent & { executionId: string },
  database: EvalDatabase = db,
): Promise<void> {
  const trace = TraceEventSchema.parse(input);
  await database.insert(traceEvent).values({
    id: trace.id,
    executionId: input.executionId,
    pipelineJobId: null,
    stage: trace.stage,
    eventType: trace.eventType,
    sequence: trace.sequence,
    attempt: trace.attempt,
    startedAt: trace.startedAt,
    completedAt: trace.completedAt,
    durationMs: trace.durationMs,
    inputSummary: trace.inputSummary === undefined ? null : JSON.stringify(trace.inputSummary),
    outputSummary: trace.outputSummary === undefined ? null : JSON.stringify(trace.outputSummary),
    errorCode: trace.errorCode,
    tokenInput: trace.tokenUsage?.input,
    tokenOutput: trace.tokenUsage?.output,
    costUsd: trace.costUsd,
  });
}

export async function completeTestExecution(
  input: CompleteExecutionInput,
  database: EvalDatabase = db,
): Promise<void> {
  const output = EvaluationAgentOutputSchema.parse(input.output);
  const grader = GraderResultSchema.parse(input.grader);
  if (grader.executionId !== input.executionId)
    throw new Error('Grader result belongs to a different test execution');
  await database.transaction(async (tx) => {
    const updated = await tx
      .update(testExecution)
      .set({
        status: 'COMPLETED',
        agentOutput: canonicalize(output),
        passed: grader.passed,
        agentCostUsd: input.agentCostUsd,
        evaluatorCostUsd: input.evaluatorCostUsd,
        tokenInput: input.tokenInput,
        tokenOutput: input.tokenOutput,
        latencyMs: input.latencyMs,
        errorCode: null,
        errorMessage: null,
        completedAt: input.completedAt,
      })
      .where(and(eq(testExecution.id, input.executionId), eq(testExecution.status, 'RUNNING')))
      .returning({ id: testExecution.id });
    if (updated.length === 0) throw new Error(`Test execution ${input.executionId} is not RUNNING`);
    await tx.insert(graderResult).values({
      id: grader.id,
      executionId: grader.executionId,
      graderVersion: grader.graderVersion,
      passed: grader.passed,
      deterministicPassed: grader.deterministicPassed,
      findingRecall: grader.findingRecall,
      criticalFindingRecall: grader.criticalFindingRecall,
      findingPrecision: grader.findingPrecision,
      categoryAccuracy: grader.categoryAccuracy,
      severityAccuracy: grader.severityAccuracy,
      criticalUnderclassificationCount: grader.criticalUnderclassificationCount,
      auditCitationPrecision: grader.auditCitationPrecision,
      ruleReferenceAccuracy: grader.ruleReferenceAccuracy,
      hallucinatedFindingRate: grader.hallucinatedFindingRate,
      correctiveActionCompleteness: grader.correctiveActionCompleteness,
      schemaValidity: grader.schemaValidity,
      failureTypesJson: canonicalize(grader.failureTypes),
      detailsJson: canonicalize(grader.details),
      judgeModel: grader.judgeModel,
      createdAt: grader.createdAt,
    });
  });
}

export async function failTestExecution(
  input: {
    executionId: string;
    errorCode: string;
    errorMessage: string;
    latencyMs: number;
    completedAt: string;
  },
  database: EvalDatabase = db,
): Promise<void> {
  const updated = await database
    .update(testExecution)
    .set({
      status: 'FAILED',
      passed: false,
      latencyMs: input.latencyMs,
      errorCode: input.errorCode,
      errorMessage: input.errorMessage,
      completedAt: input.completedAt,
    })
    .where(and(eq(testExecution.id, input.executionId), eq(testExecution.status, 'RUNNING')))
    .returning({ id: testExecution.id });
  if (updated.length === 0) throw new Error(`Test execution ${input.executionId} is not RUNNING`);
}

export async function completeEvaluationRun(
  runId: string,
  completedAt: string,
  database: EvalDatabase = db,
): Promise<void> {
  await database.transaction(async (tx) => {
    const pendingRows = await tx
      .select({ id: testExecution.id })
      .from(testExecution)
      .where(
        and(eq(testExecution.runId, runId), inArray(testExecution.status, ['PENDING', 'RUNNING'])),
      );
    if (pendingRows.length > 0)
      throw new Error(`Evaluation run ${runId} still has non-terminal executions`);
    const updated = await tx
      .update(evaluationRun)
      .set({ status: 'COMPLETED', completedAt, errorCode: null, errorMessage: null })
      .where(and(eq(evaluationRun.id, runId), eq(evaluationRun.status, 'RUNNING')))
      .returning({ id: evaluationRun.id });
    if (updated.length === 0) throw new Error(`Evaluation run ${runId} is not RUNNING`);
  });
}

export async function failEvaluationRun(
  input: { runId: string; errorCode: string; errorMessage: string; completedAt: string },
  database: EvalDatabase = db,
): Promise<void> {
  const updated = await database
    .update(evaluationRun)
    .set({
      status: 'FAILED',
      errorCode: input.errorCode,
      errorMessage: input.errorMessage,
      completedAt: input.completedAt,
    })
    .where(and(eq(evaluationRun.id, input.runId), eq(evaluationRun.status, 'RUNNING')))
    .returning({ id: evaluationRun.id });
  if (updated.length === 0) throw new Error(`Evaluation run ${input.runId} is not RUNNING`);
}

export async function countRunningEvaluationRuns(database: EvalDatabase = db) {
  const result = await database
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(evaluationRun)
    .where(eq(evaluationRun.status, 'RUNNING'));
  return result[0]?.count ?? 0;
}

export interface FrozenSuiteSummary {
  id: string;
  name: string;
  version: number;
  description: string | null;
  contentHash: string;
  frozenAt: string | null;
}

export async function listFrozenSuites(database: EvalDatabase = db): Promise<FrozenSuiteSummary[]> {
  const rows = await database
    .select()
    .from(evalSuite)
    .where(eq(evalSuite.status, 'FROZEN'))
    .orderBy(asc(evalSuite.createdAt));
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    version: row.version,
    description: row.description,
    contentHash: row.contentHash,
    frozenAt: row.frozenAt,
  }));
}
