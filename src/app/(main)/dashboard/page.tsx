import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, CalendarClock, ChevronRight, Compass, Flame, Play, Sparkles, Star, Target, Zap } from 'lucide-react';
import { Reveal } from '@/components/common/reveal';
import { ActivityHeatmap } from '@/components/dashboard/activity-heatmap';
import { GoalRing } from '@/components/dashboard/goal-ring';
import { StartButton } from '@/components/results/start-button';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { KINDS } from '@/lib/attempt-kinds';
import { daysUntil } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { getMyExams, type DashboardExam } from '@/server/analytics';
import { getActiveAttempts, listAttempts } from '@/server/attempts';
import { getActivityHeatmap, getOrCreateProfile, getStreak } from '@/server/profile';
import { getStudyPlan, type PlanView } from '@/server/plan';
import { requireUser } from '@/server/session';
import { TodayPlan } from '@/components/plan/study-plan';
import { PlanTaskButton } from '@/components/plan/plan-task-button';

export const metadata: Metadata = { title: 'Home' };

function greeting(timeZone: string) {
  const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone }).format(new Date()));
  return hour < 5 ? 'Up late' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
}

export default async function DashboardPage() {
  const user = await requireUser('/dashboard');
  const [profile, myExams, active, streak, heat, recent] = await Promise.all([
    getOrCreateProfile(user.id),
    getMyExams(user.id),
    getActiveAttempts(user.id),
    getStreak(user.id),
    getActivityHeatmap(user.id),
    listAttempts(user.id, { limit: 4 }),
  ]);
  if (!profile.onboardedAt && myExams.length === 0 && recent.length === 0) redirect('/onboarding');

  const firstName = user.isAnonymous ? '' : user.name.split(' ')[0];
  const primary = myExams.find((e) => e.id === profile.primaryExamId) ?? myExams[0] ?? null;
  const plan = primary ? await getStudyPlan(user.id, primary.id) : null;

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6 sm:py-10">
      <Reveal className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', timeZone: profile.timezone })}</p>
          <h1 className="text-3xl font-bold sm:text-4xl">{greeting(profile.timezone)}{firstName ? `, ${firstName}` : ''} 👋</h1>
        </div>
        {user.isAnonymous && (
          <Button asChild variant="outline" className="border-primary/40">
            <Link href="/sign-up"><Sparkles /> Save your progress: create a free account</Link>
          </Button>
        )}
      </Reveal>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <Reveal delay={0.05}><UpNext active={active} exams={myExams} primary={primary} plan={plan} /></Reveal>

          <Reveal delay={0.1}>
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Your exams</h2>
                <Button asChild variant="ghost" size="sm"><Link href="/explore"><Compass /> Add an exam</Link></Button>
              </div>
              {myExams.length === 0 ? (
                <Link href="/explore" className="flex items-center gap-4 rounded-2xl border border-dashed p-6 transition-colors hover:border-primary/40 hover:bg-accent/20">
                  <Compass className="size-8 text-primary" />
                  <span><span className="block font-semibold">Pick your first exam</span><span className="text-sm text-muted-foreground">Browse certifications and quizzes, then take a free diagnostic.</span></span>
                </Link>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {myExams.map((e) => <MyExamCard key={e.id} exam={e} />)}
                </div>
              )}
            </section>
          </Reveal>

          {recent.length > 0 && (
            <Reveal delay={0.15}>
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Recent results</h2>
                  <Button asChild variant="ghost" size="sm"><Link href="/progress">See all <ArrowRight data-icon="inline-end" /></Link></Button>
                </div>
                <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
                  {recent.map((a) => (
                    <li key={a.id}>
                      <Link href={`/attempt/${a.id}/result`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/30">
                        <span className="grid size-9 place-items-center rounded-xl bg-secondary text-xs font-bold">{a.examCode.split('-')[0]}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{KINDS[a.kind].label}</span>
                          <span className="block text-xs text-muted-foreground">{new Date(a.startedAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                        </span>
                        <span className={cn('rounded-full px-2.5 py-1 text-sm font-semibold tabular-nums', a.passed ? 'bg-success/12 text-success' : 'bg-secondary')}>
                          {KINDS[a.kind].scored && a.scaled != null ? a.scaled : `${a.itemCount ? Math.round(((a.correctCount ?? 0) / a.itemCount) * 100) : 0}%`}
                        </span>
                        <ChevronRight className="size-4 text-muted-foreground" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            </Reveal>
          )}
        </div>

        {/* ---------------- side column */}
        <div className="space-y-6">
          <Reveal delay={0.1}>
            <section className="rounded-3xl border bg-card p-5">
              <h2 className="mb-4 text-sm font-semibold text-muted-foreground">Today</h2>
              <div className="flex items-center gap-4">
                <GoalRing done={streak.today.items} goal={profile.dailyGoal} />
                <div className="space-y-1.5">
                  <p className="text-sm font-medium">
                    {streak.today.items >= profile.dailyGoal ? 'Daily goal done! 🎉' : `${profile.dailyGoal - streak.today.items} questions to your daily goal`}
                  </p>
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Flame className={cn('size-4', streak.activeToday ? 'fill-banana/70 text-primary' : '')} />
                    {streak.current ? `${streak.current}-day streak` : 'Start a streak today'}
                  </p>
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><Star className="size-4" /> {profile.xp.toLocaleString()} XP</p>
                </div>
              </div>
            </section>
          </Reveal>
          {plan && <Reveal delay={0.12}><TodayPlan plan={plan} /></Reveal>}
          <Reveal delay={0.15}>
            <section className="rounded-3xl border bg-card p-5">
              <h2 className="mb-4 text-sm font-semibold text-muted-foreground">Activity</h2>
              <ActivityHeatmap days={heat} timeZone={profile.timezone} />
            </section>
          </Reveal>
        </div>
      </div>
    </div>
  );
}

function UpNext({ active, exams, primary, plan }: {
  active: Awaited<ReturnType<typeof getActiveAttempts>>;
  exams: DashboardExam[];
  primary: DashboardExam | null;
  plan: PlanView | null;
}) {
  let eyebrow = 'Up next';
  let title: string;
  let body: string;
  let action: React.ReactNode;
  const mostDue = [...exams].sort((a, b) => b.due - a.due)[0];
  const nextTask = plan?.days[0]?.tasks.find((t) => !t.done && t.kind !== 'rest');

  if (active[0]) {
    const a = active[0];
    eyebrow = 'Pick up where you left off';
    title = `${a.examCode} · ${KINDS[a.kind].label}`;
    body = `Question ${a.position} of ${a.itemCount}, ${a.answered} answered${a.deadline ? '. The timer is still running.' : '.'}`;
    action = <Button asChild variant="premium" size="xl"><Link href={`/attempt/${a.id}`}><Play data-icon="inline-start" />Resume</Link></Button>;
  } else if (plan && nextTask) {
    eyebrow = `Today's plan · ${plan.examCode}`;
    title = nextTask.label;
    body = `${nextTask.detail} About ${nextTask.minutes} minutes.`;
    action = <PlanTaskButton examId={plan.examId} task={nextTask} size="xl" variant="premium" label="Start now" />;
  } else if (mostDue && mostDue.due > 0) {
    title = `Daily review: ${mostDue.due} question${mostDue.due === 1 ? '' : 's'} due`;
    body = `Questions you missed in ${mostDue.code} are ready to revisit. It takes a few minutes and makes them stick.`;
    action = <StartButton variant="premium" size="xl" input={{ examId: mostDue.id, kind: 'review' }}><CalendarClock data-icon="inline-start" />Start review</StartButton>;
  } else if (primary && !primary.readiness?.answered) {
    title = `Find your starting point in ${primary.code}`;
    body = 'A 15-question diagnostic across the whole syllabus shows exactly where to focus.';
    action = <StartButton variant="premium" size="xl" input={{ examId: primary.id, kind: 'diagnostic' }}><Target data-icon="inline-start" />Take the diagnostic</StartButton>;
  } else if (primary?.readiness) {
    const weakest = [...primary.readiness.skills].sort((a, b) => (a.answered ? a.mastery : 0.55) - (b.answered ? b.mastery : 0.55))[0];
    if ((primary.readiness.readiness ?? 0) >= 75) {
      title = `You look ready. Prove it with a full ${primary.code} mock`;
      body = `Readiness ${primary.readiness.readiness}%. A timed mock under exam conditions is the best final check.`;
      action = <Button asChild variant="premium" size="xl"><Link href={`/exams/${primary.id}`}>Go to full mock <ArrowRight data-icon="inline-end" /></Link></Button>;
    } else {
      title = `Strengthen ${weakest.name}`;
      body = weakest.answered
        ? `It's your weakest ${primary.code} skill at ${Math.round(weakest.mastery * 100)}%. Ten questions with explanations will move it.`
        : `You haven't practised this ${primary.code} skill yet. Ten quick questions will fix that.`;
      action = <StartButton variant="premium" size="xl" input={{ examId: primary.id, kind: 'practice', skills: [weakest.skillId], count: 10 }}><Zap data-icon="inline-start" />Start 10-question drill</StartButton>;
    }
  } else {
    title = 'Choose what to practise';
    body = 'Pick a certification or quiz and we will plan the rest.';
    action = <Button asChild variant="premium" size="xl"><Link href="/explore">Explore exams <ArrowRight data-icon="inline-end" /></Link></Button>;
  }

  return (
    <section className="relative overflow-hidden rounded-3xl border border-primary/25 bg-card p-6 sm:p-7">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.09] via-banana/[0.07] to-transparent" />
      <div aria-hidden className="bg-grid mask-fade-b pointer-events-none absolute inset-0 opacity-60" />
      <div className="relative space-y-4">
        <p className="text-xs font-semibold tracking-wide text-primary uppercase">{eyebrow}</p>
        <div className="space-y-1.5">
          <h2 className="text-2xl font-semibold">{title}</h2>
          <p className="max-w-xl text-muted-foreground">{body}</p>
        </div>
        {action}
      </div>
    </section>
  );
}

function MyExamCard({ exam }: { exam: DashboardExam }) {
  const r = exam.readiness;
  const days = exam.targetDate ? daysUntil(exam.targetDate) : null;
  return (
    <Link href={`/exams/${exam.id}`} className="group rounded-2xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-muted-foreground">{exam.code}</div>
          <div className="truncate font-semibold">{exam.title}</div>
        </div>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
      </div>
      <div className="mt-4 space-y-1.5">
        <div className="flex justify-between text-xs"><span className="text-muted-foreground">Readiness</span><span className="font-semibold">{r?.readiness != null ? `${r.readiness}%` : 'Not yet'}</span></div>
        <Progress value={r?.readiness ?? 0} className="h-1.5" />
      </div>
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {r?.predictedScaled != null && <span>Predicted {r.predictedScaled}</span>}
        {exam.due > 0 && <span className="text-primary">{exam.due} due for review</span>}
        {days != null && days >= 0 && <span>Exam in {days} day{days === 1 ? '' : 's'}</span>}
      </div>
    </Link>
  );
}
