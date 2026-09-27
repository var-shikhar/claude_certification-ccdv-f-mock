// Question-bank linting: template checks, blueprint tags and common
// item-writing smells. Shared by `npm run validate`, the seed tests and the
// admin editor, so an item is held to the same rules wherever it's written.

import { skillAllocation, skillById } from '@/lib/engine/blueprint';
import type { ExamConfig, Question } from '@/lib/engine/types';

const ALLOWED_FIELDS = new Set([
  'id', 'domain', 'skill', 'difficulty', 'type', 'select', 'stem', 'options', 'explanation', 'reference', 'source',
  'answerOrder', 'prompts', 'accepted', 'caseId',
]);
const TYPES = ['single', 'multi', 'truefalse', 'order', 'match', 'fill'];
const LETTER_REF = /\b(option|answer|choice)s? [A-F]\b|\([A-F]\)/;

export interface ValidationResult { errors: string[]; warnings: string[] }

/** Checks one item. `where` prefixes every message (defaults to the item id). */
export function validateQuestion(exam: ExamConfig, q: Partial<Question> & Record<string, unknown>, where = String(q?.id ?? 'item')): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const err = (m: string) => errors.push(`${where}: ${m}`);
  const warn = (m: string) => warnings.push(`${where}: ${m}`);

  if (!q || typeof q !== 'object') { err('not an object'); return { errors, warnings }; }
  if (typeof q.id !== 'string' || !/^[A-Z0-9-]+$/.test(q.id)) err('id must be an UPPER-KEBAB string');

  const skill = typeof q.skill === 'string' ? skillById(exam, q.skill) : undefined;
  if (!skill) err(`unknown skill "${q.skill}"`);
  else if (q.domain !== skill.domain) err(`domain ${q.domain} does not match skill domain ${skill.domain}`);

  if (![1, 2, 3, 4].includes(q.difficulty as number)) err('difficulty must be 1, 2, 3 or 4');
  if (!TYPES.includes(q.type as string)) err(`type must be one of ${TYPES.join(', ')}`);
  if (typeof q.stem !== 'string' || q.stem.trim().length < 20) err('stem missing or too short');
  if (typeof q.explanation !== 'string' || q.explanation.trim().length < 20) err('explanation missing or too short');
  for (const k of Object.keys(q)) if (!ALLOWED_FIELDS.has(k)) err(`unknown field "${k}"`);

  const options = Array.isArray(q.options) ? q.options : null;
  if (q.type !== 'fill' && !options) { err('options must be an array'); return { errors, warnings }; }

  if (options) {
    const ids = options.map((o) => o.id);
    if (new Set(ids).size !== ids.length) err('duplicate option ids');
    for (const o of options) {
      if (!/^[A-H]$/.test(o.id)) err(`option id "${o.id}" must be a single letter A-H`);
      if (typeof o.text !== 'string' || !o.text.trim()) err(`option ${o.id} has no text`);
    }
  }
  const correct = options?.filter((o) => o.correct === true) ?? [];
  const needsWhy = q.type === 'single' || q.type === 'multi' || q.type === 'truefalse';
  if (needsWhy && options) {
    for (const o of options) {
      if (typeof o.why !== 'string' || o.why.trim().length < 10) err(`option ${o.id} needs a "why" rationale`);
      if (typeof o.correct !== 'boolean') err(`option ${o.id} must set correct: true|false`);
    }
  }

  switch (q.type) {
    case 'single':
      if (options!.length !== 4) err('single-answer items need exactly 4 options');
      if (correct.length !== 1) err('single-answer items need exactly 1 correct option');
      if (q.select !== 1) err('single-answer items must have select: 1');
      break;
    case 'multi':
      if (options!.length < 5 || options!.length > 6) err('multi-response items need 5 or 6 options');
      if (!Number.isInteger(q.select) || (q.select as number) < 2) err('multi-response items need select >= 2');
      if (correct.length !== q.select) err(`select is ${q.select} but ${correct.length} options are correct`);
      if (!/\((choose|select) (two|three|2|3)\.?\)/i.test(q.stem ?? '')) warn('multi-response stem should say how many to select, e.g. "(Choose two.)"');
      break;
    case 'truefalse':
      if (options!.length !== 2) err('true/false items need exactly 2 options');
      if (correct.length !== 1) err('true/false items need exactly 1 correct option');
      break;
    case 'order': {
      const order = q.answerOrder;
      if (options!.length < 3 || options!.length > 6) err('ordering items need 3 to 6 options');
      if (!Array.isArray(order) || order.length !== options!.length || new Set(order).size !== order.length
        || !order.every((id) => options!.some((o) => o.id === id))) err('answerOrder must list every option id exactly once');
      break;
    }
    case 'match': {
      const prompts = q.prompts;
      if (!Array.isArray(prompts) || prompts.length < 2) { err('matching items need at least 2 prompts'); break; }
      if (new Set(prompts.map((p) => p.id)).size !== prompts.length) err('duplicate prompt ids');
      for (const p of prompts) {
        if (!p.text?.trim()) err(`prompt ${p.id} has no text`);
        if (!options!.some((o) => o.id === p.answer)) err(`prompt ${p.id} answers unknown option "${p.answer}"`);
      }
      break;
    }
    case 'fill':
      if (!Array.isArray(q.accepted) || !q.accepted.length || q.accepted.some((a) => typeof a !== 'string' || !a.trim())) {
        err('fill-in items need a non-empty "accepted" list');
      }
      break;
  }

  // Options are shuffled at delivery, so explanations must not point at letters.
  if (LETTER_REF.test(q.explanation ?? '') || options?.some((o) => LETTER_REF.test(o.why ?? ''))) {
    warn('refers to an option by letter; options are shuffled, so describe it instead');
  }
  if (/\ball of the above\b|\bnone of the above\b/i.test(options?.map((o) => o.text).join(' ') ?? '')) {
    warn('avoid "all/none of the above" options');
  }
  return { errors, warnings };
}

