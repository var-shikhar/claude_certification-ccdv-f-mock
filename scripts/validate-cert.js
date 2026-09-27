#!/usr/bin/env node
// Validates one of the additional certification datasets under data/<id>/
// (for example data/ccar-f/) with the same checks as the main CCDV-F bank.
//
//   node scripts/validate-cert.js ccar-f              validate the whole dataset + coverage
//   node scripts/validate-cert.js ccar-f --sync       also (re)list questions/*.json and study/*.json in exam.json
//   node scripts/validate-cert.js ccar-f path/to/file.json   validate one file against that exam's blueprint
//
// It does not touch data/exam.json or the existing scripts.

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateQuestions, coverageReport } from './validate-bank.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [id, ...rest] = process.argv.slice(2);
if (!id) { console.error('usage: node scripts/validate-cert.js <exam-id> [--sync] [file.json]'); process.exit(2); }

const dir = path.join(ROOT, 'data', id);
const examPath = path.join(dir, 'exam.json');
const exam = JSON.parse(readFileSync(examPath, 'utf8'));
const sync = rest.includes('--sync');
const target = rest.find((a) => a !== '--sync');

if (sync) {
  const list = (sub) => (existsSync(path.join(dir, sub)) ? readdirSync(path.join(dir, sub)) : [])
    .filter((f) => f.endsWith('.json')).sort((a, b) => (a === 'official-samples.json' ? -1 : b === 'official-samples.json' ? 1 : a.localeCompare(b)))
    .map((f) => `${sub}/${f}`);
  exam.questionFiles = list('questions');
  exam.studyFiles = list('study');
  exam.importedFiles = list('imported');
  writeFileSync(examPath, JSON.stringify(exam, null, 2) + '\n');
  console.log(`${id}: ${exam.questionFiles.length} question files, ${exam.studyFiles.length} study files listed in exam.json`);
}

// Blueprint sanity: skill weights add up to their domain weights, domains to 100.
const errors = [];
const total = exam.skills.reduce((a, s) => a + s.weight, 0);
if (Math.abs(total - 100) > 1e-9) errors.push(`skill weights sum to ${total}, not 100`);
for (const d of exam.domains) {
  const sum = exam.skills.filter((s) => s.domain === d.id).reduce((a, s) => a + s.weight, 0);
  if (Math.abs(sum - d.weight) > 1e-9) errors.push(`domain ${d.id} skills sum to ${sum}, domain weight is ${d.weight}`);
}

const read = (f) => JSON.parse(readFileSync(path.isAbsolute(f) ? f : path.join(dir, f), 'utf8'));
const questions = target ? read(path.resolve(target)) : exam.questionFiles.flatMap(read);
const study = target ? null : Object.assign({}, ...exam.studyFiles.map(read));

const res = validateQuestions(exam, questions);
errors.push(...res.errors);
for (const w of res.warnings) console.warn(`warn  ${w}`);

if (!target) {
  console.log(`\nCoverage for ${exam.code} (items per ${exam.itemCount}-item form vs. bank; bank split F/I/A/X):`);
  for (const r of coverageReport(exam, questions)) {
    console.log(`  ${r.ok ? ' ' : '!'} D${r.domain} ${r.skill.padEnd(26)} form ${String(r.perForm).padStart(2)}  bank ${String(r.inBank).padStart(3)}  (${r.byLevel.join('/')})`);
    if (!r.ok) errors.push(`${r.skill}: bank has ${r.inBank} item(s) but a form needs ${r.perForm}`);
  }
  for (const s of exam.skills) if (!study[s.id]) console.warn(`warn  no study notes for skill ${s.id}`);
  for (const k of Object.keys(study)) if (!exam.skills.some((s) => s.id === k)) errors.push(`study notes for unknown skill ${k}`);
}

for (const e of errors) console.error(`error ${e}`);
console.log(`\n${exam.code}: ${questions.length} questions, ${errors.length} error(s), ${res.warnings.length} warning(s)`);
process.exit(errors.length ? 1 : 0);
