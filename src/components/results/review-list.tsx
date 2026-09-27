'use client';

import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useMutation } from '@tanstack/react-query';
import { Bookmark, Check, ChevronDown, Clock, Flag, Minus, OctagonAlert, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { QuestionView } from '@/components/player/question-view';
import { ReportDialog } from '@/components/player/report-dialog';
import { RichText } from '@/components/player/rich-text';
import { api } from '@/lib/api';
import type { ResultItem } from '@/lib/dto';
import { TutorButton } from '@/components/tutor/tutor-sheet';
import { cn } from '@/lib/utils';

type Filter = 'all' | 'incorrect' | 'flagged' | 'unanswered';

const fmtTime = (ms: number) => (ms < 60_000 ? `${Math.max(1, Math.round(ms / 1000))}s` : `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`);

export function ReviewList({ items, attemptId, aiTutor = false }: { items: ResultItem[]; attemptId?: string; aiTutor?: boolean }) {
  const incorrect = items.filter((i) => !i.correct).length;
  const [filter, setFilter] = useState<Filter>(incorrect ? 'incorrect' : 'all');
  const [open, setOpen] = useState<string | null>(null);
  const [saved, setSaved] = useState<Set<string>>(() => new Set(items.filter((i) => i.bookmarked).map((i) => i.id)));
  const [reporting, setReporting] = useState<string | null>(null);

  const bookmark = useMutation({
    mutationFn: ({ id, on }: { id: string; on: boolean }) => (on ? api.post('/api/bookmarks', { questionId: id }) : api.delete(`/api/bookmarks/${id}`)),
    onMutate: ({ id, on }) => {
      const previous = new Set(saved);
      setSaved((s) => { const n = new Set(s); if (on) n.add(id); else n.delete(id); return n; });
      return { previous };
    },
    onError: (_e, _v, ctx) => { if (ctx) setSaved(ctx.previous); toast.error("Couldn't update saved questions."); },
    onSuccess: (_d, { on }) => toast.success(on ? 'Saved for later' : 'Removed from saved', { duration: 1600 }),
  });

  const counts = {
    all: items.length,
    incorrect,
    flagged: items.filter((i) => i.flagged).length,
    unanswered: items.filter((i) => !i.answered).length,
  };
  const visible = useMemo(() => items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => filter === 'all' || (filter === 'incorrect' ? !item.correct : filter === 'flagged' ? item.flagged : !item.answered)), [items, filter]);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Review your answers</h2>
        <ToggleGroup type="single" value={filter} onValueChange={(v) => v && setFilter(v as Filter)} variant="outline" size="sm">
          {(['incorrect', 'all', 'flagged', 'unanswered'] as Filter[]).map((f) => (
            <ToggleGroupItem key={f} value={f} disabled={!counts[f]} className="capitalize">
              {f} <span className="ml-1 text-muted-foreground tabular-nums">{counts[f]}</span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {visible.length === 0 && (
        <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">Nothing here. Nice!</p>
      )}

      <ul className="space-y-2.5">
        {visible.map(({ item, index }) => {
          const expanded = open === item.id;
          return (
            <li key={item.id} className={cn('overflow-hidden rounded-2xl border bg-card transition-shadow', expanded && 'shadow-[0_20px_50px_-35px_oklch(0.38_0.06_45/0.6)]')}>
              <button
                type="button"
                onClick={() => setOpen(expanded ? null : item.id)}
                aria-expanded={expanded}
                className="flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-accent/30"
              >
                <span
                  className={cn(
                    'mt-0.5 grid size-7 shrink-0 place-items-center rounded-full',
                    item.correct ? 'bg-success/15 text-success' : item.answered ? 'bg-destructive/12 text-destructive' : 'bg-muted text-muted-foreground',
                  )}
                  aria-label={item.correct ? 'Correct' : item.answered ? 'Incorrect' : 'Unanswered'}
                >
                  {item.correct ? <Check className="size-4" /> : item.answered ? <X className="size-4" /> : <Minus className="size-4" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">Q{index + 1}</span>
                    <span>{item.skillName}</span>
                    {item.timeMs > 0 && <span className="inline-flex items-center gap-1"><Clock className="size-3" />{fmtTime(item.timeMs)}</span>}
                    {item.flagged && <span className="inline-flex items-center gap-1"><Flag className="size-3 fill-banana text-cocoa" />Flagged</span>}
                  </span>
                  <span className={cn('mt-1 block text-sm', !expanded && 'line-clamp-2')}>{item.stem.replace(/```[\s\S]*?```/g, '[code]')}</span>
                </span>
                <ChevronDown className={cn('mt-1 size-4 shrink-0 text-muted-foreground transition-transform', expanded && 'rotate-180')} />
              </button>
              <AnimatePresence initial={false}>
                {expanded && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="space-y-4 border-t px-4 pt-4 pb-5">
                      <RichText text={item.stem} className="font-medium" />
                      <QuestionView item={item} response={item.selected} revealed={item} />
                      <div className="rounded-2xl bg-secondary/50 p-4">
                        <h4 className="mb-1.5 text-sm font-semibold">Explanation</h4>
                        <RichText text={item.explanation} className="text-sm" />
                        {item.reference && <p className="mt-2 text-xs text-muted-foreground">Reference: {item.reference}</p>}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => bookmark.mutate({ id: item.id, on: !saved.has(item.id) })}
                          className={cn(saved.has(item.id) && 'border-primary/40 text-primary')}
                        >
                          <Bookmark className={cn(saved.has(item.id) && 'fill-primary')} />
                          {saved.has(item.id) ? 'Saved' : 'Save for later'}
                        </Button>
                        {aiTutor && <TutorButton questionId={item.id} attemptId={attemptId} wasCorrect={item.correct} />}
                        <Button variant="ghost" size="sm" onClick={() => setReporting(item.id)}><OctagonAlert /> Report</Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ul>
      {reporting && <ReportDialog questionId={reporting} open onOpenChange={(o) => !o && setReporting(null)} />}
    </section>
  );
}
