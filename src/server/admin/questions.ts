import 'server-only';
import { and, asc, count, desc, eq, ilike, inArray, or, sql, type SQL } from 'drizzle-orm';
import { db } from '@/db';
import { exam, question, questionReport, questionRevision, type QuestionPool, type QuestionStatus } from '@/db/schema';
import { validateQuestion } from '@/lib/content/validate';
import type { Question } from '@/lib/engine';
import { AppError, notFound } from '../errors';
import { getExam, rowToQuestion } from '../exams';
import { flagsFor, getItemStats, type ItemStat } from './analysis';

export interface QuestionListFilters {
  examId: string;
  status?: QuestionStatus | 'all';
  pool?: QuestionPool | 'all';
  type?: string;
  skill?: string;
  q?: string;
  flagged?: boolean;
  sort?: 'updated' | 'id' | 'p' | 'n';
  page?: number;
}

export interface QuestionListRow {
  id: string;
  stem: string;
  type: Question['type'];
  skill: string;
  skillName: string;
  difficulty: number;
  status: QuestionStatus;
  pool: QuestionPool;
  source: string;
  version: number;
  updatedAt: string;
  openReports: number;
  stats: Pick<ItemStat, 'n' | 'p' | 'discrimination' | 'flags'> | null;
}

const PAGE_SIZE = 25;

export async function listQuestions(f: QuestionListFilters) {
  const ex = await getExam(f.examId);
  if (!ex) throw notFound('That exam');
  const where: SQL[] = [eq(question.examId, ex.id)];
  if (f.status && f.status !== 'all') where.push(eq(question.status, f.status));
  if (f.pool && f.pool !== 'all') where.push(eq(question.pool, f.pool));
  if (f.type) where.push(eq(question.type, f.type as Question['type']));
  if (f.skill) where.push(eq(question.skill, f.skill));
  if (f.q?.trim()) {
    const term = `%${f.q.trim().replace(/[%_]/g, (c) => `\\${c}`)}%`;
    where.push(or(ilike(question.stem, term), ilike(question.id, term))!);
  }

  const stats = await getItemStats(ex.id);
  if (f.flagged) {
    const flaggedIds = Object.values(stats).filter((s) => s.flags.length).map((s) => s.questionId);
    if (!flaggedIds.length) return { rows: [], total: 0, page: 1, pageSize: PAGE_SIZE, counts: await statusCounts(ex.id) };
    where.push(inArray(question.id, flaggedIds));
  }

  const [{ total }] = await db.select({ total: count() }).from(question).where(and(...where));
  const page = Math.max(1, f.page ?? 1);
  const order = f.sort === 'id' ? [asc(question.id)] : [desc(question.updatedAt), asc(question.id)];
  let rows = await db
    .select({
      id: question.id, stem: question.stem, type: question.type, skill: question.skill, difficulty: question.difficulty,
      status: question.status, pool: question.pool, source: question.source, version: question.version, updatedAt: question.updatedAt,
      openReports: sql<number>`(select count(*)::int from ${questionReport} r where r.question_id = ${question.id} and r.status = 'open')`,
    })
    .from(question)
    .where(and(...where))
    .orderBy(...order)
    .limit(f.sort === 'p' || f.sort === 'n' ? 5000 : PAGE_SIZE)
    .offset(f.sort === 'p' || f.sort === 'n' ? 0 : (page - 1) * PAGE_SIZE);

  // Stat-based sorts happen in memory over the filtered set, then paginate.
  if (f.sort === 'p' || f.sort === 'n') {
    const key = (id: string) => (f.sort === 'p' ? stats[id]?.p ?? 2 : -(stats[id]?.n ?? 0));
    rows = rows.sort((a, b) => key(a.id) - key(b.id)).slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  }

  const skillName = Object.fromEntries(ex.config.skills.map((s) => [s.id, s.name]));
  return {
    rows: rows.map<QuestionListRow>((r) => ({
      ...r,
      skillName: skillName[r.skill] ?? r.skill,
      updatedAt: r.updatedAt.toISOString(),
      stats: stats[r.id] ? { n: stats[r.id].n, p: stats[r.id].p, discrimination: stats[r.id].discrimination, flags: stats[r.id].flags } : null,
    })),
    total,
    page,
    pageSize: PAGE_SIZE,
    counts: await statusCounts(ex.id),
  };
}

async function statusCounts(examId: string) {
  const rows = await db.select({ status: question.status, n: count() }).from(question).where(eq(question.examId, examId)).groupBy(question.status);
  return Object.fromEntries(rows.map((r) => [r.status, r.n])) as Partial<Record<QuestionStatus, number>>;
}

