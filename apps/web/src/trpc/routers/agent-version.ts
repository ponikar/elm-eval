import { SEED_AGENT_VERSIONS } from '@repo/test-fixtures';
import { createTRPCRouter, publicProcedure } from '../init';

export const agentVersionRouter = createTRPCRouter({
  list: publicProcedure.query(() => {
    return SEED_AGENT_VERSIONS;
  }),
});
