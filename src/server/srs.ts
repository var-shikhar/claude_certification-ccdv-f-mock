import 'server-only';
import { and, eq, inArray, sql } from 'drizzle-orm';
import type { DB, Tx } from '@/db';
import { reviewCard } from '@/db/schema';
import { NEW_CARD, schedule } from '@/lib/srs';

type Executor = DB | Tx;

/**
 * Reschedules review cards after a batch of answers. Misses create cards;
 * hits only move cards that already exist (we don't track what you know).
 */
export async function applyAnswersToCards(
  tx: Executor,
  userId: string,
  examId: string,
  answers: { questionId: string; correct: boolean }[],
) {
  if (!answers.length) return;
  const ids = answers.map((a) => a.questionId);
  const existing = await tx.select().from(reviewCard).where(and(eq(reviewCard.userId, userId), inArray(reviewCard.questionId, ids)));
  const byId = new Map(existing.map((c) => [c.questionId, c]));
  const now = new Date();

  const rows = answers
    .filter((a) => byId.has(a.questionId) || !a.correct)
    .map((a) => {
      const prev = byId.get(a.questionId) ?? NEW_CARD;
      const next = schedule(prev, a.correct, now);
      return {
        userId, questionId: a.questionId, examId,
        due: next.due, intervalDays: next.intervalDays, ease: next.ease, reps: next.reps, lapses: next.lapses, lastReviewedAt: now,
      };
    });
  if (!rows.length) return;
  await tx.insert(reviewCard).values(rows).onConflictDoUpdate({
    target: [reviewCard.userId, reviewCard.questionId],
    set: {
      due: sql`excluded.due`,
      intervalDays: sql`excluded.interval_days`,
      ease: sql`excluded.ease`,
      reps: sql`excluded.reps`,
      lapses: sql`excluded.lapses`,
      lastReviewedAt: sql`excluded.last_reviewed_at`,
    },
  });
}
