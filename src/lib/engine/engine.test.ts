import { describe, expect, test } from 'vitest';
import {
  assembleForm, formFromItems, isCorrect, mulberry32, pickByDifficulty, scoreAttempt, skillAllocation, toPublicQuestion, toScaled,
  type Question,
} from '@/lib/engine';
import { loadAllExams, loadExamBundle } from '@/lib/content/load';
import { coverageReport, validateQuestions } from '@/lib/content/validate';

const { config: EXAM, questions: QUESTIONS, study: STUDY } = loadExamBundle('ccdv-f');
const QUESTION_MAP = new Map(QUESTIONS.map((q) => [q.id, q]));
const { skills: SKILLS, domains: DOMAINS, difficultyModes: DIFFICULTY_MODES } = EXAM;

describe('blueprint', () => {
  test('weights sum to 100 and domains match their skills', () => {
    const total = SKILLS.reduce((a, s) => a + s.weight, 0);
    expect(Math.abs(total - 100)).toBeLessThan(1e-9);
    for (const d of DOMAINS) {
      const sum = SKILLS.filter((s) => s.domain === d.id).reduce((a, s) => a + s.weight, 0);
      expect(Math.abs(sum - d.weight), `domain ${d.id}`).toBeLessThan(1e-9);
    }
  });

  test('skill allocation fills exactly itemCount and gives every skill at least one', () => {
    const alloc = skillAllocation(EXAM);
    expect(Object.values(alloc).reduce((a, b) => a + b, 0)).toBe(EXAM.itemCount);
    for (const s of SKILLS) expect(alloc[s.id], s.id).toBeGreaterThanOrEqual(1);
  });
});

describe('content', () => {
  test('every exam under content/exams passes validation and covers its blueprint', () => {
    for (const bundle of loadAllExams()) {
      const { errors } = validateQuestions(bundle.config, bundle.questions);
      expect(errors, bundle.config.code).toEqual([]);
      for (const row of coverageReport(bundle.config, bundle.questions)) expect(row.ok, `${bundle.config.code} ${row.skill}`).toBe(true);
      for (const id of Object.keys(bundle.study)) expect(bundle.config.skills.some((s) => s.id === id), `study notes for ${id}`).toBe(true);
    }
  });

  test('study notes exist for skills', () => {
    expect(Object.keys(STUDY).length).toBeGreaterThan(0);
  });
});

describe('form assembly', () => {
  test('a full form has unique items in blueprint proportions', () => {
    const alloc = skillAllocation(EXAM);
    for (const seed of [1, 2, 3, 42, 999]) {
      const form = assembleForm(EXAM, QUESTIONS, { seed });
      expect(form.itemIds).toHaveLength(EXAM.itemCount);
      expect(new Set(form.itemIds).size).toBe(EXAM.itemCount);
      const counts: Record<string, number> = {};
      for (const id of form.itemIds) {
        const q = QUESTION_MAP.get(id)!;
        counts[q.skill] = (counts[q.skill] ?? 0) + 1;
      }
      for (const s of SKILLS) expect(counts[s.id] ?? 0, `${s.id} seed ${seed}`).toBe(alloc[s.id]);
    }
  });

  test('forms are reproducible from their seed and differ across seeds', () => {
    const a = assembleForm(EXAM, QUESTIONS, { seed: 7 });
    const b = assembleForm(EXAM, QUESTIONS, { seed: 7 });
    const c = assembleForm(EXAM, QUESTIONS, { seed: 8 });
    expect(a).toEqual(b);
    expect(a.itemIds).not.toEqual(c.itemIds);
  });

  test("option order is a permutation of each item's option ids", () => {
    const form = assembleForm(EXAM, QUESTIONS, { seed: 11 });
    for (const id of form.itemIds) {
      const q = QUESTION_MAP.get(id)!;
      expect([...form.optionOrder[id]].sort()).toEqual(q.options.map((o) => o.id).sort());
    }
  });

  test('harder difficulty modes draw harder forms', () => {
    const avg = (difficulty: string) => {
      let sum = 0;
      let n = 0;
      for (let seed = 1; seed <= 20; seed++) {
        for (const id of assembleForm(EXAM, QUESTIONS, { seed, difficulty }).itemIds) { sum += QUESTION_MAP.get(id)!.difficulty; n++; }
      }
      return sum / n;
    };
    const [easy, standard, hard, expert] = ['easy', 'standard', 'hard', 'expert'].map(avg);
    expect(easy).toBeLessThan(standard);
    expect(standard).toBeLessThan(hard);
    expect(hard).toBeLessThanOrEqual(expert);
    for (const key of Object.keys(DIFFICULTY_MODES)) {
      expect(assembleForm(EXAM, QUESTIONS, { seed: 5, difficulty: key }).itemIds).toHaveLength(EXAM.itemCount);
    }
  });

  test('pickByDifficulty follows the mix when enough items exist', () => {
    const items = Array.from({ length: 30 }, (_, i) => ({ id: `x${i}`, difficulty: ((i % 3) + 1) as 1 | 2 | 3 }));
    const out = pickByDifficulty(items, 10, mulberry32(3), { 1: 0, 2: 0.2, 3: 0.8 });
    expect(out).toHaveLength(10);
    expect(out.filter((q) => q.difficulty === 1)).toHaveLength(0);
    expect(out.filter((q) => q.difficulty === 3)).toHaveLength(8);
  });

  test('domain drills stay inside the chosen domains', () => {
    const form = assembleForm(EXAM, QUESTIONS, { seed: 3, total: 15, domains: [7, 8] });
    expect(form.itemIds).toHaveLength(15);
    for (const id of form.itemIds) expect([7, 8]).toContain(QUESTION_MAP.get(id)!.domain);
  });

  test('skill drills stay inside the chosen skills', () => {
    const form = assembleForm(EXAM, QUESTIONS, { seed: 4, total: 8, skills: ['hooks', 'secrets'] });
    expect(form.itemIds.length).toBeGreaterThan(0);
    for (const id of form.itemIds) expect(['hooks', 'secrets']).toContain(QUESTION_MAP.get(id)!.skill);
  });

  test('formFromItems keeps a fixed item set and can preserve order', () => {
    const items = QUESTIONS.slice(0, 6);
    const kept = formFromItems(items, 9, { shuffleItems: false });
    expect(kept.itemIds).toEqual(items.map((q) => q.id));
    const shuffled = formFromItems(items, 9);
    expect([...shuffled.itemIds].sort()).toEqual(items.map((q) => q.id).sort());
  });
});