export function validateQuestions(exam: ExamConfig, questions: Question[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const seen = new Set<string>();
  for (const [i, q] of questions.entries()) {
    const where = q?.id ? `${q.id}` : `item #${i}`;
    if (seen.has(q.id)) errors.push(`${where}: duplicate id`);
    seen.add(q.id);
    const r = validateQuestion(exam, q as Question & Record<string, unknown>, where);
    errors.push(...r.errors);
    warnings.push(...r.warnings);
  }

  // Longest-option-is-correct bias across single-answer items.
  const singles = questions.filter((q) => q?.type === 'single' && q.options?.length === 4);
  if (singles.length >= 10) {
    const longestCorrect = singles.filter((q) => {
      const max = Math.max(...q.options.map((o) => o.text.length));
      return q.options.find((o) => o.correct)?.text.length === max;
    }).length;
    const ratio = longestCorrect / singles.length;
    if (ratio > 0.45) warnings.push(`correct answer is the longest option in ${(ratio * 100).toFixed(0)}% of single-answer items (aim for < 45%)`);
  }
  return { errors, warnings };
}

export interface CoverageRow { skill: string; domain: number; perForm: number; inBank: number; byLevel: number[]; ok: boolean }

export function coverageReport(exam: ExamConfig, questions: Pick<Question, 'skill' | 'difficulty'>[]): CoverageRow[] {
  const need = skillAllocation(exam);
  return exam.skills.map((s) => {
    const mine = questions.filter((q) => q.skill === s.id);
    const byLevel = [1, 2, 3, 4].map((d) => mine.filter((q) => q.difficulty === d).length);
    return { skill: s.id, domain: s.domain, perForm: need[s.id], inBank: mine.length, byLevel, ok: mine.length >= need[s.id] };
  });
}
