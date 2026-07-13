import { randomUUID } from 'node:crypto';
import { listEvalCases } from '@repo/db';
import {
  createEvaluationRun,
  freezeEvalSuite,
  getEvaluationRunDetails,
  listEvaluationRuns,
} from '@repo/db/eval-store';
import { z } from 'zod';
import { ensureReviewWorkspace } from '../../server/review-workspace';
import { createTRPCRouter, publicProcedure } from '../init';

export const evaluationRunRouter = createTRPCRouter({
  freezeTrustedSuite: publicProcedure
    .input(
      z.object({
        name: z.string().min(1),
        version: z.number().int().positive(),
        description: z.string().optional(),
      }),
    )
    .mutation(({ input }) => {
      ensureReviewWorkspace();
      const trustedCaseIds = listEvalCases()
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
    .mutation(({ input }) => {
      ensureReviewWorkspace();
      return createEvaluationRun({
        id: randomUUID(),
        ...input,
        createdAt: new Date().toISOString(),
      });
    }),
  list: publicProcedure.query(() => {
    ensureReviewWorkspace();
    return listEvaluationRuns();
  }),
  get: publicProcedure.input(z.object({ id: z.string().min(1) })).query(({ input }) => {
    ensureReviewWorkspace();
    return getEvaluationRunDetails(input.id);
  }),
});
