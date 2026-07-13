import { getExecutionTraceDetails, getTraceRunOverview, listTraceRuns } from '@repo/db/trace-store';
import { z } from 'zod';
import { ensureReviewWorkspace } from '../../server/review-workspace';
import { createTRPCRouter, publicProcedure } from '../init';

export const traceRouter = createTRPCRouter({
  listRuns: publicProcedure.query(async () => {
    await ensureReviewWorkspace();
    return listTraceRuns();
  }),
  getRunOverview: publicProcedure
    .input(z.object({ runId: z.string().min(1) }))
    .query(async ({ input }) => {
      await ensureReviewWorkspace();
      return getTraceRunOverview(input.runId);
    }),
  getExecution: publicProcedure
    .input(z.object({ executionId: z.string().min(1) }))
    .query(async ({ input }) => {
      await ensureReviewWorkspace();
      return getExecutionTraceDetails(input.executionId);
    }),
});
