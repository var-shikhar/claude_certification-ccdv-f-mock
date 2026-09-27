import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="min-h-dvh" aria-busy="true" aria-label="Loading your exam">
      <div className="border-b">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Skeleton className="size-8 rounded-lg" />
          <Skeleton className="h-4 w-44" />
          <Skeleton className="ml-auto h-8 w-24 rounded-full" />
        </div>
      </div>
      <div className="mx-auto flex max-w-6xl gap-8 px-4 py-8 sm:px-6">
        <div className="flex-1 space-y-5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-4/5" />
          <div className="space-y-2.5 pt-2">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>
        </div>
        <Skeleton className="hidden h-96 w-72 rounded-2xl lg:block" />
      </div>
    </div>
  );
}
