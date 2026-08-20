export default function RouteFallback() {
  return (
    <div className="space-y-6">
      <div className="h-24 animate-pulse rounded-2xl bg-brand-25 dark:bg-white/[0.02]" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="h-40 animate-pulse rounded-2xl bg-brand-25 dark:bg-white/[0.02]"
          />
        ))}
      </div>
    </div>
  );
}
