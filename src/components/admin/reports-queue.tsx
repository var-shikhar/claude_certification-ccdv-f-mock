'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ExternalLink, Flag, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { api } from '@/lib/api';

interface Report {
  id: string; questionId: string; examCode: string; reason: string; message: string | null; status: string;
  resolution: string | null; reporter: string; stem: string; createdAt: string; resolvedAt: string | null;
}

const REASON: Record<string, string> = { 'wrong-key': 'Answer key is wrong', unclear: 'Unclear', outdated: 'Out of date', typo: 'Typo / formatting', other: 'Other' };

export function ReportsQueue() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<'open' | 'resolved' | 'dismissed'>('open');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const key = ['admin', 'reports', status] as const;
  const { data, isPending } = useQuery({ queryKey: key, queryFn: () => api.get<Report[]>(`/api/admin/reports?status=${status}`) });

  const act = useMutation({
    mutationFn: ({ ids, to }: { ids: string[]; to: 'resolved' | 'dismissed' }) =>
      api.post<{ updated: number }>('/api/admin/reports', { ids, status: to, resolution: ids.length === 1 ? notes[ids[0]] : undefined }),
    onMutate: async ({ ids }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Report[]>(key);
      queryClient.setQueryData<Report[]>(key, (list) => list?.filter((r) => !ids.includes(r.id)));
      return { previous };
    },
    onError: (_e, _v, ctx) => { if (ctx?.previous) queryClient.setQueryData(key, ctx.previous); toast.error('Could not update the report.'); },
    onSuccess: (_d, { to }) => toast.success(to === 'resolved' ? 'Marked resolved' : 'Dismissed', { duration: 1500 }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] }),
  });

  return (
    <div className="space-y-4">
      <ToggleGroup type="single" variant="outline" value={status} onValueChange={(v) => v && setStatus(v as typeof status)}>
        <ToggleGroupItem value="open" className="px-4">Open</ToggleGroupItem>
        <ToggleGroupItem value="resolved" className="px-4">Resolved</ToggleGroupItem>
        <ToggleGroupItem value="dismissed" className="px-4">Dismissed</ToggleGroupItem>
      </ToggleGroup>

      {isPending ? (
        <div className="space-y-3">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>
      ) : !data?.length ? (
        <div className="rounded-2xl border border-dashed p-12 text-center">
          <Flag className="mx-auto size-8 text-primary" />
          <p className="mt-3 font-medium">{status === 'open' ? 'Inbox zero. Nothing to triage.' : `No ${status} reports.`}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          <AnimatePresence initial={false}>
            {data.map((r) => (
              <motion.li key={r.id} layout exit={{ opacity: 0, x: 40 }} className="space-y-3 rounded-2xl border bg-card p-4">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-primary">{REASON[r.reason] ?? r.reason}</span>
                  <span className="font-mono text-muted-foreground">{r.examCode} · {r.questionId}</span>
                  <span className="ml-auto text-muted-foreground">{r.reporter} · {new Date(r.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
                </div>
                <p className="line-clamp-2 text-sm">{r.stem.replace(/```[\s\S]*?```/g, '[code]')}</p>
                {r.message && <blockquote className="rounded-xl border-l-2 border-primary/50 bg-secondary/50 px-3 py-2 text-sm">{r.message}</blockquote>}
                {r.resolution && <p className="text-xs text-muted-foreground">Resolution: {r.resolution}</p>}
                <div className="flex flex-wrap items-center gap-2">
                  <Button asChild variant="outline" size="sm"><Link href={`/admin/questions/${encodeURIComponent(r.questionId)}`}><ExternalLink /> Open in editor</Link></Button>
                  {status === 'open' && (
                    <>
                      <Input value={notes[r.id] ?? ''} onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))} placeholder="Resolution note (optional)" className="h-8 min-w-48 flex-1" />
                      <Button size="sm" onClick={() => act.mutate({ ids: [r.id], to: 'resolved' })}><Check /> Resolve</Button>
                      <Button size="sm" variant="ghost" onClick={() => act.mutate({ ids: [r.id], to: 'dismissed' })}><X /> Dismiss</Button>
                    </>
                  )}
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}
