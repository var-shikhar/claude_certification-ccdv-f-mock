import Link from 'next/link';
import { ArrowUpRight, Clock, FileQuestion, Target } from 'lucide-react';
import { CardSpotlight } from '@/components/ui/card-spotlight';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { ExamCard as ExamCardData } from '@/server/exams';

const CATEGORY_LABEL = { certification: 'Certification', quiz: 'Quiz', interview: 'Interview prep' } as const;

export function ExamCard({ exam, readiness }: { exam: ExamCardData; readiness?: number | null }) {
  return (
    <Link href={`/exams/${exam.id}`} className="group block rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <CardSpotlight className="h-full rounded-2xl transition duration-300 group-hover:-translate-y-0.5 group-hover:border-primary/30">
        <div className="flex h-full flex-col gap-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span
                className="grid size-10 place-items-center rounded-xl text-xs font-bold text-white shadow-sm"
                style={{ background: `linear-gradient(135deg, ${exam.meta.accent ?? '#ea7a1f'}, oklch(0.45 0.09 45))` }}
              >
                {exam.code.split('-')[0].slice(0, 4)}
              </span>
              <div className="leading-tight">
                <div className="text-xs font-semibold tracking-wide text-muted-foreground">{exam.code}</div>
                <Badge variant="secondary" className="mt-1 h-5 px-1.5 text-[0.65rem]">{CATEGORY_LABEL[exam.category]}</Badge>
              </div>
            </div>
            <ArrowUpRight className="size-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
          </div>

          <div className="space-y-1.5">
            <h3 className="font-heading text-lg font-semibold leading-snug">{exam.title}</h3>
            {exam.meta.tagline && <p className="line-clamp-2 text-sm text-muted-foreground">{exam.meta.tagline}</p>}
          </div>

          <div className="mt-auto space-y-3">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1"><FileQuestion className="size-3.5" />{exam.itemCount} items</span>
              <span className="inline-flex items-center gap-1"><Clock className="size-3.5" />{exam.timeLimitMinutes} min</span>
              <span className="inline-flex items-center gap-1"><Target className="size-3.5" />Pass {exam.passing}</span>
            </div>
            {readiness != null ? (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs"><span className="text-muted-foreground">Readiness</span><span className="font-semibold">{readiness}%</span></div>
                <Progress value={readiness} className="h-1.5" />
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">{exam.questionCount.toLocaleString()} practice questions</div>
            )}
          </div>
        </div>
      </CardSpotlight>
    </Link>
  );
}
