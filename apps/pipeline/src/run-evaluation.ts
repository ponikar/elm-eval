import { AuditAgentPipeline, GeminiModelProvider, ModelProviderError } from '@repo/agent';
import { db } from '@repo/db';
import {
  appendEvaluationTrace,
  claimEvaluationRun,
  claimTestExecution,
  completeEvaluationRun,
  completeTestExecution,
  failEvaluationRun,
  failTestExecution,
  getEvaluationRunPlan,
} from '@repo/db/eval-store';
import { complianceRule, rulebook, ruleChunk } from '@repo/db/schema';
import { ComplianceRuleSchema, RuleChunkSchema, SupplierAuditSchema } from '@repo/domain';
import {
  CaseExecutionError,
  type CaseTrace,
  type EvaluationRepository,
  runEvaluation,
} from '@repo/evals';
import { RuleSearcher } from '@repo/retrieval';
import { eq } from 'drizzle-orm';

function json(value: string | null): unknown {
  return value === null ? undefined : JSON.parse(value);
}

function failureCode(error: unknown): string {
  if (error instanceof ModelProviderError && error.code === 'TIMEOUT') return 'MODEL_TIMEOUT';
  if (error instanceof Error && error.name === 'ZodError') return 'SCHEMA_ERROR';
  return 'PIPELINE_ERROR';
}

function createRepository(): EvaluationRepository {
  return {
    getRunPlan: (runId) => getEvaluationRunPlan(runId),
    claimRun: (runId, startedAt) => claimEvaluationRun(runId, startedAt),
    claimExecution: (executionId, startedAt) => claimTestExecution(executionId, startedAt),
    appendTrace: (trace) => appendEvaluationTrace(trace),
    completeExecution: (input) => completeTestExecution(input),
    failExecution: (input) => failTestExecution(input),
    completeRun: (runId, completedAt) => completeEvaluationRun(runId, completedAt),
    failRun: (input) => failEvaluationRun(input),
  };
}

function loadRulebookResources(rulebookId: string) {
  const rulebookRow = db.select().from(rulebook).where(eq(rulebook.id, rulebookId)).get();
  if (!rulebookRow) throw new Error(`Rulebook ${rulebookId} does not exist`);
  if (rulebookRow.indexStatus !== 'INDEXED')
    throw new Error(`Rulebook ${rulebookId} is not indexed`);
  const rules = db
    .select()
    .from(complianceRule)
    .where(eq(complianceRule.rulebookId, rulebookId))
    .all()
    .map((row) =>
      ComplianceRuleSchema.parse({
        ...row,
        severityGuidance: json(row.severityGuidance),
        correctiveActionGuidance: json(row.correctiveActionGuidance),
      }),
    );
  const chunks = db
    .select()
    .from(ruleChunk)
    .where(eq(ruleChunk.rulebookId, rulebookId))
    .all()
    .map((row) =>
      RuleChunkSchema.parse({
        ...row,
        metadata: {
          sectionId: row.sectionId,
          sectionTitle: row.sectionTitle,
          category: row.category,
        },
        embedding: json(row.embedding),
      }),
    );
  if (rules.length === 0 || chunks.length === 0 || chunks.some((chunk) => !chunk.embedding?.length))
    throw new Error(
      `Rulebook ${rulebookId} has no complete retrieval index; run the index-rulebook command first`,
    );
  return { rulebook: rulebookRow, rules, chunks };
}

export async function runEvaluationJob(runId: string) {
  const plan = getEvaluationRunPlan(runId);
  const resources = loadRulebookResources(plan.run.rulebookVersionId);
  const searcher = new RuleSearcher();
  const result = await runEvaluation(runId, {
    repository: createRepository(),
    clock: { now: () => new Date() },
    ids: {
      graderResult: () => crypto.randomUUID(),
      trace: () => crypto.randomUUID(),
    },
    executor: {
      execute: async ({ run, evalCase, executionId }) => {
        const startedAt = Date.now();
        const traces: CaseTrace[] = [];
        const pipeline = new AuditAgentPipeline({
          provider: new GeminiModelProvider(),
          retriever: { search: (query, chunks, topK) => searcher.search(query, chunks, topK) },
          traceSink: {
            record: (trace) => {
              const timestamp = new Date().toISOString();
              traces.push({
                stage: trace.stage,
                eventType: trace.eventType,
                sequence: trace.sequence,
                attempt: trace.attempt,
                startedAt: timestamp,
                completedAt: timestamp,
                durationMs: trace.durationMs,
                inputSummary: trace.inputSummary,
                outputSummary: trace.outputSummary,
                errorCode: trace.errorCode,
                tokenUsage: trace.tokenUsage,
                costUsd: trace.costUsd,
              });
            },
          },
        });
        const audit = SupplierAuditSchema.parse({
          id: `evaluation:${executionId}`,
          supplierName: 'Frozen evaluation input',
          factoryName: evalCase.name,
          auditStandard: resources.rulebook.standard,
          auditDate: run.createdAt.slice(0, 10),
          documentName: evalCase.name,
          pages: evalCase.input.auditPages,
        });
        try {
          const pipelineResult = await pipeline.run({
            audit,
            agentVersion: run.agentVersionSnapshot,
            rulebook: { id: resources.rulebook.id, version: resources.rulebook.version },
            rules: resources.rules,
            ruleChunks: resources.chunks,
          });
          return {
            output: {
              findings: pipelineResult.findings,
              rejectedFindings: pipelineResult.rejectedFindings,
            },
            usage: {
              agentCostUsd: pipelineResult.usage.costUsd,
              evaluatorCostUsd: 0,
              tokenInput: pipelineResult.usage.inputTokens,
              tokenOutput: pipelineResult.usage.outputTokens,
              latencyMs: pipelineResult.usage.latencyMs,
            },
            traces,
          };
        } catch (error) {
          throw new CaseExecutionError(
            failureCode(error),
            error instanceof Error ? error.message : 'Unknown evaluation pipeline failure',
            { latencyMs: Date.now() - startedAt, traces, cause: error },
          );
        }
      },
    },
  });
  console.log(JSON.stringify(result));
  return result;
}
