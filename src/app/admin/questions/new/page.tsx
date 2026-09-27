import { QuestionEditor } from '@/components/admin/question-editor';
import { emptyDraft } from '@/lib/question-draft';
import { listExamsForAdmin } from '@/server/admin/questions';

export const metadata = { title: 'New question' };

export default async function NewQuestionPage({ searchParams }: { searchParams: Promise<{ exam?: string }> }) {
  const exams = await listExamsForAdmin();
  const { exam: examParam } = await searchParams;
  const exam = exams.find((e) => e.id === examParam) ?? exams[0];
  if (!exam) return <p className="text-muted-foreground">No exams yet.</p>;
  return <QuestionEditor exam={exam.config} initial={emptyDraft(exam.config.skills[0].id)} meta={null} />;
}
