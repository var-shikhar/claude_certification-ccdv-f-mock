import { beforeAll, describe, expect, test, vi } from 'vitest';

// Real queries against an in-memory Postgres (PGlite).
vi.mock('server-only', () => ({}));
vi.mock('@/db', async () => {
  const { PGlite } = await import('@electric-sql/pglite');
  const { drizzle } = await import('drizzle-orm/pglite');
  const schema = await import('@/db/schema');
  return { db: drizzle({ client: new PGlite(), schema, casing: 'snake_case' }), schema, usingPglite: () => true };
});

const { db } = await import('@/db');
const { attempt, attemptItem, enrollment, exam, question, reviewCard, user } = await import('@/db/schema');
const { loadExamBundle } = await import('@/lib/content/load');
const analytics = await import('@/server/analytics');

const USER = 'learner-1';
const DAY = 86_400_000;

beforeAll(async () => {
  const { migrate } = await import('drizzle-orm/pglite/migrator');
  await migrate(db as never, { migrationsFolder: 'drizzle' });
  await db.insert(user).values([
    { id: USER, name: 'Learner', email: 'learner@example.com' },
    { id: 'learner-2', name: 'Newcomer', email: 'newcomer@example.com' },
  ]);

  const now = Date.now();
  for (const [examId, plan] of [
    // [attempt size, timestamp style]: "tied" = one transaction (a mock), "spread" = answered one by one (a drill)
    ['ccdv-f', [[350, 'tied'], [350, 'tied'], [200, 'spread']]],
    ['js-essentials', [[40, 'tied'], [30, 'spread']]],
  ] as const) {
    const { config, questions } = loadExamBundle(examId);
    await db.insert(exam).values({ id: config.id, code: config.code, title: config.title, config });
    for (let i = 0; i < questions.length; i += 200) {
      await db.insert(question).values(questions.slice(i, i + 200).map((q) => ({
        id: q.id, examId, domain: q.domain, skill: q.skill, difficulty: q.difficulty, type: q.type, select: q.select ?? 1,
        stem: q.stem, options: q.options ?? [], answerOrder: q.answerOrder ?? null, prompts: q.prompts ?? null,
        accepted: q.accepted ?? null, explanation: q.explanation,
      })));
    }
    await db.insert(enrollment).values({ userId: USER, examId });

    // Overlapping attempts (so "latest answer per question" matters), more than 800 answers for the
    // bigger exam (so the history cut lands inside a group of tied timestamps), some unanswered items.
    for (const [n, [size, style]] of plan.entries()) {
      const items = questions.slice((n * 150) % Math.max(1, questions.length - size), (n * 150) % Math.max(1, questions.length - size) + size);
      const [a] = await db.insert(attempt).values({ userId: USER, examId, kind: 'practice', seed: n, itemIds: items.map((q) => q.id), optionOrder: {} }).returning({ id: attempt.id });
      const base = now - (10 - n) * DAY;
      await db.insert(attemptItem).values(items.map((q, i) => ({
        attemptId: a.id, questionId: q.id, userId: USER, examId, position: i,
        domain: q.domain, skill: q.skill, difficulty: q.difficulty,
        correct: (i * 7 + n) % 3 !== 0, answered: i % 25 !== 7, selected: [],
        createdAt: new Date(style === 'tied' ? base : base + i * 1000),
      })));
    }

    await db.insert(reviewCard).values(questions.slice(0, 30).map((q, i) => ({
      userId: USER, questionId: q.id, examId, due: new Date(now + (i < 20 ? -DAY : DAY)),
    })));
  }
}, 120_000);

describe('getMyExams', () => {
  test('matches the per-exam readiness, due and mistake queries', async () => {
    const mine = await analytics.getMyExams(USER, 10);
    expect(mine.map((e) => e.id).sort()).toEqual(['ccdv-f', 'js-essentials']);
    for (const e of mine) {
      expect(e.readiness).toEqual(await analytics.getReadiness(USER, e.id));
      expect(e.due).toBe(await analytics.countDue(USER, e.id));
      expect(e.mistakes).toBe(await analytics.countMistakes(USER, e.id));
    }
    const ccdv = mine.find((e) => e.id === 'ccdv-f')!;
    expect(ccdv.readiness?.answered).toBe(800); // history capped at the newest 800
    expect(ccdv.due).toBe(20);
    expect(ccdv.mistakes).toBeGreaterThan(0);
  });

  test('is empty for someone with no enrolments', async () => {
    expect(await analytics.getMyExams('learner-2')).toEqual([]);
  });
});
