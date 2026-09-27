import { z } from 'zod';

const id = z.string().min(1).max(80);
const response = z.array(z.string().max(500)).max(12);

export const startAttemptSchema = z.object({
  examId: id,
  kind: z.enum(['full', 'quick', 'practice', 'mistakes', 'review', 'saved', 'diagnostic']),
  difficulty: z.string().max(32).optional(),
  pool: z.enum(['bank', 'imported', 'all']).optional(),
  domains: z.array(z.number().int().positive()).max(30).optional(),
  skills: z.array(z.string().max(80)).max(80).optional(),
  count: z.number().int().min(1).max(60).optional(),
  timed: z.boolean().optional(),
  instant: z.boolean().optional(),
  candidateName: z.string().max(80).optional(),
});

export const progressPatchSchema = z.object({
  responses: z.record(z.string().max(80), response).optional(),
  flags: z.record(z.string().max(80), z.boolean()).optional(),
  timeSpent: z.record(z.string().max(80), z.number().min(0)).optional(),
  current: z.number().int().min(0).optional(),
});

export const checkAnswerSchema = z.object({ questionId: id, response });

export const bookmarkSchema = z.object({ questionId: id, note: z.string().max(4000).nullish() });

export const reportSchema = z.object({
  questionId: id,
  reason: z.enum(['wrong-key', 'unclear', 'outdated', 'typo', 'other']),
  message: z.string().max(2000).optional(),
});

export const onboardingSchema = z.object({
  focus: z.enum(['exam', 'interview', 'both']),
  examId: id.optional(),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
  dailyGoal: z.number().int().min(5).max(100).optional(),
  timezone: z.string().max(64).optional(),
});

export const enrollSchema = z.object({
  examId: id,
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
});

export const settingsSchema = z.object({
  dailyGoal: z.number().int().min(5).max(100).optional(),
  timezone: z.string().max(64).optional(),
  leaderboardOptIn: z.boolean().optional(),
});
