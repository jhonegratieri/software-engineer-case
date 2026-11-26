import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it } from "vitest";
import { createTaskStore } from "../task-store";
import { createCaller } from "./_app";

// Each test gets its own empty store, so tests never depend on the sample data or on each other.
function setup() {
  return createCaller({ store: createTaskStore() });
}

async function expectTRPCError(promise: Promise<unknown>, code: TRPCError["code"]) {
  const error = await promise.catch((err: unknown) => err);
  expect(error).toBeInstanceOf(TRPCError);
  expect((error as TRPCError).code).toBe(code);
  return error as TRPCError;
}

describe("task router", () => {
  let caller: ReturnType<typeof setup>;

  beforeEach(() => {
    caller = setup();
  });

  it("creates a task with an id and a creation date", async () => {
    const task = await caller.task.create({ titulo: "  Write tests  ", descricao: "Router only" });

    expect(task.id).toBeTypeOf("string");
    expect(task.titulo).toBe("Write tests");
    expect(task.descricao).toBe("Router only");
    expect(task.dataCriacao).toBeInstanceOf(Date);
  });

  it("stores an empty description as undefined", async () => {
    const task = await caller.task.create({ titulo: "No description", descricao: "   " });
    expect(task.descricao).toBeUndefined();
  });

  it("rejects a task without a title", async () => {
    await expectTRPCError(caller.task.create({ titulo: "" }), "BAD_REQUEST");
    await expectTRPCError(caller.task.create({ titulo: "   " }), "BAD_REQUEST");
  });

  it("lists tasks newest first with cursor pagination", async () => {
    for (let i = 1; i <= 5; i++) {
      await caller.task.create({ titulo: `Task ${i}` });
    }

    const first = await caller.task.list({ limit: 2 });
    expect(first.items.map((t) => t.titulo)).toEqual(["Task 5", "Task 4"]);
    expect(first.total).toBe(5);
    expect(first.nextCursor).not.toBeNull();

    const second = await caller.task.list({ limit: 2, cursor: first.nextCursor });
    expect(second.items.map((t) => t.titulo)).toEqual(["Task 3", "Task 2"]);

    const last = await caller.task.list({ limit: 2, cursor: second.nextCursor });
    expect(last.items.map((t) => t.titulo)).toEqual(["Task 1"]);
    expect(last.nextCursor).toBeNull();
  });

  it("keeps pagination stable when a task is deleted mid-scroll", async () => {
    for (let i = 1; i <= 4; i++) {
      await caller.task.create({ titulo: `Task ${i}` });
    }
    const first = await caller.task.list({ limit: 2 });
    await caller.task.delete({ id: first.items[0].id });

    const second = await caller.task.list({ limit: 2, cursor: first.nextCursor });
    expect(second.items.map((t) => t.titulo)).toEqual(["Task 2", "Task 1"]);
  });

  it("gets a task by id", async () => {
    const created = await caller.task.create({ titulo: "Find me" });
    await expect(caller.task.byId({ id: created.id })).resolves.toEqual(created);
  });

  it("updates an existing task", async () => {
    const created = await caller.task.create({ titulo: "Old title", descricao: "Old" });
    const updated = await caller.task.update({ id: created.id, titulo: "New title" });

    expect(updated).toEqual({ ...created, titulo: "New title", descricao: undefined });
  });

  it("rejects an update with an empty title", async () => {
    const created = await caller.task.create({ titulo: "Valid" });
    await expectTRPCError(caller.task.update({ id: created.id, titulo: " " }), "BAD_REQUEST");
  });

  it("deletes a task", async () => {
    const created = await caller.task.create({ titulo: "Delete me" });

    await expect(caller.task.delete({ id: created.id })).resolves.toEqual({ id: created.id });
    await expectTRPCError(caller.task.byId({ id: created.id }), "NOT_FOUND");
  });

  it("returns a meaningful NOT_FOUND error for unknown tasks", async () => {
    const error = await expectTRPCError(
      caller.task.update({ id: "missing", titulo: "Anything" }),
      "NOT_FOUND",
    );
    expect(error.message).toBe('Task "missing" was not found.');

    await expectTRPCError(caller.task.delete({ id: "missing" }), "NOT_FOUND");
    await expectTRPCError(caller.task.byId({ id: "missing" }), "NOT_FOUND");
  });
});
