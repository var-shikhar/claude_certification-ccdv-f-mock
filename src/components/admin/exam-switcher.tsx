'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/** Every admin page is scoped to one exam, kept in the ?exam= URL parameter. */
export function ExamSwitcher({ exams, value }: { exams: { id: string; code: string; title: string }[]; value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return (
    <Select
      value={value}
      onValueChange={(exam) => {
        const next = new URLSearchParams(params);
        next.set('exam', exam);
        next.delete('page');
        router.push(`${pathname}?${next.toString()}`);
      }}
    >
      <SelectTrigger className="h-9 w-full sm:w-72" aria-label="Exam">
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
