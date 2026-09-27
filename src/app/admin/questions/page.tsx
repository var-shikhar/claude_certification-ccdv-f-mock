import { Suspense } from 'react';
import { ExamSwitcher } from '@/components/admin/exam-switcher';
import { QuestionTable } from '@/components/admin/question-table';
import { listExamsForAdmin } from '@/server/admin/questions';

export const metadata = { title: 'Questions' };

export default async function AdminQuestionsPage({ searchParams }: { searchParams: Promise<{ exam?: string }> }) {
  const exams = await listExamsForAdmin();
  const { exam: examParam } = await searchParams;
  const exam = exams.find((e) => e.id === examParam) ?? exams[0];
  if (!exam) return <p className="text-muted-foreground">No exams yet.</p>;
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Questions</h1>
          <p className="text-sm text-muted-foreground">Every item in {exam.code}, with live statistics from learner answers.</p>
        </div>
        <ExamSwitcher exams={exams} value={exam.id} />
      </div>
      <Suspense>
        <QuestionTable exam={{ id: exam.id, code: exam.code, skills: exam.config.skills, domains: exam.config.domains }} />
      </Suspense>
    </div>
  );
}
