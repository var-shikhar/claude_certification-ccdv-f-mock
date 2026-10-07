import { sql } from 'drizzle-orm';
import { beforeAll, describe, expect, test, vi } from 'vitest';

// The real queries, run against an in-memory Postgres (PGlite) instead of Neon.
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
const qs = await import('@/server/admin/questions');

type Filters = Omit<Parameters<typeof qs.listQuestions>[0], 'examId'>;

const EXAM = 'js-essentials';
const ROWS = 260; // three pages of 100
let searchable = '';
let invalidDraft = '';

beforeAll(async () => {
  const { migrate } = await import('drizzle-orm/pglite/migrator');
  await migrate(db as never, { migrationsFolder: 'drizzle' });
  const { config, questions } = loadExamBundle(EXAM);
  await db.insert(exam).values({ id: config.id, code: config.code, title: config.title, config });

  // The real items plus copies; every fifth row is a draft.
  const rows = Array.from({ length: ROWS }, (_, i) => {
    const q = questions[i % questions.length];
    return {
      id: i < questions.length ? q.id : `${q.id}-COPY-${String(i).padStart(3, '0')}`,
      examId: config.id, pool: 'bank' as const, status: i % 5 === 0 ? 'draft' as const : 'published' as const,
      domain: q.domain, skill: q.skill, difficulty: q.difficulty, type: q.type, select: q.select ?? 1,
      stem: q.stem, options: q.options ?? [], answerOrder: q.answerOrder ?? null, prompts: q.prompts ?? null,
      accepted: q.accepted ?? null, explanation: q.explanation, reference: q.reference ?? null, source: 'seed',
    };
  });
  rows[7].stem = 'Explain 100% of `x` and a_b \\ path\n```js\nconst a = 1;\n```\nThen what?';
  searchable = rows[7].id;
  rows[10].explanation = 'Too short.'; // fails validation, so it can't be published
  invalidDraft = rows[10].id;
  await db.insert(question).values(rows);

  // Microsecond timestamps with deliberate ties, so the keyset cursor has to be exact.
  await db.execute(sql`update question set updated_at = timestamptz '2026-01-01 00:00:00.123456+00' + mod(abs(hashtext(id)::bigint), 50) * interval '1 second 1 microsecond'`);
}, 60_000);

async function walk(f: Filters = {}) {
  const ids: string[] = [];
  let cursor: string | null = null;
  let total: number | null = null;
  let pages = 0;
  do {
    const page = await qs.listQuestions({ examId: EXAM, ...f, cursor });
    if (pages === 0) total = page.total;
    ids.push(...page.rows.map((r) => r.id));
    cursor = page.nextCursor;
    pages += 1;
  } while (cursor && pages < 50);
  return { ids, total, pages };
}

describe('admin question list', () => {
  test.each(['updated', 'id'] as const)('keyset pages in %s order match SQL, with no gaps or repeats', async (sort) => {
    const order = sort === 'id' ? 'id' : 'updated_at desc, id';
    const expected = (await db.execute<{ id: string }>(sql.raw(`select id from question where exam_id = '${EXAM}' order by ${order}`))).rows.map((r) => r.id);
    const { ids, total, pages } = await walk({ sort });
    expect(pages).toBe(3);
    expect(total).toBe(ROWS);
    expect(ids).toEqual(expected);
  });

  test.each(['p', 'n'] as const)('statistic sort %s pages by offset without repeats', async (sort) => {
    const { ids, total } = await walk({ sort });
    expect(total).toBe(ROWS);
    expect(new Set(ids).size).toBe(ROWS);
  });

  test('filters combine, and search treats % _ \\ literally', async () => {
    const type = (await db.execute<{ type: string }>(sql`select type from question where status = 'draft' limit 1`)).rows[0].type;
    const expected = (await db.execute<{ id: string }>(sql`select id from question where status = 'draft' and type = ${type} order by id`)).rows.map((r) => r.id);
    expect(expected.length).toBeGreaterThan(0);
    expect((await walk({ status: 'draft', type, sort: 'id' })).ids).toEqual(expected);
    for (const q of ['100%', 'a_b', '\\ path']) expect((await walk({ q })).ids).toEqual([searchable]);
  });

  test('previews put the stem on one line and collapse code blocks', async () => {
    const [row] = (await qs.listQuestions({ examId: EXAM, q: '100%' })).rows;
    expect(row.preview).toBe('Explain 100% of `x` and a_b \\ path [code] Then what?');
  });

  test('a cursor from another sort, or garbage, is rejected', async () => {
    const first = await qs.listQuestions({ examId: EXAM, sort: 'id' });
    await expect(qs.listQuestions({ examId: EXAM, sort: 'updated', cursor: first.nextCursor })).rejects.toThrow(/expired/);
    await expect(qs.listQuestions({ examId: EXAM, cursor: 'not-a-cursor' })).rejects.toThrow(/expired/);
  });

  test('status counts and the ids view cover every match', async () => {
    expect((await qs.questionStatusCounts(EXAM)).counts).toEqual({ draft: ROWS / 5, published: ROWS - ROWS / 5 });
    expect((await qs.listQuestionIds({ examId: EXAM, status: 'draft' })).ids).toHaveLength(ROWS / 5);
  });
});

describe('bulk status changes', () => {
  test('publishes valid items in one go, blocks invalid ones, and marks seed rows as edited', async () => {
    const { ids } = await qs.listQuestionIds({ examId: EXAM, status: 'draft' });
    const res = await qs.setQuestionStatus('admin-1', [...ids, ids[0], 'NO-SUCH-ID'], 'published');
    expect(res).toEqual({ updated: ROWS / 5 - 1, blocked: [invalidDraft] });

    const after = (await db.execute<{ id: string; status: string; source: string }>(sql`select id, status, source from question where id in ${ids}`)).rows;
    for (const r of after) {
      if (r.id === invalidDraft) expect(r).toMatchObject({ status: 'draft', source: 'seed' });
      else expect(r).toMatchObject({ status: 'published', source: 'admin' });
    }
  });

  test('moving to draft or retired skips validation and ignores unknown ids', async () => {
    expect(await qs.setQuestionStatus('admin-1', [invalidDraft, 'NO-SUCH-ID'], 'retired')).toEqual({ updated: 1, blocked: [] });
    expect(await qs.setQuestionStatus('admin-1', [], 'draft')).toEqual({ updated: 0, blocked: [] });
  });
});
