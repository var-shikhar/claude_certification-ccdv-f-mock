import 'server-only';
import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { bookmark, exam, question, questionReport } from '@/db/schema';
import { toRevealedQuestion } from '@/lib/engine';
import { AppError, notFound } from './errors';
import { rowToQuestion } from './exams';

async function questionExam(questionId: string) {
  const [row] = await db.select({ examId: question.examId }).from(question).where(eq(question.id, questionId)).limit(1);
  if (!row) throw notFound('That question');
  return row.examId;
}

export async function saveBookmark(userId: string, questionId: string, note?: string | null) {
  const examId = await questionExam(questionId);
  await db.insert(bookmark).values({ userId, questionId, examId, note: note ?? null }).onConflictDoUpdate({
    target: [bookmark.userId, bookmark.questionId],
    set: note === undefined ? { updatedAt: new Date() } : { note, updatedAt: new Date() },
  });
  return { ok: true as const };
}

export async function removeBookmark(userId: string, questionId: string) {
  await db.delete(bookmark).where(and(eq(bookmark.userId, userId), eq(bookmark.questionId, questionId)));
  return { ok: true as const };
}

export async function listBookmarks(userId: string, examId?: string) {
  const where = [eq(bookmark.userId, userId)];
  if (examId) where.push(eq(bookmark.examId, examId));
  const rows = await db
    .select({ b: bookmark, q: question, examCode: exam.code, examTitle: exam.title, config: exam.config })
    .from(bookmark)
    .innerJoin(question, eq(question.id, bookmark.questionId))
    .innerJoin(exam, eq(exam.id, bookmark.examId))
    .where(and(...where))
    .orderBy(desc(bookmark.updatedAt));
  return rows.map(({ b, q, examCode, examTitle, config }) => ({
    questionId: b.questionId,
    examId: b.examId,
    examCode,
    examTitle,
    note: b.note,
    savedAt: b.updatedAt.toISOString(),
    skillName: config.skills.find((s) => s.id === q.skill)?.name ?? q.skill,
    question: toRevealedQuestion(rowToQuestion(q)),
  }));
}

export async function reportQuestion(userId: string, input: { questionId: string; reason: 'wrong-key' | 'unclear' | 'outdated' | 'typo' | 'other'; message?: string }) {
  const examId = await questionExam(input.questionId);
  const [{ recent }] = await db
    .select({ recent: sql<number>`count(*)::int` })
    .from(questionReport)
    .where(and(eq(questionReport.userId, userId), sql`${questionReport.createdAt} > now() - interval '1 hour'`));
  if (recent >= 20) throw new AppError('Thanks! You have sent a lot of reports this hour. Please try again later.', 429);
  await db.insert(questionReport).values({ questionId: input.questionId, examId, userId, reason: input.reason, message: input.message?.trim() || null });
  return { ok: true as const };
}
