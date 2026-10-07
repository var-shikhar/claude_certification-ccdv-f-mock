import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Reveal } from '@/components/common/reveal';
import { Catalog } from '@/components/exams/catalog';
import { JsonLd } from '@/components/seo/json-ld';
import { examListLd, graph } from '@/lib/seo';
import { getMyExams } from '@/server/analytics';
import { listExams, type ExamCard } from '@/server/exams';
import { getUser } from '@/server/session';

export const metadata: Metadata = {
  title: 'Explore practice exams and mock interviews',
  description: 'Timed certification mocks, interview prep and quizzes: pick one to see its syllabus, take a free diagnostic and practise with an explanation for every option.',
  alternates: { canonical: '/explore' },
};

export default async function ExplorePage() {
  const exams = await listExams(); // cached catalogue: the full list is in the first HTML
  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6 sm:py-10">
      <JsonLd data={graph(examListLd(exams))} />
      <Reveal className="space-y-2">
        <h1 className="text-3xl font-bold sm:text-4xl">Explore</h1>
        <p className="max-w-2xl text-muted-foreground">
          Pick an exam to see its syllabus, take a free diagnostic, and practise with explanations for every option.
        </p>
      </Reveal>
      {/* Without readiness first (what crawlers and visitors see), then with the learner's own scores. */}
      <Suspense fallback={<Catalog exams={exams} readiness={{}} />}>
        <CatalogWithReadiness exams={exams} />
      </Suspense>
    </div>
  );
}

async function CatalogWithReadiness({ exams }: { exams: ExamCard[] }) {
  const user = await getUser();
  const mine = user ? await getMyExams(user.id, 20) : [];
  const readiness = Object.fromEntries(mine.map((m) => [m.id, m.readiness?.readiness ?? null]));
  return <Catalog exams={exams} readiness={readiness} />;
}
