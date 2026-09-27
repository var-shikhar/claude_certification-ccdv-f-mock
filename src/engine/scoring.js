// The judging system.
//
// Modeled on how the CCDV-F exam reports results (Exam Guide §9):
//   • Criterion-referenced: you are measured against a fixed standard,
//     not against other candidates.
//   • Result = pass/fail plus a scaled score (100–1,000 for CCDV-F, cut 720).
//   • Harder items carry more weight in the scaled score.
//   • The score report adds percent-correct per content domain; those
//     percentages are informational and do not decide pass/fail.
//   • Each item states how many responses to select; there is no partial
//     credit — a multiple-response item is right only if the selection
//     exactly matches the key. Unanswered items score zero.
//
// The real exam's scaling comes from a psychometric standard-setting study
// that is not public. This mock approximates it with difficulty-weighted
// percent-correct mapped onto the scale, anchored so that a weighted score
// of exam.scale.cutRaw lands exactly on the passing score.

import { levelWeight } from './blueprint.js';

export function isCorrect(question, selected = []) {
  const key = question.options.filter((o) => o.correct).map((o) => o.id).sort();
  const got = [...new Set(selected)].sort();
  return key.length === got.length && key.every((id, i) => id === got[i]);
}

/** Maps a weighted proportion (0..1) onto the exam's scale. */
export function toScaled(exam, raw) {
  const { min, max, passing, cutRaw } = exam.scale;
  const p = Math.min(1, Math.max(0, raw));
  const scaled = p <= cutRaw
    ? min + (passing - min) * (p / cutRaw)
    : passing + (max - passing) * ((p - cutRaw) / (1 - cutRaw));
  return Math.round(scaled);
}

/**
 * @param {object}   exam
 * @param {object[]} items      questions in form order
 * @param {Record<string,string[]>} responses  question id -> selected option ids
 */
export function scoreAttempt(exam, items, responses) {
  let earned = 0;
  let possible = 0;
  let correctCount = 0;
  const perItem = items.map((q) => {
    const selected = responses[q.id] ?? [];
    const correct = isCorrect(q, selected);
    const w = levelWeight(exam, q.difficulty);
    possible += w;
    if (correct) { earned += w; correctCount += 1; }
    return { id: q.id, domain: q.domain, skill: q.skill, correct, answered: selected.length > 0, selected };
  });

  const raw = possible ? earned / possible : 0;
  const scaled = toScaled(exam, raw);

  const tally = (key, list) => list
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
