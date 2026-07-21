/** Skeleton shown while a report's server data loads. */
export default function Loading() {
  return (
    <div className="animate-pulse" aria-hidden>
      <div className="mb-6 h-8 w-56 rounded-md bg-muted" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl border border-border bg-card" />
        ))}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="h-72 rounded-xl border border-border bg-card" />
        <div className="h-72 rounded-xl border border-border bg-card" />
      </div>
    </div>
  );
}
