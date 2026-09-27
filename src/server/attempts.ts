import 'server-only';
import { and, asc, desc, eq, inArray, lte, sql } from 'drizzle-orm';
import { db } from '@/db';
import {
  attempt, attemptItem, bookmark, certificate, exam as examTable, reviewCard,
  type AttemptKind, type AttemptSettings, type AttemptSummary,
} from '@/db/schema';
import {
  assembleForm, difficultyMode, formFromItems, isCorrect, newSeed, scoreAttempt, toPublicQuestion, toRevealedQuestion,
  type ExamConfig, type Question,
} from '@/lib/engine';
import { KINDS } from '@/lib/attempt-kinds';
import type { AttemptListItem, PlayerState, ProgressPatch, ResultState } from '@/lib/dto';
import { XP, recordActivity } from './activity';
import { AppError, notFound } from './errors';
import { getAssemblyPool, getCaseStudies, getExam, getQuestionsByIds } from './exams';
import { getOrCreateProfile } from './profile';
import { applyAnswersToCards } from './srs';

type AttemptRow = typeof attempt.$inferSelect;

/** Requests that land this long after the deadline are refused and the attempt is closed. */
const GRACE_MS = 15_000;
const DIAGNOSTIC_ITEMS = 15;
const MAX_TIME_PER_ITEM_MS = 4 * 60 * 60 * 1000;

export interface StartInput {
  examId: string;
  kind: Extract<AttemptKind, 'full' | 'quick' | 'practice' | 'mistakes' | 'review' | 'diagnostic'>;
  difficulty?: string;
  pool?: 'bank' | 'imported' | 'all';
  domains?: number[];
  skills?: string[];
  count?: number;
  timed?: boolean;
  instant?: boolean;
  candidateName?: string;
}

const secondsPerItem = (cfg: ExamConfig) => (cfg.timeLimitMinutes * 60) / cfg.itemCount;

// ---------------------------------------------------------------- start

export async function startAttempt(userId: string, userName: string, input: StartInput): Promise<{ id: string }> {
  const ex = await getExam(input.examId);
  if (!ex || !ex.isPublished) throw notFound('That exam');
  const cfg = ex.config;

  const [active] = await db.select({ id: attempt.id, kind: attempt.kind }).from(attempt)
    .where(and(eq(attempt.userId, userId), eq(attempt.examId, ex.id), eq(attempt.status, 'active')))
    .limit(1);
  if (active) {
    throw new AppError(`You already have a ${KINDS[active.kind].label.toLowerCase()} in progress for this exam.`, 409, 'ACTIVE_ATTEMPT', { attemptId: active.id });
  }

  const difficulty = cfg.difficultyModes[input.difficulty ?? ''] ? input.difficulty! : cfg.defaultDifficultyMode;
  const preset = difficultyMode(cfg, difficulty);
  const seed = newSeed();
  const settings: AttemptSettings = {};
  let form: { itemIds: string[]; optionOrder: Record<string, string[]> };
  let minutes: number | null = null;
  let pool: 'bank' | 'imported' | 'all' = 'bank';

  switch (input.kind) {
    case 'full':
    case 'quick': {
      const mode = cfg.modes[input.kind];
      if (!mode) throw new AppError('This exam has no such mock.', 400);
      form = assembleForm(cfg, await getAssemblyPool(ex.id, 'bank'), { seed, total: mode.items, difficulty });
      minutes = Math.ceil(mode.minutes * preset.timeFactor);
      settings.candidateName = (input.candidateName ?? userName).trim().slice(0, 80);
      break;
    }
    case 'diagnostic': {
      form = assembleForm(cfg, await getAssemblyPool(ex.id, 'bank'), { seed, total: DIAGNOSTIC_ITEMS, difficulty: cfg.defaultDifficultyMode });
      break;
    }
    case 'practice': {
      pool = input.pool ?? 'bank';
      const count = Math.max(1, Math.min(input.count ?? 10, 60));
      form = assembleForm(cfg, await getAssemblyPool(ex.id, pool), {
        seed, total: count, difficulty, domains: input.domains ?? null, skills: input.skills ?? null,
      });
      settings.domains = input.domains ?? null;
      settings.skills = input.skills ?? null;
      settings.count = count;
      settings.timed = Boolean(input.timed);
      if (input.timed) minutes = Math.ceil(((form.itemIds.length * secondsPerItem(cfg)) / 60) * preset.timeFactor);
      break;
    }
    case 'mistakes': {
      const ids = await getRecentMistakeIds(userId, ex.id, Math.max(1, Math.min(input.count ?? 15, 60)));
      if (!ids.length) throw new AppError('No mistakes to retry yet. Nice work! Take a mock or a drill first.', 400, 'EMPTY');
      form = formFromItems(await getQuestionsByIds(ids), seed);
      break;
    }
    case 'review': {
      const due = await db.select({ questionId: reviewCard.questionId }).from(reviewCard)
        .where(and(eq(reviewCard.userId, userId), eq(reviewCard.examId, ex.id), lte(reviewCard.due, new Date())))
        .orderBy(asc(reviewCard.due))
        .limit(Math.max(1, Math.min(input.count ?? 20, 60)));
      if (!due.length) throw new AppError('Nothing is due for review right now. Come back tomorrow.', 400, 'EMPTY');
      form = formFromItems(await getQuestionsByIds(due.map((d) => d.questionId)), seed);
      break;
    }
    default:
      throw new AppError('Unknown practice mode.', 400);
  }

  if (!form.itemIds.length) throw new AppError('No questions match those settings yet.', 400, 'EMPTY');
  const instant = KINDS[input.kind].feedback === 'instant' && input.instant !== false;
  settings.instant = instant;

  const now = new Date();
  const [row] = await db.insert(attempt).values({
    userId,
    examId: ex.id,
    kind: input.kind,
    difficulty,
    pool,
    settings,
    seed,
    itemIds: form.itemIds,
    optionOrder: form.optionOrder,
    minutes,
    startedAt: now,
    deadline: minutes ? new Date(now.getTime() + minutes * 60_000) : null,
  }).returning({ id: attempt.id });
  return row;
}

