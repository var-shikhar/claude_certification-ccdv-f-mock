import type { Metadata } from 'next';
import { Reveal } from '@/components/common/reveal';
import { TeamsHome } from '@/components/teams/teams-home';
import { requireUser } from '@/server/session';
import { listMyTeams } from '@/server/teams';

export const metadata: Metadata = { title: 'Teams' };

export default async function TeamsPage() {
  const user = await requireUser('/teams');
  const teams = await listMyTeams(user.id);
  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-6 sm:py-10">
      <Reveal className="space-y-2">
        <h1 className="text-3xl font-bold sm:text-4xl">Teams</h1>
        <p className="text-muted-foreground">Practise together: shared assignments, due dates and a results view for instructors.</p>
      </Reveal>
      <TeamsHome teams={teams} />
    </div>
  );
}
