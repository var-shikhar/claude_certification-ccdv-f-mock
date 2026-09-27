import 'server-only';
import { and, count, eq, gte, sql } from 'drizzle-orm';
import { db } from '@/db';
import { attempt, attemptItem, question, user } from '@/db/schema';
import { getItemStats, type ItemFlag } from './analysis';

export async function getAdminOverview(examId: string) {
  const weekAgo = new Date(Date.now() - 7 * 86_400_000);
  const [byStatus, [learners], [attempts7], [answers7], stats] = await Promise.all([
    db.select({ status: question.status, n: count() }).from(question).where(eq(question.examId, examId)).groupBy(question.status),
    db.select({ n: count() }).from(user).where(sql`coalesce(${user.isAnonymous}, false) = false`),
    db.select({ n: count() }).from(attempt).where(and(eq(attempt.examId, examId), gte(attempt.startedAt, weekAgo))),
    db.select({ n: count() }).from(attemptItem).where(and(eq(attemptItem.examId, examId), eq(attemptItem.answered, true), gte(attemptItem.createdAt, weekAgo))),
    getItemStats(examId),
  ]);
  const flags: Partial<Record<ItemFlag, number>> = {};
  for (const s of Object.values(stats)) for (const f of s.flags) flags[f] = (flags[f] ?? 0) + 1;
  return {
    byStatus: Object.fromEntries(byStatus.map((r) => [r.status, r.n])) as Record<string, number>,
    learners: learners?.n ?? 0,
    attempts7: attempts7?.n ?? 0,
    answers7: answers7?.n ?? 0,
    analysed: Object.values(stats).filter((s) => s.n >= 20).length,
    flags,
  };
}
