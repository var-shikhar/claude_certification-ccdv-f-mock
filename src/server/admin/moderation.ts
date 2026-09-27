import 'server-only';
import { and, asc, count, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import { exam, question, questionReport, user, type QuestionPool, type QuestionStatus, type Role } from '@/db/schema';
import { convertUdemyCsv, parseCsv } from '@/lib/content/csv';
import { validateQuestion } from '@/lib/content/validate';
import type { Question } from '@/lib/engine';
import { invalidateCatalog } from '../cache';
import { AppError, notFound } from '../errors';
import { getExam, rowToQuestion } from '../exams';

// ---------------------------------------------------------------- reports

export async function listReports(status: 'open' | 'resolved' | 'dismissed' = 'open') {
  const rows = await db
    .select({ r: questionReport, stem: question.stem, examCode: exam.code, reporter: user.name })
    .from(questionReport)
    .innerJoin(question, eq(question.id, questionReport.questionId))
    .innerJoin(exam, eq(exam.id, questionReport.examId))
    .leftJoin(user, eq(user.id, questionReport.userId))
    .where(eq(questionReport.status, status))
    .orderBy(status === 'open' ? asc(questionReport.createdAt) : desc(questionReport.resolvedAt))
    .limit(200);
  return rows.map(({ r, stem, examCode, reporter }) => ({
    id: r.id, questionId: r.questionId, examCode, reason: r.reason, message: r.message, status: r.status,
    resolution: r.resolution, reporter: reporter ?? 'Deleted user', stem,
    createdAt: r.createdAt.toISOString(), resolvedAt: r.resolvedAt?.toISOString() ?? null,
  }));
}

export async function resolveReports(userId: string, ids: string[], status: 'resolved' | 'dismissed', resolution?: string) {
  if (!ids.length) return { updated: 0 };
  const res = await db.update(questionReport)
    .set({ status, resolution: resolution?.trim() || null, resolvedBy: userId, resolvedAt: new Date() })
    .where(and(inArray(questionReport.id, ids), eq(questionReport.status, 'open')))
    .returning({ id: questionReport.id });
  return { updated: res.length };
}

export async function openReportCount() {
  const [row] = await db.select({ n: count() }).from(questionReport).where(eq(questionReport.status, 'open'));
  return row?.n ?? 0;
}

// ---------------------------------------------------------------- import / export

export interface ImportPreviewItem { id: string; stem: string; type: string; skill: string; errors: string[]; warnings: string[]; exists: boolean }

function parseInput(examCfg: Awaited<ReturnType<typeof getExam>>, format: 'csv' | 'json', text: string, setName: string): { items: Question[]; skipped: string[] } {
  if (format === 'csv') return convertUdemyCsv(examCfg!.config, parseCsv(text), { setName });
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { throw new AppError('That file is not valid JSON.', 400); }
  const items = Array.isArray(parsed) ? parsed : (parsed as { questions?: unknown[] })?.questions;
  if (!Array.isArray(items)) throw new AppError('Expected a JSON array of questions (or { "questions": [...] }).', 400);
  return { items: items as Question[], skipped: [] };
}

export async function previewImport(examId: string, format: 'csv' | 'json', text: string, setName = 'import') {
  const ex = await getExam(examId);
  if (!ex) throw notFound('That exam');
  if (text.length > 5_000_000) throw new AppError('That file is too large (5 MB max).', 413);
  const { items, skipped } = parseInput(ex, format, text, setName);
  const ids = items.map((q) => String(q?.id ?? '')).filter(Boolean);
  const existing = ids.length ? new Set((await db.select({ id: question.id }).from(question).where(inArray(question.id, ids))).map((r) => r.id)) : new Set<string>();
  const seen = new Set<string>();
  const preview: ImportPreviewItem[] = items.map((q, i) => {
    const { errors, warnings } = validateQuestion(ex.config, q as Question & Record<string, unknown>, String(q?.id ?? `item ${i + 1}`));
    if (q?.id && seen.has(q.id)) errors.push(`${q.id}: duplicate id in this file`);
    if (q?.id) seen.add(q.id);
    return {
      id: String(q?.id ?? `item ${i + 1}`), stem: String(q?.stem ?? '').slice(0, 160), type: String(q?.type ?? ''), skill: String(q?.skill ?? ''),
      errors: errors.map((e) => e.replace(/^[^:]+: /, '')), warnings: warnings.map((w) => w.replace(/^[^:]+: /, '')), exists: existing.has(String(q?.id)),
    };
  });
  return { items: preview, skipped, valid: preview.filter((p) => !p.errors.length).length };
}

export async function commitImport(userId: string, examId: string, format: 'csv' | 'json', text: string, opts: { setName?: string; pool: QuestionPool; status: QuestionStatus; overwrite: boolean }) {
  const ex = await getExam(examId);
  if (!ex) throw notFound('That exam');
  const { items } = parseInput(ex, format, text, opts.setName ?? 'import');
  const valid = items.filter((q) => !validateQuestion(ex.config, q as Question & Record<string, unknown>).errors.length);
  if (!valid.length) throw new AppError('Nothing to import: every item has errors.', 400);
  const rows = valid.map((q) => ({
    id: q.id, examId: ex.id, pool: opts.pool, status: opts.status, domain: q.domain, skill: q.skill, difficulty: q.difficulty,
    type: q.type, select: q.select ?? 1, stem: q.stem, options: q.options ?? [], answerOrder: q.answerOrder ?? null, prompts: q.prompts ?? null,
    accepted: q.accepted ?? null, explanation: q.explanation, reference: q.reference ?? null, caseId: q.caseId ?? null,
    source: format === 'csv' ? 'csv-import' : 'json-import', createdBy: userId,
  }));
  let inserted = 0;
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200);
    const q = db.insert(question).values(chunk);
    const res = opts.overwrite
      ? await q.onConflictDoUpdate({
        target: question.id,
        set: Object.fromEntries(['pool', 'status', 'domain', 'skill', 'difficulty', 'type', 'select', 'stem', 'options', 'answerOrder', 'prompts', 'accepted', 'explanation', 'reference', 'caseId', 'source']
          .map((k) => [k, sql.raw(`excluded.${k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)}`)])),
      }).returning({ id: question.id })
      : await q.onConflictDoNothing().returning({ id: question.id });
    inserted += res.length;
  }
  invalidateCatalog();
  return { imported: inserted, skippedInvalid: items.length - valid.length, skippedExisting: valid.length - inserted };
}

