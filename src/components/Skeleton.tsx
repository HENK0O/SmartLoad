export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`rounded-xl bg-neutral-800 relative overflow-hidden ${className}`}>
    <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-neutral-700/30 to-transparent" />
  </div>;
}

export function CardSkeleton() {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
      <Skeleton className="h-4 w-3/4 mb-2" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}

export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-2.5">
      {Array.from({ length: count }).map((_, i) => <CardSkeleton key={i} />)}
    </div>
  );
}

export function PageSkeleton({ lines = 4 }: { lines?: number }) {
  return (
    <div className="flex min-h-screen flex-col p-5 pb-24">
      <Skeleton className="h-8 w-48 mb-6" />
      <ListSkeleton count={lines} />
    </div>
  );
}
