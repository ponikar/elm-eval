import { SEED_EVAL_CASES } from '@repo/test-fixtures';
import { createTRPCRouter, publicProcedure } from '../init';

export const evalCaseRouter = createTRPCRouter({
  list: publicProcedure.query(() => {
    return SEED_EVAL_CASES;
  }),
});
