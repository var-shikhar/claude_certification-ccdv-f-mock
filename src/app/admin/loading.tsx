import { Skeleton } from '@/components/ui/skeleton';

/** Shown inside the admin shell while an admin page renders on the server. */
export default function Loading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <Skeleton className="h-9 w-full rounded-lg sm:w-72" />
      </div>
      <Skeleton className="h-9 w-full rounded-lg" />
      <div className="space-y-2">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
    </div>
  );
}
