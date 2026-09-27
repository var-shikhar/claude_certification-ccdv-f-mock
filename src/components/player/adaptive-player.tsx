'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useMutation } from '@tanstack/react-query';
import { ArrowRight, Gauge, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { api, ApiError } from '@/lib/api';
import type { PlayerItem, PlayerState } from '@/lib/dto';
import { QuestionView, selectHint } from './question-view';
import { RichText } from './rich-text';

type Next = { finished: true } | { finished: false; item: PlayerItem; position: number; target: number };

/** Adaptive test: one question at a time, chosen from how you answered; no going back. */
export function AdaptivePlayer({ initial }: { initial: PlayerState }) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const target = initial.adaptive?.target ?? 20;
  const [item, setItem] = useState<PlayerItem>(initial.items[initial.items.length - 1]);
  const [position, setPosition] = useState(initial.items.length);
  const [response, setResponse] = useState<string[]>([]);

  const submit = useMutation({
    mutationFn: () => api.post<Next>(`/api/attempts/${initial.id}/adaptive`, { questionId: item.id, response }),
    onSuccess: (res) => {
      if (res.finished) {
        router.replace(`/attempt/${initial.id}/result`);
        router.refresh();
        return;
      }
      setItem(res.item);
      setPosition(res.position);
      setResponse([]);
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    },
    onError: (err) => {
      if (err instanceof ApiError && (err.code === 'ENDED' || err.code === 'STALE')) { router.refresh(); return; }
      toast.error(err instanceof Error ? err.message : 'Could not submit your answer.');
    },
  });

  const answered = response.some((r) => r.trim().length > 0);
  const go = useCallback(() => { if (answered && !submit.isPending) submit.mutate(); }, [answered, submit]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea, select, [role="listbox"]')) return;
      if (e.key === 'Enter') { e.preventDefault(); go(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4 sm:px-6">
          <Gauge className="size-5 text-primary" />
          <div className="min-w-0 leading-tight">
            <div className="truncate text-sm font-semibold">{initial.examCode} · Adaptive test</div>
            <div className="text-xs text-muted-foreground">Question {position} of {target} · questions adapt to your answers</div>
          </div>
          <Button asChild variant="ghost" size="sm" className="ml-auto"><Link href={`/exams/${initial.examId}`}><LogOut /> Save &amp; exit</Link></Button>
        </div>
        <div className="h-1 bg-secondary" aria-hidden>
          <motion.div className="h-full bg-gradient-brand" animate={{ width: `${((position - 1) / target) * 100}%` }} />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-6 pb-32 sm:px-6">
        <AnimatePresence mode="wait" initial={false}>
          <motion.article
            key={item.id}
            initial={reduce ? false : { opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? undefined : { opacity: 0, x: -24 }}
            transition={{ duration: 0.22 }}
            className="space-y-5"
          >
            <span className="font-heading text-sm font-semibold text-muted-foreground">Question {position}</span>
            <RichText text={item.stem} className="text-[1.05rem] font-medium sm:text-lg" />
            <p className="text-sm text-muted-foreground">{selectHint(item, item.type === 'multi' ? response.length : 0)}</p>
            <QuestionView item={item} response={response} onChange={setResponse} disabled={submit.isPending} />
          </motion.article>
        </AnimatePresence>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/90 px-4 pt-3 pb-safe backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <p className="hidden text-xs text-muted-foreground sm:block">Answers are final once submitted. Your score appears at the end.</p>
          <Button variant="premium" size="xl" className="w-full sm:w-auto" disabled={!answered || submit.isPending} onClick={go}>
            {submit.isPending && <Spinner />}
            {position >= target ? 'Submit & see results' : 'Submit answer'}
            {!submit.isPending && <ArrowRight data-icon="inline-end" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
