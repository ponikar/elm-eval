import { randomUUID } from 'node:crypto';
import type { FailureType, FrozenEvalCase, GraderMetricCounts, GraderResult } from '@repo/domain';
import { and, desc, eq, inArray } from 'drizzle-orm';
import {
  type EvaluationRunDetails,
  getEvaluationRunDetails,
  listEvaluationRuns,
  listRunSummaries,
  type RunSummary,
} from './eval-store.js';
import { db } from './index.js';
import { caseComparison, qualityGate, qualityGateEvaluation, runComparison } from './schema.js';

type ComparisonDatabase = typeof db;
type CaseClassification = 'STABLE_PASS' | 'IMPROVEMENT' | 'REGRESSION' | 'STABLE_FAILURE';

const DEFAULT_QUALITY_GATE = {
  id: 'quality-gate-default-v1',
  name: 'Default release gate',
  version: 1,
  status: 'ACTIVE',
  minimumCriticalFindingRecall: 0.95,
  minimumFindingPrecision: 0.9,
  minimumCitationPrecision: 0.98,
  minimumRuleReferenceAccuracy: 0.98,
  minimumSchemaValidity: 1.0,
  maximumCriticalRegressions: 0,
  maximumHallucinatedFindingRate: 0.02,
  minimumCapCompleteness: 0.95,
};

function evaluatePersistedQualityGate(metrics: Record<string, number>) {
  const failures: string[] = [];
  const get = (key: string): number => metrics[key] ?? 0;

  if (get('criticalFindingRecall') < DEFAULT_QUALITY_GATE.minimumCriticalFindingRecall) {
    failures.push(
      `Critical finding recall ${get('criticalFindingRecall').toFixed(2)} below ${DEFAULT_QUALITY_GATE.minimumCriticalFindingRecall}`,
    );
  }

  if (get('findingPrecision') < DEFAULT_QUALITY_GATE.minimumFindingPrecision) {
    failures.push(
      `Finding precision ${get('findingPrecision').toFixed(2)} below ${DEFAULT_QUALITY_GATE.minimumFindingPrecision}`,
    );
  }

  if (get('auditCitationPrecision') < DEFAULT_QUALITY_GATE.minimumCitationPrecision) {
    failures.push(
      `Audit citation precision ${get('auditCitationPrecision').toFixed(2)} below ${DEFAULT_QUALITY_GATE.minimumCitationPrecision}`,
    );
  }

  if (get('ruleReferenceAccuracy') < DEFAULT_QUALITY_GATE.minimumRuleReferenceAccuracy) {
    failures.push(
      `Rule reference accuracy ${get('ruleReferenceAccuracy').toFixed(2)} below ${DEFAULT_QUALITY_GATE.minimumRuleReferenceAccuracy}`,
    );
  }

  if (get('schemaValidity') < DEFAULT_QUALITY_GATE.minimumSchemaValidity) {
    failures.push(
      `Schema validity ${get('schemaValidity').toFixed(2)} below ${DEFAULT_QUALITY_GATE.minimumSchemaValidity}`,
    );
  }

  if (get('criticalRegressions') > DEFAULT_QUALITY_GATE.maximumCriticalRegressions) {
    failures.push(
      `${get('criticalRegressions')} critical regressions exceed maximum of ${DEFAULT_QUALITY_GATE.maximumCriticalRegressions}`,
    );
  }

  if (get('hallucinatedFindingRate') > DEFAULT_QUALITY_GATE.maximumHallucinatedFindingRate) {
    failures.push(
      `Hallucinated finding rate ${get('hallucinatedFindingRate').toFixed(3)} exceeds ${DEFAULT_QUALITY_GATE.maximumHallucinatedFindingRate}`,
    );
  }

  if (get('capCompleteness') < DEFAULT_QUALITY_GATE.minimumCapCompleteness) {
    failures.push(
      `CAP completeness ${get('capCompleteness').toFixed(2)} below ${DEFAULT_QUALITY_GATE.minimumCapCompleteness}`,
    );
  }

  return {
    passed: failures.length === 0,
    reasons: failures,
  };
}

export interface ComparisonMetricDelta {
  baseline: number;
  candidate: number;
  delta: number;
}

