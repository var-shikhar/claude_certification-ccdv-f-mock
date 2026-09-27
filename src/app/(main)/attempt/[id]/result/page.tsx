import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowRight, Award, CheckCircle2, Clock, RotateCcw, Target, TimerOff, TrendingUp } from 'lucide-react';
import { Reveal } from '@/components/common/reveal';
import { ReviewList } from '@/components/results/review-list';
import { ScoreRing } from '@/components/results/score-ring';
import { StartButton } from '@/components/results/start-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { KINDS } from '@/lib/attempt-kinds';
import type { ResultState } from '@/lib/dto';
import { cn } from '@/lib/utils';
import { getResult } from '@/server/attempts';
import { AppError } from '@/server/errors';
import { requireUser } from '@/server/session';

export const metadata: Metadata = { title: 'Your results' };

const fmtDuration = (ms: number) => {
  const m = Math.round(ms / 60_000);
  return m < 60 ? `${Math.max(1, m)} min` : `${Math.floor(m / 60)} h ${m % 60} min`;
};

export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/attempt/${id}/result`);
  const result = await getResult(user.id, id).catch((err) => {
    if (err instanceof AppError && err.status === 404) notFound();
    throw err;
  });
  if ('active' in result) redirect(`/attempt/${id}`);

  const { summary, scale } = result;
  const kind = KINDS[result.kind];
  const scored = kind.scored;
  const percent = summary.itemCount ? Math.round((summary.correctCount / summary.itemCount) * 100) : 0;
  const domains = [...summary.byDomain].sort((a, b) => (a.percent ?? 0) - (b.percent ?? 0));
  const weakest = domains.find((d) => (d.percent ?? 100) < 70) ?? null;
  const wrong = result.items.filter((i) => !i.correct).length;

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 py-8 sm:px-6 sm:py-10">
      {/* ---------------- hero */}
      <Reveal>
        <section className="relative overflow-hidden rounded-3xl border bg-card p-6 sm:p-8">
          <div aria-hidden className={cn('pointer-events-none absolute -top-24 -right-24 size-72 rounded-full blur-3xl', scored && summary.passed ? 'bg-success/15' : 'bg-banana/25 dark:bg-primary/10')} />
          <div className="relative grid items-center gap-8 md:grid-cols-[auto_1fr]">
            <div className="mx-auto">
              {scored ? (
                <ScoreRing
                  value={(summary.scaled - scale.min) / (scale.max - scale.min)}
                  mark={(scale.passing - scale.min) / (scale.max - scale.min)}
                  label={summary.scaled}
                  sublabel={`of ${scale.max.toLocaleString()} · pass ${scale.passing}`}
                  tone={summary.passed ? 'pass' : 'fail'}
                />
              ) : (
                <ScoreRing value={percent / 100} label={percent} sublabel="% correct" tone="neutral" />
              )}
            </div>
            <div className="space-y-4 text-center md:text-left">
              <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
                <Badge variant="secondary">{result.examCode}</Badge>
                <Badge variant="secondary">{kind.label}</Badge>
                <Badge variant="secondary">{result.difficultyLabel}</Badge>
                {summary.timedOut && <Badge variant="outline" className="gap-1"><TimerOff className="size-3" />Time ran out</Badge>}
              </div>
              <h1 className="text-3xl font-bold sm:text-4xl">
                {scored
                  ? summary.passed ? 'You passed! 🎉' : 'Not there yet, but close enough to see it.'
                  : percent >= 80 ? 'Great drill!' : percent >= 50 ? 'Good progress.' : 'Every miss is a lesson.'}
              </h1>
              <p className="text-muted-foreground">
                {scored
                  ? summary.passed
                    ? `You scored ${summary.scaled} against a pass mark of ${scale.passing}. ${result.certificateId ? 'Your readiness certificate is ready.' : ''}`
                    : `You scored ${summary.scaled}; the pass mark is ${scale.passing}. ${weakest ? `Your biggest gain is in ${weakest.name}.` : ''}`
                  : `You got ${summary.correctCount} of ${summary.itemCount} right. Missed questions are now in your review queue.`}
              </p>
              <dl className="grid grid-cols-3 gap-2 text-left sm:max-w-md">
                <Stat icon={CheckCircle2} label="Correct" value={`${summary.correctCount}/${summary.itemCount}`} />
                <Stat icon={Clock} label="Time" value={fmtDuration(summary.durationMs)} />
                <Stat icon={Target} label="Answered" value={`${summary.answeredCount}/${summary.itemCount}`} />
              </dl>
            </div>
          </div>
        </section>
      </Reveal>

      {/* ---------------- one next step */}
      <Reveal delay={0.05}>
        <NextStep result={result} weakest={weakest} wrong={wrong} />
      </Reveal>

      {/* ---------------- breakdown */}
      <Reveal delay={0.1}>
        <section className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-xl font-semibold">By domain</h2>
            <p className="text-xs text-muted-foreground">Informational: pass/fail comes from the overall score.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {domains.map((d) => (
              <div key={d.id} className="rounded-2xl border bg-card p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-medium">{d.name}</span>
                  <span className={cn('font-heading text-lg font-semibold tabular-nums', (d.percent ?? 0) >= 70 ? 'text-success' : (d.percent ?? 0) >= 50 ? 'text-foreground' : 'text-destructive')}>
                    {d.percent ?? 0}%
                  </span>
                </div>
                <Progress value={d.percent ?? 0} className="mt-2 h-1.5" />
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{d.correct} of {d.total} correct</span>
                  {(d.percent ?? 0) < 70 && (
                    <StartButton variant="link" size="xs" className="h-auto p-0" input={{ examId: result.examId, kind: 'practice', domains: [Number(d.id)], count: 10 }}>
                      Drill this <ArrowRight data-icon="inline-end" />
                    </StartButton>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </Reveal>

      <ReviewList items={result.items} attemptId={result.id} aiTutor={result.aiTutor} />
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-secondary/40 px-3 py-2">
      <dt className="flex items-center gap-1 text-[0.7rem] text-muted-foreground"><Icon className="size-3" />{label}</dt>
      <dd className="font-heading text-base font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function NextStep({ result, weakest, wrong }: { result: ResultState; weakest: { id: number; name: string; percent: number | null } | null; wrong: number }) {
  const scored = KINDS[result.kind].scored;
  let title: string;
  let body: string;
  let action: React.ReactNode;

  if (result.certificateId) {
    title = 'Your readiness certificate is ready';
    body = 'Share it, or push further with a harder difficulty.';
    action = <Button asChild variant="premium" size="xl"><Link href={`/certificates/${result.certificateId}`}><Award data-icon="inline-start" />View certificate</Link></Button>;
  } else if (scored && result.summary.passed && !result.certificateEligibleMode) {
    title = 'Ready for the real thing?';
    body = 'Sit the full mock at exam-realistic difficulty to earn your readiness certificate.';
    action = <StartButton variant="premium" size="xl" input={{ examId: result.examId, kind: 'full', difficulty: 'standard' }}>Start full mock <ArrowRight data-icon="inline-end" /></StartButton>;
  } else if (weakest) {
    title = `Next: strengthen ${weakest.name}`;
    body = `You scored ${weakest.percent ?? 0}% here. A 10-question drill with explanations is the fastest way up.`;
    action = <StartButton variant="premium" size="xl" input={{ examId: result.examId, kind: 'practice', domains: [Number(weakest.id)], count: 10 }}><TrendingUp data-icon="inline-start" />Drill {weakest.name.split(' ')[0]}</StartButton>;
  } else if (wrong > 0) {
    title = 'Lock in what you missed';
    body = `Retry the ${wrong} question${wrong === 1 ? '' : 's'} you got wrong while the explanations are fresh.`;
    action = <StartButton variant="premium" size="xl" input={{ examId: result.examId, kind: 'mistakes', count: Math.min(wrong, 30) }}><RotateCcw data-icon="inline-start" />Retry mistakes</StartButton>;
  } else {
    title = 'Flawless. Time to raise the bar';
    body = 'Try a timed mock at a harder difficulty.';
    action = <StartButton variant="premium" size="xl" input={{ examId: result.examId, kind: 'quick', difficulty: 'hard' }}>Start a harder mock <ArrowRight data-icon="inline-end" /></StartButton>;
  }

  return (
    <section className="flex flex-col items-start justify-between gap-4 rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/[0.08] via-banana/[0.08] to-transparent p-6 sm:flex-row sm:items-center">
      <div>
        <p className="text-xs font-semibold tracking-wide text-primary uppercase">Recommended next step</p>
        <h2 className="mt-1 text-xl font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        {action}
        <Button asChild variant="ghost" size="xl"><Link href={`/exams/${result.examId}`}>Back to exam</Link></Button>
      </div>
    </section>
  );
}
