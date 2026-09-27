import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, CalendarClock, ChevronRight, Clock, ExternalLink, FileQuestion, Layers, Play, Target, Trophy } from 'lucide-react';
import { Reveal } from '@/components/common/reveal';
import { ExamDateButton, GuestDiagnosticButton, OpenSetupButton } from '@/components/exam-hub/hub-actions';
import { PracticeOptions } from '@/components/exam-hub/practice-options';
import { ReadinessGauge } from '@/components/exam-hub/readiness-gauge';
import { Syllabus } from '@/components/exam-hub/syllabus';
import { StartButton } from '@/components/results/start-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { KINDS } from '@/lib/attempt-kinds';
import { cn } from '@/lib/utils';
import { getExamHubData, type ExamHubData } from '@/server/analytics';
import { getExam, getPoolCounts, getSkillCounts, getStudyNotes } from '@/server/exams';
import { getUser } from '@/server/session';

export async function generateMetadata({ params }: { params: Promise<{ examId: string }> }): Promise<Metadata> {
  const ex = await getExam((await params).examId);
  return ex ? { title: `${ex.code} practice exams`, description: ex.meta.tagline ?? ex.title } : { title: 'Exam not found' };
}

export default async function ExamHubPage({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = await params;
  const ex = await getExam(examId);
  if (!ex || !ex.isPublished) notFound();
  const cfg = ex.config;
  const user = await getUser();
  const [hub, counts, notes, pools] = await Promise.all([
    user ? getExamHubData(user.id, ex.id) : Promise.resolve(null),
    getSkillCounts(ex.id),
    getStudyNotes(ex.id),
    getPoolCounts(ex.id),
  ]);
  const totalQuestions = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-8 sm:px-6 sm:py-10">
      {/* ---------------- header */}
      <Reveal className="space-y-4">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-muted-foreground">
          <Link href="/explore" className="hover:text-foreground">Explore</Link>
          <ChevronRight className="size-3.5" />
          <span className="text-foreground">{ex.code}</span>
        </nav>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="bg-gradient-brand text-white">{ex.code}</Badge>
          {ex.vendor && <Badge variant="secondary">{ex.vendor}</Badge>}
          {cfg.blueprintVersion && <Badge variant="outline">{cfg.blueprintVersion}</Badge>}
        </div>
        <h1 className="max-w-3xl text-3xl font-bold sm:text-4xl">{ex.title}</h1>
        {ex.meta.description && <p className="max-w-3xl text-muted-foreground">{ex.meta.description}</p>}
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <Metric icon={FileQuestion} label={`${cfg.itemCount} questions`} />
          <Metric icon={Clock} label={`${cfg.timeLimitMinutes} minutes`} />
          <Metric icon={Target} label={`Pass ${cfg.scale.passing} / ${cfg.scale.max.toLocaleString()}`} />
          <Metric icon={Layers} label={`${cfg.domains.length} domains`} />
          <Metric icon={Trophy} label={`${(pools.bank + pools.imported).toLocaleString()} practice questions`} />
          {cfg.officialUrl && (
            <a href={cfg.officialUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-primary hover:underline">
              Official exam page <ExternalLink className="size-3.5" />
            </a>
          )}
        </div>
      </Reveal>

      {/* ---------------- progress */}
      <Reveal delay={0.05}>
        {user && hub ? <ProgressCard examId={ex.id} hub={hub} passing={cfg.scale.passing} /> : <VisitorCard examId={ex.id} />}
      </Reveal>

      <Reveal delay={0.1}>
        <PracticeOptions
          exam={cfg}
          signedIn={Boolean(user)}
          defaultName={user && !user.isAnonymous ? user.name : ''}
          hasImported={pools.imported > 0}
          due={hub?.due ?? 0}
          mistakes={hub?.mistakes ?? 0}
        />
      </Reveal>

      <Reveal delay={0.1}>
        <Syllabus exam={cfg} mastery={hub?.readiness?.skills ?? null} counts={counts} studySkills={Object.keys(notes)} signedIn={Boolean(user)} />
      </Reveal>

      {hub && hub.recent.length > 0 && (
        <Reveal>
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Recent attempts</h2>
              <Button asChild variant="ghost" size="sm"><Link href={`/progress?exam=${ex.id}`}>All history <ArrowRight data-icon="inline-end" /></Link></Button>
            </div>
            <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
              {hub.recent.map((a) => (
                <li key={a.id}>
                  <Link href={`/attempt/${a.id}/result`} className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-accent/30 sm:px-5">
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{KINDS[a.kind].label}</span>
                      <span className="block text-xs text-muted-foreground">{new Date(a.startedAt).toLocaleDateString(undefined, { dateStyle: 'medium' })} · {a.correctCount ?? 0}/{a.itemCount} correct</span>
                    </span>
                    {KINDS[a.kind].scored && a.scaled != null ? (
                      <span className={cn('rounded-full px-2.5 py-1 text-sm font-semibold tabular-nums', a.passed ? 'bg-success/12 text-success' : 'bg-secondary')}>{a.scaled}</span>
                    ) : (
                      <span className="rounded-full bg-secondary px-2.5 py-1 text-sm font-semibold tabular-nums">{a.itemCount ? Math.round(((a.correctCount ?? 0) / a.itemCount) * 100) : 0}%</span>
                    )}
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </Reveal>
      )}
    </div>
  );
}

function Metric({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return <span className="inline-flex items-center gap-1.5 text-muted-foreground"><Icon className="size-4 text-primary" />{label}</span>;
}

function ProgressCard({ examId, hub, passing }: { examId: string; hub: ExamHubData; passing: number }) {
  const r = hub.readiness;
  const confidenceNote = !r || r.confidence === 'none'
    ? 'Answer a few questions and your readiness appears here.'
    : r.confidence === 'low'
      ? 'Early estimate. It sharpens as you cover more of the syllabus.'
      : r.confidence === 'medium' ? 'Solid estimate. Cover every skill for the most accurate read.' : 'High confidence. Based on broad, recent practice.';

  let primary: React.ReactNode;
  let hint: string;
  if (hub.active) {
    primary = (
      <Button asChild variant="premium" size="xl">
        <Link href={`/attempt/${hub.active.id}`}><Play data-icon="inline-start" />Resume {KINDS[hub.active.kind].label.toLowerCase()}</Link>
      </Button>
    );
    hint = `Question ${hub.active.position} of ${hub.active.itemCount} · ${hub.active.answered} answered${hub.active.deadline ? ' · timer running' : ''}`;
  } else if (!r || r.answered === 0) {
    primary = <StartButton variant="premium" size="xl" input={{ examId, kind: 'diagnostic' }}>Take the 15-question diagnostic <ArrowRight data-icon="inline-end" /></StartButton>;
    hint = 'About 20 minutes. Tells you exactly where to focus.';
  } else if (hub.due >= 5) {
    primary = <StartButton variant="premium" size="xl" input={{ examId, kind: 'review' }}><CalendarClock data-icon="inline-start" />Review {hub.due} due questions</StartButton>;
    hint = 'Spaced review takes a few minutes and locks in what you missed.';
  } else if ((r.readiness ?? 0) < 50) {
    const weakest = [...r.skills].filter((s) => s.answered > 0).sort((a, b) => a.mastery - b.mastery)[0] ?? r.skills.find((s) => s.answered === 0);
    primary = weakest
      ? <StartButton variant="premium" size="xl" input={{ examId, kind: 'practice', skills: [weakest.skillId], count: 10 }}>Drill {weakest.name} <ArrowRight data-icon="inline-end" /></StartButton>
      : <OpenSetupButton kind="practice" variant="premium" size="xl">Start a drill <ArrowRight data-icon="inline-end" /></OpenSetupButton>;
    hint = weakest ? `Your ${weakest.answered ? 'weakest' : 'least practised'} skill right now.` : 'Build your base with instant feedback.';
  } else {
    primary = <OpenSetupButton kind="full" variant="premium" size="xl">Start full mock <ArrowRight data-icon="inline-end" /></OpenSetupButton>;
    hint = 'You look ready to test yourself under real conditions.';
  }

  return (
    <section className="relative overflow-hidden rounded-3xl border bg-card p-6 sm:p-7">
      <div aria-hidden className="pointer-events-none absolute -top-28 -right-20 size-72 rounded-full bg-banana/20 blur-3xl dark:bg-primary/10" />
      <div className="relative grid items-center gap-8 md:grid-cols-[auto_1fr_auto]">
        <ReadinessGauge value={r?.readiness ?? null} />
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">Your progress</h2>
            <ExamDateButton examId={examId} targetDate={hub.targetDate} />
          </div>
          <dl className="grid grid-cols-3 gap-2 sm:max-w-md">
            <MiniStat label="Predicted" value={r?.predictedScaled != null ? String(r.predictedScaled) : '—'} good={r?.predictedScaled != null && r.predictedScaled >= passing} />
            <MiniStat label="Best mock" value={hub.bestScaled != null ? String(hub.bestScaled) : '—'} good={hub.bestScaled != null && hub.bestScaled >= passing} />
            <MiniStat label="Answered" value={String(r?.answered ?? 0)} />
          </dl>
          <p className="text-xs text-muted-foreground">{confidenceNote}</p>
        </div>
        <div className="flex flex-col items-stretch gap-2 md:items-end">
          {primary}
          <p className="max-w-xs text-xs text-muted-foreground md:text-right">{hint}</p>
          {hub.certificateId && (
            <Link href={`/certificates/${hub.certificateId}`} className="inline-flex items-center gap-1 text-sm font-medium text-success hover:underline md:justify-end">
              <Trophy className="size-4" /> View your certificate
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

function MiniStat({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div className="rounded-xl border bg-secondary/40 px-3 py-2">
      <dt className="text-[0.7rem] text-muted-foreground">{label}</dt>
      <dd className={cn('font-heading text-lg font-semibold tabular-nums', good && 'text-success')}>{value}</dd>
    </div>
  );
}

function VisitorCard({ examId }: { examId: string }) {
  return (
    <section className="flex flex-col items-start justify-between gap-5 rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/[0.08] via-banana/[0.08] to-transparent p-6 sm:flex-row sm:items-center sm:p-7">
      <div className="space-y-1.5">
        <h2 className="text-lg font-semibold">Know where you stand in 20 minutes</h2>
        <p className="max-w-xl text-sm text-muted-foreground">Take the free 15-question diagnostic. No account needed, and your results carry over if you sign up later.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <GuestDiagnosticButton examId={examId} />
        <Button asChild variant="ghost" size="xl"><Link href={`/sign-in?next=/exams/${examId}`}>Sign in</Link></Button>
      </div>
    </section>
  );
}
