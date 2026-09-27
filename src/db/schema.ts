// Database schema (Drizzle, Postgres/Neon). Column names are snake_case in
// the database; `casing: 'snake_case'` maps them from these camelCase keys.

import { sql } from 'drizzle-orm';
import {
  boolean, date, index, integer, jsonb, pgTable, primaryKey, real, text, timestamp, uniqueIndex,
} from 'drizzle-orm/pg-core';
import type { ExamConfig, MatchPrompt, QuestionOption } from '@/lib/engine/types';

const createdAt = () => timestamp({ withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp({ withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date());

// ---------------------------------------------------------------- auth (Better Auth)

export type Role = 'learner' | 'author' | 'admin';

export const user = pgTable('user', {
  id: text().primaryKey(),
  name: text().notNull(),
  email: text().notNull().unique(),
  emailVerified: boolean().notNull().default(false),
  image: text(),
  role: text().$type<Role>().notNull().default('learner'),
  isAnonymous: boolean().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const session = pgTable('session', {
  id: text().primaryKey(),
  expiresAt: timestamp({ withTimezone: true }).notNull(),
  token: text().notNull().unique(),
  ipAddress: text(),
  userAgent: text(),
  userId: text().notNull().references(() => user.id, { onDelete: 'cascade' }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [index().on(t.userId)]);

export const account = pgTable('account', {
  id: text().primaryKey(),
  accountId: text().notNull(),
  providerId: text().notNull(),
  userId: text().notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text(),
  refreshToken: text(),
  idToken: text(),
  accessTokenExpiresAt: timestamp({ withTimezone: true }),
  refreshTokenExpiresAt: timestamp({ withTimezone: true }),
  scope: text(),
  password: text(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [index().on(t.userId)]);

export const verification = pgTable('verification', {
  id: text().primaryKey(),
  identifier: text().notNull(),
  value: text().notNull(),
  expiresAt: timestamp({ withTimezone: true }).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [index().on(t.identifier)]);

// ---------------------------------------------------------------- learner profile

export const profile = pgTable('profile', {
  userId: text().primaryKey().references(() => user.id, { onDelete: 'cascade' }),
  /** what the learner said they're preparing for during onboarding */
  focus: text().$type<'exam' | 'interview' | 'both'>(),
  primaryExamId: text(),
  onboardedAt: timestamp({ withTimezone: true }),
  xp: integer().notNull().default(0),
  dailyGoal: integer().notNull().default(10),
  timezone: text().notNull().default('UTC'),
  /** show on public leaderboards */
  leaderboardOptIn: boolean().notNull().default(true),
  plan: text().$type<'free' | 'pro'>().notNull().default('free'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// ---------------------------------------------------------------- content

export type ExamCategory = 'certification' | 'quiz' | 'interview';

export interface ExamMeta {
  tagline?: string;
  description?: string;
  tags?: string[];
  level?: string;
  /** accent for the exam's card, as a CSS color */
  accent?: string;
}

export const exam = pgTable('exam', {
  id: text().primaryKey(),
  code: text().notNull(),
  title: text().notNull(),
  vendor: text(),
  category: text().$type<ExamCategory>().notNull().default('certification'),
  config: jsonb().$type<ExamConfig>().notNull(),
  meta: jsonb().$type<ExamMeta>().notNull().default({}),
  isPublished: boolean().notNull().default(true),
  /** free exams need no Pro plan for full mocks */
  isFree: boolean().notNull().default(true),
  sortOrder: integer().notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export type QuestionStatus = 'draft' | 'review' | 'published' | 'retired';
/** bank = reviewed items used in scored mocks; imported = third-party practice pool */
export type QuestionPool = 'bank' | 'imported';

export const question = pgTable('question', {
  id: text().primaryKey(),
  examId: text().notNull().references(() => exam.id, { onDelete: 'cascade' }),
  pool: text().$type<QuestionPool>().notNull().default('bank'),
  status: text().$type<QuestionStatus>().notNull().default('published'),
  domain: integer().notNull(),
  skill: text().notNull(),
  difficulty: integer().$type<1 | 2 | 3 | 4>().notNull(),
  type: text().$type<'single' | 'multi' | 'truefalse' | 'order' | 'match' | 'fill'>().notNull(),
  select: integer().notNull().default(1),
  stem: text().notNull(),
  options: jsonb().$type<QuestionOption[]>().notNull().default([]),
  answerOrder: jsonb().$type<string[]>(),
  prompts: jsonb().$type<MatchPrompt[]>(),
  accepted: jsonb().$type<string[]>(),
  explanation: text().notNull(),
  reference: text(),
  caseId: text(),
  /** where the item came from: seed file, admin editor, AI draft, CSV import */
  source: text().notNull().default('seed'),
  /** free-text origin note, e.g. 'Official Exam Guide sample 1' */
  provenance: text(),
  version: integer().notNull().default(1),
  createdBy: text().references(() => user.id, { onDelete: 'set null' }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [
  index().on(t.examId, t.status, t.pool),
  index().on(t.examId, t.skill),
]);

export const questionRevision = pgTable('question_revision', {
  id: text().primaryKey().default(sql`gen_random_uuid()`),
  questionId: text().notNull().references(() => question.id, { onDelete: 'cascade' }),
  version: integer().notNull(),
  data: jsonb().notNull(),
  editedBy: text().references(() => user.id, { onDelete: 'set null' }),
  note: text(),
  createdAt: createdAt(),
}, (t) => [index().on(t.questionId)]);

export const caseStudy = pgTable('case_study', {
  id: text().primaryKey(),
  examId: text().notNull().references(() => exam.id, { onDelete: 'cascade' }),
  title: text().notNull(),
  scenario: text().notNull(),
  createdAt: createdAt(),
});

export interface StudyNote {
  summary: string;
  points: string[];
  traps?: string[];
  docs?: { title: string; url: string }[];
}

export const studyNote = pgTable('study_note', {
  examId: text().notNull().references(() => exam.id, { onDelete: 'cascade' }),
  skillId: text().notNull(),
  content: jsonb().$type<StudyNote>().notNull(),
  updatedAt: updatedAt(),
}, (t) => [primaryKey({ columns: [t.examId, t.skillId] })]);

// ---------------------------------------------------------------- attempts

export type AttemptKind = 'full' | 'quick' | 'practice' | 'mistakes' | 'review' | 'saved' | 'adaptive' | 'diagnostic' | 'challenge' | 'assignment';
export type AttemptStatus = 'active' | 'submitted' | 'expired' | 'abandoned';

export interface AttemptSettings {
  domains?: number[] | null;
  skills?: string[] | null;
  count?: number;
  timed?: boolean;
  /** show the answer after each item */
  instant?: boolean;
  candidateName?: string;
  /** adaptive tests: running ability estimate and planned length */
  adaptive?: { theta: number; target: number };
}

export interface AttemptSummary {
  scaled: number;
  passed: boolean;
  rawWeighted: number;
  correctCount: number;
  itemCount: number;
  answeredCount: number;
  byDomain: { id: number; name: string; total: number; correct: number; percent: number | null }[];
  bySkill: { id: string; name: string; total: number; correct: number; percent: number | null }[];
  durationMs: number;
  /** the timer ran out and the attempt submitted itself */
  timedOut?: boolean;
  /** adaptive tests: final ability estimate on a -2.5..2.5 scale */
  ability?: number;
}

export interface IntegrityLog {
  blurs: number;
  fullscreenExits: number;
  events: { t: number; kind: 'blur' | 'focus' | 'fullscreen-exit' | 'paste' }[];
}

export const attempt = pgTable('attempt', {
  id: text().primaryKey().default(sql`gen_random_uuid()`),
  userId: text().notNull().references(() => user.id, { onDelete: 'cascade' }),
  examId: text().notNull().references(() => exam.id, { onDelete: 'cascade' }),
  kind: text().$type<AttemptKind>().notNull(),
  difficulty: text().notNull().default('standard'),
  pool: text().$type<'bank' | 'imported' | 'all'>().notNull().default('bank'),
  settings: jsonb().$type<AttemptSettings>().notNull().default({}),
  seed: integer().notNull(),
  itemIds: jsonb().$type<string[]>().notNull(),
  optionOrder: jsonb().$type<Record<string, string[]>>().notNull(),
  responses: jsonb().$type<Record<string, string[]>>().notNull().default({}),
  flags: jsonb().$type<Record<string, boolean>>().notNull().default({}),
  /** instant-feedback drills: items whose answer has been revealed */
  checked: jsonb().$type<Record<string, boolean>>().notNull().default({}),
  timeSpent: jsonb().$type<Record<string, number>>().notNull().default({}),
  current: integer().notNull().default(0),
  status: text().$type<AttemptStatus>().notNull().default('active'),
  minutes: integer(),
  startedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  deadline: timestamp({ withTimezone: true }),
  finishedAt: timestamp({ withTimezone: true }),
  scaled: integer(),
  passed: boolean(),
  summary: jsonb().$type<AttemptSummary>(),
  integrity: jsonb().$type<IntegrityLog>(),
  challengeId: text(),
  assignmentId: text(),
  updatedAt: updatedAt(),
}, (t) => [
  index().on(t.userId, t.status),
  index().on(t.userId, t.examId, t.finishedAt),
  index().on(t.challengeId),
  index().on(t.assignmentId),
]);

/** One row per item per finished attempt: feeds analytics, retry-mistakes and item analysis. */
export const attemptItem = pgTable('attempt_item', {
  attemptId: text().notNull().references(() => attempt.id, { onDelete: 'cascade' }),
  questionId: text().notNull().references(() => question.id, { onDelete: 'cascade' }),
  userId: text().notNull().references(() => user.id, { onDelete: 'cascade' }),
  examId: text().notNull(),
  position: integer().notNull(),
  domain: integer().notNull(),
  skill: text().notNull(),
  difficulty: integer().notNull(),
  correct: boolean().notNull(),
  answered: boolean().notNull(),
  selected: jsonb().$type<string[]>().notNull().default([]),
  timeMs: integer().notNull().default(0),
  createdAt: createdAt(),
}, (t) => [
  primaryKey({ columns: [t.attemptId, t.questionId] }),
  index().on(t.userId, t.examId, t.skill),
  index().on(t.questionId),
]);

// ---------------------------------------------------------------- study tools

/** Spaced-repetition schedule (SM-2 style) for items a learner got wrong or saved for review. */
export const reviewCard = pgTable('review_card', {
  userId: text().notNull().references(() => user.id, { onDelete: 'cascade' }),
  questionId: text().notNull().references(() => question.id, { onDelete: 'cascade' }),
  examId: text().notNull(),
  due: timestamp({ withTimezone: true }).notNull().defaultNow(),
  intervalDays: real().notNull().default(0),
  ease: real().notNull().default(2.5),
  reps: integer().notNull().default(0),
  lapses: integer().notNull().default(0),
  lastReviewedAt: timestamp({ withTimezone: true }),
  createdAt: createdAt(),
}, (t) => [primaryKey({ columns: [t.userId, t.questionId] }), index().on(t.userId, t.examId, t.due)]);

export const bookmark = pgTable('bookmark', {
  userId: text().notNull().references(() => user.id, { onDelete: 'cascade' }),
  questionId: text().notNull().references(() => question.id, { onDelete: 'cascade' }),
  examId: text().notNull(),
  note: text(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [primaryKey({ columns: [t.userId, t.questionId] }), index().on(t.userId, t.examId)]);

export const enrollment = pgTable('enrollment', {
  userId: text().notNull().references(() => user.id, { onDelete: 'cascade' }),
  examId: text().notNull().references(() => exam.id, { onDelete: 'cascade' }),
  targetDate: date(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [primaryKey({ columns: [t.userId, t.examId] })]);

export interface StudyPlanDay { date: string; tasks: { kind: 'drill' | 'review' | 'mock' | 'study'; label: string; skill?: string; count?: number; done?: boolean }[] }

export const studyPlan = pgTable('study_plan', {
  userId: text().notNull().references(() => user.id, { onDelete: 'cascade' }),
  examId: text().notNull().references(() => exam.id, { onDelete: 'cascade' }),
  days: jsonb().$type<StudyPlanDay[]>().notNull(),
  generatedBy: text().$type<'rules' | 'ai'>().notNull().default('rules'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [primaryKey({ columns: [t.userId, t.examId] })]);

// ---------------------------------------------------------------- quality

export const questionReport = pgTable('question_report', {
  id: text().primaryKey().default(sql`gen_random_uuid()`),
  questionId: text().notNull().references(() => question.id, { onDelete: 'cascade' }),
  examId: text().notNull(),
  userId: text().references(() => user.id, { onDelete: 'set null' }),
  reason: text().$type<'wrong-key' | 'unclear' | 'outdated' | 'typo' | 'other'>().notNull(),
  message: text(),
  status: text().$type<'open' | 'resolved' | 'dismissed'>().notNull().default('open'),
  resolution: text(),
  resolvedBy: text().references(() => user.id, { onDelete: 'set null' }),
  resolvedAt: timestamp({ withTimezone: true }),
  createdAt: createdAt(),
}, (t) => [index().on(t.status), index().on(t.questionId)]);

// ---------------------------------------------------------------- achievements

export const certificate = pgTable('certificate', {
  /** public verification code */
  id: text().primaryKey(),
  userId: text().notNull().references(() => user.id, { onDelete: 'cascade' }),
  attemptId: text().notNull().references(() => attempt.id, { onDelete: 'cascade' }),
  examId: text().notNull(),
  candidateName: text().notNull(),
  scaled: integer().notNull(),
  difficulty: text().notNull(),
  issuedAt: createdAt(),
}, (t) => [uniqueIndex().on(t.attemptId)]);

/** Daily activity roll-up: streaks, heatmap, XP history. `day` is in the learner's timezone. */
export const activityDay = pgTable('activity_day', {
  userId: text().notNull().references(() => user.id, { onDelete: 'cascade' }),
  day: date().notNull(),
  xp: integer().notNull().default(0),
  items: integer().notNull().default(0),
  correct: integer().notNull().default(0),
  minutes: integer().notNull().default(0),
}, (t) => [primaryKey({ columns: [t.userId, t.day] })]);

export const userBadge = pgTable('user_badge', {
  userId: text().notNull().references(() => user.id, { onDelete: 'cascade' }),
  badge: text().notNull(),
  earnedAt: createdAt(),
}, (t) => [primaryKey({ columns: [t.userId, t.badge] })]);

// ---------------------------------------------------------------- interviews

export interface InterviewTurn {
  role: 'interviewer' | 'candidate';
  content: string;
  at: string;
  /** interviewer turns: a new main question, a follow-up on the last answer, or the closing message */
  kind?: 'question' | 'follow_up' | 'wrap_up';
}
export interface InterviewReport {
  overall: number;
  summary: string;
  rubric: { criterion: string; score: number; evidence: string; improve: string }[];
  strengths: string[];
  improvements: string[];
}

export const interview = pgTable('interview', {
  id: text().primaryKey().default(sql`gen_random_uuid()`),
  userId: text().notNull().references(() => user.id, { onDelete: 'cascade' }),
  role: text().notNull(),
  level: text().notNull(),
  focus: text().notNull(),
  questionTarget: integer().notNull().default(5),
  status: text().$type<'active' | 'completed' | 'abandoned'>().notNull().default('active'),
  turns: jsonb().$type<InterviewTurn[]>().notNull().default([]),
  report: jsonb().$type<InterviewReport>(),
  createdAt: createdAt(),
  finishedAt: timestamp({ withTimezone: true }),
}, (t) => [index().on(t.userId, t.createdAt)]);

// ---------------------------------------------------------------- social

/** A fixed form anyone with the link can take; results form a mini leaderboard. */
export const challenge = pgTable('challenge', {
  id: text().primaryKey(),
  creatorId: text().notNull().references(() => user.id, { onDelete: 'cascade' }),
  examId: text().notNull().references(() => exam.id, { onDelete: 'cascade' }),
  title: text().notNull(),
  difficulty: text().notNull().default('standard'),
  minutes: integer(),
  itemIds: jsonb().$type<string[]>().notNull(),
  optionOrder: jsonb().$type<Record<string, string[]>>().notNull(),
  createdAt: createdAt(),
  expiresAt: timestamp({ withTimezone: true }),
});

export const organization = pgTable('organization', {
  id: text().primaryKey().default(sql`gen_random_uuid()`),
  name: text().notNull(),
  inviteCode: text().notNull().unique(),
  createdBy: text().notNull().references(() => user.id, { onDelete: 'cascade' }),
  createdAt: createdAt(),
});

export const orgMember = pgTable('org_member', {
  orgId: text().notNull().references(() => organization.id, { onDelete: 'cascade' }),
  userId: text().notNull().references(() => user.id, { onDelete: 'cascade' }),
  role: text().$type<'owner' | 'instructor' | 'member'>().notNull().default('member'),
  joinedAt: createdAt(),
}, (t) => [primaryKey({ columns: [t.orgId, t.userId] }), index().on(t.userId)]);

export const assignment = pgTable('assignment', {
  id: text().primaryKey().default(sql`gen_random_uuid()`),
  orgId: text().notNull().references(() => organization.id, { onDelete: 'cascade' }),
  examId: text().notNull().references(() => exam.id, { onDelete: 'cascade' }),
  title: text().notNull(),
  kind: text().$type<'full' | 'quick' | 'practice'>().notNull().default('quick'),
  difficulty: text().notNull().default('standard'),
  dueAt: timestamp({ withTimezone: true }),
  createdBy: text().notNull().references(() => user.id, { onDelete: 'cascade' }),
  createdAt: createdAt(),
}, (t) => [index().on(t.orgId)]);

// ---------------------------------------------------------------- billing & limits

export const subscription = pgTable('subscription', {
  userId: text().primaryKey().references(() => user.id, { onDelete: 'cascade' }),
  stripeCustomerId: text(),
  stripeSubscriptionId: text(),
  status: text().notNull(),
  currentPeriodEnd: timestamp({ withTimezone: true }),
  updatedAt: updatedAt(),
});

export const aiUsage = pgTable('ai_usage', {
  userId: text().notNull().references(() => user.id, { onDelete: 'cascade' }),
  day: date().notNull(),
  requests: integer().notNull().default(0),
}, (t) => [primaryKey({ columns: [t.userId, t.day] })]);
