"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * Renders a date in the viewer's local time zone.
 *
 * The server does not know the browser's time zone, so formatting in local time during SSR
 * would cause a hydration mismatch. The server (and the first client render) use UTC, then the
 * client switches to local time right after hydration.
 */
export function TaskDate({ date }: Readonly<{ date: Date }>) {
  const isClient = useSyncExternalStore(subscribe, () => true, () => false);

  const formatted = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: isClient ? undefined : "UTC",
  }).format(date);

  return (
    <time dateTime={date.toISOString()}>
      {formatted}
      {isClient ? "" : " UTC"}
    </time>
  );
}
