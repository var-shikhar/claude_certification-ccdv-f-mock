'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { ArrowRight, BookOpenCheck, CalendarClock, ChevronDown, Gauge, Hourglass, RotateCcw, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useStartAttempt } from '@/hooks/use-start-attempt';
import { KINDS } from '@/lib/attempt-kinds';
import type { ExamConfig } from '@/lib/engine/types';
import { cn } from '@/lib/utils';
import { useHubUi, type SetupKind } from '@/stores/hub-ui';
import { DifficultyPicker } from './difficulty-picker';

type Setup = SetupKind | null;

export function PracticeOptions({ exam, signedIn, defaultName, hasImported, due, mistakes, autoOpen }: {
  exam: ExamConfig;
  signedIn: boolean;
  defaultName: string;
  hasImported: boolean;
  due: number;
  mistakes: number;
  /** open this setup sheet on arrival (links from the study plan) */
  autoOpen?: SetupKind;
}) {
  const router = useRouter();
  const setup = useHubUi((s) => s.setup);
  const openSetup = useHubUi((s) => s.openSetup);
  const closeSetup = useHubUi((s) => s.closeSetup);
  const start = useStartAttempt();
  useEffect(() => { if (autoOpen) openSetup(autoOpen); }, [autoOpen, openSetup]);
  const open = (s: SetupKind) => (signedIn ? openSetup(s) : router.push(`/sign-up?next=/exams/${exam.id}`));

  const cards = [
    {
      key: 'full' as const, icon: Timer, title: KINDS.full.label, when: KINDS.full.when,
      meta: `${exam.modes.full?.items ?? exam.itemCount} questions · ${exam.modes.full?.minutes ?? exam.timeLimitMinutes} min`, accent: true,
    },
    {
      key: 'quick' as const, icon: Hourglass, title: KINDS.quick.label, when: KINDS.quick.when,
      meta: `${exam.modes.quick?.items ?? 20} questions · ${exam.modes.quick?.minutes ?? 45} min`,
    },
    {
      key: 'practice' as const, icon: BookOpenCheck, title: KINDS.practice.label, when: KINDS.practice.when,
      meta: 'Pick topics · 5–30 questions · untimed',
    },
  ];

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Ways to practise</h2>
        <p className="text-sm text-muted-foreground">Not sure? Drills while you learn, mocks when you want a score.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {cards.filter((c) => c.key !== 'quick' || exam.modes.quick).map((c, i) => (
          <motion.button
            key={c.key}
            type="button"
            onClick={() => open(c.key)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={cn(
              'group relative flex flex-col gap-3 overflow-hidden rounded-2xl border bg-card p-5 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_18px_40px_-28px_oklch(0.38_0.06_45/0.6)]',
              c.accent && 'border-primary/30',
            )}
          >
            {c.accent && <span className="absolute top-0 right-0 rounded-bl-xl bg-gradient-brand px-2.5 py-1 text-[0.65rem] font-semibold text-white">Exam conditions</span>}
            <c.icon className="size-6 text-primary" />
            <div>
              <div className="font-heading text-base font-semibold">{c.title}</div>
              <p className="mt-1 text-sm text-muted-foreground">{c.when}</p>
            </div>
            <div className="mt-auto flex items-center justify-between pt-1 text-xs text-muted-foreground">
              <span>{c.meta}</span>
              <ArrowRight className="size-4 transition group-hover:translate-x-0.5 group-hover:text-primary" />
            </div>
          </motion.button>
        ))}
      </div>

      {signedIn && (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" disabled={start.isPending} onClick={() => start.mutate({ examId: exam.id, kind: 'adaptive' })}>
            <Gauge /> Adaptive test · {Math.min(20, exam.itemCount)} questions
          </Button>
          {due > 0 && (
            <Button variant="outline" size="sm" disabled={start.isPending} onClick={() => start.mutate({ examId: exam.id, kind: 'review' })}>
              <CalendarClock /> Daily review · {due} due
            </Button>
          )}
          {mistakes > 0 && (
            <Button variant="outline" size="sm" disabled={start.isPending} onClick={() => start.mutate({ examId: exam.id, kind: 'mistakes' })}>
              <RotateCcw /> Retry mistakes · {mistakes}
            </Button>
          )}
        </div>
      )}

      <SetupSheet exam={exam} setup={setup} onClose={closeSetup} defaultName={defaultName} hasImported={hasImported} />
    </section>
  );
}

