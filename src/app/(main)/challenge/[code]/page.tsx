import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Clock, FileQuestion, Swords, Trophy } from 'lucide-react';
import { GuestStartButton } from '@/components/exam-hub/hub-actions';
import { StartButton } from '@/components/results/start-button';
import { cn } from '@/lib/utils';
import { getChallenge } from '@/server/challenges';
import { getUser } from '@/server/session';

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const c = await getChallenge((await params).code);
  return c ? { title: c.title, description: `Take the same ${c.itemCount} ${c.examCode} questions and beat the leaderboard.` } : { title: 'Challenge not found' };
}

const fmt = (ms: number) => { const m = Math.round(ms / 60_000); return m < 1 ? '<1 min' : `${m} min`; };

export default async function ChallengePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const c = await getChallenge(code);
  if (!c) notFound();
  const user = await getUser();
  const input = { examId: c.examId, kind: 'challenge' as const, challengeId: c.id };

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-10 sm:px-6">
      <section className="relative overflow-hidden rounded-3xl border bg-card p-6 text-center sm:p-10">
        <div aria-hidden className="bg-grid mask-fade-b pointer-events-none absolute inset-0" />
        <div className="relative space-y-4">
          <Swords className="mx-auto size-10 text-primary" />
          <p className="text-sm font-semibold tracking-wide text-primary uppercase">You&apos;ve been challenged</p>
          <h1 className="text-3xl font-bold sm:text-4xl">{c.title}</h1>
          <p className="text-muted-foreground">{c.examTitle}</p>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><FileQuestion className="size-4 text-primary" />{c.itemCount} questions</span>
            <span className="inline-flex items-center gap-1.5"><Clock className="size-4 text-primary" />{c.minutes ? `${c.minutes} min` : 'Untimed'}</span>
            <span className="inline-flex items-center gap-1.5"><Trophy className="size-4 text-primary" />Pass {c.scale.passing}</span>
          </div>
          <div className="flex justify-center pt-2">
            {user ? (
              <StartButton variant="premium" size="xl" input={input}>Accept challenge</StartButton>
            ) : (
              <GuestStartButton input={input} label="Accept challenge (no sign-up needed)" />
            )}
          </div>
          {!user && <p className="text-xs text-muted-foreground">Already have an account? <Link href={`/sign-in?next=/challenge/${c.id}`} className="text-primary hover:underline">Sign in</Link></p>}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Leaderboard</h2>
        {c.leaderboard.length === 0 ? (
          <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">No finished runs yet. Set the score to beat!</p>
        ) : (
          <ol className="divide-y overflow-hidden rounded-2xl border bg-card">
            {c.leaderboard.map((r) => (
              <li key={r.userId} className={cn('flex items-center gap-4 px-4 py-3 text-sm', r.userId === user?.id && 'bg-primary/10 font-semibold')}>
                <span className="w-7 text-center font-heading text-base font-bold">{r.rank <= 3 ? ['🥇', '🥈', '🥉'][r.rank - 1] : r.rank}</span>
                <span className="flex-1 truncate">{r.name}{r.userId === c.creatorId ? ' · creator' : ''}{r.userId === user?.id ? ' (you)' : ''}</span>
                <span className="text-xs text-muted-foreground">{fmt(r.durationMs)}</span>
                <span className={cn('rounded-full px-2.5 py-1 font-semibold tabular-nums', r.passed ? 'bg-success/12 text-success' : 'bg-secondary')}>{r.scaled}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
