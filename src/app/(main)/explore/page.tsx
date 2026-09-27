import type { Metadata } from 'next';
import { Reveal } from '@/components/common/reveal';
import { Catalog } from '@/components/exams/catalog';
import { getMyExams } from '@/server/analytics';
import { listExams } from '@/server/exams';
import { getUser } from '@/server/session';

export const metadata: Metadata = { title: 'Explore exams' };

export default async function ExplorePage() {
  const [exams, user] = await Promise.all([listExams(), getUser()]);
  const mine = user ? await getMyExams(user.id, 20) : [];
  const readiness = Object.fromEntries(mine.map((m) => [m.id, m.readiness?.readiness ?? null]));
  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6 sm:py-10">
      <Reveal className="space-y-2">
        <h1 className="text-3xl font-bold sm:text-4xl">Explore</h1>
        <p className="max-w-2xl text-muted-foreground">
          Pick an exam to see its syllabus, take a free diagnostic, and practise with explanations for every option.
        </p>
      </Reveal>
      <Catalog exams={exams} readiness={readiness} />
    </div>
  );
}
