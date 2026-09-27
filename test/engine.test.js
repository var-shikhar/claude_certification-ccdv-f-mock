import { test } from 'node:test';
import assert from 'node:assert/strict';

import { skillAllocation as allocate } from '../src/engine/blueprint.js';
import { assembleForm as assemble, pickByDifficulty } from '../src/engine/assemble.js';
import { isCorrect, scoreAttempt as score, toScaled as scale } from '../src/engine/scoring.js';
import { mulberry32 } from '../src/engine/random.js';
import { loadExam, validateQuestions, coverageReport } from '../scripts/validate-bank.js';

const { exam: EXAM, questions: QUESTIONS, study: STUDY } = loadExam();
const { skills: SKILLS, domains: DOMAINS, difficultyModes: DIFFICULTY_MODES } = EXAM;
const QUESTION_MAP = new Map(QUESTIONS.map((q) => [q.id, q]));
const skillAllocation = (total) => allocate(EXAM, total);
const assembleForm = (bank, opts) => assemble(EXAM, bank, opts);
const scoreAttempt = (items, responses) => score(EXAM, items, responses);
const toScaled = (raw) => scale(EXAM, raw);
const CUT_RAW = EXAM.scale.cutRaw;

test('blueprint weights sum to 100 and domains match their skills', () => {
  const total = SKILLS.reduce((a, s) => a + s.weight, 0);
  assert.ok(Math.abs(total - 100) < 1e-9);
  for (const d of DOMAINS) {
    const sum = SKILLS.filter((s) => s.domain === d.id).reduce((a, s) => a + s.weight, 0);
    assert.ok(Math.abs(sum - d.weight) < 1e-9, `domain ${d.id}: ${sum} vs ${d.weight}`);
  }
});

test('skill allocation fills exactly 53 items and gives every skill at least one', () => {
  const alloc = skillAllocation();
  assert.equal(Object.values(alloc).reduce((a, b) => a + b, 0), EXAM.itemCount);
  for (const s of SKILLS) assert.ok(alloc[s.id] >= 1, s.id);
});

test('question bank passes schema validation', () => {
  const { errors } = validateQuestions(EXAM, QUESTIONS);
  assert.deepEqual(errors, []);
  for (const row of coverageReport(EXAM, QUESTIONS)) assert.ok(row.ok, `${row.skill} has too few items`);
});

test('every question file and study file listed in exam.json is used', () => {
  assert.ok(EXAM.questionFiles.length > 0);
  for (const id of Object.keys(STUDY)) assert.ok(SKILLS.some((s) => s.id === id), `study notes for unknown skill ${id}`);
});

test('a full form has 53 unique items in blueprint proportions', () => {
  const alloc = skillAllocation();
  for (const seed of [1, 2, 3, 42, 999]) {
    const form = assembleForm(QUESTIONS, { seed });
    assert.equal(form.itemIds.length, EXAM.itemCount);
    assert.equal(new Set(form.itemIds).size, EXAM.itemCount);
    const counts = {};
    for (const id of form.itemIds) {
      const q = QUESTION_MAP.get(id);
      counts[q.skill] = (counts[q.skill] ?? 0) + 1;
    }
    for (const s of SKILLS) assert.equal(counts[s.id] ?? 0, alloc[s.id], `${s.id} seed ${seed}`);
  }
});

test('forms are reproducible from their seed and differ across seeds', () => {
  const a = assembleForm(QUESTIONS, { seed: 7 });
  const b = assembleForm(QUESTIONS, { seed: 7 });
  const c = assembleForm(QUESTIONS, { seed: 8 });
  assert.deepEqual(a, b);
  assert.notDeepEqual(a.itemIds, c.itemIds);
});

test('option order is a permutation of each item\'s option ids', () => {
  const form = assembleForm(QUESTIONS, { seed: 11 });
  for (const id of form.itemIds) {
    const q = QUESTION_MAP.get(id);
    assert.deepEqual([...form.optionOrder[id]].sort(), q.options.map((o) => o.id).sort());
  }
});

