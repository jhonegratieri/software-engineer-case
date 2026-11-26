import { createCallerFactory, router } from "../trpc";
import { taskRouter } from "./task";

export const appRouter = router({
  task: taskRouter,
});

/** Type-only export consumed by the client: this is what gives tRPC end-to-end typing. */
export type AppRouter = typeof appRouter;

/** Calls procedures directly (no HTTP) — used for server-side rendering and tests. */
export const createCaller = createCallerFactory(appRouter);
