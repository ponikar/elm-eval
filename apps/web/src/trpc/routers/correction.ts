import { convertCorrectionToRegressionTest, createCorrection } from '@repo/db';
import { CreateCorrectionInputSchema } from '@repo/domain';
import { z } from 'zod';
import { ensureReviewWorkspace } from '../../server/review-workspace';
import { createTRPCRouter, publicProcedure } from '../init';

export const correctionRouter = createTRPCRouter({
  create: publicProcedure.input(CreateCorrectionInputSchema).mutation(({ input }) => {
    ensureReviewWorkspace();
    return createCorrection(input);
  }),
  convertToRegressionTest: publicProcedure
    .input(z.object({ correctionId: z.string().min(1) }))
    .mutation(({ input }) => {
      ensureReviewWorkspace();
      return convertCorrectionToRegressionTest(input.correctionId);
    }),
});