describe('scoring', () => {
  const opt = (id: string, correct: boolean) => ({ id, text: id, correct });

  test('grading is all-or-nothing for multiple-response items', () => {
    const q = { type: 'multi' as const, options: [opt('A', true), opt('B', true), opt('C', false), opt('D', false), opt('E', false)] };
    expect(isCorrect(q, ['A', 'B'])).toBe(true);
    expect(isCorrect(q, ['B', 'A'])).toBe(true);
    expect(isCorrect(q, ['A'])).toBe(false);
    expect(isCorrect(q, ['A', 'B', 'C'])).toBe(false);
    expect(isCorrect(q, [])).toBe(false);
  });

  test('ordering items need the exact sequence', () => {
    const q = { type: 'order' as const, options: [opt('A', false), opt('B', false), opt('C', false)], answerOrder: ['B', 'C', 'A'] };
    expect(isCorrect(q, ['B', 'C', 'A'])).toBe(true);
    expect(isCorrect(q, ['A', 'B', 'C'])).toBe(false);
    expect(isCorrect(q, ['B', 'C'])).toBe(false);
  });

  test('matching items need every pair right', () => {
    const q = {
      type: 'match' as const,
      options: [opt('A', false), opt('B', false), opt('C', false)],
      prompts: [{ id: 'P1', text: 'one', answer: 'B' }, { id: 'P2', text: 'two', answer: 'A' }],
    };
    expect(isCorrect(q, ['P1=B', 'P2=A'])).toBe(true);
    expect(isCorrect(q, ['P2=A', 'P1=B'])).toBe(true);
    expect(isCorrect(q, ['P1=B', 'P2=C'])).toBe(false);
    expect(isCorrect(q, ['P1=B'])).toBe(false);
  });

  test('fill-in answers ignore case and extra whitespace', () => {
    const q = { type: 'fill' as const, options: [], accepted: ['tool_use', 'tool use'] };
    expect(isCorrect(q, ['  Tool_Use '])).toBe(true);
    expect(isCorrect(q, ['tool   use'])).toBe(true);
    expect(isCorrect(q, ['tool'])).toBe(false);
    expect(isCorrect(q, [''])).toBe(false);
  });

  test('scaled score spans the scale and puts the cut on the passing score', () => {
    expect(toScaled(EXAM, 0)).toBe(EXAM.scale.min);
    expect(toScaled(EXAM, 1)).toBe(EXAM.scale.max);
    expect(toScaled(EXAM, EXAM.scale.cutRaw)).toBe(EXAM.scale.passing);
    expect(toScaled(EXAM, EXAM.scale.cutRaw - 0.01)).toBeLessThan(EXAM.scale.passing);
    for (let p = 0; p < 1; p += 0.05) expect(toScaled(EXAM, p)).toBeLessThanOrEqual(toScaled(EXAM, p + 0.05));
  });

  test('scoreAttempt weights harder items more and reports domains', () => {
    const mk = (id: string, difficulty: 1 | 3, domain: number): Question => ({
      id, difficulty, domain, skill: SKILLS.find((s) => s.domain === domain)!.id, type: 'single', select: 1, stem: '', explanation: '',
      options: [opt('A', true), opt('B', false), opt('C', false), opt('D', false)],
    });
    const items = [mk('e', 1, 1), mk('h', 3, 2)];
    const hardRight = scoreAttempt(EXAM, items, { h: ['A'], e: ['B'] });
    const easyRight = scoreAttempt(EXAM, items, { e: ['A'], h: ['B'] });
    expect(hardRight.scaled).toBeGreaterThan(easyRight.scaled);
    expect(hardRight.correctCount).toBe(1);
    expect(hardRight.byDomain.map((d) => [d.id, d.percent])).toEqual([[1, 0], [2, 100]]);

    const perfect = scoreAttempt(EXAM, items, { e: ['A'], h: ['A'] });
    expect(perfect.scaled).toBe(1000);
    expect(perfect.passed).toBe(true);
    const blank = scoreAttempt(EXAM, items, {});
    expect(blank.scaled).toBe(100);
    expect(blank.passed).toBe(false);
    expect(blank.answeredCount).toBe(0);
  });
});

describe('sanitizing', () => {
  test('public questions never carry keys, rationales or explanations', () => {
    const q = QUESTIONS.find((x) => x.type === 'multi')!;
    const form = assembleForm(EXAM, QUESTIONS, { seed: 1 });
    const pub = toPublicQuestion(q, form.optionOrder[q.id]);
    const json = JSON.stringify(pub);
    expect(json).not.toContain('"correct"');
    expect(json).not.toContain('"why"');
    expect(json).not.toContain(q.explanation);
    expect(pub.options).toHaveLength(q.options.length);
  });

  test('public options follow the delivered order', () => {
    const q = QUESTIONS[0];
    const order = [...q.options.map((o) => o.id)].reverse();
    expect(toPublicQuestion(q, order).options.map((o) => o.id)).toEqual(order);
  });
});
