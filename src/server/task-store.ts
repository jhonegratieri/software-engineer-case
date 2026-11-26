/**
 * In-memory task storage.
 *
 * The case explicitly does not require a database, so tasks live in a `Map` inside the
 * Node.js process. Data is lost on restart and is not shared between multiple server
 * instances — an accepted trade-off for this exercise.
 *
 * Field names (`titulo`, `descricao`, `dataCriacao`) intentionally follow the case
 * specification; everything else in the codebase is in English.
 */

export type Task = {
  id: string;
  titulo: string;
  descricao?: string;
  dataCriacao: Date;
};

export type CreateTaskData = Pick<Task, "titulo" | "descricao">;
export type UpdateTaskData = Pick<Task, "titulo" | "descricao">;

export type ListTasksParams = {
  limit: number;
  /** Opaque cursor returned by a previous page; `null`/`undefined` means "first page". */
  cursor?: number | null;
};

export type ListTasksResult = {
  items: Task[];
  nextCursor: number | null;
  total: number;
};

type Entry = {
  task: Task;
  /**
   * Monotonic insertion sequence used as the pagination cursor. Keyset pagination on a
   * sequence (instead of an offset) keeps infinite scroll stable when tasks are deleted
   * or created while the user is scrolling.
   */
  seq: number;
};

/** Returns a copy so callers can never mutate the stored object by accident. */
const clone = (task: Task): Task => ({ ...task, dataCriacao: new Date(task.dataCriacao) });

export function createTaskStore(seed: Array<CreateTaskData & { dataCriacao?: Date }> = []) {
  const entries = new Map<string, Entry>();
  let nextSeq = 1;

  function insert(data: CreateTaskData, dataCriacao: Date): Task {
    const task: Task = {
      id: crypto.randomUUID(),
      titulo: data.titulo,
      descricao: data.descricao,
      dataCriacao,
    };
    entries.set(task.id, { task, seq: nextSeq++ });
    return clone(task);
  }

  for (const item of seed) {
    insert(item, item.dataCriacao ?? new Date());
  }

  return {
    create(data: CreateTaskData): Task {
      return insert(data, new Date());
    },

    /** Newest tasks first, paginated by cursor. */
    list({ limit, cursor }: ListTasksParams): ListTasksResult {
      const sorted = [...entries.values()]
        .filter((entry) => cursor == null || entry.seq < cursor)
        .sort((a, b) => b.seq - a.seq);
      const page = sorted.slice(0, limit);
      const hasMore = sorted.length > limit;

      return {
        items: page.map((entry) => clone(entry.task)),
        nextCursor: hasMore ? page[page.length - 1].seq : null,
        total: entries.size,
      };
    },

    get(id: string): Task | undefined {
      const entry = entries.get(id);
      return entry ? clone(entry.task) : undefined;
    },

    update(id: string, data: UpdateTaskData): Task | undefined {
      const entry = entries.get(id);
      if (!entry) return undefined;
      entry.task = { ...entry.task, titulo: data.titulo, descricao: data.descricao };
      return clone(entry.task);
    },

    delete(id: string): boolean {
      return entries.delete(id);
    },
  };
}

export type TaskStore = ReturnType<typeof createTaskStore>;

/** Purely fictitious sample tasks, so the list (and infinite scroll) has something to show. */
function sampleTasks(count = 30): Array<CreateTaskData & { dataCriacao: Date }> {
  const titles = [
    "Plan the sprint backlog",
    "Review open pull requests",
    "Write unit tests for the task router",
    "Update the project README",
    "Prepare the weekly status report",
    "Refactor the form validation",
    "Fix the flaky end-to-end test",
    "Organize the team retrospective",
    "Upgrade project dependencies",
    "Draft the onboarding checklist",
  ];
  const hour = 60 * 60 * 1000;
  const now = Date.now();

  // Oldest first, so the insertion sequence matches the creation date.
  return Array.from({ length: count }, (_, index) => ({
    titulo: `${titles[index % titles.length]} #${index + 1}`,
    descricao: index % 3 === 0 ? undefined : `Sample task number ${index + 1}.`,
    dataCriacao: new Date(now - (count - index) * hour),
  }));
}

/**
 * Process-wide singleton.
 *
 * Next.js may load this module more than once (route handlers and server components are
 * bundled separately, and dev mode hot-reloads modules). Keeping the store on `globalThis`
 * guarantees that the tRPC API and server-side rendering read and write the same tasks.
 */
const globalForStore = globalThis as unknown as { taskStore?: TaskStore };

export function getTaskStore(): TaskStore {
  globalForStore.taskStore ??= createTaskStore(sampleTasks());
  return globalForStore.taskStore;
}