export interface CaseComparisonDetails {
  id: string;
  evalCase: FrozenEvalCase;
  classification: CaseClassification;
  isCritical: boolean;
  baselineExecution: EvaluationRunDetails['cases'][number]['execution'];
  candidateExecution: EvaluationRunDetails['cases'][number]['execution'];
  baselineGrader?: GraderResult;
  candidateGrader?: GraderResult;
  metricDelta: Record<string, ComparisonMetricDelta>;
  failureTypes: FailureType[];
}

export interface QualityGateDecision {
  id: string;
  qualityGateId: string;
  decision: 'APPROVED' | 'BLOCKED';
  reasons: string[];
  evaluatedAt: string;
  metrics: Record<string, number>;
  thresholds: typeof DEFAULT_QUALITY_GATE;
}

export interface RunComparisonDetails {
  id: string;
  baselineRun: EvaluationRunDetails['run'];
  candidateRun: EvaluationRunDetails['run'];
  status: string;
  createdAt: string;
  completedAt?: string;
  summary: {
    stablePassCount: number;
    improvementCount: number;
    regressionCount: number;
    stableFailureCount: number;
    criticalRegressionCount: number;
  };
  metrics: Record<string, ComparisonMetricDelta>;
  costDeltaUsd: number;
  latencyDeltaMs: number;
  qualityGate: QualityGateDecision;
  cases: CaseComparisonDetails[];
}

export interface ComparisonListItem {
  id: string;
  baselineRunId: string;
  candidateRunId: string;
  createdAt: string;
  completedAt?: string;
  summary: RunComparisonDetails['summary'];
  qualityGateDecision: 'APPROVED' | 'BLOCKED';
  baselineAgentName: string;
  candidateAgentName: string;
  suiteName: string;
}

export interface ComparableRunSummary extends RunSummary {}

function ratio(numerator: number, denominator: number, zeroValue = 0): number {
  if (denominator === 0) return zeroValue;
  return numerator / denominator;
}

function roundMetric(value: number): number {
  return Number(value.toFixed(6));
}

function zeroCounts(): GraderMetricCounts {
  return {
    expectedFindingCount: 0,
    expectedCriticalFindingCount: 0,
    actualFindingCount: 0,
    matchedFindingCount: 0,
    matchedCriticalFindingCount: 0,
    correctCategoryCount: 0,
    correctSeverityCount: 0,
    criticalUnderclassificationCount: 0,
    supportedCitationCount: 0,
    correctRuleReferenceCount: 0,
    completeCorrectiveActionCount: 0,
    hallucinatedFindingCount: 0,
    schemaValidOutputCount: 0,
    outputCount: 0,
  };
}

function sumCounts(items: GraderMetricCounts[]): GraderMetricCounts {
  return items.reduce<GraderMetricCounts>((acc, item) => {
    for (const key of Object.keys(acc) as Array<keyof GraderMetricCounts>) {
      acc[key] += item[key];
    }
    return acc;
  }, zeroCounts());
}

