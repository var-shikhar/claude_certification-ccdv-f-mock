import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { AdaptivePlayer } from '@/components/player/adaptive-player';
import { ExamPlayer } from '@/components/player/exam-player';
import { getPlayerState } from '@/server/attempts';
import { AppError } from '@/server/errors';
import { requireUser } from '@/server/session';

export const metadata: Metadata = { title: 'Exam in progress' };

export default async function AttemptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/attempt/${id}`);
  const state = await getPlayerState(user.id, id).catch((err) => {
    if (err instanceof AppError && err.status === 404) notFound();
    throw err;
  });
  if ('finished' in state) redirect(`/attempt/${id}/result`);
  return state.kind === 'adaptive' ? <AdaptivePlayer initial={state} /> : <ExamPlayer initial={state} />;
}
