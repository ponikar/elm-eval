import { createCallerFactory } from "./init";
import { appRouter } from "./routers/_app";
import { createTRPCContext } from "./init";

const createCaller = createCallerFactory(appRouter);

export async function createTRPCCaller() {
  const context = await createTRPCContext();
  return createCaller(context);
}