function metricsFromCounts(
  counts: GraderMetricCounts,
  executions: EvaluationRunDetails['cases'],
): Record<string, number> {
  const averageExecutionCostUsd =
    executions.length === 0
      ? 0
      : executions.reduce(
          (sum, item) =>
            sum + (item.execution.agentCostUsd ?? 0) + (item.execution.evaluatorCostUsd ?? 0),
          0,
        ) / executions.length;

  const sortedLatency = executions
    .map((item) => item.execution.latencyMs ?? 0)
    .sort((left, right) => left - right);
  const p95PipelineLatencyMs =
    sortedLatency.length === 0
      ? 0
      : (sortedLatency[
          Math.min(sortedLatency.length - 1, Math.floor(sortedLatency.length * 0.95))
        ] ?? 0);

  return {
    findingRecall: roundMetric(
      ratio(
        counts.matchedFindingCount,
        counts.expectedFindingCount,
        counts.expectedFindingCount === 0 ? 1 : 0,
      ),
    ),
    criticalFindingRecall: roundMetric(
      ratio(
        counts.matchedCriticalFindingCount,
        counts.expectedCriticalFindingCount,
        counts.expectedCriticalFindingCount === 0 ? 1 : 0,
      ),
    ),
    findingPrecision: roundMetric(
      ratio(
        counts.matchedFindingCount,
        counts.actualFindingCount,
        counts.actualFindingCount === 0 ? 1 : 0,
      ),
    ),
    categoryAccuracy: roundMetric(
      ratio(
        counts.correctCategoryCount,
        counts.matchedFindingCount,
        counts.matchedFindingCount === 0 ? 1 : 0,
      ),
    ),
    severityAccuracy: roundMetric(
      ratio(
        counts.correctSeverityCount,
        counts.matchedFindingCount,
        counts.matchedFindingCount === 0 ? 1 : 0,
      ),
    ),
    criticalUnderclassificationCount: counts.criticalUnderclassificationCount,
    auditCitationPrecision: roundMetric(
      ratio(
        counts.supportedCitationCount,
        counts.matchedFindingCount,
        counts.matchedFindingCount === 0 ? 1 : 0,
      ),
    ),
    ruleReferenceAccuracy: roundMetric(
      ratio(
        counts.correctRuleReferenceCount,
        counts.matchedFindingCount,
        counts.matchedFindingCount === 0 ? 1 : 0,
      ),
    ),
    hallucinatedFindingRate: roundMetric(
      ratio(counts.hallucinatedFindingCount, counts.actualFindingCount, 0),
    ),
    capCompleteness: roundMetric(
      ratio(
        counts.completeCorrectiveActionCount,
        counts.matchedFindingCount,
        counts.matchedFindingCount === 0 ? 1 : 0,
      ),
    ),
    schemaValidity: roundMetric(ratio(counts.schemaValidOutputCount, counts.outputCount, 0)),
    averageExecutionCostUsd: roundMetric(averageExecutionCostUsd),
    p95PipelineLatencyMs,
  };
}

function metricDelta(baseline: number, candidate: number): ComparisonMetricDelta {
  return {
    baseline: roundMetric(baseline),
    candidate: roundMetric(candidate),
    delta: roundMetric(candidate - baseline),
  };
}

function classificationForCase(
  baseline: EvaluationRunDetails['cases'][number],
  candidate: EvaluationRunDetails['cases'][number],
): CaseClassification {
  const baselinePassed = baseline.execution.passed === true;
  const candidatePassed = candidate.execution.passed === true;
  if (baselinePassed && candidatePassed) return 'STABLE_PASS';
  if (!baselinePassed && candidatePassed) return 'IMPROVEMENT';
  if (baselinePassed && !candidatePassed) return 'REGRESSION';
  return 'STABLE_FAILURE';
}

function failureTypesForCase(candidate: EvaluationRunDetails['cases'][number]): FailureType[] {
  if (candidate.grader?.failureTypes.length) return candidate.grader.failureTypes;
  if (candidate.execution.status === 'FAILED') return ['PIPELINE_ERROR'];
  return [];
}

