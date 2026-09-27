'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Download, FileUp, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface PreviewItem { id: string; stem: string; type: string; skill: string; errors: string[]; warnings: string[]; exists: boolean }
interface Preview { items: PreviewItem[]; skipped: string[]; valid: number }

export function ImportPanel({ examId, examCode }: { examId: string; examCode: string }) {
  const queryClient = useQueryClient();
  const [format, setFormat] = useState<'csv' | 'json'>('json');
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState('');
  const [setName, setSetName] = useState('import');
  const [pool, setPool] = useState<'bank' | 'imported'>('imported');
  const [status, setStatus] = useState<'draft' | 'review' | 'published'>('draft');
  const [overwrite, setOverwrite] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);

  const body = () => ({ examId, format, text, setName: setName || undefined, pool, status, overwrite });
  const check = useMutation({
    mutationFn: () => api.post<Preview>('/api/admin/import/preview', body()),
    onSuccess: setPreview,
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not read that file.'),
  });
  const commit = useMutation({
    mutationFn: () => api.post<{ imported: number; skippedInvalid: number; skippedExisting: number }>('/api/admin/import', body()),
    onSuccess: (r) => {
      toast.success(`Imported ${r.imported} question${r.imported === 1 ? '' : 's'}${r.skippedExisting ? `, ${r.skippedExisting} already existed` : ''}${r.skippedInvalid ? `, ${r.skippedInvalid} had errors` : ''}.`);
      setPreview(null); setText(''); setFileName('');
      queryClient.invalidateQueries({ queryKey: ['admin', 'questions', examId] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Import failed.'),
  });

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 5_000_000) { toast.error('That file is over 5 MB.'); return; }
    setFileName(file.name);
    setFormat(file.name.toLowerCase().endsWith('.csv') ? 'csv' : 'json');
    setText(await file.text());
    setPreview(null);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <section className="space-y-4 rounded-2xl border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Import into {examCode}</h2>
          <ToggleGroup type="single" variant="outline" size="sm" value={format} onValueChange={(v) => { if (v) { setFormat(v as typeof format); setPreview(null); } }}>
            <ToggleGroupItem value="json" className="px-3">JSON</ToggleGroupItem>
            <ToggleGroupItem value="csv" className="px-3">Udemy CSV</ToggleGroupItem>
          </ToggleGroup>
        </div>

        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed p-6 text-center transition-colors hover:border-primary/40 hover:bg-accent/20">
          <FileUp className="size-7 text-primary" />
          <span className="text-sm font-medium">{fileName || 'Choose a .json or .csv file'}</span>
          <span className="text-xs text-muted-foreground">or paste the contents below</span>
          <input type="file" accept=".json,.csv,application/json,text/csv" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
        <Textarea
          value={text}
          onChange={(e) => { setText(e.target.value); setPreview(null); }}
          placeholder={format === 'json' ? '[ { "id": "…", "domain": 1, "skill": "…", … } ]' : 'Question,Question Type,Answer Option 1,…'}
          className="min-h-40 font-mono text-xs"
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Add to</Label>
            <ToggleGroup type="single" variant="outline" size="sm" value={pool} onValueChange={(v) => v && setPool(v as typeof pool)} className="w-full">
              <ToggleGroupItem value="imported" className="flex-1">Practice pool</ToggleGroupItem>
              <ToggleGroupItem value="bank" className="flex-1">Reviewed bank</ToggleGroupItem>
            </ToggleGroup>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Status after import</Label>
            <ToggleGroup type="single" variant="outline" size="sm" value={status} onValueChange={(v) => v && setStatus(v as typeof status)} className="w-full">
              <ToggleGroupItem value="draft" className="flex-1">Draft</ToggleGroupItem>
              <ToggleGroupItem value="review" className="flex-1">Review</ToggleGroupItem>
              <ToggleGroupItem value="published" className="flex-1">Published</ToggleGroupItem>
            </ToggleGroup>
          </div>
          {format === 'csv' && (
            <div className="space-y-1.5">
              <Label htmlFor="set" className="text-xs text-muted-foreground">Set name (used in generated ids)</Label>
              <Input id="set" value={setName} onChange={(e) => setSetName(e.target.value.replace(/[^a-z0-9-]/gi, '').slice(0, 40))} className="h-9" />
            </div>
          )}
          <label className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm">
            <span>Overwrite questions with the same id</span>
            <Switch checked={overwrite} onCheckedChange={setOverwrite} />
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={!text.trim() || check.isPending} onClick={() => check.mutate()}>{check.isPending && <Spinner />} Check file</Button>
          <Button variant="premium" disabled={!preview?.valid || commit.isPending} onClick={() => commit.mutate()}>
            {commit.isPending && <Spinner />} Import {preview?.valid ?? 0} valid question{preview?.valid === 1 ? '' : 's'}
          </Button>
        </div>

        {preview && (
          <div className="space-y-2">
            <p className="text-sm">
              <b>{preview.valid}</b> of {preview.items.length} ready{preview.skipped.length ? `, ${preview.skipped.length} rows skipped while reading` : ''}.
              {preview.items.some((i) => i.exists) && <span className="text-muted-foreground"> Items marked &ldquo;exists&rdquo; are {overwrite ? 'overwritten' : 'skipped'}.</span>}
            </p>
            <ul className="max-h-96 divide-y overflow-y-auto rounded-xl border">
              {preview.items.map((it, i) => (
                <li key={`${it.id}-${i}`} className="px-3 py-2 text-sm">
                  <div className="flex items-center gap-2">
                    {it.errors.length ? <X className="size-4 shrink-0 text-destructive" /> : <CheckCircle2 className="size-4 shrink-0 text-success" />}
                    <span className="font-mono text-xs">{it.id}</span>
                    <span className="text-xs text-muted-foreground">{it.type} · {it.skill}</span>
                    {it.exists && <span className="rounded-full bg-secondary px-1.5 text-[0.65rem]">exists</span>}
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{it.stem}</p>
                  {it.errors.map((e) => <p key={e} className="text-xs text-destructive">{e}</p>)}
                  {it.warnings.map((w) => <p key={w} className={cn('text-xs text-cocoa dark:text-banana')}>{w}</p>)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <aside className="space-y-4">
        <section className="space-y-3 rounded-2xl border bg-card p-5">
          <h2 className="font-semibold">Export {examCode}</h2>
          <p className="text-sm text-muted-foreground">Downloads JSON in the same format as the content files, ready to edit and re-import.</p>
          <div className="grid gap-2">
            <Button asChild variant="outline"><a href={`/api/admin/export?examId=${examId}&status=published`}><Download /> Published questions</a></Button>
            <Button asChild variant="outline"><a href={`/api/admin/export?examId=${examId}&status=all`}><Download /> Everything (incl. drafts)</a></Button>
          </div>
        </section>
        <section className="space-y-2 rounded-2xl border bg-card p-5 text-sm text-muted-foreground">
          <h2 className="font-semibold text-foreground">Formats</h2>
          <p><b>JSON:</b> an array of questions, exactly as in <code>content/exams/&lt;id&gt;/questions/*.json</code>.</p>
          <p><b>Udemy CSV:</b> the practice-test export (Question, Answer Option 1–6, Explanation 1–6, Correct Answers, Overall Explanation, Domain). Skills are matched automatically; review before publishing.</p>
        </section>
      </aside>
    </div>
  );
}