test('harder difficulty modes draw harder forms', () => {
  const avg = (difficulty) => {
    let sum = 0, n = 0;
    for (let seed = 1; seed <= 20; seed++) {
      for (const id of assembleForm(QUESTIONS, { seed, difficulty }).itemIds) { sum += QUESTION_MAP.get(id).difficulty; n++; }
    }
    return sum / n;
  };
  const easy = avg('easy');
  const standard = avg('standard');
  const hard = avg('hard');
  const expert = avg('expert');
  assert.ok(easy < standard && standard < hard && hard <= expert, `${easy} ${standard} ${hard} ${expert}`);
  for (const key of Object.keys(DIFFICULTY_MODES)) {
    assert.equal(assembleForm(QUESTIONS, { seed: 5, difficulty: key }).itemIds.length, EXAM.itemCount);
  }
});

test('pickByDifficulty follows the mix when enough items exist', () => {
  const items = [];
  for (let i = 0; i < 30; i++) items.push({ id: `x${i}`, difficulty: (i % 3) + 1 });
  const out = pickByDifficulty(items, 10, mulberry32(3), { 1: 0, 2: 0.2, 3: 0.8 });
  assert.equal(out.length, 10);
  assert.equal(out.filter((q) => q.difficulty === 1).length, 0);
  assert.equal(out.filter((q) => q.difficulty === 3).length, 8);
});

test('practice drills stay inside the chosen domains', () => {
  const form = assembleForm(QUESTIONS, { seed: 3, total: 15, domains: [7, 8] });
  assert.equal(form.itemIds.length, 15);
  for (const id of form.itemIds) assert.ok([7, 8].includes(QUESTION_MAP.get(id).domain));
});

test('grading is all-or-nothing for multiple-response items', () => {
  const q = { options: [{ id: 'A', correct: true }, { id: 'B', correct: true }, { id: 'C', correct: false }, { id: 'D', correct: false }, { id: 'E', correct: false }] };
  assert.equal(isCorrect(q, ['A', 'B']), true);
  assert.equal(isCorrect(q, ['B', 'A']), true);
  assert.equal(isCorrect(q, ['A']), false);
  assert.equal(isCorrect(q, ['A', 'B', 'C']), false);
  assert.equal(isCorrect(q, []), false);
});

test('scaled score spans 100–1000 and puts the cut at 720', () => {
  assert.equal(toScaled(0), EXAM.scale.min);
  assert.equal(toScaled(1), EXAM.scale.max);
  assert.equal(toScaled(CUT_RAW), EXAM.scale.passing);
  assert.ok(toScaled(CUT_RAW - 0.01) < EXAM.scale.passing);
  for (let p = 0; p < 1; p += 0.05) assert.ok(toScaled(p) <= toScaled(p + 0.05));
});

test('scoreAttempt weights harder items more and reports domains', () => {
  const mk = (id, difficulty, domain) => ({
    id, difficulty, domain, skill: SKILLS.find((s) => s.domain === domain).id,
    options: [{ id: 'A', correct: true }, { id: 'B', correct: false }, { id: 'C', correct: false }, { id: 'D', correct: false }],
  });
  const items = [mk('e', 1, 1), mk('h', 3, 2)];
  const hardRight = scoreAttempt(items, { h: ['A'], e: ['B'] });
  const easyRight = scoreAttempt(items, { e: ['A'], h: ['B'] });
  assert.ok(hardRight.scaled > easyRight.scaled);
  assert.equal(hardRight.correctCount, 1);
  assert.deepEqual(hardRight.byDomain.map((d) => [d.id, d.percent]), [[1, 0], [2, 100]]);

  const perfect = scoreAttempt(items, { e: ['A'], h: ['A'] });
  assert.equal(perfect.scaled, 1000);
  assert.equal(perfect.passed, true);
  const blank = scoreAttempt(items, {});
  assert.equal(blank.scaled, 100);
  assert.equal(blank.passed, false);
  assert.equal(blank.answeredCount, 0);
});
