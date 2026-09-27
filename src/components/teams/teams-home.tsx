'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { ChevronRight, Plus, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { api } from '@/lib/api';

interface TeamRow { id: string; name: string; role: string; members: number; assignments: number }

export function TeamsHome({ teams }: { teams: TeamRow[] }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const create = useMutation({
    mutationFn: () => api.post<{ id: string }>('/api/teams', { name }),
    onSuccess: ({ id }) => { toast.success('Team created. Share the invite code with your group.'); router.push(`/teams/${id}`); },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not create the team.'),
  });
  const join = useMutation({
    mutationFn: () => api.post<{ id: string; name: string }>('/api/teams/join', { code }),
    onSuccess: ({ id, name: teamName }) => { toast.success(`Joined ${teamName}`); router.push(`/teams/${id}`); },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not join.'),
  });

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2">
        <form className="space-y-3 rounded-3xl border bg-card p-5" onSubmit={(e) => { e.preventDefault(); if (name.trim().length >= 2) create.mutate(); }}>
          <h2 className="font-semibold">Start a team</h2>
          <p className="text-sm text-muted-foreground">For a study group, a class or a company cohort. You set assignments and see everyone&apos;s results.</p>
          <div className="flex gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Team name" maxLength={80} className="h-10" aria-label="Team name" />
            <Button type="submit" variant="premium" disabled={name.trim().length < 2 || create.isPending}>{create.isPending ? <Spinner /> : <Plus />} Create</Button>
          </div>
        </form>
        <form className="space-y-3 rounded-3xl border bg-card p-5" onSubmit={(e) => { e.preventDefault(); if (code.trim()) join.mutate(); }}>
          <h2 className="font-semibold">Join a team</h2>
          <p className="text-sm text-muted-foreground">Enter the invite code your instructor or group shared with you.</p>
          <div className="flex gap-2">
            <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="INVITE CODE" maxLength={20} className="h-10 font-mono tracking-widest" aria-label="Invite code" />
            <Button type="submit" variant="outline" disabled={!code.trim() || join.isPending}>{join.isPending ? <Spinner /> : null} Join</Button>
          </div>
        </form>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Your teams</h2>
        {teams.length === 0 ? (
          <div className="rounded-3xl border border-dashed p-10 text-center">
            <Users className="mx-auto size-9 text-primary" />
            <p className="mt-3 font-medium">No teams yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">Practising with others keeps everyone accountable. Create one above or ask for an invite code.</p>
          </div>
        ) : (
          <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
            {teams.map((t) => (
              <li key={t.id}>
                <Link href={`/teams/${t.id}`} className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-accent/30">
                  <span className="grid size-10 place-items-center rounded-xl bg-gradient-brand text-sm font-bold text-white">{t.name.slice(0, 2).toUpperCase()}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{t.name}</span>
                    <span className="block text-xs text-muted-foreground capitalize">{t.role} · {t.members} member{t.members === 1 ? '' : 's'} · {t.assignments} assignment{t.assignments === 1 ? '' : 's'}</span>
                  </span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
