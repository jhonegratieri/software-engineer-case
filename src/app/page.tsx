import Link from "next/link";
import { TaskList } from "@/components/task-list";
import { TASKS_PAGE_SIZE } from "@/lib/task-limits";
import { getQueryClient, HydrateClient, trpc } from "@/trpc/server";

// Tasks change at runtime, so this page must be rendered on every request (SSR), never at build time.
export const dynamic = "force-dynamic";

export default async function TasksPage() {
  // SSR: the first page is fetched on the server (calling the tRPC procedure directly) and
  // hydrated into the client cache, so the HTML already contains the tasks.
  await getQueryClient().prefetchInfiniteQuery(
    trpc.task.list.infiniteQueryOptions(
      { limit: TASKS_PAGE_SIZE },
      { getNextPageParam: (lastPage) => lastPage.nextCursor },
    ),
  );

  return (
    <>
      <div className="page-header">
        <h1>Tasks</h1>
        <Link href="/tasks/new" className="btn btn-primary">
          New task
        </Link>
      </div>
      <HydrateClient>
        <TaskList />
      </HydrateClient>
    </>
  );
}
