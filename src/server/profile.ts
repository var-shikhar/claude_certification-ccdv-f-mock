import 'server-only';
import { cache } from 'react';
import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { db } from '@/db';
import { activityDay, enrollment, profile } from '@/db/schema';
import { computeStreak, dayKey } from '@/lib/streak';

export type ProfileRow = typeof profile.$inferSelect;

/** Deduplicated per request: the header, layout and page all ask for it. */
export const getOrCreateProfile = cache(async (userId: string): Promise<ProfileRow> => {
  const [row] = await db.select().from(profile).where(eq(profile.userId, userId)).limit(1);
  if (row) return row;
  const [created] = await db.insert(profile).values({ userId }).onConflictDoNothing().returning();
  return created ?? (await db.select().from(profile).where(eq(profile.userId, userId)).limit(1))[0];
});

export interface StreakInfo { current: number; best: number; activeToday: boolean; today: { items: number; xp: number } }

/** Streak in the learner's time zone; the activity query runs alongside the profile lookup. */
export const getStreak = cache(async (userId: string): Promise<StreakInfo> => {
  const [rows, prof] = await Promise.all([
    db.select({ day: activityDay.day, items: activityDay.items, xp: activityDay.xp })
      .from(activityDay)
      .where(eq(activityDay.userId, userId))
      .orderBy(desc(activityDay.day))
      .limit(400),
    getOrCreateProfile(userId),
  ]);
  const timeZone = prof.timezone;
  const today = dayKey(new Date(), timeZone);
  const todayRow = rows.find((r) => r.day === today);
  return {
    ...computeStreak(rows.filter((r) => r.items > 0).map((r) => r.day), today),
    today: { items: todayRow?.items ?? 0, xp: todayRow?.xp ?? 0 },
  };
});

export async function getActivityHeatmap(userId: string, days = 84) {
  const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
  return db
    .select({ day: activityDay.day, items: activityDay.items, xp: activityDay.xp })
    .from(activityDay)
    .where(and(eq(activityDay.userId, userId), gte(activityDay.day, since)));
}

/** Marks an exam as one the learner is working on (first attempt, onboarding, or "Add to my exams"). */
export async function ensureEnrollment(userId: string, examId: string) {
  await db.insert(enrollment).values({ userId, examId }).onConflictDoNothing();
  await db.update(profile).set({ primaryExamId: examId })
    .where(and(eq(profile.userId, userId), sql`${profile.primaryExamId} is null`));
}