function SetupSheet({ exam, setup, onClose, defaultName, hasImported }: {
  exam: ExamConfig; setup: Setup; onClose: () => void; defaultName: string; hasImported: boolean;
}) {
  const desktop = useMediaQuery('(min-width: 768px)', true);
  const start = useStartAttempt();
  const [difficulty, setDifficulty] = useState(exam.defaultDifficultyMode);
  const [name, setName] = useState(defaultName);
  const [agree, setAgree] = useState(false);
  const [domains, setDomains] = useState<number[]>([]);
  const [count, setCount] = useState('10');
  const [instant, setInstant] = useState(true);
  const [timed, setTimed] = useState(false);
  const [pool, setPool] = useState<'bank' | 'imported' | 'all'>('bank');
  const [more, setMore] = useState(false);

  const isMock = setup === 'full' || setup === 'quick';
  const mode = isMock ? exam.modes[setup!] : null;

  function begin() {
    if (!setup) return;
    if (isMock) start.mutate({ examId: exam.id, kind: setup, difficulty, candidateName: name });
    else start.mutate({ examId: exam.id, kind: 'practice', difficulty, domains: domains.length ? domains : undefined, count: Number(count), instant, timed, pool });
  }

  return (
    <Sheet open={setup !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side={desktop ? 'right' : 'bottom'} className={cn('flex flex-col gap-0 p-0', desktop ? 'w-full sm:max-w-md' : 'max-h-[92dvh] rounded-t-3xl')}>
        <SheetHeader className="border-b p-5">
          <SheetTitle className="font-heading text-lg">{setup ? KINDS[setup].label : ''}</SheetTitle>
          <SheetDescription>
            {isMock && mode ? `${mode.items} questions · ${mode.minutes} min · scored ${exam.scale.min}–${exam.scale.max.toLocaleString()}, pass ${exam.scale.passing}` : 'Choose what to practise. Everything else is already set sensibly.'}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          {isMock ? (
            <>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Difficulty</Label>
                <DifficultyPicker exam={exam} value={difficulty} onChange={setDifficulty} baseMinutes={mode?.minutes} showCertificate={setup === 'full'} />
              </div>
              {setup === 'full' && (
                <div className="space-y-1.5">
                  <Label htmlFor="candidate" className="text-sm font-semibold">Name on your certificate</Label>
                  <Input id="candidate" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Your name" className="h-11" />
                </div>
              )}
              <ul className="space-y-2 rounded-2xl bg-secondary/50 p-4 text-sm">
                <li><b>The timer starts when you begin</b> and keeps running if you leave. At zero, your answers submit themselves.</li>
                <li><b>No feedback until you submit.</b> Flag questions to come back to them.</li>
                <li><b>No partial credit.</b> Unanswered questions score zero, so answer everything.</li>
              </ul>
              <Label className="flex items-start gap-3 font-normal">
                <Checkbox checked={agree} onCheckedChange={(v) => setAgree(v === true)} className="mt-0.5" />
                <span className="text-sm text-muted-foreground">I&apos;ll take this under exam conditions and understand it&apos;s an independent practice exam, not the official one.</span>
              </Label>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Topics</Label>
                <div className="flex flex-wrap gap-2">
                  <Chip active={domains.length === 0} onClick={() => setDomains([])}>All topics</Chip>
                  {exam.domains.map((d) => (
                    <Chip
                      key={d.id}
                      active={domains.includes(d.id)}
                      onClick={() => setDomains((cur) => (cur.includes(d.id) ? cur.filter((x) => x !== d.id) : [...cur, d.id]))}
                    >
                      {d.name}
                    </Chip>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Questions</Label>
                <ToggleGroup type="single" value={count} onValueChange={(v) => v && setCount(v)} variant="outline" className="w-full">
                  {['5', '10', '20', '30'].map((n) => <ToggleGroupItem key={n} value={n} className="flex-1">{n}</ToggleGroupItem>)}
                </ToggleGroup>
              </div>
              <Label className="flex items-center justify-between gap-4 rounded-2xl border p-4 font-normal">
                <span>
                  <span className="block text-sm font-semibold">Show answers as I go</span>
                  <span className="text-xs text-muted-foreground">See the explanation after each question.</span>
                </span>
                <Switch checked={instant} onCheckedChange={setInstant} />
              </Label>

              <div>
                <button type="button" onClick={() => setMore((m) => !m)} className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
                  More options <ChevronDown className={cn('size-4 transition-transform', more && 'rotate-180')} />
                </button>
                {more && (
                  <div className="mt-4 space-y-5">
                    <Label className="flex items-center justify-between gap-4 rounded-2xl border p-4 font-normal">
                      <span>
                        <span className="block text-sm font-semibold">Exam pace timer</span>
                        <span className="text-xs text-muted-foreground">About {Math.round((exam.timeLimitMinutes * 60) / exam.itemCount)}s per question, like the real exam.</span>
                      </span>
                      <Switch checked={timed} onCheckedChange={setTimed} />
                    </Label>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Difficulty mix</Label>
                      <DifficultyPicker exam={exam} value={difficulty} onChange={setDifficulty} />
                    </div>
                    {hasImported && (
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">Question pool</Label>
                        <ToggleGroup type="single" value={pool} onValueChange={(v) => v && setPool(v as typeof pool)} variant="outline" className="w-full">
                          <ToggleGroupItem value="bank" className="flex-1">Reviewed</ToggleGroupItem>
                          <ToggleGroupItem value="imported" className="flex-1">Imported</ToggleGroupItem>
                          <ToggleGroupItem value="all" className="flex-1">Both</ToggleGroupItem>
                        </ToggleGroup>
                        <p className="text-xs text-muted-foreground">Imported sets come from third parties and have lighter explanations. They never appear in scored mocks.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <SheetFooter className="border-t p-5">
          <Button variant="premium" size="xl" className="w-full" disabled={start.isPending || (isMock && !agree)} onClick={begin}>
            {start.isPending && <Spinner />}
            {isMock ? 'Begin exam' : 'Start drill'}
            {!start.isPending && <ArrowRight data-icon="inline-end" />}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-full border px-3 py-1.5 text-sm transition-colors',
        active ? 'border-primary bg-primary text-primary-foreground' : 'hover:border-primary/40 hover:bg-accent/40',
      )}
    >
      {children}
    </button>
  );
}
