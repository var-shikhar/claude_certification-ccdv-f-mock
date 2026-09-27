'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ChevronLeft, ChevronRight, Download, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { api } from '@/lib/api';
import type { ExamConfig } from '@/lib/engine/types';
import { FLAG_INFO } from '@/lib/item-flags';
import { cn } from '@/lib/utils';
import type { QuestionListRow } from '@/server/admin/questions';

type ListResponse = { rows: QuestionListRow[]; total: number; page: number; pageSize: number; counts: Record<string, number> };
type Status = 'draft' | 'review' | 'published' | 'retired';

const STATUS_STYLE: Record<Status, string> = {
  draft: 'bg-muted text-muted-foreground',
  review: 'bg-banana/25 text-cocoa dark:text-banana',
  published: 'bg-success/12 text-success',
  retired: 'bg-destructive/10 text-destructive',
};
const TYPE_LABEL: Record<string, string> = { single: 'Single', multi: 'Multi', truefalse: 'True/false', order: 'Order', match: 'Match', fill: 'Fill-in' };

export function QuestionTable({ exam }: { exam: Pick<ExamConfig, 'id' | 'code' | 'skills' | 'domains'> }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState(params.get('q') ?? '');

  const filters = {
    status: params.get('status') ?? 'all',
    type: params.get('type') ?? '',
    skill: params.get('skill') ?? '',
    flagged: params.get('flagged') === '1',
    sort: params.get('sort') ?? 'updated',
    page: Number(params.get('page') ?? 1) || 1,
    q: params.get('q') ?? '',
  };
  const setParam = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    next.set('exam', exam.id);
    for (const [k, v] of Object.entries(patch)) {
      if (v == null || v === '' || v === 'all') next.delete(k); else next.set(k, v);
    }
    if (!('page' in patch)) next.delete('page');
    setSelected(new Set());
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  // Debounced search box → URL.
  useEffect(() => {
    const t = setTimeout(() => { if (search !== filters.q) setParam({ q: search || null }); }, 350);
    return () => clearTimeout(t);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  const key = ['admin', 'questions', exam.id, filters] as const;
  const qs = new URLSearchParams({ examId: exam.id, status: filters.status, sort: filters.sort, page: String(filters.page), ...(filters.type && { type: filters.type }), ...(filters.skill && { skill: filters.skill }), ...(filters.q && { q: filters.q }), ...(filters.flagged && { flagged: '1' }) });
  const { data, isPending, isFetching, isPlaceholderData } = useQuery({
    queryKey: key,
    queryFn: () => api.get<ListResponse>(`/api/admin/questions?${qs.toString()}`),
    placeholderData: keepPreviousData,
  });

  const bulk = useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: Status }) => api.post<{ updated: number; blocked: string[] }>('/api/admin/questions/status', { ids, status }),
    onMutate: async ({ ids, status }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ListResponse>(key);
      queryClient.setQueryData<ListResponse>(key, (d) => d && { ...d, rows: d.rows.map((r) => (ids.includes(r.id) ? { ...r, status } : r)) });
      return { previous };
    },
    onError: (err, _v, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(key, ctx.previous);
      toast.error(err instanceof Error ? err.message : 'Could not update status.');
    },
    onSuccess: (res, { status }) => {
      setSelected(new Set());
      if (res.blocked.length) toast.warning(`${res.updated} updated. ${res.blocked.length} blocked by validation errors: ${res.blocked.slice(0, 3).join(', ')}${res.blocked.length > 3 ? '…' : ''}`);
      else toast.success(`${res.updated} question${res.updated === 1 ? '' : 's'} moved to ${status}`);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['admin', 'questions', exam.id] }),
  });

  const rows = data?.rows ?? [];
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const counts = data?.counts ?? {};
  const totalAll = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-4">
      {/* status tabs */}
      <div className="scrollbar-none flex gap-1 overflow-x-auto border-b">
        {(['all', 'draft', 'review', 'published', 'retired'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setParam({ status: s })}
            className={cn('-mb-px shrink-0 border-b-2 px-3 py-2 text-sm font-medium capitalize transition-colors', filters.status === s ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}
          >
            {s} <span className="text-xs text-muted-foreground tabular-nums">{s === 'all' ? totalAll : counts[s] ?? 0}</span>
          </button>
        ))}
      </div>

      {/* one filter row */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search stem or id…" className="h-9 pl-9" aria-label="Search questions" />
        </div>
        <Select value={filters.skill || 'all'} onValueChange={(v) => setParam({ skill: v })}>
          <SelectTrigger className="h-9 w-48" aria-label="Skill"><SelectValue placeholder="All skills" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All skills</SelectItem>
            {exam.domains.map((d) => exam.skills.filter((s) => s.domain === d.id).map((s) => <SelectItem key={s.id} value={s.id}>D{d.id} · {s.name}</SelectItem>))}
          </SelectContent>
        </Select>
        <Select value={filters.type || 'all'} onValueChange={(v) => setParam({ type: v })}>
          <SelectTrigger className="h-9 w-36" aria-label="Type"><SelectValue placeholder="All types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {Object.entries(TYPE_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.sort} onValueChange={(v) => setParam({ sort: v })}>
          <SelectTrigger className="h-9 w-40" aria-label="Sort"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="updated">Recently edited</SelectItem>
            <SelectItem value="id">By id</SelectItem>
            <SelectItem value="p">Hardest first</SelectItem>
            <SelectItem value="n">Most answered</SelectItem>
          </SelectContent>
        </Select>
        <label className="flex h-9 items-center gap-2 rounded-lg border px-3 text-sm">
          <Switch checked={filters.flagged} onCheckedChange={(v) => setParam({ flagged: v ? '1' : null })} /> Needs attention
        </label>
        <div className="ml-auto flex gap-2">
          <Button asChild variant="outline" size="sm"><a href={`/api/admin/export?examId=${exam.id}&status=${filters.status === 'all' ? 'all' : filters.status}`}><Download /> Export</a></Button>
          <Button asChild variant="premium" size="sm"><Link href={`/admin/questions/new?exam=${exam.id}`}><Plus /> New question</Link></Button>
        </div>
      </div>

      {/* bulk actions */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-sm animate-pop">
          <span className="font-medium">{selected.size} selected</span>
          <span className="mx-1 h-4 w-px bg-border" />
          {(['published', 'review', 'draft', 'retired'] as Status[]).map((s) => (
            <Button key={s} size="xs" variant={s === 'published' ? 'default' : 'outline'} disabled={bulk.isPending} onClick={() => bulk.mutate({ ids: [...selected], status: s })} className="capitalize">
              {s === 'published' ? 'Publish' : s === 'review' ? 'Send to review' : s === 'draft' ? 'Move to draft' : 'Retire'}
            </Button>
          ))}
          <Button size="xs" variant="ghost" className="ml-auto" onClick={() => setSelected(new Set())}>Clear</Button>
        </div>
      )}

      {/* table */}
      <div className={cn('overflow-x-auto rounded-2xl border bg-card transition-opacity', isFetching && isPlaceholderData && 'opacity-60')}>
        <table className="w-full min-w-[56rem] text-left text-sm">
          <thead className="border-b bg-secondary/40 text-xs text-muted-foreground">
            <tr>
              <th className="w-10 px-3 py-2.5">
                <Checkbox checked={allSelected} onCheckedChange={(v) => setSelected(v ? new Set(rows.map((r) => r.id)) : new Set())} aria-label="Select all on this page" />
              </th>
              <th className="px-3 py-2.5 font-medium">Question</th>
              <th className="px-3 py-2.5 font-medium">Skill</th>
              <th className="px-3 py-2.5 font-medium">Type</th>
              <th className="px-3 py-2.5 font-medium">Level</th>
              <th className="px-3 py-2.5 font-medium">Status</th>
              <th className="px-3 py-2.5 text-right font-medium">Answered</th>
              <th className="px-3 py-2.5 text-right font-medium">% correct</th>
              <th className="px-3 py-2.5 font-medium">Signals</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isPending && !data
              ? Array.from({ length: 8 }, (_, i) => (
                <tr key={i}><td colSpan={9} className="px-3 py-3"><Skeleton className="h-5 w-full" /></td></tr>
              ))
              : rows.map((r) => (
                <tr key={r.id} className={cn('transition-colors hover:bg-accent/30', selected.has(r.id) && 'bg-primary/[0.04]')}>
                  <td className="px-3 py-2.5">
                    <Checkbox
                      checked={selected.has(r.id)}
                      onCheckedChange={(v) => setSelected((cur) => { const n = new Set(cur); if (v) n.add(r.id); else n.delete(r.id); return n; })}
                      aria-label={`Select ${r.id}`}
                    />
                  </td>
                  <td className="max-w-[26rem] px-3 py-2.5">
                    <Link href={`/admin/questions/${encodeURIComponent(r.id)}?exam=${exam.id}`} className="group block">
                      <span className="block font-mono text-[0.7rem] text-muted-foreground">{r.id}{r.version > 1 ? ` · v${r.version}` : ''}{r.pool === 'imported' ? ' · imported' : ''}</span>
                      <span className="line-clamp-2 group-hover:text-primary">{r.stem.replace(/```[\s\S]*?```/g, '[code]')}</span>
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{r.skillName}</td>
                  <td className="px-3 py-2.5 text-xs">{TYPE_LABEL[r.type]}</td>
                  <td className="px-3 py-2.5">
                    <span className="flex gap-0.5" aria-label={`Difficulty ${r.difficulty} of 4`}>
                      {[1, 2, 3, 4].map((l) => <span key={l} className={cn('h-2.5 w-1.5 rounded-sm', l <= r.difficulty ? 'bg-primary' : 'bg-secondary')} />)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5"><span className={cn('rounded-full px-2 py-0.5 text-[0.7rem] font-semibold capitalize', STATUS_STYLE[r.status])}>{r.status}</span></td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{r.stats?.n ?? 0}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{r.stats?.p != null && r.stats.n >= 5 ? `${Math.round(r.stats.p * 100)}%` : '—'}</td>
                  <td className="px-3 py-2.5">
                    <span className="flex flex-wrap items-center gap-1">
                      {r.openReports > 0 && <Badge variant="outline" className="border-primary/40 text-primary">{r.openReports} report{r.openReports === 1 ? '' : 's'}</Badge>}
                      {r.stats?.flags.map((f) => (
                        <Tooltip key={f}>
                          <TooltipTrigger asChild>
                            <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.7rem] font-medium', FLAG_INFO[f].tone === 'bad' ? 'bg-destructive/10 text-destructive' : 'bg-banana/25 text-cocoa dark:text-banana')}>
                              <AlertTriangle className="size-3" />{FLAG_INFO[f].label}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>{FLAG_INFO[f].hint}</TooltipContent>
                        </Tooltip>
                      ))}
                    </span>
                  </td>
                </tr>
              ))}
            {data && rows.length === 0 && (
              <tr><td colSpan={9} className="px-3 py-12 text-center text-sm text-muted-foreground">No questions match these filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {data && data.total > data.pageSize && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{(filters.page - 1) * data.pageSize + 1}–{Math.min(filters.page * data.pageSize, data.total)} of {data.total.toLocaleString()}</span>
          <div className="flex gap-1">
            <Button variant="outline" size="icon-sm" disabled={filters.page <= 1} onClick={() => setParam({ page: String(filters.page - 1) })} aria-label="Previous page"><ChevronLeft /></Button>
            <Button variant="outline" size="icon-sm" disabled={filters.page >= pages} onClick={() => setParam({ page: String(filters.page + 1) })} aria-label="Next page"><ChevronRight /></Button>
          </div>
        </div>
      )}
    </div>
  );
}
