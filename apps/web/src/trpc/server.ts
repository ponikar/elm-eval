import { createCallerFactory, createTRPCContext } from './init';
import { appRouter } from './routers/_app';

const createCaller = createCallerFactory(appRouter);

export async function createTRPCCaller() {
  const context = await createTRPCContext();
  return createCaller(context);
}
