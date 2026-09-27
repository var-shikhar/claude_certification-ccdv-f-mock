import 'server-only';
import { sql } from 'drizzle-orm';
import type { DB, Tx } from '@/db';
import { activityDay, profile } from '@/db/schema';
import { dayKey } from '@/lib/streak';

type Executor = DB | Tx;

// XP rewards effort first, accuracy second, finishing third.
export const XP = { answered: 1, correct: 2, finishedMock: 15, passedMock: 25 } as const;

export async function recordActivity(
  tx: Executor,
  userId: string,
  delta: { xp: number; items?: number; correct?: number; minutes?: number },
  timeZone = 'UTC',
) {
  const day = dayKey(new Date(), timeZone);
  const items = delta.items ?? 0;
  const correct = delta.correct ?? 0;
  const minutes = Math.round(delta.minutes ?? 0);
  await tx.insert(activityDay).values({ userId, day, xp: delta.xp, items, correct, minutes }).onConflictDoUpdate({
    target: [activityDay.userId, activityDay.day],
    set: {
      xp: sql`${activityDay.xp} + ${delta.xp}`,
      items: sql`${activityDay.items} + ${items}`,
      correct: sql`${activityDay.correct} + ${correct}`,
      minutes: sql`${activityDay.minutes} + ${minutes}`,
    },
  });
  if (delta.xp) {
    await tx.insert(profile).values({ userId, xp: delta.xp }).onConflictDoUpdate({
      target: profile.userId,
      set: { xp: sql`${profile.xp} + ${delta.xp}` },
    });
  }
}
