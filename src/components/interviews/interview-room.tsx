'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowUp, ChevronDown, Flag, RotateCcw, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { LogoMark } from '@/components/brand/logo';
import { RichText } from '@/components/player/rich-text';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import type { InterviewReport, InterviewTurn } from '@/db/schema';
import { api } from '@/lib/api';
import { focusLabel, levelLabel, roleLabel } from '@/lib/interview-presets';
import { cn } from '@/lib/utils';

export interface InterviewData {
  id: string; role: string; level: string; focus: string; questionTarget: number; status: 'active' | 'completed' | 'abandoned';
  turns: InterviewTurn[]; report: InterviewReport | null; createdAt: string; finishedAt: string | null;
}

export function InterviewRoom({ initial }: { initial: InterviewData }) {
  const queryClient = useQueryClient();
  const key = ['interview', initial.id] as const;
  const { data } = useQuery({ queryKey: key, queryFn: () => api.get<InterviewData>(`/api/interviews/${initial.id}`), initialData: initial, staleTime: Infinity });
  const [text, setText] = useState('');
  const bottom = useRef<HTMLDivElement>(null);
  const asked = data.turns.filter((t) => t.role === 'interviewer' && t.kind === 'question').length;
  const wrapped = data.turns.at(-1)?.kind === 'wrap_up';

  const send = useMutation({
    mutationFn: (answer: string) => api.post<{ turns: InterviewTurn[]; done: boolean }>(`/api/interviews/${initial.id}/answer`, { answer }),
    onMutate: async (answer) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<InterviewData>(key);
      queryClient.setQueryData<InterviewData>(key, (d) => d && { ...d, turns: [...d.turns, { role: 'candidate', content: answer, at: new Date().toISOString() }] });
      setText('');
      return { previous, answer };
    },
    onError: (err, _answer, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(key, ctx.previous);
      if (ctx?.answer) setText(ctx.answer);
      toast.error(err instanceof Error ? err.message : 'Could not send your answer.');
    },
    onSuccess: ({ turns }) => queryClient.setQueryData<InterviewData>(key, (d) => d && { ...d, turns }),
  });

  const finish = useMutation({
    mutationFn: () => api.post<{ report: InterviewReport }>(`/api/interviews/${initial.id}/finish`),
    onSuccess: ({ report }) => queryClient.setQueryData<InterviewData>(key, (d) => d && { ...d, report, status: 'completed' }),
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not create your report.'),
  });

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [data.turns.length, send.isPending]);

  function submit() {
    const answer = text.trim();
    if (!answer || send.isPending) return;
    send.mutate(answer);
  }

  if (data.report) return <InterviewReportView data={data} />;

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-3xl flex-col px-4 sm:px-6">
      <header className="sticky top-14 z-10 -mx-4 flex flex-wrap items-center gap-3 border-b bg-background/85 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6">
        <div className="min-w-0">
          <h1 className="truncate font-semibold">{roleLabel(data.role)} interview</h1>
          <p className="text-xs text-muted-foreground">{levelLabel(data.level)} · {focusLabel(data.focus)} · question {Math.min(asked, data.questionTarget)} of {data.questionTarget}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="hidden h-1.5 w-28 overflow-hidden rounded-full bg-secondary sm:block">
            <div className="h-full bg-gradient-brand transition-all duration-500" style={{ width: `${(Math.min(asked, data.questionTarget) / data.questionTarget) * 100}%` }} />
          </div>
          <Button variant={wrapped ? 'premium' : 'outline'} size="sm" disabled={finish.isPending || send.isPending || !data.turns.some((t) => t.role === 'candidate')} onClick={() => finish.mutate()}>
            {finish.isPending ? <Spinner /> : <Flag />} {wrapped ? 'Get my feedback' : 'End & get feedback'}
          </Button>
        </div>
      </header>

      <div className="flex-1 space-y-5 py-6" aria-live="polite">
        <AnimatePresence initial={false}>
          {data.turns.map((t, i) => (
            <motion.div key={`${t.at}-${i}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn('flex gap-3', t.role === 'candidate' && 'flex-row-reverse')}>
              {t.role === 'interviewer' ? <LogoMark className="size-8 shrink-0" /> : <span className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-brand text-xs font-semibold text-white">You</span>}
              <div className={cn('max-w-[85%] rounded-2xl px-4 py-3 text-[0.95rem]', t.role === 'interviewer' ? 'rounded-tl-sm border bg-card' : 'rounded-tr-sm bg-primary text-primary-foreground')}>
                {t.role === 'interviewer' && t.kind === 'follow_up' && <p className="mb-1 text-[0.7rem] font-semibold tracking-wide text-primary uppercase">Follow-up</p>}
                <RichText text={t.content} />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {send.isPending && (
          <div className="flex gap-3">
            <LogoMark className="size-8 shrink-0" />
            <div className="w-64 space-y-2 rounded-2xl rounded-tl-sm border bg-card px-4 py-3">
              <Skeleton className="h-3 w-5/6" /><Skeleton className="h-3 w-3/5" />
            </div>
          </div>
        )}
        {finish.isPending && (
          <div className="rounded-2xl border bg-card p-5 text-center text-sm text-muted-foreground">
            <Sparkles className="mx-auto mb-2 size-5 animate-pulse text-primary" /> Scoring your answers against the rubric…
          </div>
        )}
        <div ref={bottom} />
      </div>

      {!wrapped && (
        <div className="sticky bottom-20 z-10 -mx-4 bg-gradient-to-t from-background via-background to-transparent px-4 pt-4 pb-4 md:bottom-0 sm:-mx-6 sm:px-6">
          <div className="flex items-end gap-2 rounded-2xl border bg-card p-2 shadow-[0_20px_50px_-30px_oklch(0.38_0.06_45/0.6)] focus-within:border-primary/50">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
              placeholder="Type your answer… (Enter to send, Shift+Enter for a new line)"
              maxLength={4000}
              rows={2}
              className="max-h-48 min-h-12 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
              aria-label="Your answer"
              disabled={send.isPending || finish.isPending}
            />
            <Button variant="premium" size="icon-lg" onClick={submit} disabled={!text.trim() || send.isPending || finish.isPending} aria-label="Send answer"><ArrowUp /></Button>
          </div>
          <p className="mt-1.5 text-right text-[0.7rem] text-muted-foreground">{text.length > 0 ? `${text.length}/4000` : 'Think out loud: interviewers score your reasoning, not just the answer.'}</p>
        </div>
      )}
    </div>
  );
}

function InterviewReportView({ data }: { data: InterviewData }) {
  const r = data.report!;
  const [showTranscript, setShowTranscript] = useState(false);
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6 sm:py-10">
      <section className="relative overflow-hidden rounded-3xl border bg-card p-6 sm:p-8">
        <div aria-hidden className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-banana/25 blur-3xl dark:bg-primary/10" />
        <div className="relative flex flex-col items-center gap-6 sm:flex-row">
          <div className="grid size-32 shrink-0 place-items-center rounded-full border-8 border-primary/80 bg-background">
            <div className="text-center"><div className="font-heading text-4xl font-bold">{r.overall}</div><div className="text-xs text-muted-foreground">out of 10</div></div>
          </div>
          <div className="space-y-2 text-center sm:text-left">
            <p className="text-xs font-semibold tracking-wide text-primary uppercase">{roleLabel(data.role)} · {levelLabel(data.level)} · {focusLabel(data.focus)}</p>
            <h1 className="text-2xl font-bold">Your interview feedback</h1>
            <p className="text-muted-foreground">{r.summary}</p>
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-3xl border bg-card p-5 sm:p-6">
        <h2 className="font-semibold">Rubric</h2>
        <ul className="space-y-4">
          {r.rubric.map((c) => (
            <li key={c.criterion} className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="font-medium">{c.criterion}</span>
                <span className="font-semibold tabular-nums">{c.score}/10</span>
              </div>
              <div className="h-2.5 rounded-r-[4px] bg-secondary/70">
                <div className="h-full rounded-r-[4px] transition-all duration-700" style={{ width: `${c.score * 10}%`, background: 'var(--chart-1)' }} />
              </div>
              <p className="text-sm text-muted-foreground">{c.evidence}</p>
              <p className="text-sm"><b className="text-primary">Try: </b>{c.improve}</p>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="space-y-2 rounded-3xl border bg-card p-5">
          <h2 className="font-semibold text-success">What went well</h2>
          <ul className="list-disc space-y-1.5 pl-5 text-sm">{r.strengths.map((s) => <li key={s}>{s}</li>)}</ul>
        </section>
        <section className="space-y-2 rounded-3xl border bg-card p-5">
          <h2 className="font-semibold text-primary">Work on next</h2>
          <ul className="list-disc space-y-1.5 pl-5 text-sm">{r.improvements.map((s) => <li key={s}>{s}</li>)}</ul>
        </section>
      </div>

      <section className="rounded-3xl border bg-card">
        <button type="button" onClick={() => setShowTranscript((v) => !v)} className="flex w-full items-center justify-between p-5 text-left font-semibold">
          Transcript <ChevronDown className={cn('size-4 transition-transform', showTranscript && 'rotate-180')} />
        </button>
        {showTranscript && (
          <div className="space-y-3 border-t p-5 text-sm">
            {data.turns.map((t, i) => (
              <p key={i}><b className={t.role === 'interviewer' ? 'text-primary' : ''}>{t.role === 'interviewer' ? 'Interviewer' : 'You'}:</b> {t.content}</p>
            ))}
          </div>
        )}
      </section>

      <div className="flex justify-center">
        <Button asChild variant="premium" size="xl"><Link href="/interviews"><RotateCcw data-icon="inline-start" />Practise another interview</Link></Button>
      </div>
    </div>
  );
}
