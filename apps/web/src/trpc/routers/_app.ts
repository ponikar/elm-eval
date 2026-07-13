import { createTRPCRouter, publicProcedure } from '../init';
import { agentVersionRouter } from './agent-version';
import { auditRouter } from './audit';
import { comparisonRouter } from './comparison';
import { correctionRouter } from './correction';
import { evalCaseRouter } from './eval-case';
import { evaluationRunRouter } from './evaluation-run';
import { traceRouter } from './trace';

export const appRouter = createTRPCRouter({
  health: publicProcedure.query(() => {
    return { status: 'ok' as const };
  }),
  audit: auditRouter,
  correction: correctionRouter,
  comparison: comparisonRouter,
  agentVersion: agentVersionRouter,
  evalCase: evalCaseRouter,
  evaluationRun: evaluationRunRouter,
  trace: traceRouter,
});

export type AppRouter = typeof appRouter;