/** The latest answer to each question; ids whose latest answer was wrong, newest first. */
async function getRecentMistakeIds(userId: string, examId: string, limit: number): Promise<string[]> {
  const rows = await db.execute<{ question_id: string }>(sql`
    select question_id from (
      select distinct on (question_id) question_id, correct, created_at
      from ${attemptItem}
      where user_id = ${userId} and exam_id = ${examId} and answered
      order by question_id, created_at desc
    ) latest
    where not correct
    order by created_at desc
    limit ${limit}`);
  return rows.rows.map((r) => r.question_id);
}

// ---------------------------------------------------------------- load

async function loadOwned(userId: string, attemptId: string): Promise<AttemptRow> {
  if (!/^[0-9a-f-]{36}$/i.test(attemptId)) throw notFound('That attempt');
  const [row] = await db.select().from(attempt).where(and(eq(attempt.id, attemptId), eq(attempt.userId, userId))).limit(1);
  if (!row) throw notFound('That attempt');
  return row;
}

const isOverdue = (a: Pick<AttemptRow, 'deadline'>, graceMs = GRACE_MS) => Boolean(a.deadline && Date.now() > a.deadline.getTime() + graceMs);

/** Closes attempts whose clock ran out while nobody was looking. */
async function settleIfExpired(a: AttemptRow): Promise<AttemptRow> {
  if (a.status === 'active' && isOverdue(a, 0)) {
    await finalize(a, { timedOut: true });
    const [fresh] = await db.select().from(attempt).where(eq(attempt.id, a.id)).limit(1);
    return fresh;
  }
  return a;
}

function nameMaps(cfg: ExamConfig) {
  return {
    skill: Object.fromEntries(cfg.skills.map((s) => [s.id, s.name])) as Record<string, string>,
    domain: Object.fromEntries(cfg.domains.map((d) => [d.id, d.name])) as Record<number, string>,
  };
}

export async function getPlayerState(userId: string, attemptId: string): Promise<PlayerState | { finished: true; id: string }> {
  const a = await settleIfExpired(await loadOwned(userId, attemptId));
  if (a.status !== 'active') return { finished: true, id: a.id };
  const ex = (await getExam(a.examId))!;
  const cfg = ex.config;
  const names = nameMaps(cfg);
  const questions = await getQuestionsByIds(a.itemIds);
  const saved = await db.select({ questionId: bookmark.questionId }).from(bookmark)
    .where(and(eq(bookmark.userId, userId), inArray(bookmark.questionId, a.itemIds)));

  const revealed: PlayerState['revealed'] = {};
  for (const q of questions) {
    if (a.checked[q.id]) revealed[q.id] = { ...toRevealedQuestion(q, a.optionOrder[q.id]), correct: isCorrect(q, a.responses[q.id]) };
  }

  return {
    id: a.id,
    examId: ex.id,
    examCode: ex.code,
    examTitle: ex.title,
    kind: a.kind,
    difficulty: a.difficulty,
    difficultyLabel: difficultyMode(cfg, a.difficulty).label,
    instant: Boolean(a.settings.instant),
    status: a.status,
    current: Math.min(a.current, Math.max(0, a.itemIds.length - 1)),
    responses: a.responses,
    flags: a.flags,
    checked: a.checked,
    timeSpent: a.timeSpent,
    startedAt: a.startedAt.toISOString(),
    deadline: a.deadline?.toISOString() ?? null,
    serverNow: new Date().toISOString(),
    items: questions.map((q) => ({
      ...toPublicQuestion(q, a.optionOrder[q.id]),
      skillName: names.skill[q.skill] ?? q.skill,
      domainName: names.domain[q.domain] ?? `Domain ${q.domain}`,
    })),
    revealed,
    cases: await getCaseStudies(questions.map((q) => q.caseId)),
    bookmarks: saved.map((s) => s.questionId),
  };
}

