// Builds exam forms from the question bank.
//
// A full mock draws items skill-by-skill in the proportions of the official
// blueprint (see skillAllocation), then shuffles item order so domains are
// interleaved the way they are on the live exam. Answer options are shuffled
// per item too; grading is by option id, so shuffling never affects scoring.

import { skillAllocation, difficultyMode } from './blueprint';
import { mulberry32, shuffle } from './random';
import type { DifficultyMode, ExamConfig, Question } from './types';

type Mix = DifficultyMode['mix'];
type Pickable = Pick<Question, 'id' | 'difficulty'>;
type BankItem = Pick<Question, 'id' | 'difficulty' | 'domain' | 'skill' | 'type' | 'options'>;

export interface AssembleOptions {
  seed: number;
  /** item count (defaults to exam.itemCount) */
  total?: number;
  /** restrict to these domain ids (practice drills) */
  domains?: number[] | null;
  /** restrict to these skill ids (skill drills) */
  skills?: string[] | null;
  /** key of exam.difficultyModes */
  difficulty?: string | null;
  shuffleOptions?: boolean;
}

export interface Form {
  itemIds: string[];
  optionOrder: Record<string, string[]>;
}

// True/false keeps its natural order; fill-in has no options to shuffle.
const SHUFFLED_TYPES = new Set(['single', 'multi', 'order', 'match']);

const mixWeight = (mix: Mix, level: number) => mix[String(level) as keyof Mix] ?? 0;

export function assembleForm(exam: ExamConfig, bank: BankItem[], opts: AssembleOptions): Form {
  const { seed, total, domains, skills, difficulty, shuffleOptions = true } = opts;
  const rand = mulberry32(seed);
  const mix = difficultyMode(exam, difficulty).mix;
  let pool = bank;
  if (skills?.length) pool = pool.filter((q) => skills.includes(q.skill));
  else if (domains?.length) pool = pool.filter((q) => domains.includes(q.domain));
  const size = Math.min(total ?? exam.itemCount, pool.length);

  const picked = skills?.length || domains?.length
    ? pickProportional(exam, pool, size, rand, mix, skills?.length ? skills : null, domains ?? null)
    : pickByBlueprint(exam, pool, size, rand, mix);

  return orderForm(picked, rand, shuffleOptions);
}

/** Builds a form from a fixed list of items (retry mistakes, review queue, shared challenges). */
export function formFromItems(items: BankItem[], seed: number, { shuffleItems = true, shuffleOptions = true } = {}): Form {
  const rand = mulberry32(seed);
  return orderForm(shuffleItems ? items : items.slice(), rand, shuffleOptions, !shuffleItems);
}

function orderForm(picked: BankItem[], rand: () => number, shuffleOptions: boolean, keepOrder = false): Form {
  const ordered = keepOrder ? picked : shuffle(picked, rand);
  const optionOrder: Record<string, string[]> = {};
  for (const q of ordered) {
    const ids = q.options.map((o) => o.id);
    optionOrder[q.id] = shuffleOptions && SHUFFLED_TYPES.has(q.type) ? shuffle(ids, rand) : ids;
  }
  return { itemIds: ordered.map((q) => q.id), optionOrder };
}

/**
 * Picks n items from candidates so their difficulties follow `mix` as
 * closely as the candidates allow: each draw goes to the difficulty that is
 * furthest behind its target share, falling back to whatever is left.
 */
export function pickByDifficulty<T extends Pickable>(candidates: T[], n: number, rand: () => number, mix: Mix): T[] {
  const byLevel: Record<number, T[]> = { 1: [], 2: [], 3: [], 4: [] };
  for (const q of shuffle(candidates, rand)) (byLevel[q.difficulty] ?? byLevel[2]).push(q);
  const got: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  const out: T[] = [];
  while (out.length < n) {
    const levels = [1, 2, 3, 4].filter((d) => byLevel[d].length);
    if (!levels.length) break;
    const drawn = out.length + 1;
    // Deficit vs. target, with a random tie-breaker so small forms vary.
    levels.sort((a, b) => ((got[a] - mixWeight(mix, a) * drawn) - (got[b] - mixWeight(mix, b) * drawn)) || (rand() - 0.5));
    const pickLevel = mixWeight(mix, levels[0]) > 0 ? levels[0] : levels.find((d) => mixWeight(mix, d) > 0) ?? levels[0];
    out.push(byLevel[pickLevel].shift()!);
    got[pickLevel] += 1;
  }
  return out;
}

function pickByBlueprint(exam: ExamConfig, pool: BankItem[], size: number, rand: () => number, mix: Mix): BankItem[] {
  const need = skillAllocation(exam, size);
  const chosen = new Set<string>();
  const out: BankItem[] = [];
  const take = (q: BankItem) => { chosen.add(q.id); out.push(q); };

  const shortfall: { domain: number; missing: number }[] = [];
  for (const skill of exam.skills) {
    const candidates = pool.filter((q) => q.skill === skill.id);
    const n = need[skill.id];
    pickByDifficulty(candidates, n, rand, mix).forEach(take);
    if (candidates.length < n) shortfall.push({ domain: skill.domain, missing: n - candidates.length });
  }

  // A thin skill borrows from its own domain first, then from anywhere.
  for (const { domain, missing } of shortfall) {
    let left = missing;
    const sameDomain = pool.filter((x) => x.domain === domain && !chosen.has(x.id));
    for (const q of pickByDifficulty(sameDomain, left, rand, mix)) { take(q); left -= 1; }
    const anywhere = pool.filter((x) => !chosen.has(x.id));
    for (const q of pickByDifficulty(anywhere, left, rand, mix)) { take(q); left -= 1; }
  }
  return out.slice(0, size);
}

// Drills: spread items across the chosen skills in blueprint proportion, so a
// drill on one domain still covers all of its skills.
function pickProportional(
  exam: ExamConfig, pool: BankItem[], size: number, rand: () => number, mix: Mix,
  skillIds: string[] | null, domains: number[] | null,
): BankItem[] {
  const skills = exam.skills.filter((s) => (skillIds ? skillIds.includes(s.id) : domains!.includes(s.domain)));
  const weightSum = skills.reduce((a, s) => a + s.weight, 0) || 1;
  // Order each skill's items by the difficulty mix so the first ones drawn follow it.
  const bySkill = Object.fromEntries(skills.map((s) => {
    const items = pool.filter((q) => q.skill === s.id);
    return [s.id, pickByDifficulty(items, items.length, rand, mix)];
  }));
  const out: BankItem[] = [];
  const quota = skills.map((s) => ({ id: s.id, want: (s.weight / weightSum) * size, got: 0 }));
  while (out.length < size) {
    const open = quota.filter((x) => bySkill[x.id].length > 0);
    if (!open.length) break;
    open.sort((a, b) => (a.got - a.want) - (b.got - b.want));
    const next = open[0];
    out.push(bySkill[next.id].shift()!);
    next.got += 1;
  }
  return out;
}
