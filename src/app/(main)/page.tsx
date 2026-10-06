import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  ArrowRight, BookOpenCheck, BrainCircuit, CalendarClock, Compass, Gauge, MessagesSquare, ScrollText, Timer,
} from 'lucide-react';
import { ExamCard } from '@/components/exams/exam-card';
import { HeroPreview } from '@/components/marketing/hero-preview';
import { Reveal } from '@/components/common/reveal';
import { BentoGrid, BentoGridItem } from '@/components/ui/bento-grid';
import { Button } from '@/components/ui/button';
import { Spotlight } from '@/components/ui/spotlight-new';
import { listExams } from '@/server/exams';
import { getUser } from '@/server/session';

export default async function LandingPage() {
  const user = await getUser();
  if (user) redirect('/dashboard');
  const exams = await listExams();
  const totalQuestions = exams.reduce((a, e) => a + e.questionCount, 0);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="bg-grid mask-fade-b pointer-events-none absolute inset-0 -z-10" />
        <Spotlight
          gradientFirst="radial-gradient(68.54% 68.72% at 55.02% 31.46%, hsla(35, 100%, 70%, .16) 0, hsla(28, 100%, 55%, .05) 50%, hsla(28, 100%, 45%, 0) 80%)"
          gradientSecond="radial-gradient(50% 50% at 50% 50%, hsla(40, 100%, 75%, .12) 0, hsla(35, 100%, 55%, .04) 80%, transparent 100%)"
          gradientThird="radial-gradient(50% 50% at 50% 50%, hsla(45, 100%, 70%, .08) 0, hsla(35, 100%, 45%, .03) 80%, transparent 100%)"
        />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-16 pb-20 sm:px-6 md:pt-24 lg:grid-cols-[1.1fr_1fr]">
          <Reveal className="space-y-7">
            <Link href="/interviews" className="inline-flex items-center gap-2 rounded-full border bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur transition hover:border-primary/40 hover:text-foreground">
              <span className="rounded-full bg-gradient-brand px-1.5 py-px text-[0.65rem] font-semibold text-white">New</span>
              AI mock interviews with rubric feedback
              <ArrowRight className="size-3" />
            </Link>
            <h1 className="text-4xl leading-[1.05] font-bold sm:text-5xl lg:text-6xl">
              Practise like it&apos;s <span className="text-gradient">exam day</span>.
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground">
              Timed mocks that follow the real blueprint, drills that explain every option, and a readiness score that tells you when you&apos;re ready.
              One calm place for certifications, quizzes and interview prep.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild variant="premium" size="xl">
                <Link href="/sign-up">Start practising free <ArrowRight data-icon="inline-end" /></Link>
              </Button>
              <Button asChild variant="outline" size="xl">
                <Link href="/explore"><Compass data-icon="inline-start" /> Explore exams</Link>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {totalQuestions.toLocaleString()} practice questions · every option explained · no card needed
            </p>
          </Reveal>
          <Reveal delay={0.15}>
            <HeroPreview />
          </Reveal>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <Reveal className="mx-auto mb-10 max-w-2xl text-center">
          <h2 className="text-3xl font-semibold sm:text-4xl">Three steps. No guesswork.</h2>
          <p className="mt-3 text-muted-foreground">quizMonkey always shows you one next step, so you spend your time practising instead of planning.</p>
        </Reveal>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { icon: Compass, title: 'Pick your exam', body: 'Choose a certification or quiz. A 15-question diagnostic finds your starting point.' },
            { icon: BookOpenCheck, title: 'Learn with drills', body: 'Practise a topic and see why each option is right or wrong, straight away.' },
            { icon: Timer, title: 'Prove it under time', body: 'Sit a full timed mock scored like the real exam. Your readiness updates as you go.' },
          ].map((step, i) => (
            <Reveal key={step.title} delay={i * 0.08} className="relative rounded-2xl border bg-card p-6">
              <span className="absolute top-5 right-5 font-heading text-4xl font-bold text-muted-foreground/15">{i + 1}</span>
              <step.icon className="size-6 text-primary" />
              <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{step.body}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <Reveal className="mx-auto mb-10 max-w-2xl text-center">
          <h2 className="text-3xl font-semibold sm:text-4xl">Everything you need, nothing you don&apos;t</h2>
          <p className="mt-3 text-muted-foreground">Built around how certification exams actually work.</p>
        </Reveal>
        <BentoGrid>
          <BentoGridItem
            className="md:col-span-2"
            icon={<ScrollText className="size-5 text-primary" />}
            title="Blueprint-accurate mocks"
            description="Questions are drawn per skill in the official proportions, with the real timer, scale and pass mark. Harder questions weigh more, just like the real thing."
            header={<FeatureArt kind="blueprint" />}
          />
          <BentoGridItem
            icon={<Gauge className="size-5 text-primary" />}
            title="A readiness score you can trust"
            description="Your recent answers, weighted by the blueprint, predict your score and flag your weakest skills."
            header={<FeatureArt kind="gauge" />}
          />
          <BentoGridItem
            icon={<CalendarClock className="size-5 text-primary" />}
            title="Spaced review"
            description="Missed questions come back just before you'd forget them. A few minutes a day keeps them fresh."
            header={<FeatureArt kind="calendar" />}
          />
          <BentoGridItem
            className="md:col-span-2"
            icon={<MessagesSquare className="size-5 text-primary" />}
            title="AI mock interviews"
            description="Pick a role and level. The interviewer asks follow-ups based on your answers and scores you against a clear rubric."
            header={<FeatureArt kind="chat" />}
          />
        </BentoGrid>
      </section>

      {/* Exams */}
      {exams.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <Reveal className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-semibold">Popular exams</h2>
              <p className="mt-2 text-muted-foreground">Start with a free diagnostic on any of them.</p>
            </div>
            <Button asChild variant="ghost"><Link href="/explore">See all exams <ArrowRight data-icon="inline-end" /></Link></Button>
          </Reveal>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {exams.slice(0, 6).map((exam, i) => (
              <Reveal key={exam.id} delay={i * 0.06}><ExamCard exam={exam} /></Reveal>
            ))}
          </div>
        </section>
      )}

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <Reveal className="relative overflow-hidden rounded-3xl bg-gradient-brand px-6 py-14 text-center text-white sm:px-12">
          <div aria-hidden className="bg-grid pointer-events-none absolute inset-0 opacity-30" />
          <BrainCircuit className="mx-auto size-10 opacity-90" />
          <h2 className="mt-4 text-3xl font-semibold sm:text-4xl">Your next exam, minus the nerves.</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/85">Create a free account in seconds, or try it as a guest. Your progress follows you when you sign up.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="xl" className="bg-white text-[oklch(0.3_0.06_45)] hover:bg-white/90">
              <Link href="/sign-up">Create free account</Link>
            </Button>
            <Button asChild size="xl" variant="ghost" className="text-white hover:bg-white/15 hover:text-white">
              <Link href="/sign-in">I already have one</Link>
            </Button>
          </div>
        </Reveal>
      </section>
    </>
  );
}

