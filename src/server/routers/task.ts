import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { DESCRIPTION_MAX_LENGTH, TITLE_MAX_LENGTH } from "@/lib/task-limits";
import { publicProcedure, router } from "../trpc";

const id = z.string().min(1, "Task id is required.");

// Whitespace-only titles are rejected: the title is trimmed before the length check.
const titulo = z
  .string()
  .trim()
  .min(1, "Title is required.")
  .max(TITLE_MAX_LENGTH, `Title must be at most ${TITLE_MAX_LENGTH} characters.`);

// An empty description is stored as "no description" rather than an empty string.
const descricao = z
  .string()
  .trim()
  .max(DESCRIPTION_MAX_LENGTH, `Description must be at most ${DESCRIPTION_MAX_LENGTH} characters.`)
  .optional()
  .transform((value) => value || undefined);

function notFound(taskId: string): never {
  throw new TRPCError({ code: "NOT_FOUND", message: `Task "${taskId}" was not found.` });
}

export const taskRouter = router({
  /** Cursor-based pagination, newest first. `cursor` is what `useInfiniteQuery` expects. */
  list: publicProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(50).default(10),
        cursor: z.number().int().nullish(),
      }),
    )
    .query(({ ctx, input }) => ctx.store.list(input)),

  byId: publicProcedure
    .input(z.object({ id }))
    .query(({ ctx, input }) => ctx.store.get(input.id) ?? notFound(input.id)),

  create: publicProcedure
    .input(z.object({ titulo, descricao }))
    .mutation(({ ctx, input }) => ctx.store.create(input)),

  update: publicProcedure
    .input(z.object({ id, titulo, descricao }))
    .mutation(({ ctx, input }) => {
      const { id: taskId, ...data } = input;
      return ctx.store.update(taskId, data) ?? notFound(taskId);
    }),

  delete: publicProcedure.input(z.object({ id })).mutation(({ ctx, input }) => {
    if (!ctx.store.delete(input.id)) notFound(input.id);
    return { id: input.id };
  }),
});
