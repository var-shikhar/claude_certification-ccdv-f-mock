// Computer-adaptive testing, kept deliberately simple (a Rasch-style
// ability update, not a calibrated IRT model):
//
// - Each difficulty level maps to an item location b on a logit scale.
// - After every answer, ability θ moves toward the evidence:
//     θ ← θ + K·(correct − P),  P = 1 / (1 + e^(b − θ))
//   with a step K that shrinks as more answers come in.
// - The next item comes from the skill furthest behind its blueprint share,
//   at the difficulty whose b is closest to θ.

import { skillAllocation } from './blueprint';
import type { ExamConfig } from './types';

export const ITEM_LOCATION: Record<number, number> = { 1: -1.2, 2: -0.4, 3: 0.4, 4: 1.2 };
export const THETA_LIMIT = 2.5;

export function updateAbility(theta: number, difficulty: number, correct: boolean, answeredBefore: number) {
  const b = ITEM_LOCATION[difficulty] ?? 0;
  const p = 1 / (1 + Math.exp(b - theta));
  const k = Math.max(0.35, 1.4 / Math.sqrt(answeredBefore + 1));
  const next = theta + k * ((correct ? 1 : 0) - p);
  return Math.max(-THETA_LIMIT, Math.min(THETA_LIMIT, next));
}

interface PoolItem { id: string; skill: string; difficulty: number }

export function pickNextAdaptive<T extends PoolItem>(
  exam: ExamConfig, pool: T[], used: Set<string>, answeredSkills: string[], theta: number, target: number, rand: () => number = Math.random,
): T | null {
  const need = skillAllocation(exam, target);
  const have: Record<string, number> = {};
  for (const s of answeredSkills) have[s] = (have[s] ?? 0) + 1;
  const free = pool.filter((q) => !used.has(q.id));
  if (!free.length) return null;

  const skills = [...exam.skills]
    .map((s) => ({ id: s.id, deficit: (need[s.id] ?? 0) - (have[s.id] ?? 0), jitter: rand() }))
    .sort((a, b) => b.deficit - a.deficit || a.jitter - b.jitter);

  const closest = (items: T[]) => {
    let best: T[] = [];
    let bestGap = Number.POSITIVE_INFINITY;
    for (const q of items) {
      const gap = Math.abs((ITEM_LOCATION[q.difficulty] ?? 0) - theta);
      if (gap < bestGap - 1e-9) { best = [q]; bestGap = gap; } else if (Math.abs(gap - bestGap) < 1e-9) best.push(q);
    }
    return best[Math.floor(rand() * best.length)] ?? null;
  };

  for (const s of skills) {
    const inSkill = free.filter((q) => q.skill === s.id);
    if (inSkill.length) return closest(inSkill);
  }
  return closest(free);
}
