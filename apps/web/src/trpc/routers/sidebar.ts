import { countAgentVersions, countAuditsWithPendingFindings, countEvalCases } from '@repo/db';
import { countRunningEvaluationRuns } from '@repo/db/eval-store';
import { countFailedTraceRuns } from '@repo/db/trace-store';
import { createTRPCRouter, publicProcedure } from '../init';

export const sidebarRouter = createTRPCRouter({
  counts: publicProcedure.query(async () => {
    const [pendingAudits, evalCases, runningEvals, agentVersions, failedTraces] = await Promise.all(
      [
        countAuditsWithPendingFindings(),
        countEvalCases(),
        countRunningEvaluationRuns(),
        countAgentVersions(),
        countFailedTraceRuns(),
      ],
    );
    return { pendingAudits, evalCases, runningEvals, agentVersions, failedTraces };
  }),
});
