"use client";

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { TASKS_PAGE_SIZE } from "@/lib/task-limits";
import { useTRPC } from "@/trpc/client";
import { useFlash } from "./flash";
import { TaskDate } from "./task-date";

export function TaskList() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { showFlash } = useFlash();

  // Same input as the server prefetch in app/page.tsx, so the first page comes from the
  // SSR-hydrated cache and only the following pages are fetched from the browser.
  const listOptions = trpc.task.list.infiniteQueryOptions(
    { limit: TASKS_PAGE_SIZE },
    { getNextPageParam: (lastPage) => lastPage.nextCursor },
  );
  const { data, error, status, hasNextPage, isFetchingNextPage, fetchNextPage, refetch } =
    useInfiniteQuery(listOptions);

  const deleteTask = useMutation(
    trpc.task.delete.mutationOptions({
      onSuccess: ({ id }) => {
        // Remove the task from the cached pages instead of refetching every loaded page.
        queryClient.setQueryData(listOptions.queryKey, (old) =>
          old
            ? {
                ...old,
                pages: old.pages.map((page) => ({
                  ...page,
                  items: page.items.filter((task) => task.id !== id),
                  total: page.total - 1,
                })),
              }
            : old,
        );
        showFlash("success", "Task deleted.");
      },
      onError: (err) => showFlash("error", `Could not delete the task: ${err.message}`),
    }),
  );

  // Infinite scroll: an invisible sentinel at the end of the list loads the next page when it
  // becomes visible. The effect re-runs after each page, so it keeps loading while the
  // sentinel is still on screen (e.g. on tall displays).
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [sentinelVisible, setSentinelVisible] = useState(false);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(([entry]) => setSentinelVisible(entry.isIntersecting), {
      rootMargin: "200px",
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (sentinelVisible && hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [sentinelVisible, hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (status === "pending") return <p className="muted">Loading tasks…</p>;
  if (status === "error") {
    return (
      <div className="notice notice-error" role="alert">
        <p>Could not load tasks: {error.message}</p>
        <button type="button" className="btn" onClick={() => refetch()}>
          Try again
        </button>
      </div>
    );
  }

  const tasks = data.pages.flatMap((page) => page.items);
  const total = data.pages.at(-1)?.total ?? tasks.length;

  function handleDelete(id: string, titulo: string) {
    if (window.confirm(`Delete "${titulo}"?`)) deleteTask.mutate({ id });
  }

  return (
    <>
      <p className="muted">
        Showing {tasks.length} of {total} task{total === 1 ? "" : "s"}
      </p>

      {tasks.length === 0 ? (
        <div className="notice">
          <p>No tasks yet.</p>
          <Link href="/tasks/new" className="btn btn-primary">
            Create your first task
          </Link>
        </div>
      ) : (
        <ul className="task-list">
          {tasks.map((task) => {
            const isDeleting = deleteTask.isPending && deleteTask.variables?.id === task.id;
            return (
              <li key={task.id} className="card task" aria-busy={isDeleting}>
                <div className="task-body">
                  <h2 className="task-title">{task.titulo}</h2>
                  {task.descricao && <p className="task-description">{task.descricao}</p>}
                  <p className="muted small">
                    Created <TaskDate date={task.dataCriacao} />
                  </p>
                </div>
                <div className="task-actions">
                  <Link href={`/tasks/${task.id}/edit`} className="btn">
                    Edit
                  </Link>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => handleDelete(task.id, task.titulo)}
                    disabled={isDeleting}
                  >
                    {isDeleting ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div ref={sentinelRef} className="list-footer muted">
        {isFetchingNextPage
          ? "Loading more tasks…"
          : hasNextPage
            ? null
            : tasks.length > 0 && "You have reached the end of the list."}
      </div>
    </>
  );
}
