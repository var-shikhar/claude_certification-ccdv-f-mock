// The judging system.
//
// Modeled on how certification exams report results:
//   • Criterion-referenced: you are measured against a fixed standard,
//     not against other candidates.
//   • Result = pass/fail plus a scaled score (e.g. 100–1,000, cut 720).
//   • Harder items carry more weight in the scaled score.
//   • The report adds percent-correct per domain and skill; those are
//     informational and do not decide pass/fail.
//   • No partial credit: a multiple-response, ordering or matching item is
//     right only if the whole response matches the key. Blank scores zero.
//
// Real exams scale scores through a confidential standard-setting study.
// This approximates it with difficulty-weighted percent-correct mapped onto
// the scale, anchored so a weighted score of scale.cutRaw lands exactly on
// the passing score.

import { levelWeight } from './blueprint';
import type { ExamConfig, Question, Response, Responses } from './types';

type Gradable = Pick<Question, 'type' | 'options' | 'answerOrder' | 'prompts' | 'accepted'>;

export const normalizeText = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * Response shapes:
 *   single / multi / truefalse  selected option ids
 *   order                       option ids in the chosen sequence
 *   match                       "promptId=optionId" pairs
 *   fill                        [typed answer]
 */
export function isCorrect(question: Gradable, selected: Response = []): boolean {
  switch (question.type) {
    case 'order': {
      const key = question.answerOrder ?? question.options.map((o) => o.id);
      return selected.length === key.length && key.every((id, i) => selected[i] === id);
    }
    case 'match': {
      const prompts = question.prompts ?? [];
      const chosen = new Map(selected.map((pair) => pair.split('=') as [string, string]));
      return prompts.length > 0 && prompts.every((p) => chosen.get(p.id) === p.answer);
    }
    case 'fill': {
      const got = normalizeText(selected[0] ?? '');
      return got.length > 0 && (question.accepted ?? []).some((a) => normalizeText(a) === got);
    }
    default: {
      const key = question.options.filter((o) => o.correct).map((o) => o.id).sort();
      const got = [...new Set(selected)].sort();
      return key.length === got.length && key.every((id, i) => id === got[i]);
    }
  }
}

export const isAnswered = (selected: Response | undefined) =>
  Boolean(selected?.length && selected.some((s) => s.trim().length > 0));

/** Maps a weighted proportion (0..1) onto the exam's scale. */
export function toScaled(exam: Pick<ExamConfig, 'scale'>, raw: number): number {
  const { min, max, passing, cutRaw } = exam.scale;
  const p = Math.min(1, Math.max(0, raw));
  const scaled = p <= cutRaw
    ? min + (passing - min) * (p / cutRaw)
    : passing + (max - passing) * ((p - cutRaw) / (1 - cutRaw));
  return Math.round(scaled);
}

export interface ItemResult {
  id: string;
  domain: number;
  skill: string;
  difficulty: number;
  correct: boolean;
  answered: boolean;
  selected: Response;
}

export interface Breakdown { id: string | number; name: string; total: number; correct: number; percent: number | null }

export interface ScoreReport {
  scaled: number;
  passed: boolean;
  rawWeighted: number;
  correctCount: number;
  itemCount: number;
  answeredCount: number;
  byDomain: Breakdown[];
  bySkill: Breakdown[];
  perItem: ItemResult[];
}

type ScorableItem = Gradable & Pick<Question, 'id' | 'domain' | 'skill' | 'difficulty'>;

export function scoreAttempt(exam: ExamConfig, items: ScorableItem[], responses: Responses): ScoreReport {
  let earned = 0;
  let possible = 0;
  let correctCount = 0;
  const perItem: ItemResult[] = items.map((q) => {
    const selected = responses[q.id] ?? [];
    const correct = isCorrect(q, selected);
    const w = levelWeight(exam, q.difficulty);
    possible += w;
    if (correct) { earned += w; correctCount += 1; }
    return { id: q.id, domain: q.domain, skill: q.skill, difficulty: q.difficulty, correct, answered: isAnswered(selected), selected };
  });

  const raw = possible ? earned / possible : 0;
  const scaled = toScaled(exam, raw);

  const tally = <K extends 'domain' | 'skill'>(key: K, list: { id: ItemResult[K]; name: string }[]): Breakdown[] => list
    .map((entry) => {
      const mine = perItem.filter((r) => r[key] === entry.id);
      const right = mine.filter((r) => r.correct).length;
      return { id: entry.id, name: entry.name, total: mine.length, correct: right, percent: mine.length ? Math.round((right / mine.length) * 100) : null };
    })
    .filter((row) => row.total > 0);

  return {
    scaled,
    passed: scaled >= exam.scale.passing,
    rawWeighted: raw,
    correctCount,
    itemCount: items.length,
    answeredCount: perItem.filter((r) => r.answered).length,
    byDomain: tally('domain', exam.domains),
    bySkill: tally('skill', exam.skills),
    perItem,
  };
}
