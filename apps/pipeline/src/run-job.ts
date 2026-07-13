import { AuditAgentPipeline, GeminiModelProvider, type PipelineTrace } from '@repo/agent';
import {
  appendPipelineTrace,
  claimPipelineJob,
  completePipelineJob,
  db,
  failPipelineJob,
} from '@repo/db';
import {
  agentVersion,
  auditPage,
  complianceRule,
  pipelineJob,
  rulebook,
  ruleChunk,
  supplierAudit,
} from '@repo/db/schema';
import {
  AgentVersionSchema,
  ComplianceRuleSchema,
  type PipelineFailureCode,
  RuleChunkSchema,
  SupplierAuditSchema,
} from '@repo/domain';
import { RuleSearcher } from '@repo/retrieval';
import { eq } from 'drizzle-orm';

export async function runPipelineJob(jobId: string) {
  if (!(await claimPipelineJob(jobId, new Date().toISOString())))
    throw new Error(`Pipeline job ${jobId} is missing, terminal, or already claimed`);
  try {
    const input = await load(jobId);
    const searcher = new RuleSearcher();
    const agent = new AuditAgentPipeline({
      provider: new GeminiModelProvider(),
      retriever: { search: (q, c, k) => searcher.search(q, c, k) },
      traceSink: { record: (t) => persist(jobId, t) },
    });
    const result = await agent.run(input);
    await completePipelineJob(
      jobId,
      input.agentVersion.id,
      result.findings,
      new Date().toISOString(),
    );
    console.log(
      JSON.stringify({
        jobId,
        status: 'COMPLETED',
        findings: result.findings.length,
        rejected: result.rejectedFindings.length,
        usage: result.usage,
      }),
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown pipeline failure';
    await failPipelineJob(jobId, code(error), message, new Date().toISOString());
    throw error;
  }
}

async function load(id: string) {
  const jobRows = await db.select().from(pipelineJob).where(eq(pipelineJob.id, id));
  const job = jobRows[0];
  if (!job) throw new Error(`Pipeline job ${id} not found after claim`);
  const aRows = await db.select().from(supplierAudit).where(eq(supplierAudit.id, job.auditId));
  const a = aRows[0];
  const vRows = await db.select().from(agentVersion).where(eq(agentVersion.id, job.agentVersionId));
  const v = vRows[0];
  if (!a || !v) throw new Error('Pipeline job references missing audit or agent version');
  const rbRows = await db.select().from(rulebook).where(eq(rulebook.id, v.rulebookVersionId));
  const rb = rbRows[0];
  if (!rb || rb.version !== job.rulebookVersion)
    throw new Error('Pipeline job rulebook snapshot does not match the agent version');
  const pages = await db.select().from(auditPage).where(eq(auditPage.auditId, a.id));
  const rules = await db.select().from(complianceRule).where(eq(complianceRule.rulebookId, rb.id));
  const chunks = await db.select().from(ruleChunk).where(eq(ruleChunk.rulebookId, rb.id));
  return {
    audit: SupplierAuditSchema.parse({
      ...a,
      pages: pages.map((p) => ({ pageNumber: p.pageNumber, text: p.normalizedText ?? p.text })),
    }),
    agentVersion: AgentVersionSchema.parse(v),
    rulebook: { id: rb.id, version: rb.version },
    rules: rules.map((r) =>
      ComplianceRuleSchema.parse({
        ...r,
        severityGuidance: json(r.severityGuidance),
        correctiveActionGuidance: json(r.correctiveActionGuidance),
      }),
    ),
    ruleChunks: chunks.map((c) =>
      RuleChunkSchema.parse({
        ...c,
        metadata: { sectionId: c.sectionId, sectionTitle: c.sectionTitle, category: c.category },
        embedding: json(c.embedding),
      }),
    ),
  };
}

function json(v: unknown): unknown {
  if (v === null || v === undefined) return undefined;
  if (typeof v === 'string') return JSON.parse(v);
  return v;
}

async function persist(jobId: string, t: PipelineTrace) {
  const now = new Date().toISOString();
  await appendPipelineTrace({
    id: crypto.randomUUID(),
    pipelineJobId: jobId,
    stage: t.stage,
    eventType: t.eventType,
    sequence: t.sequence,
    attempt: t.attempt,
    startedAt: now,
    completedAt: now,
    durationMs: t.durationMs,
    inputSummary: t.inputSummary,
    outputSummary: t.outputSummary,
    errorCode: t.errorCode,
    tokenUsage: t.tokenUsage,
    costUsd: t.costUsd,
  });
}

function code(e: unknown): PipelineFailureCode {
  if (e instanceof Error && e.name === 'ZodError') return 'SCHEMA_ERROR';
  if (e instanceof Error && e.message.toLowerCase().includes('timeout')) return 'MODEL_TIMEOUT';
  return 'PIPELINE_ERROR';
}
