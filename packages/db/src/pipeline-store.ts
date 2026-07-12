import { and, eq } from 'drizzle-orm';
import type { AuditFinding, PipelineFailureCode } from '@repo/domain';
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
export function enqueuePipelineJob(input: {
  id: string;
  auditId: string;
  agentVersionId: string;
  rulebookVersion: string;
  idempotencyKey: string;
  createdAt: string;
}): boolean {
  return (
    db
      .insert(pipelineJob)
      .values({ ...input, status: 'PENDING', attemptCount: 0 })
      .onConflictDoNothing({ target: pipelineJob.idempotencyKey })
      .returning({ id: pipelineJob.id })
      .get() !== undefined
  );
}
export function claimPipelineJob(id: string, startedAt: string): boolean {
  return (
    db
      .update(pipelineJob)
      .set({ status: 'RUNNING', startedAt, attemptCount: 1, errorCode: null, errorMessage: null })
      .where(and(eq(pipelineJob.id, id), eq(pipelineJob.status, 'PENDING')))
      .returning({ id: pipelineJob.id })
      .get() !== undefined
  );
}
export function appendPipelineTrace(t: PersistedPipelineTrace): void {
  db.insert(traceEvent)
    .values({
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
    })
    .run();
}
export function completePipelineJob(
  jobId: string,
  agentVersionId: string,
  findings: AuditFinding[],
  completedAt: string,
): void {
  db.transaction((tx) => {
    tx.delete(auditFinding).where(eq(auditFinding.pipelineJobId, jobId)).run();
    if (findings.length)
      tx.insert(auditFinding)
        .values(
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
        )
        .run();
    const done = tx
      .update(pipelineJob)
      .set({ status: 'COMPLETED', completedAt, errorCode: null, errorMessage: null })
      .where(and(eq(pipelineJob.id, jobId), eq(pipelineJob.status, 'RUNNING')))
      .returning({ id: pipelineJob.id })
      .get();
    if (!done) throw new Error(`Pipeline job ${jobId} is not RUNNING`);
  });
}
export function failPipelineJob(
  jobId: string,
  code: PipelineFailureCode,
  message: string,
  completedAt: string,
): void {
  db.transaction((tx) => {
    tx.delete(auditFinding).where(eq(auditFinding.pipelineJobId, jobId)).run();
    tx.update(pipelineJob)
      .set({ status: 'FAILED', errorCode: code, errorMessage: message, completedAt })
      .where(and(eq(pipelineJob.id, jobId), eq(pipelineJob.status, 'RUNNING')))
      .run();
  });
}
