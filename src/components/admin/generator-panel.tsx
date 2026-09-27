'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ExternalLink, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { api } from '@/lib/api';
import type { ExamConfig } from '@/lib/engine/types';

type Result = { created: { id: string; stem: string; type: string; warnings: string[] }[]; rejected: { stem: string; errors: string[] }[] };
const TYPES = [{ id: 'single', label: 'Multiple choice' }, { id: 'multi', label: 'Multiple response' }, { id: 'truefalse', label: 'True / false' }] as const;

export function GeneratorPanel({ exam }: { exam: ExamConfig }) {
  const queryClient = useQueryClient();
  const [skillId, setSkillId] = useState(exam.skills[0]?.id ?? '');
  const [count, setCount] = useState('5');
  const [difficulty, setDifficulty] = useState('2');
  const [types, setTypes] = useState<string[]>(['single', 'multi']);
  const [source, setSource] = useState('');
  const [instructions, setInstructions] = useState('');
  const [results, setResults] = useState<Result[]>([]);

  const generate = useMutation({
    mutationFn: () => api.post<Result>('/api/admin/generate', {
      examId: exam.id, skillId, count: Number(count), difficulty: Number(difficulty), types, source: source || undefined, instructions: instructions || undefined,
    }),
    onSuccess: (r) => {
      setResults((prev) => [r, ...prev]);
      queryClient.invalidateQueries({ queryKey: ['admin', 'questions', exam.id] });
      toast.success(`${r.created.length} draft${r.created.length === 1 ? '' : 's'} created${r.rejected.length ? `, ${r.rejected.length} rejected by validation` : ''}.`);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Generation failed.'),
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
      <section className="space-y-4 rounded-2xl border bg-card p-5 lg:self-start">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Skill</Label>
          <Select value={skillId} onValueChange={setSkillId}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>{exam.domains.map((d) => exam.skills.filter((s) => s.domain === d.id).map((s) => <SelectItem key={s.id} value={s.id}>D{d.id} · {s.name}</SelectItem>))}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">How many</Label>
          <ToggleGroup type="single" variant="outline" value={count} onValueChange={(v) => v && setCount(v)} className="w-full">
            {['1', '3', '5', '10'].map((n) => <ToggleGroupItem key={n} value={n} className="flex-1">{n}</ToggleGroupItem>)}
          </ToggleGroup>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Difficulty</Label>
          <ToggleGroup type="single" variant="outline" value={difficulty} onValueChange={(v) => v && setDifficulty(v)} className="w-full">
            {['1', '2', '3', '4'].map((l) => <ToggleGroupItem key={l} value={l} className="flex-1 text-xs">{exam.difficultyLevels[l]?.label ?? l}</ToggleGroupItem>)}
          </ToggleGroup>
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Question types</Label>
          {TYPES.map((t) => (
            <label key={t.id} className="flex items-center gap-2 text-sm">
              <Checkbox checked={types.includes(t.id)} onCheckedChange={(v) => setTypes((cur) => (v ? [...new Set([...cur, t.id])] : cur.filter((x) => x !== t.id)))} />
              {t.label}
            </label>
          ))}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Source material (optional)</Label>
          <Textarea value={source} onChange={(e) => setSource(e.target.value)} placeholder="Paste docs, release notes or your own notes. Questions are grounded in this plus the skill's study notes." className="min-h-28 text-xs" maxLength={20_000} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Extra guidance (optional)</Label>
          <Textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="e.g. focus on rate limits and retries" className="min-h-16 text-xs" maxLength={1000} />
        </div>
        <Button variant="premium" className="w-full" disabled={!types.length || generate.isPending} onClick={() => generate.mutate()}>
          {generate.isPending ? <Spinner /> : <Sparkles />} Generate drafts
        </Button>
        <p className="text-xs text-muted-foreground">Drafts never reach learners until someone reviews and publishes them.</p>
      </section>

      <section className="space-y-4">
        {generate.isPending && (
          <div className="space-y-3">{Array.from({ length: Number(count) > 3 ? 3 : Number(count) }, (_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
        )}
        {!generate.isPending && results.length === 0 && (
          <div className="rounded-2xl border border-dashed p-12 text-center text-sm text-muted-foreground">
            <Sparkles className="mx-auto mb-3 size-8 text-primary" />
            Generated drafts appear here, each with a link to the editor.
          </div>
        )}
        {results.map((r, i) => (
          <div key={i} className="space-y-2">
            {r.created.map((c) => (
              <div key={c.id} className="flex items-start gap-3 rounded-2xl border bg-card p-4">
                <span className="rounded-full bg-muted px-2 py-0.5 text-[0.65rem] font-semibold">Draft</span>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[0.7rem] text-muted-foreground">{c.id} · {c.type}</p>
                  <p className="line-clamp-3 text-sm">{c.stem}</p>
                  {c.warnings.map((w) => <p key={w} className="mt-1 flex items-center gap-1 text-xs text-cocoa dark:text-banana"><AlertTriangle className="size-3" />{w}</p>)}
                </div>
                <Button asChild variant="outline" size="sm"><Link href={`/admin/questions/${encodeURIComponent(c.id)}?exam=${exam.id}`}><ExternalLink /> Review</Link></Button>
              </div>
            ))}
            {r.rejected.map((x, j) => (
              <div key={j} className="rounded-2xl border border-destructive/30 bg-destructive/[0.04] p-4 text-sm">
                <p className="flex items-center gap-1.5 font-medium text-destructive"><X className="size-4" /> Rejected by validation</p>
                <p className="mt-1 line-clamp-2 text-muted-foreground">{x.stem}</p>
                <p className="mt-1 text-xs text-destructive">{x.errors.join(' · ')}</p>
              </div>
            ))}
          </div>
        ))}
      </section>
    </div>
  );
}
