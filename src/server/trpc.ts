import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { ZodError, z } from "zod";
import { getTaskStore, type TaskStore } from "./task-store";

/**
 * The store is injected through the context instead of being imported by the procedures.
 * Production uses the shared in-memory singleton; tests pass a fresh, isolated store.
 */
export type Context = {
  store: TaskStore;
};

export function createContext(): Context {
  return { store: getTaskStore() };
}

const t = initTRPC.context<Context>().create({
  // superjson keeps `Date` values (e.g. `dataCriacao`) as real dates across the wire.
  transformer: superjson,
  // Validation errors get a readable message (instead of the raw issue list) and expose
  // field-level messages so the UI can show them next to the inputs.
  errorFormatter({ shape, error }) {
    const zodError = error.cause instanceof ZodError ? error.cause : null;
    return {
      ...shape,
      message: zodError ? zodError.issues.map((issue) => issue.message).join(" ") : shape.message,
      data: {
        ...shape.data,
        zodError: zodError ? z.flattenError(zodError) : null,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const createCallerFactory = t.createCallerFactory;
