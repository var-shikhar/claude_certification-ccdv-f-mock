import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, CheckCircle2, ChevronDown, XCircle } from 'lucide-react';
import { Reveal } from '@/components/common/reveal';
import { RichText } from '@/components/player/rich-text';
import { Breadcrumbs } from '@/components/seo/breadcrumbs';
import { JsonLd } from '@/components/seo/json-ld';
import { Button } from '@/components/ui/button';
import type { Question } from '@/lib/engine/types';
import { breadcrumbLd, graph, sampleQuestionsTitle, sampleQuizLd } from '@/lib/seo';
import { getExam, getPoolCounts, getSampleQuestions } from '@/server/exams';

const LETTERS = 'ABCDEFGH';

/** The published exam and its sample questions (cached catalogue reads), or null. */
async function load(examId: string) {
  const ex = await getExam(examId);
  if (!ex?.isPublished) return null;
  const questions = await getSampleQuestions(ex.id);
  return questions.length ? { ex, questions } : null;
}

export async function generateMetadata({ params }: { params: Promise<{ examId: string }> }): Promise<Metadata> {
  const found = await load((await params).examId);
  if (!found) return { title: 'Sample questions not found', robots: { index: false } };
  const { ex, questions } = found;
  const title = sampleQuestionsTitle(ex);
  const description = `${questions.length} free ${ex.code} practice questions with the correct answer and an explanation for every option.`;
  const path = `/exams/${ex.id}/sample-questions`;
  return { title, description, alternates: { canonical: path }, openGraph: { title, description, url: path } };
}

export default async function SampleQuestionsPage({ params }: { params: Promise<{ examId: string }> }) {
  const found = await load((await params).examId);
  if (!found) notFound();
  const { ex, questions } = found;
  const pools = await getPoolCounts(ex.id);
  const domainName = new Map(ex.config.domains.map((d) => [d.id, d.name]));
  const path = `/exams/${ex.id}/sample-questions`;

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6 sm:py-10">
      <JsonLd data={graph(
        sampleQuizLd(ex, questions),
        breadcrumbLd([{ name: 'Explore', path: '/explore' }, { name: ex.code, path: `/exams/${ex.id}` }, { name: 'Sample questions', path }]),
      )} />

      <Reveal className="space-y-4">
        <Breadcrumbs items={[{ name: 'Explore', href: '/explore' }, { name: ex.code, href: `/exams/${ex.id}` }, { name: 'Sample questions' }]} />
        <h1 className="text-3xl font-bold sm:text-4xl">{sampleQuestionsTitle(ex)}</h1>
        <p className="text-lg text-muted-foreground">
          {questions.length} questions from the {ex.title} practice bank, spread across its domains. Pick your answer, then open the explanation to see why each option is right or wrong.
        </p>
      </Reveal>

      <ol className="space-y-6">
        {questions.map((q, i) => <SampleQuestion key={q.id} q={q} index={i} domain={domainName.get(q.domain)} />)}
      </ol>

      <section className="flex flex-col items-start justify-between gap-4 rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/[0.08] via-banana/[0.08] to-transparent p-6 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-semibold">Practise all {pools.bank.toLocaleString('en-US')} {ex.code} questions</h2>
          <p className="text-sm text-muted-foreground">Start with the free 15-question diagnostic. It shows where to focus, and your results carry over if you sign up.</p>
        </div>
        <Button asChild variant="premium" size="xl"><Link href={`/exams/${ex.id}`}>Go to {ex.code} <ArrowRight data-icon="inline-end" /></Link></Button>
      </section>
    </div>
  );
}

function SampleQuestion({ q, index, domain }: { q: Question; index: number; domain?: string }) {
  const options = q.options.map((o, i) => ({ ...o, letter: LETTERS[i] ?? String(i + 1) }));
  const correct = options.filter((o) => o.correct);
  const wrong = options.filter((o) => !o.correct && o.why);
  return (
    <li className="space-y-4 rounded-2xl border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="font-heading text-sm font-semibold text-foreground">Question {index + 1}</span>
        {domain && <span className="rounded-full bg-secondary px-2.5 py-0.5">{domain}</span>}
      </div>
      <RichText text={q.stem} className="font-medium" />
      {q.type === 'multi' && <p className="text-sm text-muted-foreground">Choose {q.select}.</p>}
      <ul className="space-y-2">
        {options.map((o) => (
          <li key={o.id} className="flex gap-3 rounded-xl border px-3 py-2.5 text-sm">
            <span className="grid size-6 shrink-0 place-items-center rounded-lg border text-xs font-semibold">{o.letter}</span>
            <RichText text={o.text} className="min-w-0 flex-1 space-y-2" />
          </li>
        ))}
      </ul>
      {/* Collapsed so learners can try first; still in the HTML for crawlers and answer engines. */}
      <details className="group rounded-xl bg-secondary/40 px-4">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
          Show the answer and explanation
          <ChevronDown aria-hidden className="size-4 shrink-0 transition-transform group-open:rotate-180" />
        </summary>
        <div className="space-y-3 pb-4 text-sm animate-in fade-in">
          <p className="flex items-center gap-2 font-semibold text-success">
            <CheckCircle2 aria-hidden className="size-4 shrink-0" />
            Answer: {correct.map((o) => o.letter).join(' and ')}
          </p>
          <RichText text={q.explanation} className="text-muted-foreground" />
          {wrong.length > 0 && (
            <div className="space-y-2">
              <p className="font-semibold">Why the other options are wrong</p>
              <ul className="space-y-2">
                {wrong.map((o) => (
                  <li key={o.id} className="flex gap-2">
                    <XCircle aria-hidden className="mt-1 size-4 shrink-0 text-destructive/70" />
                    <RichText text={`**${o.letter}.** ${o.why}`} className="min-w-0 flex-1 text-muted-foreground" />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </details>
    </li>
  );
}