// ---------------------------------------------------------------- progress

async function loadActive(userId: string, attemptId: string): Promise<AttemptRow> {
  const a = await loadOwned(userId, attemptId);
  if (a.status !== 'active') throw new AppError('This attempt has already ended.', 409, 'ENDED', { status: a.status });
  if (isOverdue(a)) {
    await finalize(a, { timedOut: true });
    throw new AppError("Time's up. Your answers were submitted.", 409, 'TIME_UP');
  }
  return a;
}

export async function saveProgress(userId: string, attemptId: string, patch: ProgressPatch) {
  const a = await loadActive(userId, attemptId);
  const inForm = new Set(a.itemIds);
  const pick = <T>(obj: Record<string, T> | undefined, keep: (id: string, v: T) => boolean) =>
    Object.fromEntries(Object.entries(obj ?? {}).filter(([id, v]) => inForm.has(id) && keep(id, v)));

  // Answers are locked once revealed in a drill.
  const responses = pick(patch.responses, (id, v) => !a.checked[id] && Array.isArray(v) && v.length <= 12);
  const flags = pick(patch.flags, (_id, v) => typeof v === 'boolean');
  const timeSpent = pick(patch.timeSpent, (_id, v) => Number.isFinite(v) && v >= 0 && v <= MAX_TIME_PER_ITEM_MS);
  const current = patch.current === undefined ? undefined : Math.max(0, Math.min(Math.trunc(patch.current), a.itemIds.length - 1));

  // JSONB `||` merges atomically, so rapid saves never overwrite each other.
  await db.update(attempt).set({
    ...(Object.keys(responses).length ? { responses: sql`${attempt.responses} || ${JSON.stringify(responses)}::jsonb` } : {}),
    ...(Object.keys(flags).length ? { flags: sql`${attempt.flags} || ${JSON.stringify(flags)}::jsonb` } : {}),
    ...(Object.keys(timeSpent).length ? { timeSpent: sql`${attempt.timeSpent} || ${JSON.stringify(timeSpent)}::jsonb` } : {}),
    ...(current !== undefined ? { current } : {}),
  }).where(and(eq(attempt.id, a.id), eq(attempt.status, 'active')));
  return { ok: true as const, deadline: a.deadline?.toISOString() ?? null, serverNow: new Date().toISOString() };
}

/** Instant-feedback drills: lock in an answer and reveal the key for one item. */
export async function checkAnswer(userId: string, attemptId: string, questionId: string, response: string[]) {
  const a = await loadActive(userId, attemptId);
  if (!a.settings.instant) throw new AppError('Answers are revealed when you submit this attempt.', 400);
  const position = a.itemIds.indexOf(questionId);
  if (position < 0) throw notFound('That question');
  const [q] = await getQuestionsByIds([questionId]);
  const given = a.checked[questionId] ? (a.responses[questionId] ?? []) : response;
  const correct = isCorrect(q, given);
  const revealed = { ...toRevealedQuestion(q, a.optionOrder[questionId]), correct };
  if (a.checked[questionId]) return revealed;
  if (!given.length) throw new AppError('Choose an answer first.', 400);

  const profile = await getOrCreateProfile(userId);
  await db.transaction(async (tx) => {
    await tx.update(attempt).set({
      responses: sql`${attempt.responses} || ${JSON.stringify({ [questionId]: given })}::jsonb`,
      checked: sql`${attempt.checked} || ${JSON.stringify({ [questionId]: true })}::jsonb`,
    }).where(eq(attempt.id, a.id));
    await tx.insert(attemptItem).values({
      attemptId: a.id, questionId, userId, examId: a.examId, position,
      domain: q.domain, skill: q.skill, difficulty: q.difficulty,
      correct, answered: true, selected: given, timeMs: Math.round(a.timeSpent[questionId] ?? 0),
    }).onConflictDoNothing();
    await applyAnswersToCards(tx, userId, a.examId, [{ questionId, correct }]);
    await recordActivity(tx, userId, { xp: XP.answered + (correct ? XP.correct : 0), items: 1, correct: correct ? 1 : 0 }, profile.timezone);
  });
  return revealed;
}

