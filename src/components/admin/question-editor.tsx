'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ArrowDown, ArrowLeft, ArrowUp, CheckCircle2, Eye, EyeOff, History, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { QuestionView } from '@/components/player/question-view';
import { RichText } from '@/components/player/rich-text';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { api, ApiError } from '@/lib/api';
import type { ExamConfig, QuestionType } from '@/lib/engine/types';
import type { RevealedQuestion } from '@/lib/engine/sanitize';
import { FLAG_INFO, type ItemFlag } from '@/lib/item-flags';
import { blank, type Draft } from '@/lib/question-draft';
import { cn } from '@/lib/utils';

type Status = Draft['status'];
type Option = Draft['options'][number];
type Prompt = NonNullable<Draft['prompts']>[number];

export interface EditorMeta {
  version?: number;
  source?: string;
  provenance?: string | null;
  stats: { n: number; p: number | null; discrimination: number | null; nScored: number; avgTimeMs: number | null; picks: Record<string, number>; flags: ItemFlag[] } | null;
  revisions: { id: string; version: number; note: string | null; createdAt: string }[];
  reports: { id: string; reason: string; message: string | null; status: string; createdAt: string }[];
}

const LETTERS = 'ABCDEFGH';
const TYPES: { value: QuestionType; label: string }[] = [
  { value: 'single', label: 'Multiple choice' },
  { value: 'multi', label: 'Multiple response' },
  { value: 'truefalse', label: 'True / false' },
  { value: 'order', label: 'Ordering' },
  { value: 'match', label: 'Matching' },
  { value: 'fill', label: 'Fill in the blank' },
];

const nextLetter = (opts: Option[]) => LETTERS.split('').find((l) => !opts.some((o) => o.id === l)) ?? 'H';

/** Reshape options when the author switches question type, keeping any text already written. */
function convertType(d: Draft, type: QuestionType): Draft {
  const texts = d.options.map((o) => o.text);
  const withIds = (n: number) => Array.from({ length: n }, (_, i) => ({ ...blank(LETTERS[i]), text: texts[i] ?? '', why: d.options[i]?.why ?? '' }));
  switch (type) {
    case 'single': {
      const options = withIds(4);
      options[0].correct = true;
      return { ...d, type, select: 1, options, answerOrder: undefined, prompts: undefined, accepted: undefined };
    }
    case 'multi': {
      const options = withIds(5);
      options[0].correct = true; options[1].correct = true;
      return { ...d, type, select: 2, options, answerOrder: undefined, prompts: undefined, accepted: undefined };
    }
    case 'truefalse':
      return { ...d, type, select: 1, options: [{ id: 'A', text: 'True', correct: true, why: '' }, { id: 'B', text: 'False', correct: false, why: '' }], answerOrder: undefined, prompts: undefined, accepted: undefined };
    case 'order': {
      const options = withIds(4).map(({ id, text }) => ({ id, text }));
      return { ...d, type, select: 1, options, answerOrder: options.map((o) => o.id), prompts: undefined, accepted: undefined };
    }
    case 'match': {
      const options = withIds(4).map(({ id, text }) => ({ id, text }));
      return { ...d, type, select: 1, options, prompts: options.slice(0, 3).map((o, i) => ({ id: `P${i + 1}`, text: '', answer: o.id })), answerOrder: undefined, accepted: undefined };
    }
    case 'fill':
      return { ...d, type, select: 1, options: [], accepted: [''], answerOrder: undefined, prompts: undefined };
  }
}

function toPayload(d: Draft) {
  const clean = { ...d, reference: d.reference || null, caseId: d.caseId || null };
  if (d.type === 'order') clean.answerOrder = d.options.map((o) => o.id);
  if (d.type === 'multi') clean.select = d.options.filter((o) => o.correct).length;
  if (d.type === 'fill') clean.accepted = (d.accepted ?? []).map((a) => a.trim()).filter(Boolean);
  return clean;
}

