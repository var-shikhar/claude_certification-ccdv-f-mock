'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bookmark, ChevronDown, Play, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { QuestionView } from '@/components/player/question-view';
import { RichText } from '@/components/player/rich-text';
import { StartButton } from '@/components/results/start-button';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import type { RevealedQuestion } from '@/lib/engine/sanitize';
import { cn } from '@/lib/utils';
import { TutorButton } from '@/components/tutor/tutor-sheet';

export interface SavedItem {
  questionId: string;
  examId: string;
  examCode: string;
  examTitle: string;
  note: string | null;
  savedAt: string;
  skillName: string;
  question: RevealedQuestion;
}

const KEY = ['bookmarks'] as const;

export function SavedList({ initial, aiTutor = false }: { initial: SavedItem[]; aiTutor?: boolean }) {
  const queryClient = useQueryClient();
  const { data: items = [] } = useQuery({ queryKey: KEY, queryFn: () => api.get<SavedItem[]>('/api/bookmarks'), initialData: initial, staleTime: 30_000 });
  const [open, setOpen] = useState<string | null>(null);

  const remove = useMutation({
    mutationFn: (item: SavedItem) => api.delete(`/api/bookmarks/${item.questionId}`),
    onMutate: async (item) => {
      await queryClient.cancelQueries({ queryKey: KEY });
      const previous = queryClient.getQueryData<SavedItem[]>(KEY);
      queryClient.setQueryData<SavedItem[]>(KEY, (list) => list?.filter((i) => i.questionId !== item.questionId));
      return { previous };
    },
    onError: (_e, _item, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(KEY, ctx.previous);
      toast.error("Couldn't remove it. Please try again.");
    },
    onSuccess: (_d, item) => {
      toast('Removed from saved', { action: { label: 'Undo', onClick: () => restore.mutate(item) } });
    },
  });

  const restore = useMutation({
    mutationFn: (item: SavedItem) => api.post('/api/bookmarks', { questionId: item.questionId, note: item.note }),
    onMutate: async (item) => {
      await queryClient.cancelQueries({ queryKey: KEY });
      queryClient.setQueryData<SavedItem[]>(KEY, (list) => (list ? [item, ...list] : [item]));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });

  if (!items.length) {
    return (
      <div className="rounded-3xl border border-dashed p-12 text-center">
        <Bookmark className="mx-auto size-10 text-primary" />
        <p className="mt-3 font-medium">Nothing saved yet</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">Tap <b>Save</b> on any question during practice or in your results to keep it here with your own notes.</p>
        <Button asChild variant="outline" className="mt-5"><Link href="/explore">Find something to practise</Link></Button>
      </div>
    );
  }

  const groups = items.reduce<Record<string, SavedItem[]>>((acc, i) => { (acc[i.examId] ??= []).push(i); return acc; }, {});

  return (
    <div className="space-y-8">
      {Object.entries(groups).map(([examId, list]) => (
        <section key={examId} className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">{list[0].examCode} <span className="font-normal text-muted-foreground">· {list.length} saved</span></h2>
            <StartButton variant="outline" size="sm" input={{ examId, kind: 'saved', count: Math.min(list.length, 60) }}><Play /> Practise these</StartButton>
          </div>
          <ul className="space-y-2.5">
            <AnimatePresence initial={false}>
              {list.map((item) => {
                const expanded = open === item.questionId;
                // No `layout`: it re-measured every item on each expand and note save. The exit's height
                // collapse already slides the items below into place.
                return (
                  <motion.li key={item.questionId} exit={{ opacity: 0, height: 0 }} className="overflow-hidden rounded-2xl border bg-card">
                    <button type="button" onClick={() => setOpen(expanded ? null : item.questionId)} aria-expanded={expanded} className="flex w-full items-start gap-3 p-4 text-left hover:bg-accent/30">
                      <Bookmark className="mt-0.5 size-4 shrink-0 fill-primary text-primary" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs text-muted-foreground">{item.skillName} · saved {new Date(item.savedAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                        <span className={cn('mt-1 block text-sm', !expanded && 'line-clamp-2')}>{item.question.stem.replace(/```[\s\S]*?```/g, '[code]')}</span>
                        {!expanded && item.note && <span className="mt-1.5 block truncate text-xs text-primary">Note: {item.note}</span>}
                      </span>
                      <ChevronDown className={cn('mt-1 size-4 shrink-0 text-muted-foreground transition-transform', expanded && 'rotate-180')} />
                    </button>
                    {expanded && (
                      <div className="space-y-4 border-t px-4 pt-4 pb-5">
                        <RichText text={item.question.stem} className="font-medium" />
                        <QuestionView item={item.question} response={[]} revealed={item.question} />
                        <div className="rounded-2xl bg-secondary/50 p-4">
                          <h4 className="mb-1.5 text-sm font-semibold">Explanation</h4>
                          <RichText text={item.question.explanation} className="text-sm" />
                        </div>
                        <NoteEditor item={item} />
                        {aiTutor && <TutorButton questionId={item.questionId} />}
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => remove.mutate(item)}>
                          <Trash2 /> Remove from saved
                        </Button>
                      </div>
                    )}
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        </section>
      ))}
    </div>
  );
}

/** Personal note with optimistic, debounced autosave. */
function NoteEditor({ item }: { item: SavedItem }) {
  const queryClient = useQueryClient();
  const [value, setValue] = useState(item.note ?? '');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useMutation({
    mutationFn: (note: string) => api.post('/api/bookmarks', { questionId: item.questionId, note }),
    onMutate: (note) => {
      setStatus('saving');
      const previous = queryClient.getQueryData<SavedItem[]>(KEY);
      queryClient.setQueryData<SavedItem[]>(KEY, (list) => list?.map((i) => (i.questionId === item.questionId ? { ...i, note } : i)));
      return { previous };
    },
    onError: (_e, _n, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(KEY, ctx.previous);
      setStatus('idle');
      toast.error("Couldn't save your note.");
    },
    onSuccess: () => setStatus('saved'),
  });

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={`note-${item.questionId}`} className="text-sm font-semibold">Your note</label>
        <span className="text-xs text-muted-foreground" aria-live="polite">{status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved' : ''}</span>
      </div>
      <Textarea
        id={`note-${item.questionId}`}
        value={value}
        placeholder="Why did this trip you up? What will you remember next time?"
        maxLength={4000}
        onChange={(e) => {
          const note = e.target.value;
          setValue(note);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => save.mutate(note), 700);
        }}
        className="min-h-24"
      />
    </div>
  );
}
