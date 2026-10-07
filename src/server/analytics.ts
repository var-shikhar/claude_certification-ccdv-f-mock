import 'server-only';
import { cache } from 'react';
import { and, count, desc, eq, inArray, lte, max, sql } from 'drizzle-orm';
import { db } from '@/db';
import { attempt, attemptItem, bookmark, certificate, enrollment, exam, reviewCard } from '@/db/schema';
import { computeReadiness, type AnswerRecord, type Readiness } from '@/lib/readiness';
import { getActiveAttempts, listAttempts } from './attempts';
import { getExam } from './exams';

const HISTORY_LIMIT = 800;

// Newest first. A mock's answers are saved together and share a timestamp, so position breaks the tie
// (later items count as more recent) and every caller sees the same order.
export const getReadiness = cache(async (userId: string, examId: string): Promise<Readiness | null> => {
  const ex = await getExam(examId);
  if (!ex) return null;
  const history = await db
    .select({ skill: attemptItem.skill, difficulty: attemptItem.difficulty, correct: attemptItem.correct })
    .from(attemptItem)
    .where(and(eq(attemptItem.userId, userId), eq(attemptItem.examId, examId), eq(attemptItem.answered, true)))
    .orderBy(desc(attemptItem.createdAt), desc(attemptItem.position))
    .limit(HISTORY_LIMIT);
  return computeReadiness(ex.config, history);
});

/** getReadiness's input for several exams in one query: each exam's latest answers, newest first. */
async function recentAnswersByExam(userId: string, examIds: string[]) {
  const res = await db.execute<{ exam_id: string; skill: string; difficulty: number; correct: boolean }>(sql`
    select exam_id, skill, difficulty, correct from (
      select exam_id, skill, difficulty, correct, created_at, position,
        row_number() over (partition by exam_id order by created_at desc, position desc) as n
      from ${attemptItem}
      where user_id = ${userId} and exam_id in ${examIds} and answered
    ) recent
    where n <= ${HISTORY_LIMIT}
    order by exam_id, created_at desc, position desc`);
  const byExam = new Map<string, AnswerRecord[]>();
  for (const r of res.rows) {
    const list = byExam.get(r.exam_id) ?? [];
    list.push({ skill: r.skill, difficulty: Number(r.difficulty), correct: Boolean(r.correct) });
    byExam.set(r.exam_id, list);
  }
  return byExam;
}

/** countDue for several exams in one query. */
async function dueByExam(userId: string, examIds: string[]) {
  const rows = await db.select({ examId: reviewCard.examId, n: count() }).from(reviewCard)
    .where(and(eq(reviewCard.userId, userId), inArray(reviewCard.examId, examIds), lte(reviewCard.due, new Date())))
    .groupBy(reviewCard.examId);
  return new Map(rows.map((r) => [r.examId, r.n]));
}

/** countMistakes for several exams in one query. */
async function mistakesByExam(userId: string, examIds: string[]) {
  const res = await db.execute<{ exam_id: string; n: number }>(sql`
    select exam_id, count(*)::int as n from (
      select distinct on (exam_id, question_id) exam_id, correct
      from ${attemptItem}
      where user_id = ${userId} and exam_id in ${examIds} and answered
      order by exam_id, question_id, created_at desc
    ) latest where not correct
    group by exam_id`);
  return new Map(res.rows.map((r) => [r.exam_id, Number(r.n)]));
}

export const countDue = cache(async (userId: string, examId?: string) => {
  const where = [eq(reviewCard.userId, userId), lte(reviewCard.due, new Date())];
  if (examId) where.push(eq(reviewCard.examId, examId));
  const [row] = await db.select({ n: count() }).from(reviewCard).where(and(...where));
  return row?.n ?? 0;
});

/** Questions whose most recent answer was wrong. */
export const countMistakes = cache(async (userId: string, examId: string) => {
  const res = await db.execute<{ n: number }>(sql`
    select count(*)::int as n from (
      select distinct on (question_id) correct
      from ${attemptItem}
      where user_id = ${userId} and exam_id = ${examId} and answered
      order by question_id, created_at desc
    ) latest where not correct`);
  return Number(res.rows[0]?.n ?? 0);
});

/** Per request: the exam hub and its study plan both read it. */
export const getEnrollment = cache(async (userId: string, examId: string) => {
  const [row] = await db.select().from(enrollment).where(and(eq(enrollment.userId, userId), eq(enrollment.examId, examId))).limit(1);
  return row ?? null;
});

export interface ExamHubData {
  readiness: Readiness | null;
  active: Awaited<ReturnType<typeof getActiveAttempts>>[number] | null;
  due: number;
  mistakes: number;
  saved: number;
  recent: Awaited<ReturnType<typeof listAttempts>>;
  bestScaled: number | null;
  certificateId: string | null;
  targetDate: string | null;
}

export async function getExamHubData(userId: string, examId: string): Promise<ExamHubData> {
  const [readiness, activeList, due, mistakes, [savedRow], recent, [best], [cert], enroll] = await Promise.all([
    getReadiness(userId, examId),
    getActiveAttempts(userId),
    countDue(userId, examId),
    countMistakes(userId, examId),
    db.select({ n: count() }).from(bookmark).where(and(eq(bookmark.userId, userId), eq(bookmark.examId, examId))),
    listAttempts(userId, { examId, limit: 5 }),
    db.select({ best: max(attempt.scaled) }).from(attempt)
      .where(and(eq(attempt.userId, userId), eq(attempt.examId, examId), eq(attempt.status, 'submitted'), sql`${attempt.kind} in ('full','quick')`)),
    db.select({ id: certificate.id }).from(certificate).where(and(eq(certificate.userId, userId), eq(certificate.examId, examId))).orderBy(desc(certificate.scaled)).limit(1),
    getEnrollment(userId, examId),
  ]);
  return {
    readiness,
    active: activeList.find((a) => a.examId === examId) ?? null,
    due,
    mistakes,
    saved: savedRow?.n ?? 0,
    recent,
    bestScaled: best?.best ?? null,
    certificateId: cert?.id ?? null,
    targetDate: enroll?.targetDate ?? null,
  };
}

