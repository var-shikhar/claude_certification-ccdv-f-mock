// Moves a guest's data onto the account they just created or signed into.
// Runs before Better Auth deletes the anonymous user (whose rows would
// otherwise cascade away). Rows keyed by (user, something) skip entries the
// account already has, so signing into an existing account never clobbers it.

import { sql } from 'drizzle-orm';
import { db } from '@/db';

/** tables whose primary key includes user_id, with the other key columns */
const KEYED: [table: string, keys: string[]][] = [
  ['review_card', ['question_id']],
  ['bookmark', ['question_id']],
  ['enrollment', ['exam_id']],
  ['study_plan', ['exam_id']],
  ['activity_day', ['day']],
  ['user_badge', ['badge']],
  ['org_member', ['org_id']],
  ['ai_usage', ['day']],
];

/** tables where a user simply owns rows */
const OWNED: [table: string, column: string][] = [
  ['attempt', 'user_id'],
  ['attempt_item', 'user_id'],
  ['certificate', 'user_id'],
  ['interview', 'user_id'],
  ['question_report', 'user_id'],
  ['challenge', 'creator_id'],
];

export async function mergeGuestIntoUser(guestId: string, userId: string) {
  if (guestId === userId) return;
  await db.transaction(async (tx) => {
    for (const [table, column] of OWNED) {
      await tx.execute(sql`UPDATE ${sql.identifier(table)} SET ${sql.identifier(column)} = ${userId} WHERE ${sql.identifier(column)} = ${guestId}`);
    }
    for (const [table, keys] of KEYED) {
      const clash = sql.join(keys.map((k) => sql`t2.${sql.identifier(k)} = t.${sql.identifier(k)}`), sql` AND `);
      await tx.execute(sql`
        UPDATE ${sql.identifier(table)} AS t SET user_id = ${userId}
        WHERE t.user_id = ${guestId}
          AND NOT EXISTS (SELECT 1 FROM ${sql.identifier(table)} t2 WHERE t2.user_id = ${userId} AND ${clash})`);
    }
    // Profile: keep the account's own profile if it has one, but carry XP over.
    await tx.execute(sql`
      INSERT INTO profile (user_id, focus, primary_exam_id, onboarded_at, xp, daily_goal, timezone)
      SELECT ${userId}, focus, primary_exam_id, onboarded_at, xp, daily_goal, timezone FROM profile WHERE user_id = ${guestId}
      ON CONFLICT (user_id) DO UPDATE SET xp = profile.xp + EXCLUDED.xp,
        primary_exam_id = COALESCE(profile.primary_exam_id, EXCLUDED.primary_exam_id),
        onboarded_at = COALESCE(profile.onboarded_at, EXCLUDED.onboarded_at)`);
  });
}
