import 'server-only';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { attempt, bookmark, question } from '@/db/schema';
import type { SessionUser } from '@/lib/auth';
import { AppError, notFound } from '../errors';
import { getExam, rowToQuestion } from '../exams';
import { streamCompletion, consumeAiQuota } from './client';

export interface TutorMessage { role: 'user' | 'assistant'; content: string }

const LETTERS = 'ABCDEFGH';

/**
 * Streams a tutor reply about one question. The learner must already have
 * seen the answer (a finished attempt, a checked drill item, or a saved
 * question) so the tutor can never be used to peek during a live exam.
 */
export async function tutorStream(user: SessionUser, input: { questionId: string; attemptId?: string; messages: TutorMessage[] }) {
  const [row] = await db.select().from(question).where(eq(question.id, input.questionId)).limit(1);
  if (!row) throw notFound('That question');

  let selected: string[] | null = null;
  let order: string[] | undefined;
  if (input.attemptId && /^[0-9a-f-]{36}$/i.test(input.attemptId)) {
    const [a] = await db.select().from(attempt).where(and(eq(attempt.id, input.attemptId), eq(attempt.userId, user.id))).limit(1);
    if (a && a.itemIds.includes(row.id) && (a.status !== 'active' || a.checked[row.id])) {
      selected = a.responses[row.id] ?? [];
      order = a.optionOrder[row.id];
    }
  }
  if (selected === null) {
    const [saved] = await db.select({ q: bookmark.questionId }).from(bookmark).where(and(eq(bookmark.userId, user.id), eq(bookmark.questionId, row.id))).limit(1);
    if (!saved) throw new AppError('The tutor opens once you have seen this answer.', 403, 'NOT_REVEALED');
    selected = [];
  }

  await consumeAiQuota(user.id, user.role as string);
  const q = rowToQuestion(row);
  const ex = await getExam(row.examId);
  const skill = ex?.config.skills.find((s) => s.id === q.skill)?.name ?? q.skill;
  // Letters as the learner saw them (options are shuffled per attempt).
  const shown = order?.length ? order.map((id) => q.options.find((o) => o.id === id)!).filter(Boolean) : q.options;
  const letterOf = (id: string) => LETTERS[shown.findIndex((o) => o.id === id)] ?? id;

  const lines = [
    `Exam: ${ex?.title ?? row.examId}. Skill: ${skill}.`,
    `Question (${q.type}): ${q.stem}`,
    ...(q.type === 'match'
      ? (q.prompts ?? []).map((p) => `Prompt "${p.text}" matches "${q.options.find((o) => o.id === p.answer)?.text}"`)
      : q.type === 'order'
        ? [`Correct order: ${(q.answerOrder ?? []).map((id, i) => `${i + 1}. ${q.options.find((o) => o.id === id)?.text}`).join(' | ')}`]
        : q.type === 'fill'
          ? [`Accepted answers: ${(q.accepted ?? []).join(', ')}`]
          : shown.map((o) => `${letterOf(o.id)}. ${o.text} [${o.correct ? 'CORRECT' : 'incorrect'}] Why: ${o.why ?? ''}`)),
    `Official explanation: ${q.explanation}`,
    q.reference ? `Reference: ${q.reference}` : '',
    selected.length
      ? `The learner answered: ${q.type === 'fill' ? selected[0] : q.type === 'match' || q.type === 'order' ? selected.join(', ') : selected.map(letterOf).join(', ')}.`
      : 'The learner has not answered this question (or is revisiting a saved question).',
  ].filter(Boolean);

  const system = [
    'You are quizMonkey\'s tutor: warm, precise and brief. Help the learner understand this one exam question.',
    'Ground every claim in the question material below. If something is not covered there and you are not certain, say so and point to the reference instead of guessing.',
    'Default to under 150 words. Use short paragraphs, bullet points and `code` where they help. Refer to options by their letter as the learner saw them.',
    'When the learner was wrong, explain the misconception behind their choice before the fix. Offer a quick memory hook when useful.',
    'Stay on this topic; politely decline unrelated requests.',
    '',
    'QUESTION MATERIAL',
    ...lines,
  ].join('\n');

  const history = input.messages.slice(-10).map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));
  return streamCompletion({ messages: [{ role: 'system', content: system }, ...history], maxTokens: 700 });
}
