"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DESCRIPTION_MAX_LENGTH, TITLE_MAX_LENGTH } from "@/lib/task-limits";
import { useTRPC } from "@/trpc/client";
import { useFlash } from "./flash";

type TaskFormProps = {
  /** When provided, the form edits this task; otherwise it creates a new one. */
  task?: { id: string; titulo: string; descricao?: string };
};

type FieldErrors = { titulo?: string; descricao?: string };

/** Client-side validation mirrors the server rules for instant feedback; the server still validates. */
function validate(titulo: string, descricao: string): FieldErrors {
  const errors: FieldErrors = {};
  if (!titulo.trim()) errors.titulo = "Title is required.";
  else if (titulo.trim().length > TITLE_MAX_LENGTH)
    errors.titulo = `Title must be at most ${TITLE_MAX_LENGTH} characters.`;
  if (descricao.trim().length > DESCRIPTION_MAX_LENGTH)
    errors.descricao = `Description must be at most ${DESCRIPTION_MAX_LENGTH} characters.`;
  return errors;
}

export function TaskForm({ task }: Readonly<TaskFormProps>) {
  const isEditing = Boolean(task);
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { showFlash } = useFlash();

  const [titulo, setTitulo] = useState(task?.titulo ?? "");
  const [descricao, setDescricao] = useState(task?.descricao ?? "");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitted, setSubmitted] = useState(false);

  function onSuccess(message: string) {
    // Drop the cached list (it is not mounted on this page): the list page is server-rendered
    // again on navigation, so it hydrates fresh data instead of briefly showing stale items.
    queryClient.removeQueries(trpc.task.list.pathFilter());
    showFlash("success", message);
    router.push("/");
  }

  const createTask = useMutation(
    trpc.task.create.mutationOptions({ onSuccess: () => onSuccess("Task created.") }),
  );
  const updateTask = useMutation(
    trpc.task.update.mutationOptions({ onSuccess: () => onSuccess("Task updated.") }),
  );
  const mutation = isEditing ? updateTask : createTask;

  // Server-side validation errors come back per field (see errorFormatter in server/trpc.ts).
  const serverFieldErrors = mutation.error?.data?.fieldErrors;
  const titleError = errors.titulo ?? serverFieldErrors?.titulo?.[0];
  const descriptionError = errors.descricao ?? serverFieldErrors?.descricao?.[0];
  const generalError = mutation.error && !serverFieldErrors ? mutation.error.message : null;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    const validationErrors = validate(titulo, descricao);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    if (task) updateTask.mutate({ id: task.id, titulo, descricao });
    else createTask.mutate({ titulo, descricao });
  }

  // After the first submit attempt, re-validate as the user types so errors clear immediately.
  function onTitleChange(value: string) {
    setTitulo(value);
    if (submitted) setErrors(validate(value, descricao));
  }

  function onDescriptionChange(value: string) {
    setDescricao(value);
    if (submitted) setErrors(validate(titulo, value));
  }

  const isBusy = mutation.isPending || mutation.isSuccess;

  return (
    <form className="card form" onSubmit={handleSubmit} noValidate>
      {generalError && (
        <div className="notice notice-error" role="alert">
          {generalError}
        </div>
      )}

      <div className="field">
        <label htmlFor="titulo">
          Title <span aria-hidden="true">*</span>
        </label>
        <input
          id="titulo"
          name="titulo"
          value={titulo}
          onChange={(event) => onTitleChange(event.target.value)}
          maxLength={TITLE_MAX_LENGTH}
          aria-invalid={Boolean(titleError)}
          aria-describedby={titleError ? "titulo-error" : undefined}
          autoFocus
          disabled={isBusy}
        />
        {titleError && (
          <p id="titulo-error" className="field-error">
            {titleError}
          </p>
        )}
      </div>

      <div className="field">
        <label htmlFor="descricao">Description</label>
        <textarea
          id="descricao"
          name="descricao"
          rows={4}
          value={descricao}
          onChange={(event) => onDescriptionChange(event.target.value)}
          maxLength={DESCRIPTION_MAX_LENGTH}
          aria-invalid={Boolean(descriptionError)}
          aria-describedby={descriptionError ? "descricao-error" : undefined}
          disabled={isBusy}
        />
        {descriptionError && (
          <p id="descricao-error" className="field-error">
            {descriptionError}
          </p>
        )}
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={isBusy}>
          {isBusy ? "Saving…" : isEditing ? "Save changes" : "Create task"}
        </button>
        <Link href="/" className="btn">
          Cancel
        </Link>
      </div>
    </form>
  );
}
