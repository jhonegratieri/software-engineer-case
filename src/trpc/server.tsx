import "server-only";

import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { cache } from "react";
import { appRouter, createCaller } from "@/server/routers/_app";
import { createContext } from "@/server/trpc";
import { makeQueryClient } from "./query-client";

/** One QueryClient per server request (React `cache` scopes it to the request). */
export const getQueryClient = cache(makeQueryClient);

/**
 * Server-side tRPC proxy: server components prefetch queries with it. Procedures are
 * called directly (no HTTP round-trip) and the results are handed to the client cache.
 */
export const trpc = createTRPCOptionsProxy({
  ctx: createContext,
  router: appRouter,
  queryClient: getQueryClient,
});

/** Direct server-side caller, for server components that just need the data. */
export const caller = createCaller(createContext);

/** Serializes everything prefetched during this request into the client-side cache. */
export function HydrateClient({ children }: Readonly<{ children: React.ReactNode }>) {
  return <HydrationBoundary state={dehydrate(getQueryClient())}>{children}</HydrationBoundary>;
}
