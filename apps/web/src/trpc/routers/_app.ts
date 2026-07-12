import { createTRPCRouter, publicProcedure } from "../init";
import { auditRouter } from "./audit";
import { agentVersionRouter } from "./agent-version";
import { evalCaseRouter } from "./eval-case";

export const appRouter = createTRPCRouter({
  health: publicProcedure.query(() => {
    return { status: "ok" as const };
  }),
  audit: auditRouter,
  agentVersion: agentVersionRouter,
  evalCase: evalCaseRouter,
});

export type AppRouter = typeof appRouter;