export function QuestionEditor({ exam, initial, meta, questionId }: { exam: ExamConfig; initial: Draft; meta: EditorMeta | null; questionId?: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft>(initial);
  const [note, setNote] = useState('');
  const [showAnswers, setShowAnswers] = useState(false);
  const [previewResponse, setPreviewResponse] = useState<string[]>([]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  // Warn before leaving with unsaved edits.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => { if (dirty) e.preventDefault(); };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  // Live validation, debounced through the query key.
  const [debounced, setDebounced] = useState(draft);
  useEffect(() => { const t = setTimeout(() => setDebounced(draft), 450); return () => clearTimeout(t); }, [draft]);
  const validation = useQuery({
    queryKey: ['admin', 'validate', exam.id, debounced],
    queryFn: () => api.post<{ errors: string[]; warnings: string[] }>('/api/admin/questions/validate', { examId: exam.id, draft: toPayload(debounced) }),
    placeholderData: (prev) => prev,
    staleTime: 60_000,
  });
  const errors = validation.data?.errors ?? [];
  const warnings = validation.data?.warnings ?? [];

  const save = useMutation({
    mutationFn: (status: Status) => {
      const payload = { examId: exam.id, draft: toPayload({ ...draft, status }), note: note || undefined };
      return questionId
        ? api.put<{ id: string; warnings: string[] }>(`/api/admin/questions/${encodeURIComponent(questionId)}`, payload)
        : api.post<{ id: string; warnings: string[] }>('/api/admin/questions', payload);
    },
    onMutate: (status) => setDraft((d) => ({ ...d, status })),
    onError: (err) => {
      setDraft((d) => ({ ...d, status: initial.status }));
      const details = err instanceof ApiError && Array.isArray(err.data?.errors) ? ` (${(err.data!.errors as string[]).length} problems)` : '';
      toast.error(`${err instanceof Error ? err.message : 'Could not save.'}${details}`);
    },
    onSuccess: ({ id }, status) => {
      toast.success(status === 'published' ? 'Published: learners will see it in new attempts.' : status === 'review' ? 'Sent to review' : 'Saved');
      setNote('');
      queryClient.invalidateQueries({ queryKey: ['admin', 'questions', exam.id] });
      if (!questionId) router.replace(`/admin/questions/${encodeURIComponent(id)}?exam=${exam.id}`);
      else router.refresh();
    },
  });

  const preview: RevealedQuestion = useMemo(() => ({
    id: draft.id || 'preview', domain: exam.skills.find((s) => s.id === draft.skill)?.domain ?? 1, skill: draft.skill, difficulty: draft.difficulty,
    type: draft.type, select: draft.type === 'multi' ? Math.max(1, draft.options.filter((o) => o.correct).length) : 1,
    stem: draft.stem, options: draft.options.map((o) => ({ id: o.id, text: o.text || '…', correct: Boolean(o.correct), why: o.why ?? '' })),
    prompts: draft.prompts?.map((p) => ({ ...p, text: p.text || '…' })), answerOrder: draft.type === 'order' ? draft.options.map((o) => o.id) : undefined,
    accepted: draft.accepted, explanation: draft.explanation, reference: draft.reference, caseId: null,
  }), [draft, exam.skills]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="ghost" size="sm"><Link href={`/admin/questions?exam=${exam.id}`}><ArrowLeft /> Questions</Link></Button>
        <h1 className="text-xl font-bold">{questionId ? <span className="font-mono">{questionId}</span> : 'New question'}</h1>
        {meta?.version && <span className="text-xs text-muted-foreground">v{meta.version} · {meta.source}{meta.provenance ? ` · ${meta.provenance}` : ''}</span>}
        {dirty && <span className="rounded-full bg-banana/25 px-2 py-0.5 text-xs font-medium text-cocoa dark:text-banana">Unsaved changes</span>}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_26rem]">
        {/* ---------------- form */}
        <div className="space-y-5">
          <Card title="Classification">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Skill">
                <Select value={draft.skill} onValueChange={(v) => set('skill', v)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {exam.domains.map((d) => exam.skills.filter((s) => s.domain === d.id).map((s) => <SelectItem key={s.id} value={s.id}>D{d.id} · {s.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Question type">
                <Select value={draft.type} onValueChange={(v) => setDraft((d) => convertType(d, v as QuestionType))}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Difficulty">
                <ToggleGroup type="single" variant="outline" value={String(draft.difficulty)} onValueChange={(v) => v && set('difficulty', Number(v) as Draft['difficulty'])} className="w-full">
                  {[1, 2, 3, 4].map((l) => <ToggleGroupItem key={l} value={String(l)} className="flex-1 text-xs">{exam.difficultyLevels[String(l)]?.label ?? l}</ToggleGroupItem>)}
                </ToggleGroup>
              </Field>
              <Field label="Pool">
                <ToggleGroup type="single" variant="outline" value={draft.pool} onValueChange={(v) => v && set('pool', v as Draft['pool'])} className="w-full">
                  <ToggleGroupItem value="bank" className="flex-1 text-xs">Reviewed bank</ToggleGroupItem>
                  <ToggleGroupItem value="imported" className="flex-1 text-xs">Practice only</ToggleGroupItem>
                </ToggleGroup>
              </Field>
            </div>
          </Card>

          <Card title="Question">
            <Textarea value={draft.stem} onChange={(e) => set('stem', e.target.value)} placeholder="Write a scenario-based stem. Wrap code in ``` fences; use `backticks` for inline code." className="min-h-32 font-[inherit]" />
            {draft.type === 'multi' && <p className="text-xs text-muted-foreground">End the stem with &ldquo;(Choose two.)&rdquo; or &ldquo;(Choose three.)&rdquo; to match the number of correct options.</p>}
          </Card>

          <Card title={draft.type === 'fill' ? 'Accepted answers' : draft.type === 'order' ? 'Items, in the correct order' : draft.type === 'match' ? 'Pairs' : 'Options'}>
            {(draft.type === 'single' || draft.type === 'multi' || draft.type === 'truefalse') && <ChoiceEditor draft={draft} setDraft={setDraft} />}
            {draft.type === 'order' && <OrderEditor draft={draft} setDraft={setDraft} />}
            {draft.type === 'match' && <MatchEditor draft={draft} setDraft={setDraft} />}
            {draft.type === 'fill' && <AcceptedEditor draft={draft} setDraft={setDraft} />}
          </Card>

          <Card title="Explanation">
            <Textarea value={draft.explanation} onChange={(e) => set('explanation', e.target.value)} placeholder="The teaching point. Describe options by content, never by letter: options are shuffled." className="min-h-24" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Reference (optional)"><Input value={draft.reference} onChange={(e) => set('reference', e.target.value)} placeholder="e.g. MDN: AbortController" /></Field>
              <Field label="Case study id (optional)"><Input value={draft.caseId} onChange={(e) => set('caseId', e.target.value)} placeholder="e.g. S1" /></Field>
            </div>
          </Card>
        </div>

        {/* ---------------- side panel */}
        <div className="space-y-4 xl:sticky xl:top-20 xl:self-start">
          <section className="space-y-3 rounded-2xl border bg-card p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Status: <span className="capitalize">{draft.status}</span></h2>
              {validation.isFetching && <Spinner className="size-3.5" />}
            </div>
            {errors.length === 0 && warnings.length === 0 ? (
              <p className="flex items-center gap-2 text-sm text-success"><CheckCircle2 className="size-4" /> Passes every check</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {errors.map((e) => <li key={e} className="flex items-start gap-2 text-destructive"><X className="mt-0.5 size-3.5 shrink-0" />{e}</li>)}
                {warnings.map((w) => <li key={w} className="flex items-start gap-2 text-cocoa dark:text-banana"><AlertTriangle className="mt-0.5 size-3.5 shrink-0" />{w}</li>)}
              </ul>
            )}
            {questionId && <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="What changed? (saved in history)" className="h-9" />}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" disabled={save.isPending} onClick={() => save.mutate('draft')}>Save draft</Button>
              <Button variant="outline" disabled={save.isPending || errors.length > 0} onClick={() => save.mutate('review')}>Send to review</Button>
              <Button variant="premium" className="col-span-2" disabled={save.isPending || errors.length > 0} onClick={() => save.mutate('published')}>
                {save.isPending && <Spinner />} {draft.status === 'published' && questionId ? 'Save & keep published' : 'Publish'}
              </Button>
              {questionId && draft.status !== 'retired' && (
                <Button variant="ghost" className="col-span-2 text-destructive hover:text-destructive" disabled={save.isPending} onClick={() => save.mutate('retired')}>Retire question</Button>
              )}
            </div>
          </section>

          <section className="space-y-3 rounded-2xl border bg-card p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Learner preview</h2>
              <Button variant="ghost" size="xs" onClick={() => setShowAnswers((v) => !v)}>{showAnswers ? <><EyeOff /> Hide answers</> : <><Eye /> Show answers</>}</Button>
            </div>
            <div className="max-h-[32rem] space-y-3 overflow-y-auto pr-1">
              <RichText text={draft.stem || 'Your question stem appears here.'} className="text-sm font-medium" />
              <QuestionView item={preview} response={previewResponse} onChange={setPreviewResponse} revealed={showAnswers ? preview : null} />
              {showAnswers && draft.explanation && <RichText text={draft.explanation} className="rounded-xl bg-secondary/50 p-3 text-xs" />}
            </div>
          </section>

          {meta?.stats && <StatsPanel stats={meta.stats} options={draft.options} type={draft.type} />}

          {meta && meta.reports.length > 0 && (
            <section className="space-y-2 rounded-2xl border bg-card p-4">
              <h2 className="text-sm font-semibold">Learner reports</h2>
              <ul className="space-y-2 text-sm">
                {meta.reports.map((r) => (
                  <li key={r.id} className="rounded-xl bg-secondary/50 p-2.5">
                    <span className="flex items-center justify-between text-xs"><b className="capitalize">{r.reason.replace('-', ' ')}</b><span className="text-muted-foreground">{r.status}</span></span>
                    {r.message && <span className="mt-1 block text-xs text-muted-foreground">{r.message}</span>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {meta && meta.revisions.length > 0 && (
            <section className="space-y-2 rounded-2xl border bg-card p-4">
              <h2 className="flex items-center gap-2 text-sm font-semibold"><History className="size-4" /> History</h2>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                {meta.revisions.map((r) => (
                  <li key={r.id}>v{r.version} saved {new Date(r.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}{r.note ? `: ${r.note}` : ''}</li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- sub-editors

type SetDraft = React.Dispatch<React.SetStateAction<Draft>>;

function ChoiceEditor({ draft, setDraft }: { draft: Draft; setDraft: SetDraft }) {
  const multi = draft.type === 'multi';
  const tf = draft.type === 'truefalse';
  const update = (id: string, patch: Partial<Option>) => setDraft((d) => ({ ...d, options: d.options.map((o) => (o.id === id ? { ...o, ...patch } : o)) }));
  const markCorrect = (id: string, on: boolean) => setDraft((d) => ({
    ...d,
    options: d.options.map((o) => (multi ? (o.id === id ? { ...o, correct: on } : o) : { ...o, correct: o.id === id })),
  }));
  const max = multi ? 6 : 4;
  const min = multi ? 5 : tf ? 2 : 4;
  return (
    <div className="space-y-3">
      {draft.options.map((o, i) => (
        <div key={o.id} className={cn('space-y-2 rounded-xl border p-3', o.correct && 'border-success/50 bg-success/[0.04]')}>
          <div className="flex items-start gap-3">
            <span className="mt-1.5 grid size-7 shrink-0 place-items-center rounded-lg border text-xs font-bold">{LETTERS[i]}</span>
            {tf ? <span className="mt-2 flex-1 text-sm font-medium">{o.text}</span> : (
              <Textarea value={o.text} onChange={(e) => update(o.id, { text: e.target.value })} placeholder="Option text" className="min-h-10 flex-1" rows={1} />
            )}
            <label className="mt-2 flex shrink-0 items-center gap-1.5 text-xs font-medium">
              <Checkbox checked={Boolean(o.correct)} onCheckedChange={(v) => markCorrect(o.id, v === true)} /> Correct
            </label>
            {!tf && draft.options.length > min && (
              <Button variant="ghost" size="icon-sm" onClick={() => setDraft((d) => ({ ...d, options: d.options.filter((x) => x.id !== o.id) }))} aria-label={`Remove option ${LETTERS[i]}`}><Trash2 /></Button>
            )}
          </div>
          <Input value={o.why ?? ''} onChange={(e) => update(o.id, { why: e.target.value })} placeholder={o.correct ? 'Why this is right' : 'Why this is wrong'} className="h-9 text-sm" />
        </div>
      ))}
      {!tf && draft.options.length < max && (
        <Button variant="outline" size="sm" onClick={() => setDraft((d) => ({ ...d, options: [...d.options, blank(nextLetter(d.options))] }))}><Plus /> Add option</Button>
      )}
    </div>
  );
}

function OrderEditor({ draft, setDraft }: { draft: Draft; setDraft: SetDraft }) {
  const move = (from: number, to: number) => setDraft((d) => {
    if (to < 0 || to >= d.options.length) return d;
    const options = [...d.options];
    const [x] = options.splice(from, 1);
    options.splice(to, 0, x);
    return { ...d, options };
  });
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">List the items in the correct order. Learners see them shuffled.</p>
      {draft.options.map((o, i) => (
        <div key={o.id} className="flex items-center gap-2">
          <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-secondary text-xs font-bold">{i + 1}</span>
          <Input value={o.text} onChange={(e) => setDraft((d) => ({ ...d, options: d.options.map((x) => (x.id === o.id ? { ...x, text: e.target.value } : x)) }))} placeholder={`Step ${i + 1}`} />
          <Button variant="ghost" size="icon-sm" disabled={i === 0} onClick={() => move(i, i - 1)} aria-label="Move up"><ArrowUp /></Button>
          <Button variant="ghost" size="icon-sm" disabled={i === draft.options.length - 1} onClick={() => move(i, i + 1)} aria-label="Move down"><ArrowDown /></Button>
          {draft.options.length > 3 && <Button variant="ghost" size="icon-sm" onClick={() => setDraft((d) => ({ ...d, options: d.options.filter((x) => x.id !== o.id) }))} aria-label="Remove"><Trash2 /></Button>}
        </div>
      ))}
      {draft.options.length < 6 && <Button variant="outline" size="sm" onClick={() => setDraft((d) => ({ ...d, options: [...d.options, { id: nextLetter(d.options), text: '' }] }))}><Plus /> Add item</Button>}
    </div>
  );
}

function MatchEditor({ draft, setDraft }: { draft: Draft; setDraft: SetDraft }) {
  const prompts = draft.prompts ?? [];
  const setPrompts = (fn: (p: Prompt[]) => Prompt[]) => setDraft((d) => ({ ...d, prompts: fn(d.prompts ?? []) }));
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Left side (prompts) and their match</Label>
        {prompts.map((p, i) => (
          <div key={p.id} className="space-y-1.5 rounded-xl border p-2.5">
            <div className="flex gap-2">
              <Input value={p.text} onChange={(e) => setPrompts((ps) => ps.map((x) => (x.id === p.id ? { ...x, text: e.target.value } : x)))} placeholder={`Prompt ${i + 1}`} />
              {prompts.length > 2 && <Button variant="ghost" size="icon-sm" onClick={() => setPrompts((ps) => ps.filter((x) => x.id !== p.id))} aria-label="Remove prompt"><Trash2 /></Button>}
            </div>
            <Select value={p.answer} onValueChange={(v) => setPrompts((ps) => ps.map((x) => (x.id === p.id ? { ...x, answer: v } : x)))}>
              <SelectTrigger className="h-8 w-full text-xs"><SelectValue placeholder="Matches…" /></SelectTrigger>
              <SelectContent>{draft.options.map((o, j) => <SelectItem key={o.id} value={o.id}>{LETTERS[j]}. {o.text || '(empty option)'}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        ))}
        {prompts.length < 8 && (
          <Button variant="outline" size="sm" onClick={() => setPrompts((ps) => [...ps, { id: `P${Math.max(0, ...ps.map((x) => Number(x.id.slice(1)) || 0)) + 1}`, text: '', answer: draft.options[0]?.id ?? 'A' }])}><Plus /> Add prompt</Button>
        )}
      </div>
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Right side (choices). Extra choices act as distractors.</Label>
        {draft.options.map((o, i) => (
          <div key={o.id} className="flex items-center gap-2">
            <span className="grid size-7 shrink-0 place-items-center rounded-lg border text-xs font-bold">{LETTERS[i]}</span>
            <Input value={o.text} onChange={(e) => setDraft((d) => ({ ...d, options: d.options.map((x) => (x.id === o.id ? { ...x, text: e.target.value } : x)) }))} placeholder="Choice text" />
            {draft.options.length > 2 && !prompts.some((p) => p.answer === o.id) && (
              <Button variant="ghost" size="icon-sm" onClick={() => setDraft((d) => ({ ...d, options: d.options.filter((x) => x.id !== o.id) }))} aria-label="Remove choice"><Trash2 /></Button>
            )}
          </div>
        ))}
        {draft.options.length < 8 && <Button variant="outline" size="sm" onClick={() => setDraft((d) => ({ ...d, options: [...d.options, { id: nextLetter(d.options), text: '' }] }))}><Plus /> Add choice</Button>}
      </div>
    </div>
  );
}

function AcceptedEditor({ draft, setDraft }: { draft: Draft; setDraft: SetDraft }) {
  const accepted = draft.accepted ?? [''];
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Answers are compared ignoring case and extra spaces. Add every spelling you would accept.</p>
      {accepted.map((a, i) => (
        <div key={i} className="flex gap-2">
          <Input value={a} onChange={(e) => setDraft((d) => ({ ...d, accepted: (d.accepted ?? []).map((x, j) => (j === i ? e.target.value : x)) }))} placeholder="Accepted answer" />
          {accepted.length > 1 && <Button variant="ghost" size="icon-sm" onClick={() => setDraft((d) => ({ ...d, accepted: (d.accepted ?? []).filter((_, j) => j !== i) }))} aria-label="Remove answer"><Trash2 /></Button>}
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => setDraft((d) => ({ ...d, accepted: [...(d.accepted ?? []), ''] }))}><Plus /> Add accepted answer</Button>
    </div>
  );
}

function StatsPanel({ stats, options, type }: { stats: NonNullable<EditorMeta['stats']>; options: Option[]; type: QuestionType }) {
  const totalPicks = Object.values(stats.picks).reduce((a, b) => a + b, 0);
  const choice = type === 'single' || type === 'multi' || type === 'truefalse';
  return (
    <section className="space-y-3 rounded-2xl border bg-card p-4">
      <h2 className="text-sm font-semibold">How learners do</h2>
      <dl className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-secondary/50 p-2"><dt className="text-[0.65rem] text-muted-foreground">Answered</dt><dd className="font-heading font-semibold tabular-nums">{stats.n}</dd></div>
        <div className="rounded-xl bg-secondary/50 p-2"><dt className="text-[0.65rem] text-muted-foreground">% correct</dt><dd className="font-heading font-semibold tabular-nums">{stats.p != null ? `${Math.round(stats.p * 100)}%` : '—'}</dd></div>
        <div className="rounded-xl bg-secondary/50 p-2"><dt className="text-[0.65rem] text-muted-foreground">Discrimination</dt><dd className="font-heading font-semibold tabular-nums">{stats.discrimination != null ? stats.discrimination.toFixed(2) : '—'}</dd></div>
      </dl>
      {stats.flags.length > 0 && (
        <ul className="space-y-1.5">
          {stats.flags.map((f) => (
            <li key={f} className={cn('rounded-xl p-2.5 text-xs', FLAG_INFO[f].tone === 'bad' ? 'bg-destructive/10 text-destructive' : 'bg-banana/20')}>
              <b>{FLAG_INFO[f].label}.</b> {FLAG_INFO[f].hint}
            </li>
          ))}
        </ul>
      )}
      {choice && totalPicks > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">How often each option is picked</p>
          {options.map((o, i) => {
            const share = (stats.picks[o.id] ?? 0) / totalPicks;
            return (
              <div key={o.id} className="grid grid-cols-[1.5rem_1fr_2.5rem] items-center gap-2 text-xs">
                <span className="font-bold">{LETTERS[i]}</span>
                <span className="h-2 rounded-r-[4px] bg-secondary/70">
                  <span className="block h-full rounded-r-[4px]" style={{ width: `${Math.max(share * 100, 1)}%`, background: o.correct ? 'var(--success)' : 'var(--chart-1)' }} />
                </span>
                <span className="text-right tabular-nums">{Math.round(share * 100)}%</span>
              </div>
            );
          })}
          <p className="text-[0.65rem] text-muted-foreground">Green is a correct option.</p>
        </div>
      )}
      {stats.n < 20 && <p className="text-xs text-muted-foreground">Signals appear after 20 answers.</p>}
    </section>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-2xl border bg-card p-4 sm:p-5">
      <h2 className="text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">{label}</Label>{children}</div>;
}
