// Builds exam forms from the question bank.
//
// A full mock draws items skill-by-skill in the proportions of the official
// blueprint (see skillAllocation), then shuffles item order so domains are
// interleaved the way they are on the live exam. Answer options are shuffled
// per item too; grading is by option id, so shuffling never affects scoring.

import { skillAllocation, difficultyMode } from './blueprint.js';
import { mulberry32, shuffle } from './random.js';

/**
 * @param {object}   exam      exam config (exams/<id>/exam.json)
 * @param {object[]} bank      all questions
 * @param {object}   opts
 * @param {number}   opts.seed
 * @param {number}   [opts.total]      item count (defaults to exam.itemCount)
 * @param {number[]} [opts.domains]    restrict to these domain ids (practice drills)
 * @param {string}   [opts.difficulty='standard']  key of exam.difficultyModes
 * @param {boolean}  [opts.shuffleOptions=true]
 * @returns {{ itemIds: string[], optionOrder: Record<string,string[]> }}
 */
export function assembleForm(exam, bank, { seed, total, domains, difficulty, shuffleOptions = true } = {}) {
  const rand = mulberry32(seed);
  const mix = difficultyMode(exam, difficulty).mix;
  const pool = domains?.length ? bank.filter((q) => domains.includes(q.domain)) : bank;
  const size = Math.min(total ?? exam.itemCount, pool.length);

  let picked;
  if (domains?.length) {
    picked = pickProportional(exam, pool, size, rand, domains, mix);
  } else {
    picked = pickByBlueprint(exam, pool, size, rand, mix);
  }

  const ordered = shuffle(picked, rand);
  const optionOrder = {};
  for (const q of ordered) {
    const ids = q.options.map((o) => o.id);
    optionOrder[q.id] = shuffleOptions ? shuffle(ids, rand) : ids;
  }
  return { itemIds: ordered.map((q) => q.id), optionOrder };
}

/**
 * Picks n items from candidates so their difficulties follow `mix` as
 * closely as the candidates allow: each draw goes to the difficulty that is
 * furthest behind its target share, falling back to whatever is left.
 */
export function pickByDifficulty(candidates, n, rand, mix) {
  const byLevel = { 1: [], 2: [], 3: [], 4: [] };
  for (const q of shuffle(candidates, rand)) (byLevel[q.difficulty] ?? byLevel[2]).push(q);
  const got = { 1: 0, 2: 0, 3: 0, 4: 0 };
  const out = [];
  while (out.length < n) {
    const levels = [1, 2, 3, 4].filter((d) => byLevel[d].length);
    if (!levels.length) break;
    const drawn = out.length + 1;
    // Deficit vs. target, with a random tie-breaker so small forms vary.
    levels.sort((a, b) => ((got[a] - (mix[a] ?? 0) * drawn) - (got[b] - (mix[b] ?? 0) * drawn)) || (rand() - 0.5));
    const pickLevel = (mix[levels[0]] ?? 0) > 0 ? levels[0] : levels.find((d) => (mix[d] ?? 0) > 0) ?? levels[0];
    out.push(byLevel[pickLevel].shift());
    got[pickLevel] += 1;
  }
  return out;
}

function pickByBlueprint(exam, pool, size, rand, mix) {
  const need = skillAllocation(exam, size);
  const chosen = new Set();
  const out = [];
  const take = (q) => { chosen.add(q.id); out.push(q); };

  const shortfall = [];
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

// Practice drills: spread items across the chosen skills in blueprint
// proportion, so a drill on one domain still covers all of its skills.
function pickProportional(exam, pool, size, rand, domains, mix) {
  const skills = exam.skills.filter((s) => domains.includes(s.domain));
  const weightSum = skills.reduce((a, s) => a + s.weight, 0);
  // Order each skill's items by the difficulty mix so the first ones drawn follow it.
  const bySkill = Object.fromEntries(skills.map((s) => {
    const items = pool.filter((q) => q.skill === s.id);
    return [s.id, pickByDifficulty(items, items.length, rand, mix)];
  }));
  const out = [];
  const quota = skills.map((s) => ({ id: s.id, want: (s.weight / weightSum) * size, got: 0 }));
  while (out.length < size) {
    const open = quota.filter((x) => bySkill[x.id].length > 0);
    if (!open.length) break;
    open.sort((a, b) => (a.got - a.want) - (b.got - b.want));
    const next = open[0];
    out.push(bySkill[next.id].shift());
    next.got += 1;
  }
  return out;
}