/** Export in the same JSON format as content/exams/<id>/questions/*.json. */
export async function exportQuestions(examId: string, status: QuestionStatus | 'all' = 'published') {
  const ex = await getExam(examId);
  if (!ex) throw notFound('That exam');
  const where = [eq(question.examId, ex.id)];
  if (status !== 'all') where.push(eq(question.status, status));
  const rows = await db.select().from(question).where(and(...where)).orderBy(asc(question.id));
  return rows.map((r) => {
    const q = rowToQuestion(r);
    const out: Record<string, unknown> = { id: q.id, domain: q.domain, skill: q.skill, difficulty: q.difficulty, type: q.type, select: q.select, stem: q.stem, options: q.options };
    if (q.answerOrder) out.answerOrder = q.answerOrder;
    if (q.prompts) out.prompts = q.prompts;
    if (q.accepted) out.accepted = q.accepted;
    out.explanation = q.explanation;
    if (q.reference) out.reference = q.reference;
    if (q.caseId) out.caseId = q.caseId.includes(':') ? q.caseId.split(':').slice(1).join(':') : q.caseId;
    return out;
  });
}

// ---------------------------------------------------------------- users

export async function listUsers(search?: string) {
  const where = search?.trim()
    ? or(ilike(user.email, `%${search.trim()}%`), ilike(user.name, `%${search.trim()}%`))
    : undefined;
  const rows = await db
    .select({ id: user.id, name: user.name, email: user.email, role: user.role, isAnonymous: user.isAnonymous, createdAt: user.createdAt })
    .from(user)
    .where(where ? and(where, sql`coalesce(${user.isAnonymous}, false) = false`) : sql`coalesce(${user.isAnonymous}, false) = false`)
    .orderBy(desc(user.createdAt))
    .limit(100);
  return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
}

export async function setUserRole(actorId: string, userId: string, role: Role) {
  if (actorId === userId && role !== 'admin') throw new AppError("You can't remove your own admin access.", 400);
  const [row] = await db.update(user).set({ role }).where(eq(user.id, userId)).returning({ id: user.id, role: user.role });
  if (!row) throw notFound('That user');
  return row;
}
