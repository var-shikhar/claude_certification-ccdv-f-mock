import { z } from 'zod';

const id = z.string().min(1).max(80);
const response = z.array(z.string().max(500)).max(12);

export const startAttemptSchema = z.object({
  examId: id,
  kind: z.enum(['full', 'quick', 'practice', 'mistakes', 'review', 'saved', 'diagnostic', 'adaptive']),
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

// ---------------------------------------------------------------- admin

const optionSchema = z.object({
  id: z.string().regex(/^[A-H]$/),
  text: z.string().max(4000),
  correct: z.boolean().optional(),
  why: z.string().max(4000).optional(),
});

export const questionDraftSchema = z.object({
  id: z.string().max(80).default(''),
  domain: z.number().int().default(0),
  skill: z.string().max(80),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  type: z.enum(['single', 'multi', 'truefalse', 'order', 'match', 'fill']),
  select: z.number().int().min(1).max(8).default(1),
  stem: z.string().max(10_000),
  options: z.array(optionSchema).max(8),
  answerOrder: z.array(z.string().max(4)).max(8).optional(),
  prompts: z.array(z.object({ id: z.string().max(10), text: z.string().max(2000), answer: z.string().max(4) })).max(10).optional(),
  accepted: z.array(z.string().max(200)).max(20).optional(),
  explanation: z.string().max(10_000),
  reference: z.string().max(500).nullish(),
  caseId: z.string().max(120).nullish(),
  status: z.enum(['draft', 'review', 'published', 'retired']),
  pool: z.enum(['bank', 'imported']),
});

export const saveQuestionSchema = z.object({ examId: id, draft: questionDraftSchema, note: z.string().max(500).optional() });

export const bulkStatusSchema = z.object({ ids: z.array(id).min(1).max(500), status: z.enum(['draft', 'review', 'published', 'retired']) });

export const resolveReportsSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(200),
  status: z.enum(['resolved', 'dismissed']),
  resolution: z.string().max(1000).optional(),
});

export const importSchema = z.object({
  examId: id,
  format: z.enum(['csv', 'json']),
  text: z.string().max(5_000_000),
  setName: z.string().regex(/^[a-z0-9-]{1,40}$/i).optional(),
  pool: z.enum(['bank', 'imported']).default('imported'),
  status: z.enum(['draft', 'review', 'published']).default('draft'),
  overwrite: z.boolean().default(false),
});

export const setRoleSchema = z.object({ role: z.enum(['learner', 'author', 'admin']) });

// ---------------------------------------------------------------- AI

export const interviewSetupSchema = z.object({
  role: z.string().max(40),
  level: z.string().max(20),
  focus: z.enum(['technical', 'behavioral', 'mixed']),
  questionTarget: z.number().int().min(2).max(10).default(5),
});

export const interviewAnswerSchema = z.object({ answer: z.string().min(1).max(4000) });

export const tutorSchema = z.object({
  questionId: id,
  attemptId: z.string().max(40).optional(),
  messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().min(1).max(4000) })).min(1).max(30),
});

export const generateSchema = z.object({
  examId: id,
  skillId: z.string().max(80),
  count: z.number().int().min(1).max(10),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  types: z.array(z.enum(['single', 'multi', 'truefalse'])).min(1),
  source: z.string().max(20_000).optional(),
  instructions: z.string().max(1000).optional(),
});
