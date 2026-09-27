'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  ArrowLeft, ArrowRight, Bookmark, BookOpen, Check, ChevronDown, CircleHelp, Ellipsis, Flag, LayoutGrid, LogOut, OctagonAlert, Trash2, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Kbd } from '@/components/ui/kbd';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useMediaQuery } from '@/hooks/use-media-query';
import { KINDS } from '@/lib/attempt-kinds';
import type { PlayerState } from '@/lib/dto';
import { cn } from '@/lib/utils';
import { usePlayerUi } from '@/stores/player-ui';
import { ExamTimer } from './exam-timer';
import { FinishDialog } from './finish-dialog';
import { QuestionNavigator, itemStatus } from './question-navigator';
import { QuestionView, selectHint } from './question-view';
import { ReportDialog } from './report-dialog';
import { RichText } from './rich-text';
import { SaveIndicator } from './save-indicator';
import { useAttempt } from './use-attempt';
import { TutorButton } from '@/components/tutor/tutor-sheet';

const TIME_COMMIT_MS = 30_000;

export function ExamPlayer({ initial }: { initial: PlayerState }) {
  const { state, saveState, update, check, bookmark, submit, abandon } = useAttempt(initial);
  const ui = usePlayerUi();
  const reduceMotion = useReducedMotion();
  const desktop = useMediaQuery('(min-width: 1024px)', true);
  const [reportOpen, setReportOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [direction, setDirection] = useState(1);
  const offsetMs = useMemo(() => new Date(initial.serverNow).getTime() - Date.now(), [initial.serverNow]);

  useEffect(() => { ui.reset(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const kind = KINDS[state.kind];
  const isDrill = state.instant;
  const total = state.items.length;
  const index = Math.min(state.current, total - 1);
  const item = state.items[index];
  const response = state.responses[item.id] ?? [];
  const revealed = state.revealed[item.id] ?? null;
  const flagged = Boolean(state.flags[item.id]);
  const saved = state.bookmarks.includes(item.id);
  const caseStudy = item.caseId ? state.cases[item.caseId] : null;
  const last = index === total - 1;
  const answeredCount = state.items.filter((q) => itemStatus(state, q.id).answered).length;
  const flaggedCount = state.items.filter((q) => state.flags[q.id]).length;
  const hasAnswer = response.some((r) => r.trim().length > 0);

  // ---- time on each question (absolute totals, committed on leave and every 30s)
  const shownAt = useRef(Date.now());
  const stateRef = useRef(state);
  stateRef.current = state;
  const commitTime = useCallback((questionId: string) => {
    const delta = Date.now() - shownAt.current;
    shownAt.current = Date.now();
    if (delta < 500) return undefined;
    const totalMs = (stateRef.current.timeSpent[questionId] ?? 0) + delta;
    return { [questionId]: Math.round(totalMs) };
  }, []);
  useEffect(() => {
    shownAt.current = Date.now();
    const t = setInterval(() => {
      const timeSpent = commitTime(item.id);
      if (timeSpent) update({ timeSpent });
    }, TIME_COMMIT_MS);
    return () => clearInterval(t);
  }, [item.id, commitTime, update]);

  const go = useCallback((next: number) => {
    const target = Math.max(0, Math.min(next, total - 1));
    if (target === index) return;
    setDirection(target > index ? 1 : -1);
    const timeSpent = commitTime(item.id);
    update({ current: target, ...(timeSpent ? { timeSpent } : {}) });
    ui.setNavigatorOpen(false);
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  }, [total, index, commitTime, item.id, update, ui, reduceMotion]);

  const setResponse = useCallback((next: string[]) => {
    if (revealed) return;
    update({ responses: { [item.id]: next } });
  }, [revealed, update, item.id]);

  const toggleFlag = useCallback(() => update({ flags: { [item.id]: !flagged } }), [update, item.id, flagged]);

  const doCheck = useCallback(() => {
    if (!hasAnswer || revealed || check.isPending) return;
    check.mutate({ questionId: item.id, response });
  }, [hasAnswer, revealed, check, item.id, response]);

  const primary = useCallback(() => {
    if (isDrill && !revealed) return doCheck();
    if (last) return ui.setFinishOpen(true);
    go(index + 1);
  }, [isDrill, revealed, doCheck, last, ui, go, index]);

  const onExpire = useCallback(() => submit.mutate(), [submit]);

  // ---- keyboard shortcuts (ignored while typing)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement;
      if (el.closest('input, textarea, select, [contenteditable="true"], [role="dialog"], [role="alertdialog"], [role="listbox"]')) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === 'arrowright') { e.preventDefault(); go(index + 1); }
      else if (k === 'arrowleft') { e.preventDefault(); go(index - 1); }
      else if (k === 'f') toggleFlag();
      else if (k === 'n') ui.setNavigatorOpen(!ui.navigatorOpen);
      else if (k === 'enter') { e.preventDefault(); primary(); }
      else if (/^[a-h1-8]$/.test(k) && ['single', 'multi', 'truefalse'].includes(item.type) && !revealed) {
        const pos = /\d/.test(k) ? Number(k) - 1 : k.charCodeAt(0) - 97;
        const opt = item.options[pos];
        if (!opt) return;
        if (item.type === 'multi') {
          const has = response.includes(opt.id);
          if (has) setResponse(response.filter((x) => x !== opt.id));
          else if (response.length < item.select) setResponse([...response, opt.id]);
        } else setResponse([opt.id]);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, index, toggleFlag, ui, primary, item, revealed, response, setResponse]);

  const jumpToFirst = (pred: (id: string) => boolean) => {
    const i = state.items.findIndex((q) => pred(q.id));
    ui.setFinishOpen(false);
    if (i >= 0) go(i);
  };

  const navigator = <QuestionNavigator state={state} onJump={go} />;

  return (
    <div className="flex min-h-dvh flex-col">
      {/* ---------------- top bar */}
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-3 sm:px-6">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Exam menu"><Ellipsis /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuItem asChild>
                <Link href={`/exams/${state.examId}`}><LogOut /> Save &amp; exit</Link>
              </DropdownMenuItem>
              {state.deadline && (
                <p className="px-2 pb-1.5 text-xs text-muted-foreground">The timer keeps running while you&apos;re away.</p>
              )}
              <DropdownMenuItem onSelect={() => setReportOpen(true)}><OctagonAlert /> Report this question</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setDiscardOpen(true)}><Trash2 /> Discard attempt</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="min-w-0 leading-tight">
            <div className="truncate text-sm font-semibold">{state.examCode} · {kind.label}</div>
            <div className="hidden truncate text-xs text-muted-foreground sm:block">{state.difficultyLabel} · {isDrill ? 'answers after each question' : 'answers at the end'}</div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <SaveIndicator state={saveState} className="hidden sm:inline-flex" />
            {state.deadline ? (
              <ExamTimer deadline={state.deadline} offsetMs={offsetMs} onExpire={onExpire} />
            ) : (
              <span className="hidden h-8 items-center rounded-full border bg-secondary px-3 text-xs font-medium text-muted-foreground sm:inline-flex">Untimed</span>
            )}
            <Button variant="outline" size="icon" className="lg:hidden" onClick={() => ui.setNavigatorOpen(true)} aria-label="Question navigator">
              <LayoutGrid />
            </Button>
            <Button variant="premium" className="hidden sm:inline-flex" onClick={() => ui.setFinishOpen(true)}>
              {isDrill ? 'Finish' : 'Submit'}
            </Button>
          </div>
        </div>
        <div className="h-1 bg-secondary" aria-hidden>
          <motion.div className="h-full bg-gradient-brand" animate={{ width: `${(answeredCount / total) * 100}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} />
        </div>
      </header>

      {/* ---------------- body */}
      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-8 px-4 pt-6 pb-32 sm:px-6 lg:pb-12">
        <main className="min-w-0 flex-1">
          <AnimatePresence mode="wait" initial={false} custom={direction}>
            <motion.article
              key={item.id}
              custom={direction}
              initial={reduceMotion ? false : { opacity: 0, x: direction * 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, x: direction * -24 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="space-y-5"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-heading text-sm font-semibold text-muted-foreground">Question {index + 1} <span className="font-normal">of {total}</span></span>
                {isDrill && <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground">{item.skillName}</span>}
                <div className="ml-auto flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={toggleFlag} aria-pressed={flagged} className={cn(flagged && 'text-cocoa dark:text-banana')}>
                    <Flag className={cn(flagged && 'fill-banana')} /> <span className="hidden sm:inline">{flagged ? 'Flagged' : 'Flag'}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => bookmark.mutate({ questionId: item.id, on: !saved })}
                    aria-pressed={saved}
                    className={cn(saved && 'text-primary')}
                  >
                    <Bookmark className={cn(saved && 'fill-primary')} /> <span className="hidden sm:inline">{saved ? 'Saved' : 'Save'}</span>
                  </Button>
                </div>
              </div>

              {caseStudy && (
                <div className="rounded-2xl border bg-secondary/40">
                  <button type="button" onClick={() => ui.setCaseOpen(!ui.caseOpen)} className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold">
                    <BookOpen className="size-4 text-primary" /> Case study: {caseStudy.title}
                    <ChevronDown className={cn('ml-auto size-4 transition-transform', ui.caseOpen && 'rotate-180')} />
                  </button>
                  {ui.caseOpen && <RichText text={caseStudy.scenario} className="border-t px-4 py-3 text-sm text-muted-foreground" />}
                </div>
              )}

              <RichText text={item.stem} className="text-[1.05rem] font-medium sm:text-lg" />
              <p className="text-sm text-muted-foreground">{selectHint(item, item.type === 'multi' ? response.length : 0)}</p>

              <QuestionView item={item} response={response} onChange={setResponse} revealed={revealed} />

              <AnimatePresence>
                {revealed && (
                  <motion.section
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn('space-y-2 rounded-2xl border p-4 sm:p-5', revealed.correct ? 'border-success/40 bg-success/[0.06]' : 'border-destructive/30 bg-destructive/[0.05]')}
                  >
                    <h3 className={cn('flex items-center gap-2 text-base font-semibold', revealed.correct ? 'text-success' : 'text-destructive')}>
                      {revealed.correct ? <Check className="size-5" /> : <X className="size-5" />}
                      {revealed.correct ? 'Correct!' : 'Not quite'}
                    </h3>
                    <RichText text={revealed.explanation} className="text-sm" />
                    {revealed.reference && <p className="text-xs text-muted-foreground">Reference: {revealed.reference}</p>}
                    {state.aiTutor && <div className="pt-1"><TutorButton questionId={item.id} attemptId={state.id} wasCorrect={revealed.correct} /></div>}
                  </motion.section>
                )}
              </AnimatePresence>

              <p className="hidden items-center gap-3 text-xs text-muted-foreground lg:flex">
                <span><Kbd>A</Kbd>–<Kbd>F</Kbd> answer</span>
                <span><Kbd>←</Kbd> <Kbd>→</Kbd> move</span>
                <span><Kbd>F</Kbd> flag</span>
                <span><Kbd>Enter</Kbd> {isDrill ? 'check / next' : 'next'}</span>
              </p>
            </motion.article>
          </AnimatePresence>

          {/* desktop step controls */}
          <div className="mt-8 hidden items-center justify-between lg:flex">
            <Button variant="outline" size="xl" onClick={() => go(index - 1)} disabled={index === 0}><ArrowLeft data-icon="inline-start" /> Previous</Button>
            <PrimaryButton isDrill={isDrill} revealed={Boolean(revealed)} hasAnswer={hasAnswer} last={last} checking={check.isPending} onClick={primary} onSkip={() => go(index + 1)} />
          </div>
        </main>

        {/* desktop navigator */}
        <aside className="hidden w-72 shrink-0 lg:block">
          <div className="sticky top-24 space-y-4 rounded-2xl border bg-card p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Questions</h2>
              <SaveIndicator state={saveState} />
            </div>
            {navigator}
            <Button variant="outline" className="w-full" onClick={() => ui.setFinishOpen(true)}>
              {isDrill ? 'Finish drill' : 'Review & submit'}
            </Button>
          </div>
        </aside>
      </div>

      {/* mobile step controls */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/90 px-3 pt-3 pb-safe backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-2xl items-center gap-2">
          <Button variant="outline" size="icon-lg" onClick={() => go(index - 1)} disabled={index === 0} aria-label="Previous question"><ArrowLeft /></Button>
          <div className="flex-1">
            <PrimaryButton isDrill={isDrill} revealed={Boolean(revealed)} hasAnswer={hasAnswer} last={last} checking={check.isPending} onClick={primary} onSkip={() => go(index + 1)} block />
          </div>
          <Button variant="outline" size="icon-lg" onClick={() => go(index + 1)} disabled={last} aria-label="Next question"><ArrowRight /></Button>
        </div>
      </div>

      {!desktop && (
        <Sheet open={ui.navigatorOpen} onOpenChange={ui.setNavigatorOpen}>
          <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-3xl">
            <SheetHeader><SheetTitle>Questions</SheetTitle></SheetHeader>
            <div className="px-4 pb-6">
              {navigator}
              <Button variant="premium" size="xl" className="mt-5 w-full" onClick={() => { ui.setNavigatorOpen(false); ui.setFinishOpen(true); }}>
                {isDrill ? 'Finish drill' : 'Review & submit'}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      )}

      <FinishDialog
        open={ui.finishOpen}
        onOpenChange={ui.setFinishOpen}
        total={total}
        answered={answeredCount}
        flagged={flaggedCount}
        isDrill={isDrill}
        pending={submit.isPending}
        onSubmit={() => submit.mutate()}
        onReviewFlagged={() => jumpToFirst((id) => Boolean(state.flags[id]))}
        onReviewUnanswered={() => jumpToFirst((id) => !itemStatus(state, id).answered)}
      />

      <ReportDialog questionId={item.id} open={reportOpen} onOpenChange={setReportOpen} />

      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard this attempt?</AlertDialogTitle>
            <AlertDialogDescription>
              It won&apos;t be scored or appear in your history. {isDrill ? 'Questions you already checked still count toward your streak and review queue.' : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep going</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => abandon.mutate()}>Discard</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function PrimaryButton({ isDrill, revealed, hasAnswer, last, checking, onClick, onSkip, block }: {
  isDrill: boolean; revealed: boolean; hasAnswer: boolean; last: boolean; checking: boolean; onClick: () => void; onSkip: () => void; block?: boolean;
}) {
  if (isDrill && !revealed) {
    return (
      <div className={cn('flex items-center gap-2', block && 'w-full')}>
        {!hasAnswer && !last && (
          <Button variant="ghost" size="xl" onClick={onSkip} className={cn(block && 'hidden')}>Skip</Button>
        )}
        <Button variant="premium" size="xl" onClick={onClick} disabled={!hasAnswer || checking} className={cn(block && 'w-full')}>
          {checking ? <Spinner /> : <CircleHelp data-icon="inline-start" />}
          Check answer
        </Button>
      </div>
    );
  }
  return (
    <Button variant="premium" size="xl" onClick={onClick} className={cn(block && 'w-full')}>
      {last ? (isDrill ? 'Finish drill' : 'Review & submit') : 'Next question'}
      {!last && <ArrowRight data-icon="inline-end" />}
    </Button>
  );
}
