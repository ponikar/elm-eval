import { createTRPCRouter, publicProcedure } from "../init";
import { SEED_EVAL_CASES } from "@repo/test-fixtures";

export const evalCaseRouter = createTRPCRouter({
  list: publicProcedure.query(() => {
    return SEED_EVAL_CASES;
  }),
});
