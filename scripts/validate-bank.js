#!/usr/bin/env node
// Validates question files against the question template and the exam
// blueprint.
//
//   node scripts/validate-bank.js                       whole bank (data/exam.json)
//   node scripts/validate-bank.js data/questions/x.json one file
//
// Exits non-zero on any error; prints warnings for item-writing smells.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { skillById, skillAllocation } from '../src/engine/blueprint.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function loadExam() {
  const dir = path.join(ROOT, 'data');
  const exam = JSON.parse(readFileSync(path.join(dir, 'exam.json'), 'utf8'));
  const read = (f) => JSON.parse(readFileSync(path.join(dir, f), 'utf8'));
  const questions = exam.questionFiles.flatMap(read);
  const study = Object.assign({}, ...exam.studyFiles.map(read));
  const imported = (exam.importedFiles ?? []).flatMap(read);
  return { exam, questions, study, imported };
}

export function validateQuestions(exam, questions) {
  const errors = [];
  const warnings = [];
  const seen = new Set();

  for (const [i, q] of questions.entries()) {
    const where = q?.id ? `${q.id}` : `item #${i}`;
    const err = (m) => errors.push(`${where}: ${m}`);

    if (!q || typeof q !== 'object') { err('not an object'); continue; }
    if (typeof q.id !== 'string' || !/^[A-Z0-9-]+$/.test(q.id)) err('id must be an UPPER-KEBAB string');
    if (seen.has(q.id)) err('duplicate id');
    seen.add(q.id);

    const skill = skillById(exam, q.skill);
    if (!skill) err(`unknown skill "${q.skill}"`);
    else if (q.domain !== skill.domain) err(`domain ${q.domain} does not match skill domain ${skill.domain}`);

    if (![1, 2, 3, 4].includes(q.difficulty)) err('difficulty must be 1, 2, 3 or 4');
    if (!['single', 'multi'].includes(q.type)) err('type must be "single" or "multi"');
    if (typeof q.stem !== 'string' || q.stem.trim().length < 20) err('stem missing or too short');
    if (typeof q.explanation !== 'string' || q.explanation.trim().length < 20) err('explanation missing or too short');

    const allowed = new Set(['id', 'domain', 'skill', 'difficulty', 'type', 'select', 'stem', 'options', 'explanation', 'reference', 'source']);
    for (const k of Object.keys(q)) if (!allowed.has(k)) err(`unknown field "${k}"`);

    if (!Array.isArray(q.options)) { err('options must be an array'); continue; }
    const correct = q.options.filter((o) => o.correct === true);
    const ids = q.options.map((o) => o.id);
    if (new Set(ids).size !== ids.length) err('duplicate option ids');
    for (const o of q.options) {
      if (!/^[A-F]$/.test(o.id)) err(`option id "${o.id}" must be A-F`);
      if (typeof o.text !== 'string' || !o.text.trim()) err(`option ${o.id} has no text`);
      if (typeof o.why !== 'string' || o.why.trim().length < 10) err(`option ${o.id} needs a "why" rationale`);
      if (typeof o.correct !== 'boolean') err(`option ${o.id} must set correct: true|false`);
    }

    if (q.type === 'single') {
      if (q.options.length !== 4) err('single-answer items need exactly 4 options');
      if (correct.length !== 1) err('single-answer items need exactly 1 correct option');
      if (q.select !== 1) err('single-answer items must have select: 1');
    } else if (q.type === 'multi') {
      if (q.options.length < 5 || q.options.length > 6) err('multi-response items need 5 or 6 options');
      if (!Number.isInteger(q.select) || q.select < 2) err('multi-response items need select >= 2');
      if (correct.length !== q.select) err(`select is ${q.select} but ${correct.length} options are correct`);
      if (!/\((choose|select) (two|three|2|3)\.?\)/i.test(q.stem)) {
        warnings.push(`${where}: multi-response stem should say how many to select, e.g. "(Choose two.)"`);
      }
    }

    // Options are shuffled at delivery, so explanations must not point at letters.
    const letterRef = /\b(option|answer|choice)s? [A-F]\b|\([A-F]\)/;
    if (letterRef.test(q.explanation) || q.options.some((o) => letterRef.test(o.why))) {
      warnings.push(`${where}: refers to an option by letter; options are shuffled, so describe it instead`);
    }

    if (/\ball of the above\b|\bnone of the above\b/i.test(q.options.map((o) => o.text).join(' '))) {
      warnings.push(`${where}: avoid "all/none of the above" options`);
    }
  }

  // Longest-option-is-correct bias across single-answer items.
  const singles = questions.filter((q) => q?.type === 'single' && Array.isArray(q.options) && q.options.length === 4);
  if (singles.length >= 10) {
    const longestCorrect = singles.filter((q) => {
      const max = Math.max(...q.options.map((o) => o.text.length));
      return q.options.find((o) => o.correct)?.text.length === max;
    }).length;
    const ratio = longestCorrect / singles.length;
    if (ratio > 0.45) {
      warnings.push(`correct answer is the longest option in ${(ratio * 100).toFixed(0)}% of single-answer items (aim for < 45%)`);
    }
  }

  return { errors, warnings };
}

export function coverageReport(exam, questions) {
  const need = skillAllocation(exam);
  return exam.skills.map((s) => {
    const mine = questions.filter((q) => q.skill === s.id);
    const byLevel = [1, 2, 3, 4].map((d) => mine.filter((q) => q.difficulty === d).length);
    return { skill: s.id, domain: s.domain, perForm: need[s.id], inBank: mine.length, byLevel, ok: mine.length >= need[s.id] };
  });
}

async function main() {
  const target = process.argv[2];
  const { exam, questions: bank, imported } = loadExam();

  let questions = bank;
  if (target) {
    const file = path.resolve(target);
    questions = file.endsWith('.json')
      ? JSON.parse(readFileSync(file, 'utf8'))
      : (await import(pathToFileURL(file).href)).default;
  }

  const { errors, warnings } = validateQuestions(exam, questions);
  for (const w of warnings) console.warn(`warn  ${w}`);
  for (const e of errors) console.error(`error ${e}`);

  if (!target) {
    console.log(`\nCoverage for ${exam.code} (items per ${exam.itemCount}-item form vs. bank; bank split F/I/A/X):`);
    const report = coverageReport(exam, questions);
    for (const r of report) {
      console.log(`  ${r.ok ? ' ' : '!'} D${r.domain} ${r.skill.padEnd(26)} form ${String(r.perForm).padStart(2)}  bank ${String(r.inBank).padStart(3)}  (${r.byLevel.join('/')})`);
    }
    const short = report.filter((r) => !r.ok);
    if (short.length) errors.push(`${short.length} skill(s) have fewer bank items than a form needs`);
  }

  if (!target && imported.length) {
    const imp = validateQuestions(exam, imported);
    for (const e of imp.errors) console.error(`error [imported] ${e}`);
    errors.push(...imp.errors);
    console.log(`${imported.length} imported item(s) in ${exam.importedFiles.length} set(s) (kept out of scored mocks)`);
  }
  console.log(`\n${questions.length} questions, ${errors.length} error(s), ${warnings.length} warning(s)`);
  process.exit(errors.length ? 1 : 0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