function perCaseMetricDelta(
  baseline: EvaluationRunDetails['cases'][number],
  candidate: EvaluationRunDetails['cases'][number],
): Record<string, ComparisonMetricDelta> {
  const baselineMetrics = baseline.grader
    ? {
        findingRecall: baseline.grader.findingRecall ?? 0,
        criticalFindingRecall: baseline.grader.criticalFindingRecall ?? 0,
        findingPrecision: baseline.grader.findingPrecision ?? 0,
        auditCitationPrecision: baseline.grader.auditCitationPrecision ?? 0,
        ruleReferenceAccuracy: baseline.grader.ruleReferenceAccuracy ?? 0,
        correctiveActionCompleteness: baseline.grader.correctiveActionCompleteness ?? 0,
        schemaValidity: baseline.grader.schemaValidity ?? 0,
      }
    : {
        findingRecall: 0,
        criticalFindingRecall: 0,
        findingPrecision: 0,
        auditCitationPrecision: 0,
        ruleReferenceAccuracy: 0,
        correctiveActionCompleteness: 0,
        schemaValidity: 0,
      };
  const candidateMetrics = candidate.grader
    ? {
        findingRecall: candidate.grader.findingRecall ?? 0,
        criticalFindingRecall: candidate.grader.criticalFindingRecall ?? 0,
        findingPrecision: candidate.grader.findingPrecision ?? 0,
        auditCitationPrecision: candidate.grader.auditCitationPrecision ?? 0,
        ruleReferenceAccuracy: candidate.grader.ruleReferenceAccuracy ?? 0,
        correctiveActionCompleteness: candidate.grader.correctiveActionCompleteness ?? 0,
        schemaValidity: candidate.grader.schemaValidity ?? 0,
      }
    : {
        findingRecall: 0,
        criticalFindingRecall: 0,
        findingPrecision: 0,
        auditCitationPrecision: 0,
        ruleReferenceAccuracy: 0,
        correctiveActionCompleteness: 0,
        schemaValidity: 0,
      };

  return {
    findingRecall: metricDelta(baselineMetrics.findingRecall, candidateMetrics.findingRecall),
    criticalFindingRecall: metricDelta(
      baselineMetrics.criticalFindingRecall,
      candidateMetrics.criticalFindingRecall,
    ),
    findingPrecision: metricDelta(
      baselineMetrics.findingPrecision,
      candidateMetrics.findingPrecision,
    ),
    auditCitationPrecision: metricDelta(
      baselineMetrics.auditCitationPrecision,
      candidateMetrics.auditCitationPrecision,
    ),
    ruleReferenceAccuracy: metricDelta(
      baselineMetrics.ruleReferenceAccuracy,
      candidateMetrics.ruleReferenceAccuracy,
    ),
    correctiveActionCompleteness: metricDelta(
      baselineMetrics.correctiveActionCompleteness,
      candidateMetrics.correctiveActionCompleteness,
    ),
    schemaValidity: metricDelta(baselineMetrics.schemaValidity, candidateMetrics.schemaValidity),
    executionCostUsd: metricDelta(
      (baseline.execution.agentCostUsd ?? 0) + (baseline.execution.evaluatorCostUsd ?? 0),
      (candidate.execution.agentCostUsd ?? 0) + (candidate.execution.evaluatorCostUsd ?? 0),
    ),
    latencyMs: metricDelta(baseline.execution.latencyMs ?? 0, candidate.execution.latencyMs ?? 0),
  };
}

function ensureComparableRuns(
  baseline: EvaluationRunDetails,
  candidate: EvaluationRunDetails,
): void {
  if (baseline.run.id === candidate.run.id) {
    throw new Error('Baseline and candidate runs must be different');
  }
  if (baseline.run.status !== 'COMPLETED' || candidate.run.status !== 'COMPLETED') {
    throw new Error('Only completed runs can be compared');
  }
  if (baseline.run.suiteId !== candidate.run.suiteId) {
    throw new Error('Baseline and candidate runs must use the same frozen suite');
  }
  if (baseline.run.suiteContentHash !== candidate.run.suiteContentHash) {
    throw new Error('Baseline and candidate runs must use the same frozen suite snapshot');
  }
}

async function ensureDefaultQualityGate(database: ComparisonDatabase = db) {
  await database
    .insert(qualityGate)
    .values({
      id: DEFAULT_QUALITY_GATE.id,
      name: DEFAULT_QUALITY_GATE.name,
      version: DEFAULT_QUALITY_GATE.version,
      status: DEFAULT_QUALITY_GATE.status,
      minimumCriticalFindingRecall: DEFAULT_QUALITY_GATE.minimumCriticalFindingRecall,
      minimumFindingPrecision: DEFAULT_QUALITY_GATE.minimumFindingPrecision,
      minimumAuditCitationPrecision: DEFAULT_QUALITY_GATE.minimumCitationPrecision,
      minimumRuleReferenceAccuracy: DEFAULT_QUALITY_GATE.minimumRuleReferenceAccuracy,
      minimumSchemaValidity: DEFAULT_QUALITY_GATE.minimumSchemaValidity,
      minimumCapCompleteness: DEFAULT_QUALITY_GATE.minimumCapCompleteness,
      maximumCriticalRegressions: DEFAULT_QUALITY_GATE.maximumCriticalRegressions,
      maximumHallucinatedFindingRate: DEFAULT_QUALITY_GATE.maximumHallucinatedFindingRate,
      createdAt: '2026-07-13T00:00:00.000Z',
      updatedAt: '2026-07-13T00:00:00.000Z',
    })
    .onConflictDoNothing();

  const rows = await database
    .select()
    .from(qualityGate)
    .where(eq(qualityGate.id, DEFAULT_QUALITY_GATE.id));
  const gate = rows[0];
  if (!gate) throw new Error('Default quality gate is missing after upsert');
  return gate;
}

