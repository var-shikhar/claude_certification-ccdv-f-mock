import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { enrollment } from '@/db/schema';
import { enrollSchema } from '@/lib/validators';
import { notFound } from '@/server/errors';
import { getExam } from '@/server/exams';
import { parseBody, route } from '@/server/http';
import { ensureEnrollment } from '@/server/profile';

/** Add an exam to "my exams" and optionally set its target date. */
export const POST = route(async ({ req, user }) => {
  const { examId, targetDate } = await parseBody(req, enrollSchema);
  if (!(await getExam(examId))) throw notFound('That exam');
  await ensureEnrollment(user.id, examId);
  if (targetDate !== undefined) {
    await db.update(enrollment).set({ targetDate: targetDate ?? null })
      .where(and(eq(enrollment.userId, user.id), eq(enrollment.examId, examId)));
  }
  return { ok: true };
});
