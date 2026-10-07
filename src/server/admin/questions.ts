import 'server-only';
import { and, asc, count, desc, eq, gt, ilike, inArray, or, sql, type SQL } from 'drizzle-orm';
import { db } from '@/db';
import { exam, question, questionReport, questionRevision, type QuestionPool, type QuestionStatus } from '@/db/schema';
import { validateQuestion } from '@/lib/content/validate';
import type { Question } from '@/lib/engine';
import { cached, invalidateCatalog } from '../cache';
import { AppError, notFound } from '../errors';
import { getExam, rowToQuestion } from '../exams';
import { flagsFor, getItemStats, getItemStatsSnapshot, type ItemStat } from './analysis';

export type QuestionSort = 'updated' | 'id' | 'p' | 'n';

export interface QuestionListFilters {
  examId: string;
  status?: QuestionStatus | 'all';
  pool?: QuestionPool | 'all';
  type?: string;
  skill?: string;
  q?: string;
  flagged?: boolean;
  sort?: QuestionSort;
}

export interface QuestionListRow {
  id: string;
  /** the stem as one plain line, code blocks collapsed, cut to what a table row shows */
  preview: string;
  type: Question['type'];
  skillName: string;
  difficulty: number;
  status: QuestionStatus;
  pool: QuestionPool;
  version: number;
  openReports: number;
  stats: Pick<ItemStat, 'n' | 'p' | 'flags'> | null;
}

export interface QuestionListPage {
  rows: QuestionListRow[];
  /** send back as `cursor` for the next page; null on the last page */
  nextCursor: string | null;
  /** how many questions match; sent with the first page */
  total: number | null;
}

/** Rows per request. The table virtualises its rows, so this only bounds each response. */
const LIST_PAGE_SIZE = 100;
/** The largest set one bulk status change (or "select all matching") may cover. */
const MAX_BULK = 5000;

const listColumns = {
  id: question.id,
  // Enough of the stem for a two-line preview; long code-heavy stems stay in the database.
  stem: sql<string>`left(${question.stem}, 600)`,
  type: question.type,
  skill: question.skill,
  difficulty: question.difficulty,
  status: question.status,
  pool: question.pool,
  version: question.version,
  // Full precision for the cursor: a JS Date would drop the microseconds Postgres compares on.
  updatedAtText: sql<string>`${question.updatedAt}::text`,
  openReports: sql<number>`(select count(*)::int from ${questionReport} r where r.question_id = ${question.id} and r.status = 'open')`,
};

interface ListRecord {
  id: string;
  stem: string;
  type: Question['type'];
  skill: string;
  difficulty: number;
  status: QuestionStatus;
  pool: QuestionPool;
  version: number;
  updatedAtText: string;
  openReports: number;
}

/**
 * One page of an exam's questions. Pages are keyset-paginated (the cursor is
 * the last row's sort key), so later pages cost the same as the first and
 * edits made meanwhile never shift rows into or out of view. The statistic
 * sorts order the matching ids in memory and slice by offset instead.
 */
