import { listEvalCases } from '@repo/db';
import { ensureReviewWorkspace } from '../../server/review-workspace';
import { createTRPCRouter, publicProcedure } from '../init';

export const evalCaseRouter = createTRPCRouter({
  list: publicProcedure.query(() => {
    ensureReviewWorkspace();
    return listEvalCases();
  }),
});
