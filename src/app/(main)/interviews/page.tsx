import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight, KeyRound, MessagesSquare } from 'lucide-react';
import { Reveal } from '@/components/common/reveal';
import { InterviewSetup } from '@/components/interviews/interview-setup';
import { focusLabel, levelLabel, roleLabel } from '@/lib/interview-presets';
import { cn } from '@/lib/utils';
import { aiEnabled } from '@/server/ai/client';
import { listInterviews } from '@/server/ai/interviews';
import { getUser, isStaff } from '@/server/session';

export const metadata: Metadata = {
  title: 'AI mock interviews',
  description: 'An AI interviewer asks one question at a time, follows up when an answer is thin, and scores you against a clear rubric at the end.',
  alternates: { canonical: '/interviews' },
};

export default async function InterviewsPage() {
  const user = await getUser();
  const enabled = aiEnabled();
  const past = user ? await listInterviews(user.id) : [];
  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6 sm:py-10">
      <Reveal className="space-y-2">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"><MessagesSquare className="size-3.5" /> AI mock interviews</p>
        <h1 className="text-3xl font-bold sm:text-4xl">Practise the interview, not just the quiz</h1>
        <p className="max-w-2xl text-muted-foreground">An AI interviewer asks one question at a time, follows up when an answer is thin, and scores you against a clear rubric at the end.</p>
      </Reveal>

      {!enabled ? (
        <div className="rounded-3xl border border-dashed p-8 text-center">
          <KeyRound className="mx-auto size-9 text-primary" />
          <h2 className="mt-3 text-lg font-semibold">Interviews are almost ready</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            {isStaff(user)
              ? 'Add OPENAI_API_KEY (plus OPENAI_BASE_URL for a LiteLLM proxy, and AI_MODEL) to .env and restart the server to switch them on.'
              : 'AI interviews switch on shortly. In the meantime, sharpen up with a drill.'}
          </p>
        </div>
      ) : (
        <Reveal delay={0.05}><InterviewSetup signedIn={Boolean(user)} /></Reveal>
      )}

      {past.length > 0 && (
        <Reveal delay={0.1}>
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Your interviews</h2>
            <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
              {past.map((i) => (
                <li key={i.id}>
                  <Link href={`/interviews/${i.id}`} className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-accent/30">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{roleLabel(i.role)} · {levelLabel(i.level)} · {focusLabel(i.focus)}</span>
                      <span className="block text-xs text-muted-foreground">{new Date(i.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })} · {i.status === 'active' ? 'in progress' : i.status}</span>
                    </span>
                    <span className={cn('rounded-full px-2.5 py-1 text-sm font-semibold tabular-nums', i.overall != null ? 'bg-secondary' : 'bg-primary/10 text-primary')}>
                      {i.overall != null ? `${i.overall}/10` : i.status === 'active' ? 'Resume' : '—'}
                    </span>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </Reveal>
      )}
    </div>
  );
}