export async function listQuestions(f: QuestionListFilters & { cursor?: string | null }): Promise<QuestionListPage> {
  const ex = await getExam(f.examId);
  if (!ex) throw notFound('That exam');
  const sort = f.sort ?? 'updated';
  const cursor = readCursor(f.cursor);
  const statsP = getItemStatsSnapshot(ex.id);
  const where = filterWhere(ex.id, f);
  if (f.flagged && !addFlagged(where, await statsP)) return { rows: [], nextCursor: null, total: 0 };

  const skillName = new Map(ex.config.skills.map((s) => [s.id, s.name]));
  const toRow = (r: ListRecord, stats: Record<string, ItemStat>): QuestionListRow => {
    const s = stats[r.id];
    return {
      id: r.id,
      preview: toPreview(r.stem),
      type: r.type,
      skillName: skillName.get(r.skill) ?? r.skill,
      difficulty: r.difficulty,
      status: r.status,
      pool: r.pool,
      version: r.version,
      openReports: r.openReports,
      stats: s ? { n: s.n, p: s.p, flags: s.flags } : null,
    };
  };

  if (sort === 'p' || sort === 'n') {
    const [matches, stats] = await Promise.all([db.select({ id: question.id }).from(question).where(and(...where)), statsP]);
    const key = (id: string) => (sort === 'p' ? stats[id]?.p ?? 2 : -(stats[id]?.n ?? 0));
    const ordered = matches.map((m) => m.id).sort((a, b) => key(a) - key(b) || (a < b ? -1 : a > b ? 1 : 0));
    const offset = cursor ? cursorOffset(cursor) : 0;
    const pageIds = ordered.slice(offset, offset + LIST_PAGE_SIZE);
    const records = pageIds.length ? await db.select(listColumns).from(question).where(inArray(question.id, pageIds)) : [];
    const byId = new Map(records.map((r) => [r.id, r]));
    return {
      rows: pageIds.flatMap((id) => {
        const r = byId.get(id);
        return r ? [toRow(r, stats)] : [];
      }),
      nextCursor: offset + LIST_PAGE_SIZE < ordered.length ? writeCursor({ o: offset + LIST_PAGE_SIZE }) : null,
      total: ordered.length,
    };
  }

  // The total ignores the cursor, so it is counted (once, with the first page) before the keyset condition joins.
  const counted = cursor ? null : db.select({ n: count() }).from(question).where(and(...where));
  if (cursor) where.push(keysetAfter(sort, cursor));
  const order = sort === 'id' ? [asc(question.id)] : [desc(question.updatedAt), asc(question.id)];
  const [records, total, stats] = await Promise.all([
    db.select(listColumns).from(question).where(and(...where)).orderBy(...order).limit(LIST_PAGE_SIZE + 1),
    counted?.then(([r]) => r?.n ?? 0) ?? null,
    statsP,
  ]);
  const more = records.length > LIST_PAGE_SIZE;
  const page = more ? records.slice(0, LIST_PAGE_SIZE) : records;
  const last = page.at(-1);
  return {
    rows: page.map((r) => toRow(r, stats)),
    nextCursor: more && last ? writeCursor(sort === 'id' ? { id: last.id } : { t: last.updatedAtText, id: last.id }) : null,
    total,
  };
}

/** Every id that matches the filters, for "select all matching". */
export async function listQuestionIds(f: QuestionListFilters) {
  const ex = await getExam(f.examId);
  if (!ex) throw notFound('That exam');
  const where = filterWhere(ex.id, f);
  if (f.flagged && !addFlagged(where, await getItemStatsSnapshot(ex.id))) return { ids: [] as string[] };
  const rows = await db.select({ id: question.id }).from(question).where(and(...where)).limit(MAX_BULK + 1);
  if (rows.length > MAX_BULK) throw new AppError(`More than ${MAX_BULK.toLocaleString('en-US')} questions match. Narrow the filters first.`, 400);
  return { ids: rows.map((r) => r.id) };
}

export async function questionStatusCounts(examId: string) {
  const rows = await db.select({ status: question.status, n: count() }).from(question).where(eq(question.examId, examId)).groupBy(question.status);
  return { counts: Object.fromEntries(rows.map((r) => [r.status, r.n])) as Partial<Record<QuestionStatus, number>> };
}

function filterWhere(examId: string, f: QuestionListFilters): SQL[] {
  const where: SQL[] = [eq(question.examId, examId)];
  if (f.status && f.status !== 'all') where.push(eq(question.status, f.status));
  if (f.pool && f.pool !== 'all') where.push(eq(question.pool, f.pool));
  if (f.type) where.push(eq(question.type, f.type as Question['type']));
  if (f.skill) where.push(eq(question.skill, f.skill));
  const q = f.q?.trim();
  if (q) {
    const term = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    where.push(or(ilike(question.stem, term), ilike(question.id, term))!);
  }
  return where;
}

