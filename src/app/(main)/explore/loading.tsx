import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6" aria-busy="true">
      <div className="space-y-3"><Skeleton className="h-10 w-48" /><Skeleton className="h-4 w-96 max-w-full" /></div>
      <div className="flex gap-3"><Skeleton className="h-11 w-80 max-w-full rounded-xl" /><Skeleton className="h-9 w-24 rounded-full" /><Skeleton className="h-9 w-28 rounded-full" /></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-56 rounded-2xl" />)}</div>
    </div>
  );
}
