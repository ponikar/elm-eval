import { randomUUID } from 'node:crypto';
import { listEvalCases } from '@repo/db';
import {
  createEvaluationRun,
  freezeEvalSuite,
  getEvaluationRunDetails,
  listEvaluationRuns,
  listRunSummaries,
} from '@repo/db/eval-store';
import { z } from 'zod';
import { ensureReviewWorkspace } from '../../server/review-workspace';
import { createTRPCRouter, publicProcedure } from '../init';

const PIPELINE_URL = process.env['PIPELINE_URL'];
const PIPELINE_SECRET = process.env['PIPELINE_SECRET'];

async function triggerPipelineJob(runId: string): Promise<void> {
  if (!PIPELINE_URL) {
    console.warn('[triggerRun] PIPELINE_URL not set, skipping pipeline trigger');
    return;
  }
  const url = `${PIPELINE_URL}/run/${runId}`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (PIPELINE_SECRET) headers['x-pipeline-secret'] = PIPELINE_SECRET;

  try {
    const res = await fetch(url, { method: 'POST', headers, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) {
      console.error(`[triggerRun] Pipeline responded ${res.status}: ${await res.text()}`);
    }
  } catch (error) {
    console.error(
      `[triggerRun] Failed to reach pipeline at ${PIPELINE_URL}:`,
      error instanceof Error ? error.message : error,
    );
  }
}

export const evaluationRunRouter = createTRPCRouter({
  triggerRun: publicProcedure
    .input(
      z.object({
        agentVersionId: z.string().min(1),
      }),
    )
    .mutation(async ({ input }) => {
      await ensureReviewWorkspace();

      const trustedCaseIds = (await listEvalCases())
        .filter((item) => item.status === 'TRUSTED')
        .map((item) => item.id);
      if (trustedCaseIds.length === 0) {
        throw new Error('No trusted eval cases available. Approve cases before running.');
      }

      const suite = await freezeEvalSuite({
        id: randomUUID(),
        name: `auto-frozen-${Date.now()}`,
        version: 1,
        description: 'Automatically frozen trusted suite for dashboard-triggered run',
        caseIds: trustedCaseIds,
        frozenAt: new Date().toISOString(),
      });
      const suiteId = suite.id;

      const idempotencyKey = `run-${input.agentVersionId}-${suiteId}-${Date.now()}`;
      const run = await createEvaluationRun({
        id: randomUUID(),
        suiteId,
        agentVersionId: input.agentVersionId,
        idempotencyKey,
        createdAt: new Date().toISOString(),
      });

      triggerPipelineJob(run.run.id).catch(() => {});

      return { runId: run.run.id, status: run.run.status };
    }),
  freezeTrustedSuite: publicProcedure
    .input(
      z.object({
        name: z.string().min(1),
        version: z.number().int().positive(),
        description: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      await ensureReviewWorkspace();
      const trustedCaseIds = (await listEvalCases())
        .filter((item) => item.status === 'TRUSTED')
        .map((item) => item.id);
      return freezeEvalSuite({
        id: randomUUID(),
        name: input.name,
        version: input.version,
        description: input.description,
        caseIds: trustedCaseIds,
        frozenAt: new Date().toISOString(),
      });
    }),
  create: publicProcedure
    .input(
      z.object({
        suiteId: z.string().min(1),
        agentVersionId: z.string().min(1),
        idempotencyKey: z.string().min(1),
      }),
    )
    .mutation(async ({ input }) => {
      await ensureReviewWorkspace();
      return createEvaluationRun({
        id: randomUUID(),
        ...input,
        createdAt: new Date().toISOString(),
      });
    }),
  list: publicProcedure.query(async () => {
    await ensureReviewWorkspace();
    return listEvaluationRuns();
  }),
  listSummaries: publicProcedure.query(async () => {
    await ensureReviewWorkspace();
    return listRunSummaries();
  }),
  get: publicProcedure.input(z.object({ id: z.string().min(1) })).query(async ({ input }) => {
    await ensureReviewWorkspace();
    return getEvaluationRunDetails(input.id);
  }),
});
