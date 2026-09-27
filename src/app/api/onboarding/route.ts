import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { enrollment, profile } from '@/db/schema';
import { onboardingSchema } from '@/lib/validators';
import { getExam } from '@/server/exams';
import { parseBody, route } from '@/server/http';
import { ensureEnrollment, getOrCreateProfile } from '@/server/profile';

const validZone = (tz?: string) => {
  if (!tz) return undefined;
  try { new Intl.DateTimeFormat('en', { timeZone: tz }); return tz; } catch { return undefined; }
};

export const POST = route(async ({ req, user }) => {
  const input = await parseBody(req, onboardingSchema);
  await getOrCreateProfile(user.id);
  await db.update(profile).set({
    focus: input.focus,
    onboardedAt: new Date(),
    ...(input.dailyGoal ? { dailyGoal: input.dailyGoal } : {}),
    ...(validZone(input.timezone) ? { timezone: validZone(input.timezone) } : {}),
    ...(input.examId ? { primaryExamId: input.examId } : {}),
  }).where(eq(profile.userId, user.id));

  if (input.examId && (await getExam(input.examId))) {
    await ensureEnrollment(user.id, input.examId);
    if (input.targetDate !== undefined) {
      await db.update(enrollment).set({ targetDate: input.targetDate ?? null })
        .where(and(eq(enrollment.userId, user.id), eq(enrollment.examId, input.examId)));
    }
  }
  return { ok: true };
});