/** Small, calm illustrations for the bento tiles (pure CSS, theme-aware). */
function FeatureArt({ kind }: { kind: 'blueprint' | 'gauge' | 'calendar' | 'chat' }) {
  if (kind === 'blueprint') {
    const bars = [33, 17, 15, 11, 11, 8, 3, 3];
    return (
      <div className="flex h-24 items-end gap-2 rounded-xl bg-secondary/60 p-3">
        {bars.map((h, i) => (
          <div key={i} className="flex-1 rounded-t-md bg-gradient-to-t from-primary/80 to-banana/80 transition-all duration-500 group-hover/bento:opacity-100" style={{ height: `${h * 2.4}%`, opacity: 0.55 + i * 0.05 }} />
        ))}
      </div>
    );
  }
  if (kind === 'gauge') {
    return (
      <div className="grid h-24 place-items-center rounded-xl bg-secondary/60">
        <div className="relative size-20">
          <svg viewBox="0 0 36 36" className="size-20 -rotate-90">
            <circle cx="18" cy="18" r="15.5" fill="none" className="stroke-border" strokeWidth="3.5" />
            <circle cx="18" cy="18" r="15.5" fill="none" className="stroke-primary transition-all duration-700" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="97.4" strokeDashoffset="24" />
          </svg>
          <span className="absolute inset-0 grid place-items-center font-heading text-lg font-bold">76%</span>
        </div>
      </div>
    );
  }
  if (kind === 'calendar') {
    return (
      <div className="grid h-24 grid-cols-7 gap-1.5 rounded-xl bg-secondary/60 p-3">
        {Array.from({ length: 21 }, (_, i) => (
          <span key={i} className="rounded-[4px]" style={{ background: `color-mix(in oklch, var(--primary) ${[8, 30, 60, 15, 80, 45, 20][i % 7] + (i > 13 ? 10 : 0)}%, transparent)` }} />
        ))}
      </div>
    );
  }
  return (
    <div className="flex h-24 flex-col justify-center gap-2 rounded-xl bg-secondary/60 p-3 text-xs">
      <span className="w-fit max-w-[85%] rounded-2xl rounded-bl-sm bg-card px-3 py-1.5 shadow-sm">Walk me through how you&apos;d design a rate limiter.</span>
      <span className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3 py-1.5 text-primary-foreground">I&apos;d start with a token bucket per API key…</span>
    </div>
  );
}
