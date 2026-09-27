import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, BookOpen, ChevronRight, ExternalLink, Lightbulb, Zap } from 'lucide-react';
import { Reveal } from '@/components/common/reveal';
import { RichText } from '@/components/player/rich-text';
import { StartButton } from '@/components/results/start-button';
import { Button } from '@/components/ui/button';
import { getReadiness } from '@/server/analytics';
import { getExam, getStudyNotes } from '@/server/exams';
import { getUser } from '@/server/session';

export async function generateMetadata({ params }: { params: Promise<{ examId: string; skillId: string }> }): Promise<Metadata> {
  const { examId, skillId } = await params;
  const ex = await getExam(examId);
  const skill = ex?.config.skills.find((s) => s.id === skillId);
  return { title: skill && ex ? `${skill.name} · ${ex.code} study notes` : 'Study notes' };
}

export default async function StudyNotePage({ params }: { params: Promise<{ examId: string; skillId: string }> }) {
  const { examId, skillId } = await params;
  const ex = await getExam(examId);
  if (!ex) notFound();
  const notes = await getStudyNotes(ex.id);
  const note = notes[skillId];
  const skill = ex.config.skills.find((s) => s.id === skillId);
  if (!note || !skill) notFound();
  const domain = ex.config.domains.find((d) => d.id === skill.domain);
  const ordered = ex.config.skills.filter((s) => notes[s.id]);
  const index = ordered.findIndex((s) => s.id === skillId);
  const prev = ordered[index - 1];
  const next = ordered[index + 1];

  const user = await getUser();
  const mastery = user ? (await getReadiness(user.id, ex.id))?.skills.find((s) => s.skillId === skillId) : null;

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6 sm:py-10">
      <Reveal className="space-y-4">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
          <Link href={`/exams/${ex.id}`} className="hover:text-foreground">{ex.code}</Link>
          <ChevronRight className="size-3.5" />
          <span>{domain?.name}</span>
        </nav>
        <div className="flex items-center gap-2 text-sm font-medium text-primary"><BookOpen className="size-4" /> Study notes · {skill.weight}% of the exam</div>
        <h1 className="text-3xl font-bold sm:text-4xl">{skill.name}</h1>
        <p className="text-lg text-muted-foreground">{note.summary}</p>
        {mastery && mastery.answered > 0 && (
          <p className="text-sm text-muted-foreground">Your mastery: <b className="text-foreground">{Math.round(mastery.mastery * 100)}%</b> from {mastery.answered} answers.</p>
        )}
      </Reveal>

      <Reveal delay={0.05}>
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><Lightbulb className="size-5 text-primary" /> Key points</h2>
          <ol className="space-y-3">
            {note.points.map((p, i) => (
              <li key={i} className="flex gap-4 rounded-2xl border bg-card p-4">
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-secondary font-heading text-sm font-semibold">{i + 1}</span>
                <RichText text={p} className="text-[0.95rem]" />
              </li>
            ))}
          </ol>
        </section>
      </Reveal>

      {note.traps && note.traps.length > 0 && (
        <Reveal>
          <section className="space-y-3 rounded-2xl border border-warning/40 bg-warning/10 p-5">
            <h2 className="font-semibold">Common traps</h2>
            <ul className="list-disc space-y-1.5 pl-5 text-sm">{note.traps.map((t, i) => <li key={i}><RichText text={t} /></li>)}</ul>
          </section>
        </Reveal>
      )}

      {note.docs && note.docs.length > 0 && (
        <Reveal>
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Read the source</h2>
            <ul className="grid gap-2 sm:grid-cols-2">
              {note.docs.map((d) => (
                <li key={d.url}>
                  <a href={d.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 text-sm transition-colors hover:border-primary/40">
                    <span className="font-medium">{d.title}</span>
                    <ExternalLink className="size-4 shrink-0 text-muted-foreground" />
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </Reveal>
      )}

      <Reveal>
        <section className="flex flex-col items-start justify-between gap-4 rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/[0.08] via-banana/[0.08] to-transparent p-6 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-semibold">Test yourself on {skill.name}</h2>
            <p className="text-sm text-muted-foreground">Ten questions, with the answer and explanation after each one.</p>
          </div>
          {user ? (
            <StartButton variant="premium" size="xl" input={{ examId: ex.id, kind: 'practice', skills: [skill.id], count: 10 }}><Zap data-icon="inline-start" />Start drill</StartButton>
          ) : (
            <Button asChild variant="premium" size="xl"><Link href={`/sign-up?next=/exams/${ex.id}/study/${skill.id}`}>Sign up to practise</Link></Button>
          )}
        </section>
      </Reveal>

      <nav className="flex items-center justify-between gap-3 border-t pt-6 text-sm">
        {prev ? (
          <Link href={`/exams/${ex.id}/study/${prev.id}`} className="group flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4 transition group-hover:-translate-x-0.5" /><span><span className="block text-xs">Previous</span>{prev.name}</span>
          </Link>
        ) : <span />}
        {next ? (
          <Link href={`/exams/${ex.id}/study/${next.id}`} className="group flex items-center gap-2 text-right text-muted-foreground hover:text-foreground">
            <span><span className="block text-xs">Next</span>{next.name}</span><ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
          </Link>
        ) : <span />}
      </nav>
    </div>
  );
}
