import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6" aria-busy="true" aria-label="Loading your dashboard">
      <div className="space-y-2"><Skeleton className="h-4 w-40" /><Skeleton className="h-10 w-72" /></div>
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <Skeleton className="h-52 rounded-3xl" />
          <div className="grid gap-3 sm:grid-cols-2"><Skeleton className="h-36 rounded-2xl" /><Skeleton className="h-36 rounded-2xl" /></div>
        </div>
        <div className="space-y-6"><Skeleton className="h-36 rounded-3xl" /><Skeleton className="h-44 rounded-3xl" /></div>
      </div>
    </div>
  );
}