export async function getQuestionForEditor(id: string) {
  const [row] = await db.select().from(question).where(eq(question.id, id)).limit(1);
  if (!row) throw notFound('That question');
  const ex = (await getExam(row.examId))!;
  const [stats, revisions, reports] = await Promise.all([
    getItemStats(row.examId, [row.id]),
    db.select({ id: questionRevision.id, version: questionRevision.version, note: questionRevision.note, createdAt: questionRevision.createdAt, editedBy: questionRevision.editedBy })
      .from(questionRevision).where(eq(questionRevision.questionId, id)).orderBy(desc(questionRevision.version)).limit(15),
    db.select().from(questionReport).where(eq(questionReport.questionId, id)).orderBy(desc(questionReport.createdAt)).limit(20),
  ]);
  const s = stats[row.id] ?? null;
  return {
    question: { ...rowToQuestion(row), status: row.status, pool: row.pool, source: row.source, provenance: row.provenance, version: row.version, examId: row.examId, updatedAt: row.updatedAt.toISOString() },
    examId: ex.id,
    stats: s ? { ...s, flags: flagsFor(s, ['single', 'multi', 'truefalse'].includes(row.type) ? row.options.map((o) => o.id) : undefined) } : null,
    revisions: revisions.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
    reports: reports.map((r) => ({ ...r, createdAt: r.createdAt.toISOString(), resolvedAt: r.resolvedAt?.toISOString() ?? null })),
  };
}

export interface QuestionDraft extends Question {
  status: QuestionStatus;
  pool: QuestionPool;
}

function newQuestionId(examCode: string, skill: string) {
  const prefix = examCode.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '');
  const skillCode = skill.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || 'GEN';
  const rand = crypto.getRandomValues(new Uint32Array(1))[0].toString(36).toUpperCase().padStart(6, '0').slice(0, 6);
  return `${prefix}-${skillCode}-${rand}`;
}

/** Validates for the chosen status: drafts may be incomplete, anything else must pass every check. */
export async function checkDraft(examId: string, draft: QuestionDraft) {
  const ex = await getExam(examId);
  if (!ex) throw notFound('That exam');
  const { status: _s, pool: _p, ...q } = draft;
  // New drafts get their id and domain on first save; validate the rest as if they were already set.
  const skill = ex.config.skills.find((s) => s.id === q.skill);
  const candidate = { ...q, id: q.id || 'NEW-QUESTION', domain: skill?.domain ?? q.domain };
  const result = validateQuestion(ex.config, candidate as unknown as Question & Record<string, unknown>, draft.id || 'new question');
  return { ...result, errors: result.errors.map((e) => e.replace(/^[^:]+: /, '')), warnings: result.warnings.map((w) => w.replace(/^[^:]+: /, '')) };
}

export async function saveQuestion(userId: string, examId: string, draft: QuestionDraft, opts: { id?: string; note?: string } = {}) {
  const ex = await getExam(examId);
  if (!ex) throw notFound('That exam');
  const skill = ex.config.skills.find((s) => s.id === draft.skill);
  if (!skill) throw new AppError('Choose a skill from this exam.', 400);
  const id = opts.id ?? newQuestionId(ex.code, draft.skill);
  const candidate = { ...draft, id, domain: skill.domain };
  const { errors, warnings } = await checkDraft(examId, candidate);
  if (draft.status !== 'draft' && errors.length) {
    throw new AppError('Fix the highlighted problems before moving this question out of draft.', 400, 'INVALID_QUESTION', { errors, warnings });
  }

  const values = {
    examId: ex.id,
    pool: draft.pool,
    status: draft.status,
    domain: skill.domain,
    skill: draft.skill,
    difficulty: draft.difficulty,
    type: draft.type,
    select: draft.type === 'multi' ? draft.options.filter((o) => o.correct).length || draft.select : 1,
    stem: draft.stem,
    options: draft.options,
    answerOrder: draft.type === 'order' ? draft.answerOrder ?? null : null,
    prompts: draft.type === 'match' ? draft.prompts ?? null : null,
    accepted: draft.type === 'fill' ? draft.accepted ?? null : null,
    explanation: draft.explanation,
    reference: draft.reference || null,
    caseId: draft.caseId || null,
  };

  return db.transaction(async (tx) => {
    if (opts.id) {
      const [existing] = await tx.select().from(question).where(eq(question.id, opts.id)).limit(1);
      if (!existing) throw notFound('That question');
      await tx.insert(questionRevision).values({ questionId: existing.id, version: existing.version, data: existing, editedBy: userId, note: opts.note ?? null });
      await tx.update(question).set({ ...values, source: existing.source === 'seed' ? 'admin' : existing.source, version: existing.version + 1 }).where(eq(question.id, existing.id));
    } else {
      await tx.insert(question).values({ id, ...values, source: 'admin', createdBy: userId });
    }
    return { id, warnings };
  });
}

export async function setQuestionStatus(userId: string, ids: string[], status: QuestionStatus) {
  if (!ids.length) return { updated: 0, blocked: [] as string[] };
  const rows = await db.select().from(question).where(inArray(question.id, ids));
  const blocked: string[] = [];
  let updated = 0;
  for (const row of rows) {
    if (status === 'published' || status === 'review') {
      const ex = (await getExam(row.examId))!;
      const { errors } = validateQuestion(ex.config, rowToQuestion(row) as Question & Record<string, unknown>);
      if (errors.length) { blocked.push(row.id); continue; }
    }
    await db.update(question).set({ status, source: row.source === 'seed' ? 'admin' : row.source }).where(eq(question.id, row.id));
    updated += 1;
  }
  return { updated, blocked };
}

export async function listExamsForAdmin() {
  return db.select({ id: exam.id, code: exam.code, title: exam.title, config: exam.config }).from(exam).orderBy(asc(exam.sortOrder));
}
