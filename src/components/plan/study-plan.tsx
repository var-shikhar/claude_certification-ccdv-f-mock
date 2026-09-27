import { CalendarCheck, Check, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PlanView } from '@/server/plan';
import { PlanTaskButton } from './plan-task-button';

const dayLabel = (date: string, i: number) =>
  i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : new Date(`${date}T12:00:00Z`).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' });

/** Compact checklist of today's tasks (dashboard side column). */
export function TodayPlan({ plan }: { plan: PlanView }) {
  const today = plan.days[0];
  if (!today) return null;
  const done = today.tasks.filter((t) => t.done).length;
  return (
    <section className="rounded-3xl border bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground"><CalendarCheck className="size-4 text-primary" /> Today&apos;s plan · {plan.examCode}</h2>
        <span className="text-xs text-muted-foreground tabular-nums">{done}/{today.tasks.length}</span>
      </div>
      <ul className="space-y-2.5">
        {today.tasks.map((t, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className={cn('mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border', t.done && 'border-success bg-success text-success-foreground')}>
              {t.done && <Check className="size-3" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className={cn('block text-sm font-medium', t.done && 'text-muted-foreground line-through')}>{t.label}</span>
              <span className="block text-xs text-muted-foreground">~{t.minutes} min</span>
            </span>
            {!t.done && t.kind !== 'rest' && <PlanTaskButton examId={plan.examId} task={t} />}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The week at a glance (exam hub). */
export function WeekPlan({ plan }: { plan: PlanView }) {
  return (
    <section id="plan" className="space-y-4 scroll-mt-24">
      <div>
        <h2 className="text-xl font-semibold">Your plan for the week</h2>
        <p className="text-sm text-muted-foreground">
          Built from your weakest skills{plan.targetDate ? ' and your exam date' : ''}. It updates as you practise{plan.targetDate ? '' : '; set an exam date above to pace it'}.
        </p>
      </div>
      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {plan.days.map((d, i) => (
          <li key={d.date} className={cn('space-y-2 rounded-2xl border bg-card p-4', i === 0 && 'border-primary/40 shadow-[0_0_0_1px_var(--primary)]')}>
            <h3 className="text-sm font-semibold">{dayLabel(d.date, i)}</h3>
            <ul className="space-y-2">
              {d.tasks.map((t, j) => (
                <li key={j} className="text-sm">
                  <span className={cn('flex items-start gap-1.5 font-medium', t.done && 'text-muted-foreground line-through')}>
                    {t.done && <Check className="mt-0.5 size-3.5 shrink-0 text-success" />}{t.label}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="size-3" />~{t.minutes} min</span>
                  {i === 0 && !t.done && t.kind !== 'rest' && <div className="mt-1.5"><PlanTaskButton examId={plan.examId} task={t} /></div>}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </section>
  );
}
