import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6" aria-busy="true" aria-label="Loading your results">
      <div className="grid items-center gap-8 rounded-3xl border p-8 md:grid-cols-[auto_1fr]">
        <Skeleton className="mx-auto size-44 rounded-full" />
        <div className="space-y-4">
          <div className="flex gap-2"><Skeleton className="h-5 w-16" /><Skeleton className="h-5 w-24" /><Skeleton className="h-5 w-20" /></div>
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="h-4 w-2/3" />
          <div className="grid max-w-md grid-cols-3 gap-2"><Skeleton className="h-14" /><Skeleton className="h-14" /><Skeleton className="h-14" /></div>
        </div>
      </div>
      <Skeleton className="h-28 rounded-3xl" />
      <div className="grid gap-3 sm:grid-cols-2">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
    </div>
  );
}
