import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { profile } from '@/db/schema';
import { settingsSchema } from '@/lib/validators';
import { AppError } from '@/server/errors';
import { parseBody, route } from '@/server/http';
import { getOrCreateProfile } from '@/server/profile';

export const PATCH = route(async ({ req, user }) => {
  const input = await parseBody(req, settingsSchema);
  if (input.timezone) {
    try { new Intl.DateTimeFormat('en', { timeZone: input.timezone }); } catch { throw new AppError('Unknown time zone.', 400); }
  }
  await getOrCreateProfile(user.id);
  const [row] = await db.update(profile).set(input).where(eq(profile.userId, user.id)).returning();
  return { dailyGoal: row.dailyGoal, timezone: row.timezone, leaderboardOptIn: row.leaderboardOptIn };
});