function caseById(run: EvaluationRunDetails) {
  return new Map(run.cases.map((item) => [item.evalCase.id, item]));
}

function buildPersistedComparison(
  baseline: EvaluationRunDetails,
  candidate: EvaluationRunDetails,
): Omit<RunComparisonDetails, 'id' | 'status' | 'createdAt' | 'completedAt' | 'qualityGate'> & {
  metricsSnapshot: Record<string, number>;
} {
  ensureComparableRuns(baseline, candidate);

  const baselineByCaseId = caseById(baseline);
  const candidateByCaseId = caseById(candidate);
  const cases: CaseComparisonDetails[] = [];

  for (const evalCase of baseline.run.suiteSnapshot.cases) {
    const baselineCase = baselineByCaseId.get(evalCase.id);
    const candidateCase = candidateByCaseId.get(evalCase.id);
    if (!baselineCase || !candidateCase) {
      throw new Error(`Comparison runs are missing execution data for eval case ${evalCase.id}`);
    }

    const classification = classificationForCase(baselineCase, candidateCase);
    cases.push({
      id: randomUUID(),
      evalCase,
      classification,
      isCritical: evalCase.criticality === 'CRITICAL',
      baselineExecution: baselineCase.execution,
      candidateExecution: candidateCase.execution,
      baselineGrader: baselineCase.grader,
      candidateGrader: candidateCase.grader,
      metricDelta: perCaseMetricDelta(baselineCase, candidateCase),
      failureTypes: failureTypesForCase(candidateCase),
    });
  }

  const baselineCounts = sumCounts(
    baseline.cases.map((item) => item.grader?.details.counts ?? zeroCounts()),
  );
  const candidateCounts = sumCounts(
    candidate.cases.map((item) => item.grader?.details.counts ?? zeroCounts()),
  );
  const baselineMetrics = metricsFromCounts(baselineCounts, baseline.cases);
  const candidateMetrics = metricsFromCounts(candidateCounts, candidate.cases);
  const metrics = Object.fromEntries(
    Object.keys(candidateMetrics).map((key) => [
      key,
      metricDelta(baselineMetrics[key] ?? 0, candidateMetrics[key] ?? 0),
    ]),
  );

  const summary = {
    stablePassCount: cases.filter((item) => item.classification === 'STABLE_PASS').length,
    improvementCount: cases.filter((item) => item.classification === 'IMPROVEMENT').length,
    regressionCount: cases.filter((item) => item.classification === 'REGRESSION').length,
    stableFailureCount: cases.filter((item) => item.classification === 'STABLE_FAILURE').length,
    criticalRegressionCount: cases.filter(
      (item) => item.classification === 'REGRESSION' && item.isCritical,
    ).length,
  };

  return {
    baselineRun: baseline.run,
    candidateRun: candidate.run,
    summary,
    metrics,
    costDeltaUsd: metrics['averageExecutionCostUsd']?.delta ?? metricDelta(0, 0).delta,
    latencyDeltaMs: Math.round(metrics['p95PipelineLatencyMs']?.delta ?? 0),
    cases,
    metricsSnapshot: {
      ...candidateMetrics,
      criticalRegressions: summary.criticalRegressionCount,
    },
  };
}

function parseStoredJson<T>(value: unknown): T {
  if (typeof value === 'string') return JSON.parse(value) as T;
  return value as T;
}

export async function listComparableRuns(
  database: ComparisonDatabase = db,
): Promise<ComparableRunSummary[]> {
  const runs = await listRunSummaries(database);
  return runs.filter((item) => item.status === 'COMPLETED');
}

