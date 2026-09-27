import { notFound } from 'next/navigation';
import { QuestionEditor } from '@/components/admin/question-editor';
import type { Draft } from '@/lib/question-draft';
import { getQuestionForEditor } from '@/server/admin/questions';
import { AppError } from '@/server/errors';
import { getExam } from '@/server/exams';

export const metadata = { title: 'Edit question' };

export default async function EditQuestionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getQuestionForEditor(decodeURIComponent(id)).catch((err) => {
    if (err instanceof AppError && err.status === 404) notFound();
    throw err;
  });
  const exam = (await getExam(data.examId))!;
  const q = data.question;
  const initial: Draft = {
    id: q.id,
    skill: q.skill,
    difficulty: q.difficulty,
    type: q.type,
    select: q.select,
    stem: q.stem,
    options: q.options.map((o) => ({ id: o.id, text: o.text, correct: o.correct, why: o.why ?? '' })),
    answerOrder: q.answerOrder,
    prompts: q.prompts,
    accepted: q.accepted,
    explanation: q.explanation,
    reference: q.reference ?? '',
    caseId: q.caseId ? q.caseId.split(':').slice(-1)[0] : '',
    status: q.status,
    pool: q.pool,
  };
  // Ordering items are edited in the correct order.
  if (q.type === 'order' && q.answerOrder) {
    const byId = new Map(initial.options.map((o) => [o.id, o]));
    initial.options = q.answerOrder.map((oid) => byId.get(oid)!).filter(Boolean);
  }
  return (
    <QuestionEditor
      exam={exam.config}
      initial={initial}
      questionId={q.id}
      meta={{ version: q.version, source: q.source, provenance: q.provenance, stats: data.stats, revisions: data.revisions, reports: data.reports }}
    />
  );
}
