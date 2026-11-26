"use client";

// Error boundary for unexpected failures while rendering a page.
export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="notice notice-error" role="alert">
      <h1>Something went wrong</h1>
      <p>{error.message || "An unexpected error occurred."}</p>
      <button type="button" className="btn" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
