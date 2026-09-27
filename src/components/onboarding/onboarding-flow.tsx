'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Briefcase, GraduationCap, Layers, Check } from 'lucide-react';
import { toast } from 'sonner';
import { LogoMark } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { ExamCard } from '@/server/exams';

type Focus = 'exam' | 'interview' | 'both';

const FOCUS: { key: Focus; icon: typeof GraduationCap; title: string; body: string }[] = [
  { key: 'exam', icon: GraduationCap, title: 'A certification exam', body: 'Timed mocks, drills and a readiness score.' },
  { key: 'interview', icon: Briefcase, title: 'A job interview', body: 'AI mock interviews with rubric feedback.' },
  { key: 'both', icon: Layers, title: 'Both', body: 'Certify first, then nail the interview.' },
];

const GOALS = [
  { n: 5, label: 'Casual', body: '~5 min a day' },
  { n: 10, label: 'Regular', body: '~10 min a day' },
  { n: 20, label: 'Serious', body: '~20 min a day' },
  { n: 40, label: 'Intense', body: '~40 min a day' },
];

export function OnboardingFlow({ exams, name }: { exams: ExamCard[]; name: string }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [focus, setFocus] = useState<Focus | null>(null);
  const [examId, setExamId] = useState<string | null>(exams.length === 1 ? exams[0].id : null);
  const [date, setDate] = useState('');
  const [goal, setGoal] = useState(10);
  const needsExam = focus !== 'interview';
  const steps = needsExam ? 3 : 2;

  const finish = useMutation({
    mutationFn: () => api.post('/api/onboarding', {
      focus: focus ?? 'exam',
      examId: needsExam ? examId ?? undefined : undefined,
      targetDate: needsExam && date ? date : undefined,
      dailyGoal: goal,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }),
    onSuccess: async () => {
      if (needsExam && examId) {
        try {
          const { id } = await api.post<{ id: string }>('/api/attempts', { examId, kind: 'diagnostic' });
          toast.success("You're all set. Here's your diagnostic!");
          router.push(`/attempt/${id}`);
          return;
        } catch {
          router.push(`/exams/${examId}`);
          return;
        }
      }
      router.push(focus === 'interview' ? '/interviews' : '/dashboard');
    },
    onError: () => toast.error('Could not save your choices. Please try again.'),
  });

  const skip = useMutation({
    mutationFn: () => api.post('/api/onboarding', { focus: 'exam', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
    onSuccess: () => router.push('/explore'),
  });

  const canContinue = step === 0 ? Boolean(focus) : step === 1 && needsExam ? Boolean(examId) : true;
  const isLast = step === steps - 1;

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col px-4 py-6 sm:px-6">
      <header className="flex items-center justify-between">
        <LogoMark className="size-9" />
        <div className="flex gap-1.5" aria-label={`Step ${step + 1} of ${steps}`}>
          {Array.from({ length: steps }, (_, i) => (
            <span key={i} className={cn('h-1.5 rounded-full transition-all duration-300', i === step ? 'w-8 bg-primary' : i < step ? 'w-4 bg-primary/50' : 'w-4 bg-secondary')} />
          ))}
        </div>
        <Button variant="ghost" size="sm" onClick={() => skip.mutate()} disabled={skip.isPending}>Skip</Button>
      </header>

      <div className="flex flex-1 flex-col justify-center py-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="space-y-6"
          >
            {step === 0 && (
              <>
                <Heading title={`Welcome${name ? `, ${name}` : ''}! What are you preparing for?`} body="We'll set things up around it. You can change this any time." />
                <div className="grid gap-3">
                  {FOCUS.map((f) => (
                    <Choice key={f.key} selected={focus === f.key} onClick={() => setFocus(f.key)}>
                      <f.icon className="size-6 text-primary" />
                      <span><span className="block font-semibold">{f.title}</span><span className="text-sm text-muted-foreground">{f.body}</span></span>
                    </Choice>
                  ))}
                </div>
              </>
            )}

            {step === 1 && needsExam && (
              <>
                <Heading title="Which exam?" body="Pick one to start. You can add more later." />
                <div className="grid gap-3">
                  {exams.map((e) => (
                    <Choice key={e.id} selected={examId === e.id} onClick={() => setExamId(e.id)}>
                      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-brand text-xs font-bold text-white">{e.code.split('-')[0].slice(0, 4)}</span>
                      <span className="min-w-0"><span className="block font-semibold">{e.title}</span><span className="text-sm text-muted-foreground">{e.code} · {e.itemCount} questions · {e.timeLimitMinutes} min</span></span>
                    </Choice>
                  ))}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="exam-date">Exam date <span className="font-normal text-muted-foreground">(optional)</span></Label>
                  <Input id="exam-date" type="date" value={date} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} className="h-11 max-w-xs" />
                </div>
              </>
            )}

            {isLast && (
              <>
                <Heading title="How much time per day?" body="Small and steady beats cramming. We'll track your streak." />
                <div className="grid grid-cols-2 gap-3">
                  {GOALS.map((g) => (
                    <Choice key={g.n} selected={goal === g.n} onClick={() => setGoal(g.n)} vertical>
                      <span className="font-heading text-2xl font-bold">{g.n}</span>
                      <span className="text-sm font-semibold">{g.label}</span>
                      <span className="text-xs text-muted-foreground">{g.body}</span>
                    </Choice>
                  ))}
                </div>
                <p className="text-center text-sm text-muted-foreground">questions per day</p>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <footer className="flex items-center justify-between gap-3 border-t pt-5 pb-safe">
        <Button variant="ghost" size="xl" onClick={() => setStep((s) => s - 1)} disabled={step === 0}><ArrowLeft data-icon="inline-start" />Back</Button>
        <Button variant="premium" size="xl" disabled={!canContinue || finish.isPending} onClick={() => (isLast ? finish.mutate() : setStep((s) => s + 1))}>
          {finish.isPending && <Spinner />}
          {isLast ? (needsExam ? 'Start my diagnostic' : 'Finish') : 'Continue'}
          {!finish.isPending && <ArrowRight data-icon="inline-end" />}
        </Button>
      </footer>
    </div>
  );
}

function Heading({ title, body }: { title: string; body: string }) {
  return (
    <div className="space-y-2 text-center">
      <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
      <p className="text-muted-foreground">{body}</p>
    </div>
  );
}

function Choice({ selected, onClick, children, vertical }: { selected: boolean; onClick: () => void; children: React.ReactNode; vertical?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'relative flex gap-4 rounded-2xl border bg-card p-4 text-left transition-all hover:border-primary/40',
        vertical ? 'flex-col items-center gap-1 text-center' : 'items-center',
        selected && 'border-primary bg-primary/[0.06] shadow-[0_0_0_1px_var(--primary)]',
      )}
    >
      {children}
      {selected && (
        <span className="absolute top-3 right-3 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground animate-pop">
          <Check className="size-3" />
        </span>
      )}
    </button>
  );
}
