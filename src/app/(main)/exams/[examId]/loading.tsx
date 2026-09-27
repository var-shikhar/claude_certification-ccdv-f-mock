import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-10 sm:px-6" aria-busy="true">
      <div className="space-y-4">
        <Skeleton className="h-4 w-40" />
        <div className="flex gap-2"><Skeleton className="h-5 w-16" /><Skeleton className="h-5 w-20" /></div>
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex gap-6">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-4 w-24" />)}</div>
      </div>
      <Skeleton className="h-52 rounded-3xl" />
      <div className="grid gap-3 md:grid-cols-3">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}</div>
      <div className="space-y-2.5">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>
    </div>
  );
}
