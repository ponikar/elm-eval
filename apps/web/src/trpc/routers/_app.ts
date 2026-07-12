import { createTRPCRouter, publicProcedure } from '../init';
import { agentVersionRouter } from './agent-version';
import { auditRouter } from './audit';
import { evalCaseRouter } from './eval-case';

export const appRouter = createTRPCRouter({
  health: publicProcedure.query(() => {
    return { status: 'ok' as const };
  }),
  audit: auditRouter,
  agentVersion: agentVersionRouter,
  evalCase: evalCaseRouter,
});

export type AppRouter = typeof appRouter;
