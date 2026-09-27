'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, Copy, EyeOff, LogOut, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { StartButton } from '@/components/results/start-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

type Cell = { attemptId: string; status: string; scaled: number | null; passed: boolean | null; blurs: number } | null;
export interface TeamData {
  id: string; name: string; inviteCode: string | null; role: 'owner' | 'instructor' | 'member';
  members: { userId: string; role: string; joinedAt: string; name: string; email: string | null }[];
  assignments: { id: string; title: string; examId: string; examCode: string; examTitle: string; kind: 'full' | 'quick' | 'practice'; difficulty: string; dueAt: string | null; overdue: boolean; createdAt: string; mine: Cell; results: Record<string, Cell> | null }[];
}
export interface ExamOption { id: string; code: string; title: string; modes: Record<string, string> }

const KIND_LABEL = { full: 'Full mock', quick: 'Quick mock', practice: '15-question drill' } as const;

export function TeamView({ initial, userId, exams }: { initial: TeamData; userId: string; exams: ExamOption[] }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const key = ['team', initial.id] as const;
  const { data: team } = useQuery({ queryKey: key, queryFn: () => api.get<TeamData>(`/api/teams/${initial.id}`), initialData: initial, staleTime: 30_000 });
  const manager = team.role === 'owner' || team.role === 'instructor';

  const remove = useMutation({
    mutationFn: (memberId: string) => api.delete(`/api/teams/${team.id}/members/${memberId}`),
    onMutate: async (memberId) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<TeamData>(key);
      queryClient.setQueryData<TeamData>(key, (t) => t && { ...t, members: t.members.filter((m) => m.userId !== memberId) });
      return { previous };
    },
    onError: (err, _v, ctx) => { if (ctx?.previous) queryClient.setQueryData(key, ctx.previous); toast.error(err instanceof Error ? err.message : 'Could not remove.'); },
    onSuccess: (_d, memberId) => {
      if (memberId === userId) { toast.success('You left the team'); router.push('/teams'); }
    },
  });

  const promote = useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: 'instructor' | 'member' }) => api.patch(`/api/teams/${team.id}/members/${memberId}`, { role }),
    onMutate: async ({ memberId, role }) => {
      const previous = queryClient.getQueryData<TeamData>(key);
      queryClient.setQueryData<TeamData>(key, (t) => t && { ...t, members: t.members.map((m) => (m.userId === memberId ? { ...m, role } : m)) });
      return { previous };
    },
    onError: (_e, _v, ctx) => { if (ctx?.previous) queryClient.setQueryData(key, ctx.previous); toast.error('Could not change the role.'); },
  });

  async function copyInvite() {
    const link = `${window.location.origin}/teams/join/${team.inviteCode}`;
    try { await navigator.clipboard.writeText(link); toast.success('Invite link copied'); } catch { toast.error('Copy failed.'); }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground capitalize">Team · you are {team.role === 'member' ? 'a member' : `the ${team.role}`}</p>
          <h1 className="text-3xl font-bold">{team.name}</h1>
        </div>
        {team.inviteCode && (
          <div className="flex items-center gap-2 rounded-2xl border bg-card px-3 py-2">
            <span className="text-xs text-muted-foreground">Invite code</span>
            <span className="font-mono text-sm font-semibold tracking-widest">{team.inviteCode}</span>
            <Button variant="ghost" size="icon-sm" onClick={copyInvite} aria-label="Copy invite link"><Copy /></Button>
          </div>
        )}
      </div>

      <Tabs defaultValue="assignments" className="gap-6">
        <TabsList>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="members">Members · {team.members.length}</TabsTrigger>
        </TabsList>

        <TabsContent value="assignments" className="space-y-5">
          {manager && <NewAssignment teamId={team.id} exams={exams} onCreated={() => queryClient.invalidateQueries({ queryKey: key })} />}
          {team.assignments.length === 0 ? (
            <p className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
              {manager ? 'Set the first assignment above. Members will see it here with a Start button.' : 'No assignments yet. Your instructor will add them here.'}
            </p>
          ) : (
            <ul className="space-y-3">
              {team.assignments.map((a) => {
                const overdue = a.overdue;
                const doneCount = a.results ? Object.values(a.results).filter((c) => c?.status === 'submitted').length : 0;
                return (
                  <li key={a.id} className="space-y-3 rounded-2xl border bg-card p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold">{a.title}</h3>
                        <p className="text-sm text-muted-foreground">{a.examCode} · {KIND_LABEL[a.kind]} · {a.difficulty}</p>
                        {a.dueAt && (
                          <p className={cn('mt-1 inline-flex items-center gap-1 text-xs', overdue ? 'text-destructive' : 'text-muted-foreground')}>
                            <CalendarClock className="size-3.5" /> Due {new Date(a.dueAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {a.mine?.status === 'submitted' ? (
                          <Button asChild variant="outline" size="sm"><Link href={`/attempt/${a.mine.attemptId}/result`}>Your score: {a.mine.scaled ?? '—'}</Link></Button>
                        ) : a.mine?.status === 'active' ? (
                          <Button asChild variant="premium" size="sm"><Link href={`/attempt/${a.mine.attemptId}`}>Resume</Link></Button>
                        ) : (
                          <StartButton variant="premium" size="sm" input={{ examId: a.examId, kind: 'assignment', assignmentId: a.id }}>Start</StartButton>
                        )}
                      </div>
                    </div>
                    {manager && a.results && (
                      <div className="space-y-2 border-t pt-3">
                        <p className="text-xs text-muted-foreground">{doneCount} of {team.members.length} finished</p>
                        <div className="flex flex-wrap gap-2">
                          {team.members.map((m) => {
                            const c = a.results![m.userId];
                            return (
                              <Tooltip key={m.userId}>
                                <TooltipTrigger asChild>
                                  <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs', c?.status === 'submitted' ? (c.passed ? 'border-success/40 bg-success/10' : 'bg-secondary') : 'text-muted-foreground')}>
                                    {m.name.split(' ')[0]}
                                    <b className="tabular-nums">{c?.status === 'submitted' ? c.scaled : c?.status === 'active' ? '…' : '—'}</b>
                                    {c && c.blurs > 2 && <EyeOff className="size-3 text-destructive" />}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {c?.status === 'submitted' ? `Scored ${c.scaled}${c.passed ? ' (pass)' : ''}` : c?.status === 'active' ? 'In progress' : 'Not started'}
                                  {c && c.blurs > 0 ? ` · left the exam tab ${c.blurs} time${c.blurs === 1 ? '' : 's'}` : ''}
                                </TooltipContent>
                              </Tooltip>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="members">
          <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
            {team.members.map((m) => (
              <li key={m.userId} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{m.name}{m.userId === userId ? ' (you)' : ''}</span>
                  {m.email && <span className="block text-xs text-muted-foreground">{m.email}</span>}
                </span>
                <Badge variant="secondary" className="capitalize">{m.role}</Badge>
                {team.role === 'owner' && m.role !== 'owner' && (
                  <Button variant="ghost" size="sm" onClick={() => promote.mutate({ memberId: m.userId, role: m.role === 'instructor' ? 'member' : 'instructor' })}>
                    {m.role === 'instructor' ? 'Make member' : 'Make instructor'}
                  </Button>
                )}
                {manager && m.role !== 'owner' && m.userId !== userId && (
                  <Button variant="ghost" size="icon-sm" onClick={() => remove.mutate(m.userId)} aria-label={`Remove ${m.name}`}><Trash2 /></Button>
                )}
              </li>
            ))}
          </ul>
          {team.role !== 'owner' && (
            <Button variant="ghost" className="mt-4 text-destructive hover:text-destructive" onClick={() => remove.mutate(userId)}><LogOut /> Leave team</Button>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function NewAssignment({ teamId, exams, onCreated }: { teamId: string; exams: ExamOption[]; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [examId, setExamId] = useState(exams[0]?.id ?? '');
  const [kind, setKind] = useState<'quick' | 'full' | 'practice'>('quick');
  const [title, setTitle] = useState('');
  const [dueAt, setDueAt] = useState('');
  const exam = exams.find((e) => e.id === examId);
  const create = useMutation({
    mutationFn: () => api.post('/api/teams/' + teamId + '/assignments', {
      examId, kind, difficulty: 'standard', title: title.trim() || `${exam?.code ?? ''} ${KIND_LABEL[kind]}`.trim(), dueAt: dueAt ? new Date(dueAt).toISOString() : null,
    }),
    onSuccess: () => { toast.success('Assignment set'); setOpen(false); setTitle(''); setDueAt(''); onCreated(); },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not create the assignment.'),
  });
  if (!open) return <Button variant="outline" onClick={() => setOpen(true)}><Plus /> New assignment</Button>;
  return (
    <form className="grid gap-4 rounded-2xl border bg-card p-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Exam</Label>
        <Select value={examId} onValueChange={setExamId}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>{exams.map((e) => <SelectItem key={e.id} value={e.id}>{e.code} · {e.title}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Type</Label>
        <ToggleGroup type="single" variant="outline" value={kind} onValueChange={(v) => v && setKind(v as typeof kind)} className="w-full">
          <ToggleGroupItem value="practice" className="flex-1 text-xs">Drill</ToggleGroupItem>
          <ToggleGroupItem value="quick" className="flex-1 text-xs">Quick mock</ToggleGroupItem>
          <ToggleGroupItem value="full" className="flex-1 text-xs">Full mock</ToggleGroupItem>
        </ToggleGroup>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Title (optional)</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`${exam?.code ?? ''} ${KIND_LABEL[kind]}`} maxLength={120} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Due (optional)</Label>
        <Input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
      </div>
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" variant="premium" disabled={create.isPending}>{create.isPending && <Spinner />} Set assignment</Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>
  );
}
