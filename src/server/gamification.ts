import 'server-only';
import { and, count, desc, eq, gte, sql } from 'drizzle-orm';
import { db } from '@/db';
import { activityDay, attempt, attemptItem, interview, profile, user, userBadge } from '@/db/schema';
import { BADGES, badgeById, type BadgeDef } from '@/lib/badges';
import { getStreak } from './profile';

/** Checks every badge rule for the learner and awards anything new. Returns the newly earned badges. */
export async function evaluateBadges(userId: string, timeZone = 'UTC'): Promise<BadgeDef[]> {
  const have = new Set((await db.select({ b: userBadge.badge }).from(userBadge).where(eq(userBadge.userId, userId))).map((r) => r.b));
  if (have.size === BADGES.length) return [];

  const [[answered], streak, finished, [interviews]] = await Promise.all([
    db.select({ n: count() }).from(attemptItem).where(and(eq(attemptItem.userId, userId), eq(attemptItem.answered, true))),
    getStreak(userId, timeZone),
    db.select({ kind: attempt.kind, passed: attempt.passed, summary: attempt.summary })
      .from(attempt).where(and(eq(attempt.userId, userId), eq(attempt.status, 'submitted'))).orderBy(desc(attempt.finishedAt)).limit(300),
    db.select({ n: count() }).from(interview).where(and(eq(interview.userId, userId), eq(interview.status, 'completed'))),
  ]);
  const n = answered?.n ?? 0;
  const pct = (a: (typeof finished)[number]) => (a.summary?.itemCount ? a.summary.correctCount / a.summary.itemCount : 0);
  const best = Math.max(streak.best, streak.current);

  const earned: Record<string, boolean> = {
    'first-steps': n >= 1,
    'know-thyself': finished.some((a) => a.kind === 'diagnostic'),
    century: n >= 100,
    'question-machine': n >= 500,
    'on-a-roll': best >= 3,
    'week-warrior': best >= 7,
    unstoppable: best >= 30,
    'exam-day': finished.some((a) => a.kind === 'full'),
    passed: finished.some((a) => a.kind === 'full' && a.passed),
    flawless: finished.some((a) => (a.kind === 'practice' || a.kind === 'review') && (a.summary?.itemCount ?? 0) >= 10 && pct(a) === 1),
    comeback: finished.some((a) => a.kind === 'mistakes' && (a.summary?.itemCount ?? 0) >= 5 && pct(a) >= 0.8),
    'interview-ready': (interviews?.n ?? 0) > 0,
    challenger: finished.some((a) => a.kind === 'challenge'),
  };
  const fresh = BADGES.filter((b) => earned[b.id] && !have.has(b.id));
  if (fresh.length) {
    await db.insert(userBadge).values(fresh.map((b) => ({ userId, badge: b.id }))).onConflictDoNothing();
  }
  return fresh;
}

export async function listBadges(userId: string) {
  const rows = await db.select().from(userBadge).where(eq(userBadge.userId, userId));
  const earned = new Map(rows.map((r) => [r.badge, r.earnedAt.toISOString()]));
  return BADGES.map((b) => ({ ...b, earnedAt: earned.get(b.id) ?? null }));
}

/** Badges earned in the last few minutes (celebrated on the results page). */
export async function recentBadges(userId: string, withinMs = 10 * 60_000) {
  const rows = await db.select().from(userBadge).where(and(eq(userBadge.userId, userId), gte(userBadge.earnedAt, new Date(Date.now() - withinMs))));
  return rows.map((r) => badgeById(r.badge)).filter((b): b is BadgeDef => Boolean(b));
}

export interface LeaderRow { rank: number; userId: string; name: string; xp: number; me: boolean }

/** Weekly XP leaderboard among registered learners who opted in. */
export async function weeklyLeaderboard(userId: string, limit = 20): Promise<{ top: LeaderRow[]; me: LeaderRow | null }> {
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
  const rows = await db
    .select({ userId: activityDay.userId, name: user.name, xp: sql<number>`sum(${activityDay.xp})::int` })
    .from(activityDay)
    .innerJoin(user, eq(user.id, activityDay.userId))
    .leftJoin(profile, eq(profile.userId, activityDay.userId))
    .where(and(gte(activityDay.day, since), sql`coalesce(${user.isAnonymous}, false) = false`, sql`coalesce(${profile.leaderboardOptIn}, true)`))
    .groupBy(activityDay.userId, user.name)
    .orderBy(desc(sql`sum(${activityDay.xp})`))
    .limit(500);
  const ranked = rows.map((r, i) => ({ rank: i + 1, userId: r.userId, name: firstNameInitial(r.name), xp: r.xp, me: r.userId === userId }));
  return { top: ranked.slice(0, limit), me: ranked.find((r) => r.me) ?? null };
}

/** "Ada L." style names keep leaderboards friendly without exposing full names. */
function firstNameInitial(name: string) {
  const [first, ...rest] = name.trim().split(/\s+/);
  const last = rest.at(-1);
  return last ? `${first} ${last[0].toUpperCase()}.` : first;
}
