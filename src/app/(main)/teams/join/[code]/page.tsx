import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Users } from 'lucide-react';
import { JoinTeamButton } from '@/components/teams/join-button';
import { requireUser } from '@/server/session';
import { findTeamByCode } from '@/server/teams';

export const metadata: Metadata = { title: 'Join a team' };

export default async function JoinTeamPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  await requireUser(`/teams/join/${code}`);
  const team = await findTeamByCode(code);
  if (!team) notFound();
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center sm:px-6">
      <Users className="mx-auto size-12 text-primary" />
      <h1 className="mt-4 text-3xl font-bold">Join {team.name}</h1>
      <p className="mt-2 text-muted-foreground">{team.members} member{team.members === 1 ? '' : 's'} already practising together.</p>
      <div className="mt-6 flex justify-center"><JoinTeamButton code={code} /></div>
    </div>
  );
}