/** Adds the "needs attention" condition. False when nothing is flagged, so nothing can match. */
function addFlagged(where: SQL[], stats: Record<string, ItemStat>) {
  const ids = Object.values(stats).filter((s) => s.flags.length).map((s) => s.questionId);
  if (!ids.length) return false;
  where.push(inArray(question.id, ids));
  return true;
}

/** A stem as one plain line for tables: code blocks become [code] and whitespace collapses. */
function toPreview(stem: string) {
  const line = stem.replace(/```[\s\S]*?(?:```|$)/g, ' [code] ').replace(/\s+/g, ' ').trim();
  return line.length > 240 ? `${line.slice(0, 239).trimEnd()}…` : line;
}

interface Cursor { t?: string; id?: string; o?: number }

const writeCursor = (c: Cursor) => Buffer.from(JSON.stringify(c)).toString('base64url');
const badCursor = () => new AppError('That list position has expired. Reload the list.', 400, 'BAD_CURSOR');

function readCursor(raw: string | null | undefined): Cursor | null {
  if (!raw) return null;
  try {
    const c: unknown = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
    if (c && typeof c === 'object') return c as Cursor;
  } catch {
    // reported below
  }
  throw badCursor();
}

/** Rows strictly after the cursor in the list's order. */
function keysetAfter(sort: 'updated' | 'id', c: Cursor): SQL {
  if (sort === 'id' && typeof c.id === 'string') return gt(question.id, c.id);
  if (sort === 'updated' && typeof c.t === 'string' && typeof c.id === 'string') {
    return sql`(${question.updatedAt} < ${c.t}::timestamptz or (${question.updatedAt} = ${c.t}::timestamptz and ${question.id} > ${c.id}))`;
  }
  throw badCursor();
}

function cursorOffset(c: Cursor) {
  if (typeof c.o === 'number' && Number.isInteger(c.o) && c.o >= 0) return c.o;
  throw badCursor();
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
  }).finally(() => invalidateCatalog());
}

/** Moves questions to a status in one statement; items that fail validation can't be published or sent to review. */
export async function setQuestionStatus(userId: string, ids: string[], status: QuestionStatus) {
  const unique = [...new Set(ids)];
  if (!unique.length) return { updated: 0, blocked: [] as string[] };
  if (unique.length > MAX_BULK) throw new AppError(`Change at most ${MAX_BULK.toLocaleString('en-US')} questions at a time.`, 400);

  let allowed = unique;
  const blocked: string[] = [];
  if (status === 'published' || status === 'review') {
    const rows = await db.select().from(question).where(inArray(question.id, unique));
    const exams = new Map(await Promise.all([...new Set(rows.map((r) => r.examId))].map(async (id) => [id, await getExam(id)] as const)));
    allowed = [];
    for (const row of rows) {
      const ex = exams.get(row.examId);
      const { errors } = ex ? validateQuestion(ex.config, rowToQuestion(row) as Question & Record<string, unknown>) : { errors: ['unknown exam'] };
      if (errors.length) blocked.push(row.id);
      else allowed.push(row.id);
    }
  }

  const updated = allowed.length
    ? await db.update(question)
      // Edited in the app now, so the seed must leave these rows alone.
      .set({ status, source: sql`case when ${question.source} = 'seed' then 'admin' else ${question.source} end` })
      .where(inArray(question.id, allowed))
      .returning({ id: question.id })
    : [];
  invalidateCatalog();
  return { updated: updated.length, blocked };
}

/** Exams for the admin switcher and pages. Cached with the catalog, which admin writes clear. */
export const listExamsForAdmin = () =>
  cached('catalog:admin-exams', () => db.select({ id: exam.id, code: exam.code, title: exam.title, config: exam.config }).from(exam).orderBy(asc(exam.sortOrder)));

/** What the exam switcher needs. Passing whole exams would ship every blueprint to the browser. */
export const examOptions = (exams: { id: string; code: string; title: string }[]) =>
  exams.map(({ id, code, title }) => ({ id, code, title }));
