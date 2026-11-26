# Software Engineer Case — Task Manager

A simple task manager built with **Next.js 15 (App Router)** and **tRPC 11**. Tasks are kept in memory on the server; there is no database.

- **Part 2** (practical challenge): this application.
- **Part 1** (theoretical questions): answered in [`docs/theoretical-answers.md`](docs/theoretical-answers.md).

## Features

- **CRUD over tRPC**: `task.list`, `task.byId`, `task.create`, `task.update` and `task.delete`.
- **Validation and errors**:
  - The title is required (whitespace-only titles are rejected).
  - Lengths are limited.
  - Unknown ids return a `NOT_FOUND` error with a clear message.
  - Validation errors come back per field, so the form shows them next to the inputs.
- **SSR task list**: the first page of tasks is fetched on the server for every request and is already in the HTML.
- **Infinite scroll** (bonus): more tasks load automatically as you scroll.
- **Delete from the list** with confirmation, a pending state and success/error messages.
- **Create/edit form**:
  - One functional component with hooks.
  - Client-side validation, plus server errors shown next to the fields.
  - Loading, success and error states.
- **Tests**: Vitest suite for the tRPC router.

The app starts with 30 fictitious sample tasks, so the list and the infinite scroll have something to show.

## Getting started

Requirements: Node.js 22+ and npm.

```bash
npm install
npm run dev          # http://localhost:3000
```

Other scripts:

```bash
npm test             # unit tests (Vitest)
npm run lint         # ESLint
npm run typecheck    # TypeScript
npm run build && npm start   # production build
```

## How it works

```text
Browser ──(HTTP, superjson)──► /api/trpc/[trpc] ──► appRouter ──► task store (in-memory Map)
                                                      ▲
Server components ──(direct call, no HTTP)────────────┘
```

**Backend** (`src/server/`):
- `task-store.ts`:
  - The in-memory store.
  - Lives on `globalThis`, because Next.js bundles API routes and server components separately. Without it, they could end up with different copies of the data.
  - Pagination uses a cursor based on an insertion sequence rather than an offset, so infinite scroll does not skip or repeat items when tasks are created or deleted while scrolling.
- `trpc.ts`:
  - tRPC initialization.
  - The store is injected through the **context**, so tests can use an isolated store.
  - superjson keeps `Date` values intact.
  - The error formatter turns zod errors into readable messages and `fieldErrors`.
- `routers/task.ts`: the procedures and their zod schemas.

**Frontend** (`src/app/`, `src/components/`, `src/trpc/`):
- `/`:
  - Server-rendered on every request (`dynamic = "force-dynamic"`).
  - The server prefetches the first page through the tRPC options proxy, which calls the procedure directly. `HydrateClient` then hands that data to the client cache.
  - `TaskList` continues from there with `useInfiniteQuery`, and an `IntersectionObserver` sentinel loads the next pages.
- `/tasks/new` and `/tasks/[id]/edit`:
  - Both share `TaskForm`.
  - The edit page loads the task on the server and returns the not-found page for unknown ids.
- `FlashProvider`: lives in the root layout, so a "Task created" message survives the redirect back to the list.
- `TaskDate`:
  - Formats dates in UTC during SSR and switches to the viewer's local time after hydration.
  - This avoids hydration mismatches, because the server cannot know the browser's time zone.

## Decisions and trade-offs

- **Field names follow the spec.** The task model uses `id`, `titulo`, `descricao` and `dataCriacao` exactly as the case defines them. Everything else (code, UI, docs) is in English.
- **Next.js 15.** The case asks for "NextJS (v15)", so the project uses the latest 15.x release, with React 19.
- **In-memory storage.** This is required by the case and keeps the solution simple. Data resets on restart and is not shared between multiple server instances. A real deployment would swap `task-store.ts` for a database-backed implementation with the same interface.
- **"Less is more".** No UI or form libraries: plain CSS, `useState` and a small hand-written flash component. Validation limits live in `src/lib/task-limits.ts` and are shared by the server (the source of truth) and the form (instant feedback).
- **Not-found page status.** Because the root `loading.tsx` streams the page, a missing task renders the not-found page with HTTP 200 instead of 404. This is standard Next.js streaming behaviour.

## Project structure

```text
src/
├── app/
│   ├── api/trpc/[trpc]/route.ts   # tRPC HTTP handler
│   ├── tasks/new/page.tsx         # create page
│   ├── tasks/[id]/edit/page.tsx   # edit page (SSR load)
│   ├── page.tsx                   # task list (SSR + hydration)
│   ├── layout.tsx, loading.tsx, error.tsx, not-found.tsx, globals.css
├── components/                    # TaskList, TaskForm, TaskDate, FlashProvider
├── lib/task-limits.ts             # shared validation limits and page size
├── server/
│   ├── task-store.ts              # in-memory storage
│   ├── trpc.ts                    # tRPC init, context, error formatting
│   └── routers/                   # app router, task router and its tests
└── trpc/                          # client provider, server proxy, QueryClient factory
docs/theoretical-answers.md        # Part 1 answers
```
