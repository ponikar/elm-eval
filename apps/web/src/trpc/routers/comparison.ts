import { randomUUID } from 'node:crypto';
import {
  createRunComparison,
  getLatestRunComparison,
  getRunComparison,
  listComparableRuns,
  listRunComparisons,
} from '@repo/db/comparison-store';
import { z } from 'zod';
import { ensureReviewWorkspace } from '../../server/review-workspace';
import { createTRPCRouter, publicProcedure } from '../init';

export const comparisonRouter = createTRPCRouter({
  listRuns: publicProcedure.query(async () => {
    await ensureReviewWorkspace();
    return listComparableRuns();
  }),
  listComparisons: publicProcedure.query(async () => {
    await ensureReviewWorkspace();
    return listRunComparisons();
  }),
  getLatest: publicProcedure.query(async () => {
    await ensureReviewWorkspace();
    return getLatestRunComparison();
  }),
  get: publicProcedure
    .input(z.object({ comparisonId: z.string().min(1) }))
    .query(async ({ input }) => {
      await ensureReviewWorkspace();
      return getRunComparison(input.comparisonId);
    }),
  create: publicProcedure
    .input(
      z.object({
        baselineRunId: z.string().min(1),
        candidateRunId: z.string().min(1),
      }),
    )
    .mutation(async ({ input }) => {
      await ensureReviewWorkspace();
      return createRunComparison({
        baselineRunId: input.baselineRunId,
        candidateRunId: input.candidateRunId,
        createdAt: new Date().toISOString(),
        comparisonId: randomUUID(),
        gateEvaluationId: randomUUID(),
      });
    }),
});
