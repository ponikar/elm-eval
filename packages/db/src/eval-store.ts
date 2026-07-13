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
import { and, asc, eq, inArray } from 'drizzle-orm';
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
    failureTypes: JSON.parse(row.failureTypesJson),
    details: JSON.parse(row.detailsJson),
    judgeModel: row.judgeModel ?? undefined,
    createdAt: row.createdAt,
  });
}

export function freezeEvalSuite(
  input: FreezeEvalSuiteInput,
  database: EvalDatabase = db,
): EvalSuiteSnapshot {
  if (input.caseIds.length === 0) throw new Error('An evaluation suite requires at least one case');
  if (new Set(input.caseIds).size !== input.caseIds.length)
    throw new Error('An evaluation suite cannot contain duplicate cases');

  return database.transaction((tx) => {
    const rows = tx.select().from(evalCase).where(inArray(evalCase.id, input.caseIds)).all();
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
    const existing = tx
      .select()
      .from(evalSuite)
      .where(and(eq(evalSuite.name, input.name), eq(evalSuite.version, input.version)))
      .get();
    if (existing) {
      if (existing.contentHash !== hash)
        throw new Error(`Evaluation suite ${input.name} v${input.version} is already frozen`);
      return loadSuiteSnapshot(existing.id, tx);
    }

    tx.insert(evalSuite)
      .values({
        id: input.id,
        name: input.name,
        version: input.version,
        description: input.description,
        status: 'FROZEN',
        contentHash: hash,
        createdAt: input.frozenAt,
        frozenAt: input.frozenAt,
      })
      .run();
    tx.insert(evalSuiteCase)
      .values(
        cases.map((item, ordinal) => ({
          suiteId: input.id,
          evalCaseId: item.id,
          ordinal,
          caseContentHash: createHash('sha256').update(canonicalize(item)).digest('hex'),
          caseSnapshotJson: canonicalize(item),
          addedAt: input.frozenAt,
        })),
      )
      .run();
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

export function loadSuiteSnapshot(suiteId: string, database: EvalReader = db): EvalSuiteSnapshot {
  const suite = database.select().from(evalSuite).where(eq(evalSuite.id, suiteId)).get();
  if (suite?.status !== 'FROZEN' || !suite.frozenAt)
    throw new Error(`Frozen evaluation suite ${suiteId} does not exist`);
  const memberships = database
    .select()
    .from(evalSuiteCase)
    .where(eq(evalSuiteCase.suiteId, suiteId))
    .orderBy(asc(evalSuiteCase.ordinal))
    .all();
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

export function createEvaluationRun(
  input: CreateEvaluationRunInput,
  database: EvalDatabase = db,
): EvaluationRunPlan {
  return database.transaction((tx) => {
    const existing = tx
      .select()
      .from(evaluationRun)
      .where(eq(evaluationRun.idempotencyKey, input.idempotencyKey))
      .get();
    if (existing) {
      if (existing.suiteId !== input.suiteId || existing.agentVersionId !== input.agentVersionId)
        throw new Error('Evaluation run idempotency key was reused with different inputs');
      return getEvaluationRunPlan(existing.id, tx);
    }

    const suite = loadSuiteSnapshot(input.suiteId, tx);
    const agentRow = tx
      .select()
      .from(agentVersion)
      .where(eq(agentVersion.id, input.agentVersionId))
      .get();
    if (!agentRow) throw new Error(`Agent version ${input.agentVersionId} does not exist`);
    const agent = parseAgentVersion(agentRow);
    const rulebookIds = new Set(suite.cases.map((item) => item.input.rulebookVersionId));
    if (rulebookIds.size !== 1 || !rulebookIds.has(agent.rulebookVersionId))
      throw new Error('Agent version and frozen suite must use the same rulebook version');

    tx.insert(evaluationRun)
      .values({
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
      })
      .run();
    const createExecutionId = input.createExecutionId ?? (() => randomUUID());
    tx.insert(testExecution)
      .values(
        suite.cases.map((item) => ({
          id: createExecutionId(item.id),
          runId: input.id,
          evalCaseId: item.id,
          status: 'PENDING',
          createdAt: input.createdAt,
        })),
      )
      .run();
    return getEvaluationRunPlan(input.id, tx);
  });
}

export function getEvaluationRunPlan(runId: string, database: EvalReader = db): EvaluationRunPlan {
  const row = database.select().from(evaluationRun).where(eq(evaluationRun.id, runId)).get();
  if (!row) throw new Error(`Evaluation run ${runId} does not exist`);
  const run = parseRun(row);
  const executions = database
    .select()
    .from(testExecution)
    .where(eq(testExecution.runId, runId))
    .all();
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

export function getTestExecutions(runId: string, database: EvalDatabase = db): TestExecution[] {
  return database
    .select()
    .from(testExecution)
    .where(eq(testExecution.runId, runId))
    .all()
    .map(parseExecution);
}

export function listEvaluationRuns(database: EvalDatabase = db): EvaluationRun[] {
  return database
    .select()
    .from(evaluationRun)
    .orderBy(asc(evaluationRun.createdAt))
    .all()
    .map(parseRun);
}

export function getEvaluationRunDetails(
  runId: string,
  database: EvalDatabase = db,
): EvaluationRunDetails {
  const plan = getEvaluationRunPlan(runId, database);
  const executions = getTestExecutions(runId, database);
  const executionIds = executions.map((item) => item.id);
  const graders =
    executionIds.length === 0
      ? []
      : database
          .select()
          .from(graderResult)
          .where(inArray(graderResult.executionId, executionIds))
          .all()
          .map(parseGrader);
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

export function claimEvaluationRun(
  runId: string,
  startedAt: string,
  database: EvalDatabase = db,
): boolean {
  return (
    database
      .update(evaluationRun)
      .set({ status: 'RUNNING', startedAt, errorCode: null, errorMessage: null })
      .where(and(eq(evaluationRun.id, runId), eq(evaluationRun.status, 'PENDING')))
      .returning({ id: evaluationRun.id })
      .get() !== undefined
  );
}

export function claimTestExecution(
  executionId: string,
  startedAt: string,
  database: EvalDatabase = db,
): boolean {
  return (
    database
      .update(testExecution)
      .set({ status: 'RUNNING', startedAt, errorCode: null, errorMessage: null })
      .where(and(eq(testExecution.id, executionId), eq(testExecution.status, 'PENDING')))
      .returning({ id: testExecution.id })
      .get() !== undefined
  );
}

export function appendEvaluationTrace(
  input: TraceEvent & { executionId: string },
  database: EvalDatabase = db,
): void {
  const trace = TraceEventSchema.parse(input);
  database
    .insert(traceEvent)
    .values({
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
    })
    .run();
}

export function completeTestExecution(
  input: CompleteExecutionInput,
  database: EvalDatabase = db,
): void {
  const output = EvaluationAgentOutputSchema.parse(input.output);
  const grader = GraderResultSchema.parse(input.grader);
  if (grader.executionId !== input.executionId)
    throw new Error('Grader result belongs to a different test execution');
  database.transaction((tx) => {
    const updated = tx
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
      .returning({ id: testExecution.id })
      .get();
    if (!updated) throw new Error(`Test execution ${input.executionId} is not RUNNING`);
    tx.insert(graderResult)
      .values({
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
      })
      .run();
  });
}

export function failTestExecution(
  input: {
    executionId: string;
    errorCode: string;
    errorMessage: string;
    latencyMs: number;
    completedAt: string;
  },
  database: EvalDatabase = db,
): void {
  const updated = database
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
    .returning({ id: testExecution.id })
    .get();
  if (!updated) throw new Error(`Test execution ${input.executionId} is not RUNNING`);
}

export function completeEvaluationRun(
  runId: string,
  completedAt: string,
  database: EvalDatabase = db,
): void {
  database.transaction((tx) => {
    const pending = tx
      .select({ id: testExecution.id })
      .from(testExecution)
      .where(
        and(eq(testExecution.runId, runId), inArray(testExecution.status, ['PENDING', 'RUNNING'])),
      )
      .get();
    if (pending) throw new Error(`Evaluation run ${runId} still has non-terminal executions`);
    const updated = tx
      .update(evaluationRun)
      .set({ status: 'COMPLETED', completedAt, errorCode: null, errorMessage: null })
      .where(and(eq(evaluationRun.id, runId), eq(evaluationRun.status, 'RUNNING')))
      .returning({ id: evaluationRun.id })
      .get();
    if (!updated) throw new Error(`Evaluation run ${runId} is not RUNNING`);
  });
}

export function failEvaluationRun(
  input: { runId: string; errorCode: string; errorMessage: string; completedAt: string },
  database: EvalDatabase = db,
): void {
  const updated = database
    .update(evaluationRun)
    .set({
      status: 'FAILED',
      errorCode: input.errorCode,
      errorMessage: input.errorMessage,
      completedAt: input.completedAt,
    })
    .where(and(eq(evaluationRun.id, input.runId), eq(evaluationRun.status, 'RUNNING')))
    .returning({ id: evaluationRun.id })
    .get();
  if (!updated) throw new Error(`Evaluation run ${input.runId} is not RUNNING`);
}
