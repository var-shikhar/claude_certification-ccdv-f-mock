import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { TeamView } from '@/components/teams/team-view';
import { AppError } from '@/server/errors';
import { listExams } from '@/server/exams';
import { requireUser } from '@/server/session';
import { getTeam } from '@/server/teams';

export const metadata: Metadata = { title: 'Team' };

export default async function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/teams/${id}`);
  const team = await getTeam(user.id, id).catch((err) => {
    if (err instanceof AppError && err.status === 404) notFound();
    throw err;
  });
  const exams = (await listExams()).map((e) => ({ id: e.id, code: e.code, title: e.title, modes: {} }));
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <TeamView initial={team} userId={user.id} exams={exams} />
    </div>
  );
}
