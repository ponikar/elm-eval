import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../init";

export const appRouter = createTRPCRouter({
  health: publicProcedure.query(() => {
    return { status: "ok" as const };
  }),
});

export type AppRouter = typeof appRouter;
