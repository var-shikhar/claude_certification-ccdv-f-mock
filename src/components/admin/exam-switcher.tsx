'use client';

import { useOptimistic, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

/** Every admin page is scoped to one exam, kept in the ?exam= URL parameter. */
export function ExamSwitcher({ exams, value }: { exams: { id: string; code: string; title: string }[]; value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  // The page renders on the server for the new exam; show the choice straight away meanwhile.
  const [isPending, startTransition] = useTransition();
  const [shown, setShown] = useOptimistic(value);
  return (
    <Select
      value={shown}
      onValueChange={(exam) => {
        const next = new URLSearchParams(params);
        next.set('exam', exam);
        next.delete('page');
        startTransition(() => {
          setShown(exam);
          router.push(`${pathname}?${next.toString()}`);
        });
      }}
    >
      <SelectTrigger className={cn('h-9 w-full transition-opacity sm:w-72', isPending && 'opacity-70')} aria-label="Exam" aria-busy={isPending}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {exams.map((e) => (
          <SelectItem key={e.id} value={e.id}><span className="font-semibold">{e.code}</span> <span className="text-muted-foreground">{e.title}</span></SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