// ---------------------------------------------------------------- finish

export async function submitAttempt(userId: string, attemptId: string) {
  const a = await loadOwned(userId, attemptId);
  if (a.status === 'active') await finalize(a, { timedOut: isOverdue(a, 0) });
  return { id: a.id };
}

export async function abandonAttempt(userId: string, attemptId: string) {
  const a = await loadOwned(userId, attemptId);
  if (a.status !== 'active') return { ok: true as const };
  // Drill answers already checked still count toward analytics and streaks.
  await db.update(attempt).set({ status: 'abandoned', finishedAt: new Date() })
    .where(and(eq(attempt.id, a.id), eq(attempt.status, 'active')));
  return { ok: true as const };
}

function certificateCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  const chars = [...bytes].map((b) => alphabet[b % alphabet.length]).join('');
  return `CM-${chars.slice(0, 5)}-${chars.slice(5)}`;
}

async function finalize(a: AttemptRow, { timedOut }: { timedOut: boolean }) {
  const ex = (await getExam(a.examId))!;
  const cfg = ex.config;
  const questions = await getQuestionsByIds(a.itemIds);
  const report = scoreAttempt(cfg, questions, a.responses);
  const now = new Date();
  const limitMs = a.minutes ? a.minutes * 60_000 : Number.POSITIVE_INFINITY;
  const durationMs = Math.min(now.getTime() - a.startedAt.getTime(), limitMs);
  const { perItem, ...rest } = report;
  const summary: AttemptSummary = {
    ...rest,
    byDomain: rest.byDomain.map((d) => ({ ...d, id: Number(d.id) })),
    bySkill: rest.bySkill.map((s) => ({ ...s, id: String(s.id) })),
    durationMs,
    timedOut,
  };
  const scored = KINDS[a.kind].scored;
  const earnsCertificate = a.kind === 'full' && report.passed && difficultyMode(cfg, a.difficulty).certificate;
  const profile = await getOrCreateProfile(a.userId);

  await db.transaction(async (tx) => {
    const [closed] = await tx.update(attempt).set({
      status: 'submitted', finishedAt: now, scaled: report.scaled, passed: scored ? report.passed : null, summary,
    }).where(and(eq(attempt.id, a.id), eq(attempt.status, 'active'))).returning({ id: attempt.id });
    if (!closed) return; // a concurrent request already finished it

    // Drill items checked along the way were recorded (and rewarded) then.
    const fresh = perItem.filter((r) => !a.checked[r.id]);
    if (fresh.length) {
      await tx.insert(attemptItem).values(fresh.map((r) => ({
        attemptId: a.id, questionId: r.id, userId: a.userId, examId: a.examId, position: a.itemIds.indexOf(r.id),
        domain: r.domain, skill: r.skill, difficulty: r.difficulty, correct: r.correct, answered: r.answered,
        selected: r.selected, timeMs: Math.round(a.timeSpent[r.id] ?? 0),
      }))).onConflictDoNothing();
    }
    const answered = fresh.filter((r) => r.answered);
    await applyAnswersToCards(tx, a.userId, a.examId, answered.map((r) => ({ questionId: r.id, correct: r.correct })));

    const correct = answered.filter((r) => r.correct).length;
    const xp = answered.length * XP.answered + correct * XP.correct
      + (scored ? XP.finishedMock : 0) + (scored && report.passed ? XP.passedMock : 0);
    await recordActivity(tx, a.userId, { xp, items: answered.length, correct, minutes: durationMs / 60_000 }, profile.timezone);

    if (earnsCertificate) {
      await tx.insert(certificate).values({
        id: certificateCode(), userId: a.userId, attemptId: a.id, examId: a.examId,
        candidateName: a.settings.candidateName || 'Candidate', scaled: report.scaled, difficulty: a.difficulty,
      }).onConflictDoNothing();
    }
  });
}

// ---------------------------------------------------------------- results & history

