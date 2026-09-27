import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { InterviewRoom } from '@/components/interviews/interview-room';
import { getInterview } from '@/server/ai/interviews';
import { AppError } from '@/server/errors';
import { requireUser } from '@/server/session';

export const metadata: Metadata = { title: 'Mock interview' };

export default async function InterviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/interviews/${id}`);
  const data = await getInterview(user.id, id).catch((err) => {
    if (err instanceof AppError && err.status === 404) notFound();
    throw err;
  });
  return <InterviewRoom initial={data} />;
}
