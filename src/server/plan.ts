import 'server-only';
import { and, eq, gte } from 'drizzle-orm';
import { db } from '@/db';
import { attempt } from '@/db/schema';
import { dayKey } from '@/lib/streak';
import { buildPlan, type PlanTask } from '@/lib/study-plan';
import { countDue, getEnrollment, getReadiness } from './analytics';
import { getExam } from './exams';
import { getOrCreateProfile } from './profile';

export type PlanViewTask = PlanTask & { done: boolean };

export interface PlanView {
  examId: string;
  examCode: string;
  targetDate: string | null;
  days: { date: string; tasks: PlanViewTask[] }[];
}

/** The learner's 7-day plan for one exam, with today's finished tasks ticked off. */
export async function getStudyPlan(userId: string, examId: string): Promise<PlanView | null> {
  const ex = await getExam(examId);
  if (!ex) return null;
  const cfg = ex.config;
  const [profile, readiness, due, enrollment] = await Promise.all([
    getOrCreateProfile(userId), getReadiness(userId, examId), countDue(userId, examId), getEnrollment(userId, examId),
  ]);
  if (!readiness) return null;
  const today = dayKey(new Date(), profile.timezone);

  const plan = buildPlan({
    today,
    targetDate: enrollment?.targetDate ?? null,
    skills: readiness.skills,
    answered: readiness.answered,
    due,
    dailyGoal: profile.dailyGoal,
    secondsPerItem: (cfg.timeLimitMinutes * 60) / cfg.itemCount,
    quickItems: cfg.modes.quick?.items ?? Math.round(cfg.itemCount / 3),
    quickMinutes: cfg.modes.quick?.minutes ?? Math.round(cfg.timeLimitMinutes / 3),
    fullMinutes: cfg.modes.full?.minutes ?? cfg.timeLimitMinutes,
  });

  // What was finished today (in the learner's time zone) ticks tasks off.
  const recent = await db.select({ kind: attempt.kind, settings: attempt.settings, status: attempt.status, startedAt: attempt.startedAt })
    .from(attempt)
    .where(and(eq(attempt.userId, userId), eq(attempt.examId, examId), gte(attempt.startedAt, new Date(Date.now() - 36 * 3_600_000))));
  const finishedToday = recent.filter((a) => a.status === 'submitted' && dayKey(a.startedAt, profile.timezone) === today);
  const isDone = (t: PlanTask) => {
    switch (t.kind) {
      case 'diagnostic': return readiness.answered > 0;
      case 'review': return finishedToday.some((a) => a.kind === 'review' || a.kind === 'mistakes');
      case 'drill': return finishedToday.some((a) => a.kind === 'practice' && (a.settings.skills ?? []).includes(t.skillId ?? ''));
      case 'quick': return finishedToday.some((a) => a.kind === 'quick');
      case 'full': return finishedToday.some((a) => a.kind === 'full');
      default: return false;
    }
  };

  return {
    examId: ex.id,
    examCode: ex.code,
    targetDate: enrollment?.targetDate ?? null,
    days: plan.map((d) => ({ ...d, tasks: d.tasks.map((t) => ({ ...t, done: d.date === today && isDone(t) })) })),
  };
}