export async function getResult(userId: string, attemptId: string): Promise<ResultState | { active: true; id: string }> {
  const a = await settleIfExpired(await loadOwned(userId, attemptId));
  if (a.status === 'active') return { active: true, id: a.id };
  if (!a.summary) throw new AppError('This attempt was discarded before it was scored.', 404, 'NO_RESULT');
  const ex = (await getExam(a.examId))!;
  const cfg = ex.config;
  const names = nameMaps(cfg);
  const questions = await getQuestionsByIds(a.itemIds);
  const [cert] = await db.select({ id: certificate.id }).from(certificate).where(eq(certificate.attemptId, a.id)).limit(1);
  const saved = new Set((await db.select({ q: bookmark.questionId }).from(bookmark)
    .where(and(eq(bookmark.userId, userId), inArray(bookmark.questionId, a.itemIds)))).map((r) => r.q));

  return {
    id: a.id,
    examId: ex.id,
    examCode: ex.code,
    examTitle: ex.title,
    kind: a.kind,
    difficulty: a.difficulty,
    difficultyLabel: difficultyMode(cfg, a.difficulty).label,
    startedAt: a.startedAt.toISOString(),
    finishedAt: a.finishedAt?.toISOString() ?? null,
    summary: a.summary,
    scale: { min: cfg.scale.min, max: cfg.scale.max, passing: cfg.scale.passing },
    certificateId: cert?.id ?? null,
    certificateEligibleMode: a.kind === 'full' && difficultyMode(cfg, a.difficulty).certificate,
    items: questions.map((q: Question) => {
      const selected = a.responses[q.id] ?? [];
      return {
        ...toRevealedQuestion(q, a.optionOrder[q.id]),
        selected,
        correct: isCorrect(q, selected),
        answered: selected.some((s) => s.trim().length > 0),
        flagged: Boolean(a.flags[q.id]),
        timeMs: Math.round(a.timeSpent[q.id] ?? 0),
        skillName: names.skill[q.skill] ?? q.skill,
        domainName: names.domain[q.domain] ?? `Domain ${q.domain}`,
        bookmarked: saved.has(q.id),
      };
    }),
  };
}

export async function listAttempts(userId: string, opts: { examId?: string; limit?: number; includeActive?: boolean } = {}): Promise<AttemptListItem[]> {
  const where = [eq(attempt.userId, userId)];
  if (opts.examId) where.push(eq(attempt.examId, opts.examId));
  if (!opts.includeActive) where.push(sql`${attempt.status} <> 'active'`);
  where.push(sql`${attempt.status} <> 'abandoned'`);
  const rows = await db
    .select({
      id: attempt.id, examId: attempt.examId, examCode: examTable.code, kind: attempt.kind, difficulty: attempt.difficulty,
      status: attempt.status, startedAt: attempt.startedAt, finishedAt: attempt.finishedAt, scaled: attempt.scaled, passed: attempt.passed,
      summary: attempt.summary, itemIds: attempt.itemIds, responses: attempt.responses,
    })
    .from(attempt)
    .innerJoin(examTable, eq(examTable.id, attempt.examId))
    .where(and(...where))
    .orderBy(desc(attempt.startedAt))
    .limit(opts.limit ?? 50);
  return rows.map((r) => ({
    id: r.id, examId: r.examId, examCode: r.examCode, kind: r.kind, difficulty: r.difficulty, status: r.status,
    startedAt: r.startedAt.toISOString(), finishedAt: r.finishedAt?.toISOString() ?? null,
    scaled: r.scaled, passed: r.passed, correctCount: r.summary?.correctCount ?? null,
    itemCount: r.itemIds.length,
    answered: Object.values(r.responses).filter((v) => v.length).length,
  }));
}

export async function getActiveAttempts(userId: string) {
  const rows = await db
    .select({
      id: attempt.id, examId: attempt.examId, examCode: examTable.code, examTitle: examTable.title, kind: attempt.kind,
      current: attempt.current, itemIds: attempt.itemIds, responses: attempt.responses, deadline: attempt.deadline, startedAt: attempt.startedAt,
    })
    .from(attempt)
    .innerJoin(examTable, eq(examTable.id, attempt.examId))
    .where(and(eq(attempt.userId, userId), eq(attempt.status, 'active')))
    .orderBy(desc(attempt.startedAt));
  const live = [];
  for (const r of rows) {
    // Settle anything whose clock ran out so the dashboard never offers a dead "Resume".
    if (r.deadline && Date.now() > r.deadline.getTime()) {
      const [full] = await db.select().from(attempt).where(eq(attempt.id, r.id)).limit(1);
      if (full) await finalize(full, { timedOut: true });
      continue;
    }
    live.push({
      id: r.id, examId: r.examId, examCode: r.examCode, examTitle: r.examTitle, kind: r.kind,
      position: r.current + 1, itemCount: r.itemIds.length,
      answered: Object.values(r.responses).filter((v) => v.length).length,
      deadline: r.deadline?.toISOString() ?? null,
    });
  }
  return live;
}
