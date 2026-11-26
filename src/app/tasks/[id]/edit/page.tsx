import { TRPCError } from "@trpc/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TaskForm } from "@/components/task-form";
import { caller } from "@/trpc/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Edit task · Task Manager" };

type EditTaskPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditTaskPage({ params }: EditTaskPageProps) {
  const { id } = await params;

  // The task is loaded on the server, so the form renders already filled in.
  const task = await caller.task.byId({ id }).catch((error: unknown) => {
    if (error instanceof TRPCError && error.code === "NOT_FOUND") notFound();
    throw error;
  });

  return (
    <>
      <div className="page-header">
        <h1>Edit task</h1>
      </div>
      <TaskForm task={{ id: task.id, titulo: task.titulo, descricao: task.descricao }} />
    </>
  );
}