export async function createRunComparison(
  input: {
    baselineRunId: string;
    candidateRunId: string;
    createdAt: string;
    comparisonId?: string;
    gateEvaluationId?: string;
  },
  database: ComparisonDatabase = db,
): Promise<RunComparisonDetails> {
  const existingRows = await database
    .select()
    .from(runComparison)
    .where(
      and(
        eq(runComparison.baselineRunId, input.baselineRunId),
        eq(runComparison.candidateRunId, input.candidateRunId),
      ),
    );
  const existing = existingRows[0];
  if (existing) return await getRunComparison(existing.id, database);

  const [baseline, candidate, gate] = await Promise.all([
    getEvaluationRunDetails(input.baselineRunId, database),
    getEvaluationRunDetails(input.candidateRunId, database),
    ensureDefaultQualityGate(database),
  ]);

  const built = buildPersistedComparison(baseline, candidate);
  const gateResult = evaluatePersistedQualityGate(built.metricsSnapshot);
  const decision = gateResult.passed ? 'APPROVED' : 'BLOCKED';
  const comparisonId = input.comparisonId ?? randomUUID();
  const gateEvaluationId = input.gateEvaluationId ?? randomUUID();

  await database.transaction(async (tx) => {
    await tx.insert(runComparison).values({
      id: comparisonId,
      baselineRunId: input.baselineRunId,
      candidateRunId: input.candidateRunId,
      status: 'COMPLETED',
      stablePassCount: built.summary.stablePassCount,
      improvementCount: built.summary.improvementCount,
      regressionCount: built.summary.regressionCount,
      stableFailureCount: built.summary.stableFailureCount,
      criticalRegressionCount: built.summary.criticalRegressionCount,
      metricDeltaJson: built.metrics,
      costDeltaUsd: built.costDeltaUsd,
      latencyDeltaMs: built.latencyDeltaMs,
      errorCode: null,
      errorMessage: null,
      createdAt: input.createdAt,
      completedAt: input.createdAt,
    });

    await tx.insert(caseComparison).values(
      built.cases.map((item) => ({
        id: item.id,
        comparisonId,
        evalCaseId: item.evalCase.id,
        baselineExecutionId: item.baselineExecution.id,
        candidateExecutionId: item.candidateExecution.id,
        classification: item.classification,
        isCritical: item.isCritical,
        metricDeltaJson: item.metricDelta,
      })),
    );

    await tx.insert(qualityGateEvaluation).values({
      id: gateEvaluationId,
      qualityGateId: gate.id,
      comparisonId,
      decision,
      reasonsJson: gateResult.reasons,
      qualityGateSnapshotJson: DEFAULT_QUALITY_GATE,
      metricsSnapshotJson: built.metricsSnapshot,
      evaluatedAt: input.createdAt,
    });
  });

  return {
    id: comparisonId,
    baselineRun: built.baselineRun,
    candidateRun: built.candidateRun,
    status: 'COMPLETED',
    createdAt: input.createdAt,
    completedAt: input.createdAt,
    summary: built.summary,
    metrics: built.metrics,
    costDeltaUsd: built.costDeltaUsd,
    latencyDeltaMs: built.latencyDeltaMs,
    qualityGate: {
      id: gateEvaluationId,
      qualityGateId: gate.id,
      decision,
      reasons: gateResult.reasons,
      evaluatedAt: input.createdAt,
      metrics: built.metricsSnapshot,
      thresholds: DEFAULT_QUALITY_GATE,
    },
    cases: built.cases,
  };
}

