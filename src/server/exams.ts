import 'server-only';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/db';
import { caseStudy, exam, question, studyNote } from '@/db/schema';
import type { Question } from '@/lib/engine';
import { cached } from './cache';

export type ExamRow = typeof exam.$inferSelect;
export type QuestionRow = typeof question.$inferSelect;

export const getExam = (examId: string): Promise<ExamRow | null> => cached(`catalog:exam:${examId}`, async () => {
  const [row] = await db.select().from(exam).where(eq(exam.id, examId)).limit(1);
  return row ?? null;
});

export interface ExamCard {
  id: string;
  code: string;
  title: string;
  vendor: string | null;
  category: ExamRow['category'];
  meta: ExamRow['meta'];
  itemCount: number;
  timeLimitMinutes: number;
  passing: number;
  scaleMax: number;
  domainCount: number;
  questionCount: number;
  isFree: boolean;
}

export const listExams = (): Promise<ExamCard[]> => cached('catalog:exams', async () => {
  const rows = await db
    .select({
      id: exam.id, code: exam.code, title: exam.title, vendor: exam.vendor, category: exam.category, meta: exam.meta,
      config: exam.config, isFree: exam.isFree,
      questionCount: sql<number>`(select count(*)::int from ${question} q where q.exam_id = ${exam.id} and q.status = 'published')`,
    })
    .from(exam)
    .where(eq(exam.isPublished, true))
    .orderBy(asc(exam.sortOrder), asc(exam.title));
  return rows.map(({ config, ...r }) => ({
    ...r,
    itemCount: config.itemCount,
    timeLimitMinutes: config.timeLimitMinutes,
    passing: config.scale.passing,
    scaleMax: config.scale.max,
    domainCount: config.domains.length,
  }));
});

export function rowToQuestion(r: QuestionRow): Question {
  return {
    id: r.id,
    domain: r.domain,
    skill: r.skill,
    difficulty: r.difficulty,
    type: r.type,
    select: r.select,
    stem: r.stem,
    options: r.options,
    explanation: r.explanation,
    reference: r.reference,
    answerOrder: r.answerOrder ?? undefined,
    prompts: r.prompts ?? undefined,
    accepted: r.accepted ?? undefined,
    caseId: r.caseId,
  };
}

/** Published items for form assembly (bank, imported pool or both). */
export function getAssemblyPool(examId: string, pool: 'bank' | 'imported' | 'all' = 'bank') {
  return cached(`catalog:pool:${examId}:${pool}`, () => {
    const where = [eq(question.examId, examId), eq(question.status, 'published')];
    if (pool !== 'all') where.push(eq(question.pool, pool));
    return db
      .select({ id: question.id, domain: question.domain, skill: question.skill, difficulty: question.difficulty, type: question.type, options: question.options })
      .from(question)
      .where(and(...where));
  });
}

/** Full questions for the given ids, returned in the same order. */
export async function getQuestionsByIds(ids: string[]): Promise<Question[]> {
  if (!ids.length) return [];
  const rows = await db.select().from(question).where(inArray(question.id, ids));
  const byId = new Map(rows.map((r) => [r.id, rowToQuestion(r)]));
  return ids.map((id) => byId.get(id)).filter((q): q is Question => Boolean(q));
}

export async function getCaseStudies(ids: (string | null | undefined)[]) {
  const unique = [...new Set(ids.filter((x): x is string => Boolean(x)))];
  if (!unique.length) return {} as Record<string, { title: string; scenario: string }>;
  const rows = await db.select().from(caseStudy).where(inArray(caseStudy.id, unique));
  return Object.fromEntries(rows.map((r) => [r.id, { title: r.title, scenario: r.scenario }]));
}

export const getStudyNotes = (examId: string) => cached(`catalog:notes:${examId}`, async () => {
  const rows = await db.select().from(studyNote).where(eq(studyNote.examId, examId));
  return Object.fromEntries(rows.map((r) => [r.skillId, r.content]));
});

/** Published bank counts per skill (for "n questions" labels in the syllabus). */
export const getSkillCounts = (examId: string) => cached(`catalog:skills:${examId}`, async () => {
  const rows = await db
    .select({ skill: question.skill, n: sql<number>`count(*)::int` })
    .from(question)
    .where(and(eq(question.examId, examId), eq(question.status, 'published'), eq(question.pool, 'bank')))
    .groupBy(question.skill);
  return Object.fromEntries(rows.map((r) => [r.skill, r.n])) as Record<string, number>;
});

/** Published question counts per pool (the reviewed bank vs. imported practice sets). */
export const getPoolCounts = (examId: string) => cached(`catalog:pools:${examId}`, async () => {
  const rows = await db
    .select({ pool: question.pool, n: sql<number>`count(*)::int` })
    .from(question)
    .where(and(eq(question.examId, examId), eq(question.status, 'published')))
    .groupBy(question.pool);
  return { bank: rows.find((r) => r.pool === 'bank')?.n ?? 0, imported: rows.find((r) => r.pool === 'imported')?.n ?? 0 };
});
