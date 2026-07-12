import { createTRPCRouter, publicProcedure } from "../init";
import { SEED_AGENT_VERSIONS } from "@repo/test-fixtures";

export const agentVersionRouter = createTRPCRouter({
  list: publicProcedure.query(() => {
    return SEED_AGENT_VERSIONS;
  }),
});