export interface DashboardExam {
  id: string;
  code: string;
  title: string;
  accent: string | null;
  readiness: Readiness | null;
  due: number;
  mistakes: number;
  targetDate: string | null;
  lastActivity: string | null;
}

/** The exams a learner is working on, most recently active first. */
export async function getMyExams(userId: string, limit = 4): Promise<DashboardExam[]> {
  const rows = await db
    .select({
      id: exam.id, code: exam.code, title: exam.title, meta: exam.meta, targetDate: enrollment.targetDate,
      lastActivity: sql<string | null>`(select max(${attempt.startedAt}) from ${attempt} where ${attempt.userId} = ${userId} and ${attempt.examId} = ${exam.id})`.as('last_activity'),
    })
    .from(enrollment)
    .innerJoin(exam, eq(exam.id, enrollment.examId))
    .where(eq(enrollment.userId, userId))
    .orderBy(sql`last_activity desc nulls last`, desc(enrollment.createdAt))
    .limit(limit);
  if (!rows.length) return [];

  // Three queries for all the exams together, instead of three per exam.
  const ids = rows.map((r) => r.id);
  const [answers, due, mistakes, exams] = await Promise.all([
    recentAnswersByExam(userId, ids),
    dueByExam(userId, ids),
    mistakesByExam(userId, ids),
    Promise.all(ids.map((id) => getExam(id))),
  ]);
  return rows.map((r, i) => {
    const ex = exams[i];
    return {
      id: r.id,
      code: r.code,
      title: r.title,
      accent: r.meta.accent ?? null,
      targetDate: r.targetDate,
      lastActivity: r.lastActivity ? new Date(r.lastActivity).toISOString() : null,
      readiness: ex ? computeReadiness(ex.config, answers.get(r.id) ?? []) : null,
      due: due.get(r.id) ?? 0,
      mistakes: mistakes.get(r.id) ?? 0,
    };
  });
}

export interface ProgressData {
  exams: { id: string; code: string; title: string }[];
  examId: string | null;
  scale: { min: number; max: number; passing: number } | null;
  trend: { id: string; at: string; value: number; label: string }[];
  readiness: Readiness | null;
  stats: { answered: number; accuracy30: number | null; mocks: number; best: number | null };
  certificates: { id: string; examCode: string; examTitle: string; scaled: number; issuedAt: string }[];
}

export async function getProgressData(userId: string, requestedExamId?: string): Promise<ProgressData> {
  const exams = await db
    .selectDistinct({ id: exam.id, code: exam.code, title: exam.title })
    .from(attempt)
    .innerJoin(exam, eq(exam.id, attempt.examId))
    .where(eq(attempt.userId, userId));
  const examId = exams.find((e) => e.id === requestedExamId)?.id ?? exams[0]?.id ?? null;
  const ex = examId ? await getExam(examId) : null;

  const [trendRows, readiness, [answeredRow], [recentRow], certs] = await Promise.all([
    examId
      ? db.select({ id: attempt.id, at: attempt.finishedAt, value: attempt.scaled, kind: attempt.kind })
        .from(attempt)
        .where(and(eq(attempt.userId, userId), eq(attempt.examId, examId), eq(attempt.status, 'submitted'), sql`${attempt.kind} in ('full','quick','diagnostic')`))
        .orderBy(attempt.finishedAt)
        .limit(40)
      : Promise.resolve([]),
    examId ? getReadiness(userId, examId) : Promise.resolve(null),
    db.select({ n: count() }).from(attemptItem).where(and(eq(attemptItem.userId, userId), eq(attemptItem.answered, true), ...(examId ? [eq(attemptItem.examId, examId)] : []))),
    db.select({ n: count(), right: sql<number>`count(*) filter (where ${attemptItem.correct})::int` }).from(attemptItem)
      .where(and(eq(attemptItem.userId, userId), eq(attemptItem.answered, true), sql`${attemptItem.createdAt} > now() - interval '30 days'`, ...(examId ? [eq(attemptItem.examId, examId)] : []))),
    db.select({ id: certificate.id, examCode: exam.code, examTitle: exam.title, scaled: certificate.scaled, issuedAt: certificate.issuedAt })
      .from(certificate).innerJoin(exam, eq(exam.id, certificate.examId))
      .where(eq(certificate.userId, userId)).orderBy(desc(certificate.issuedAt)),
  ]);

  const labels: Record<string, string> = { full: 'Full mock', quick: 'Quick mock', diagnostic: 'Diagnostic' };
  const trend = trendRows.filter((r) => r.value != null && r.at).map((r) => ({ id: r.id, at: r.at!.toISOString(), value: r.value!, label: labels[r.kind] ?? r.kind }));
  const mockValues = trend.filter((t) => t.label !== 'Diagnostic').map((t) => t.value);
  return {
    exams,
    examId,
    scale: ex ? { min: ex.config.scale.min, max: ex.config.scale.max, passing: ex.config.scale.passing } : null,
    trend,
    readiness,
    stats: {
      answered: answeredRow?.n ?? 0,
      accuracy30: recentRow?.n ? Math.round((Number(recentRow.right) / recentRow.n) * 100) : null,
      mocks: mockValues.length,
      best: mockValues.length ? Math.max(...mockValues) : null,
    },
    certificates: certs.map((c) => ({ ...c, issuedAt: c.issuedAt.toISOString() })),
  };
}