export async function getRunComparison(
  comparisonId: string,
  database: ComparisonDatabase = db,
): Promise<RunComparisonDetails> {
  const comparisonRows = await database
    .select()
    .from(runComparison)
    .where(eq(runComparison.id, comparisonId));
  const comparison = comparisonRows[0];
  if (!comparison) throw new Error(`Run comparison ${comparisonId} does not exist`);

  const [baseline, candidate, caseRows, gateRows] = await Promise.all([
    getEvaluationRunDetails(comparison.baselineRunId, database),
    getEvaluationRunDetails(comparison.candidateRunId, database),
    database.select().from(caseComparison).where(eq(caseComparison.comparisonId, comparisonId)),
    database
      .select()
      .from(qualityGateEvaluation)
      .where(eq(qualityGateEvaluation.comparisonId, comparisonId)),
  ]);

  const caseByEvalCaseId = new Map(
    buildPersistedComparison(baseline, candidate).cases.map((item) => [item.evalCase.id, item]),
  );
  const cases = caseRows
    .map((row) => {
      const item = caseByEvalCaseId.get(row.evalCaseId);
      if (!item) return null;
      return {
        ...item,
        id: row.id,
        classification: row.classification as CaseClassification,
        isCritical: row.isCritical,
        metricDelta: parseStoredJson(row.metricDeltaJson ?? {}),
      } satisfies CaseComparisonDetails;
    })
    .filter((item): item is CaseComparisonDetails => Boolean(item));
  const gate = gateRows[0];
  if (!gate) throw new Error(`Run comparison ${comparisonId} is missing a quality gate evaluation`);

  return {
    id: comparison.id,
    baselineRun: baseline.run,
    candidateRun: candidate.run,
    status: comparison.status,
    createdAt: comparison.createdAt,
    completedAt: comparison.completedAt ?? undefined,
    summary: {
      stablePassCount: comparison.stablePassCount,
      improvementCount: comparison.improvementCount,
      regressionCount: comparison.regressionCount,
      stableFailureCount: comparison.stableFailureCount,
      criticalRegressionCount: comparison.criticalRegressionCount,
    },
    metrics: parseStoredJson(comparison.metricDeltaJson ?? {}),
    costDeltaUsd: comparison.costDeltaUsd ?? 0,
    latencyDeltaMs: comparison.latencyDeltaMs ?? 0,
    qualityGate: {
      id: gate.id,
      qualityGateId: gate.qualityGateId,
      decision: gate.decision as 'APPROVED' | 'BLOCKED',
      reasons: parseStoredJson(gate.reasonsJson),
      evaluatedAt: gate.evaluatedAt,
      metrics: parseStoredJson(gate.metricsSnapshotJson),
      thresholds: parseStoredJson(gate.qualityGateSnapshotJson),
    },
    cases,
  };
}

export async function listRunComparisons(
  database: ComparisonDatabase = db,
): Promise<ComparisonListItem[]> {
  const rows = await database.select().from(runComparison).orderBy(desc(runComparison.createdAt));
  if (rows.length === 0) return [];

  const runIds = [...new Set(rows.flatMap((row) => [row.baselineRunId, row.candidateRunId]))];
  const runs = await listEvaluationRuns(database);
  const byRunId = new Map(
    runs.filter((item) => runIds.includes(item.id)).map((item) => [item.id, item]),
  );
  const gateRows = await database
    .select()
    .from(qualityGateEvaluation)
    .where(
      inArray(
        qualityGateEvaluation.comparisonId,
        rows.map((row) => row.id),
      ),
    );
  const gateByComparisonId = new Map(gateRows.map((row) => [row.comparisonId, row]));

  return rows.flatMap((row) => {
    const baseline = byRunId.get(row.baselineRunId);
    const candidate = byRunId.get(row.candidateRunId);
    const gate = gateByComparisonId.get(row.id);
    if (!baseline || !candidate || !gate) return [];

    return [
      {
        id: row.id,
        baselineRunId: row.baselineRunId,
        candidateRunId: row.candidateRunId,
        createdAt: row.createdAt,
        completedAt: row.completedAt ?? undefined,
        summary: {
          stablePassCount: row.stablePassCount,
          improvementCount: row.improvementCount,
          regressionCount: row.regressionCount,
          stableFailureCount: row.stableFailureCount,
          criticalRegressionCount: row.criticalRegressionCount,
        },
        qualityGateDecision: gate.decision as 'APPROVED' | 'BLOCKED',
        baselineAgentName: baseline.agentVersionSnapshot.name,
        candidateAgentName: candidate.agentVersionSnapshot.name,
        suiteName: baseline.suiteSnapshot.name,
      },
    ];
  });
}

export async function getLatestRunComparison(
  database: ComparisonDatabase = db,
): Promise<RunComparisonDetails | null> {
  const rows = await database.select().from(runComparison).orderBy(desc(runComparison.createdAt));
  const latest = rows[0];
  if (!latest) return null;
  return getRunComparison(latest.id, database);
}
