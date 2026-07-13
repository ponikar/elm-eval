import type { AuditFinding, PipelineFailureCode } from '@repo/domain';
import { and, eq } from 'drizzle-orm';
import { db } from './index.js';
import { auditFinding, pipelineJob, traceEvent } from './schema.js';

export interface PersistedPipelineTrace {
  id: string;
  pipelineJobId: string;
  stage: string;
  eventType: string;
  sequence: number;
  attempt?: number;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  inputSummary?: Record<string, unknown>;
  outputSummary?: Record<string, unknown>;
  errorCode?: string;
  tokenUsage?: { input: number; output: number };
  costUsd?: number;
}

export async function enqueuePipelineJob(input: {
  id: string;
  auditId: string;
  agentVersionId: string;
  rulebookVersion: string;
  idempotencyKey: string;
  createdAt: string;
}): Promise<boolean> {
  const rows = await db
    .insert(pipelineJob)
    .values({ ...input, status: 'PENDING', attemptCount: 0 })
    .onConflictDoNothing({ target: pipelineJob.idempotencyKey })
    .returning({ id: pipelineJob.id });
  return rows.length > 0;
}

export async function claimPipelineJob(id: string, startedAt: string): Promise<boolean> {
  const rows = await db
    .update(pipelineJob)
    .set({ status: 'RUNNING', startedAt, attemptCount: 1, errorCode: null, errorMessage: null })
    .where(and(eq(pipelineJob.id, id), eq(pipelineJob.status, 'PENDING')))
    .returning({ id: pipelineJob.id });
  return rows.length > 0;
}

export async function appendPipelineTrace(t: PersistedPipelineTrace): Promise<void> {
  await db.insert(traceEvent).values({
    id: t.id,
    executionId: null,
    pipelineJobId: t.pipelineJobId,
    stage: t.stage,
    eventType: t.eventType,
    sequence: t.sequence,
    attempt: t.attempt,
    startedAt: t.startedAt,
    completedAt: t.completedAt,
    durationMs: t.durationMs,
    inputSummary: t.inputSummary ? JSON.stringify(t.inputSummary) : null,
    outputSummary: t.outputSummary ? JSON.stringify(t.outputSummary) : null,
    errorCode: t.errorCode,
    tokenInput: t.tokenUsage?.input,
    tokenOutput: t.tokenUsage?.output,
    costUsd: t.costUsd,
  });
}

export async function completePipelineJob(
  jobId: string,
  agentVersionId: string,
  findings: AuditFinding[],
  completedAt: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(auditFinding).where(eq(auditFinding.pipelineJobId, jobId));
    if (findings.length)
      await tx.insert(auditFinding).values(
        findings.map((f) => ({
          id: f.id,
          auditId: f.auditId,
          agentVersionId,
          pipelineJobId: jobId,
          title: f.title,
          description: f.description,
          category: f.category,
          severity: f.severity,
          evidencePage: f.auditEvidence.pageNumber,
          evidenceQuote: f.auditEvidence.quote,
          ruleId: f.applicableRule.ruleId,
          rulebookVersion: f.applicableRule.rulebookVersion,
          confidence: f.confidence,
          correctiveAction: JSON.stringify(f.correctiveAction),
          reviewStatus: f.reviewStatus,
          createdAt: completedAt,
          updatedAt: completedAt,
        })),
      );
    const done = await tx
      .update(pipelineJob)
      .set({ status: 'COMPLETED', completedAt, errorCode: null, errorMessage: null })
      .where(and(eq(pipelineJob.id, jobId), eq(pipelineJob.status, 'RUNNING')))
      .returning({ id: pipelineJob.id });
    if (done.length === 0) throw new Error(`Pipeline job ${jobId} is not RUNNING`);
  });
}

export async function failPipelineJob(
  jobId: string,
  code: PipelineFailureCode,
  message: string,
  completedAt: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(auditFinding).where(eq(auditFinding.pipelineJobId, jobId));
    await tx
      .update(pipelineJob)
      .set({ status: 'FAILED', errorCode: code, errorMessage: message, completedAt })
      .where(and(eq(pipelineJob.id, jobId), eq(pipelineJob.status, 'RUNNING')));
  });
}
