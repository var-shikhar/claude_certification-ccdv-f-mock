import 'server-only';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { attempt, challenge, exam, user } from '@/db/schema';
import { KINDS } from '@/lib/attempt-kinds';
import { AppError, notFound } from './errors';

const CODE_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
const newCode = () => [...crypto.getRandomValues(new Uint8Array(8))].map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');

/** Turns a finished scored attempt into a shareable challenge with the exact same form. */
export async function createChallenge(userId: string, attemptId: string) {
  const [a] = await db.select().from(attempt).where(and(eq(attempt.id, attemptId), eq(attempt.userId, userId))).limit(1);
  if (!a) throw notFound('That attempt');
  if (a.status !== 'submitted' || !KINDS[a.kind].scored || a.kind === 'adaptive') {
    throw new AppError('Only finished mocks, quizzes and diagnostics can become challenges.', 400);
  }
  const [owner] = await db.select({ name: user.name, isAnonymous: user.isAnonymous }).from(user).where(eq(user.id, userId)).limit(1);
  const [ex] = await db.select({ code: exam.code }).from(exam).where(eq(exam.id, a.examId)).limit(1);
  const who = owner?.isAnonymous ? 'A friend' : owner?.name.split(' ')[0] ?? 'A friend';
  const id = newCode();
  await db.insert(challenge).values({
    id, creatorId: userId, examId: a.examId, title: `${who}'s ${ex?.code ?? ''} challenge`.trim(), difficulty: a.difficulty,
    minutes: a.minutes, itemIds: a.itemIds, optionOrder: a.optionOrder,
  });
  // The creator's own run counts on the board.
  await db.update(attempt).set({ challengeId: id }).where(eq(attempt.id, a.id));
  return { id };
}

export async function getChallenge(code: string) {
  if (!/^[a-z2-9]{8}$/.test(code)) return null;
  const [row] = await db
    .select({ c: challenge, examCode: exam.code, examTitle: exam.title, scale: sql<{ min: number; max: number; passing: number }>`${exam.config}->'scale'`, creator: user.name })
    .from(challenge)
    .innerJoin(exam, eq(exam.id, challenge.examId))
    .innerJoin(user, eq(user.id, challenge.creatorId))
    .where(eq(challenge.id, code))
    .limit(1);
  if (!row) return null;

  // Best finished run per person: highest score, then fastest.
  const board = await db.execute<{ user_id: string; name: string; is_anonymous: boolean | null; scaled: number; duration_ms: number; passed: boolean | null }>(sql`
    select distinct on (a.user_id) a.user_id, u.name, u.is_anonymous, a.scaled, (a.summary->>'durationMs')::float as duration_ms, a.passed
    from ${attempt} a join ${user} u on u.id = a.user_id
    where a.challenge_id = ${code} and a.status = 'submitted' and a.scaled is not null
    order by a.user_id, a.scaled desc, (a.summary->>'durationMs')::float asc`);
  const leaderboard = board.rows
    .sort((x, y) => y.scaled - x.scaled || x.duration_ms - y.duration_ms)
    .slice(0, 20)
    .map((r, i) => ({ rank: i + 1, userId: r.user_id, name: r.is_anonymous ? 'Guest' : r.name.split(' ')[0], scaled: r.scaled, durationMs: r.duration_ms, passed: r.passed }));

  return {
    id: row.c.id,
    title: row.c.title,
    examId: row.c.examId,
    examCode: row.examCode,
    examTitle: row.examTitle,
    creatorId: row.c.creatorId,
    itemCount: row.c.itemIds.length,
    minutes: row.c.minutes,
    scale: row.scale,
    createdAt: row.c.createdAt.toISOString(),
    leaderboard,
  };
}

/** The fixed form a challenge attempt uses. */
export async function getChallengeForm(code: string) {
  const [row] = await db.select().from(challenge).where(eq(challenge.id, code)).limit(1);
  if (!row) throw notFound('That challenge');
  if (row.expiresAt && row.expiresAt.getTime() < Date.now()) throw new AppError('This challenge has expired.', 410);
  return row;
}
