import { inArray } from 'drizzle-orm';
import { beforeAll, describe, expect, test, vi } from 'vitest';

// The real query against an in-memory Postgres (PGlite).
vi.mock('server-only', () => ({}));
vi.mock('@/db', async () => {
  const { PGlite } = await import('@electric-sql/pglite');
  const { drizzle } = await import('drizzle-orm/pglite');
  const schema = await import('@/db/schema');
  return { db: drizzle({ client: new PGlite(), schema, casing: 'snake_case' }), schema, usingPglite: () => true };
});

const { db } = await import('@/db');
const { exam, question } = await import('@/db/schema');
const { loadExamBundle } = await import('@/lib/content/load');
const { invalidateCatalog } = await import('@/server/cache');
const { getSampleQuestions } = await import('@/server/exams');

const EXAM = 'ccar-f';
const bundle = loadExamBundle(EXAM);

beforeAll(async () => {
  const { migrate } = await import('drizzle-orm/pglite/migrator');
  await migrate(db as never, { migrationsFolder: 'drizzle' });
  const { config, questions } = bundle;
  await db.insert(exam).values({ id: config.id, code: config.code, title: config.title, config });
  const row = (q: (typeof questions)[number], extra: Partial<typeof question.$inferInsert> = {}) => ({
    id: q.id, examId: EXAM, domain: q.domain, skill: q.skill, difficulty: q.difficulty, type: q.type, select: q.select ?? 1,
    stem: q.stem, options: q.options ?? [], answerOrder: q.answerOrder ?? null, explanation: q.explanation,
    provenance: q.source ?? null, ...extra,
  });
  await db.insert(question).values(questions.map((q) => row(q)));
  // Things a public page must never show, made as tempting as possible (medium difficulty, top domain).
  const top = [...config.domains].sort((a, b) => b.weight - a.weight)[0].id;
  const base = questions.find((q) => q.domain === top && q.type === 'single')!;
  await db.insert(question).values([
    row(base, { id: 'TRAP-IMPORTED', pool: 'imported', difficulty: 2 }),
    row(base, { id: 'TRAP-DRAFT', status: 'draft', difficulty: 2 }),
    row(base, { id: 'TRAP-CASE', caseId: `${EXAM}:case-1`, difficulty: 2 }),
    row(base, { id: 'TRAP-ORDER', type: 'order', difficulty: 2 }),
    row(base, { id: 'TRAP-OFFICIAL', provenance: 'Official Exam Guide v1.0 sample 99', difficulty: 2 }),
  ]);
}, 60_000);

describe('sample questions', () => {
  test('come only from the original, published, self-contained bank', async () => {
    const samples = await getSampleQuestions(EXAM);
    expect(samples).toHaveLength(10);
    const ids = samples.map((q) => q.id);
    expect(ids.filter((id) => id.startsWith('TRAP-'))).toEqual([]);
    const rows = await db.select({ provenance: question.provenance, type: question.type }).from(question).where(inArray(question.id, ids));
    expect(rows.every((r) => !/official/i.test(r.provenance ?? ''))).toBe(true);
    expect(rows.every((r) => ['single', 'multi', 'truefalse'].includes(r.type))).toBe(true);
  });

  test('spread across domains, heaviest first, and stay the same between requests', async () => {
    const first = await getSampleQuestions(EXAM);
    const byWeight = [...bundle.config.domains].sort((a, b) => b.weight - a.weight).map((d) => d.id);
    expect(first.slice(0, byWeight.length).map((q) => q.domain)).toEqual(byWeight);
    invalidateCatalog();
    expect((await getSampleQuestions(EXAM)).map((q) => q.id)).toEqual(first.map((q) => q.id));
  });

  test('nothing for an unknown exam', async () => {
    expect(await getSampleQuestions('no-such-exam')).toEqual([]);
  });
});
