import { createTRPCRouter, publicProcedure } from '../init';
import { agentVersionRouter } from './agent-version';
import { auditRouter } from './audit';
import { correctionRouter } from './correction';
import { evalCaseRouter } from './eval-case';
import { evaluationRunRouter } from './evaluation-run';

export const appRouter = createTRPCRouter({
  health: publicProcedure.query(() => {
    return { status: 'ok' as const };
  }),
  audit: auditRouter,
  correction: correctionRouter,
  agentVersion: agentVersionRouter,
  evalCase: evalCaseRouter,
  evaluationRun: evaluationRunRouter,
});

export type AppRouter = typeof appRouter;
