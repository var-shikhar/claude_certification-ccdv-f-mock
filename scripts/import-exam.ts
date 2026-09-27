// Brings an exam folder in the classic layout (exam.json + questions/ +
// study/ + optional imported/) into content/exams/<id>/, after validating it.
//
//   npm run import:exam -- <source-root> <exam-id> [<exam-id> ...] [--force]
//
// <source-root> contains one folder per exam (for example a checkout's
// data/ directory). Nothing is written if any exam has validation errors,
// unless --force is given. Run `npm run db:seed` afterwards.

import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { CONTENT_ROOT, loadExamBundle } from '@/lib/content/load';
import { coverageReport, validateQuestions } from '@/lib/content/validate';

const args = process.argv.slice(2);
const force = args.includes('--force');
const [sourceRoot, ...ids] = args.filter((a) => a !== '--force');
if (!sourceRoot || !ids.length) {
  console.error('usage: npm run import:exam -- <source-root> <exam-id> [<exam-id> ...] [--force]');
  process.exit(1);
}

const ACCENTS = ['#b5541c', '#7a3e1d', '#e0a31a', '#c2410c', '#a16207'];
let failed = false;
const ready: string[] = [];

for (const id of ids) {
  const bundle = loadExamBundle(id, path.resolve(sourceRoot));
  const { config } = bundle;
  const { errors, warnings } = validateQuestions(config, bundle.questions);
  const coverage = coverageReport(config, bundle.questions);
  const short = coverage.filter((r) => !r.ok);
  console.log(`\n${config.code}: ${bundle.questions.length} questions, ${Object.keys(bundle.study).length} study notes, ${errors.length} errors, ${warnings.length} warnings`);
  for (const e of errors.slice(0, 15)) console.log(`  error ${e}`);
  if (errors.length > 15) console.log(`  … ${errors.length - 15} more errors`);
  for (const r of short) console.log(`  ! ${r.skill}: ${r.inBank} in bank, ${r.perForm} needed per form`);
  if (errors.length || short.length) failed = true;
  else ready.push(id);
}

if (failed && !force) {
  console.error('\nNothing imported: fix the errors above or pass --force.');
  process.exit(1);
}

for (const [i, id] of (force ? ids : ready).entries()) {
  const src = path.join(path.resolve(sourceRoot), id);
  const dest = path.join(CONTENT_ROOT, id);
  const raw = JSON.parse(readFileSync(path.join(src, 'exam.json'), 'utf8')) as Record<string, unknown>;
  delete raw.questionFiles;
  delete raw.studyFiles;
  delete raw.importedFiles;
  const domains = (raw.domains as unknown[]).length;
  const scale = raw.scale as { min: number; max: number; passing: number };
  raw.category ??= 'certification';
  raw.meta ??= {
    tagline: `Blueprint-accurate mocks for the ${raw.title as string}.`,
    description: `${raw.itemCount as number} scenario questions across ${domains} domains in ${raw.timeLimitMinutes as number} minutes, scored ${scale.min} to ${scale.max.toLocaleString('en')} with a ${scale.passing} pass mark: the same format as the official exam. Every option is explained.`,
    tags: ['AI', 'Claude', 'Certification'],
    level: String(raw.code).endsWith('-P') ? 'Advanced' : 'Intermediate',
    accent: ACCENTS[i % ACCENTS.length],
  };

  if (existsSync(dest)) rmSync(dest, { recursive: true });
  mkdirSync(dest, { recursive: true });
  const ordered = { id: raw.id, code: raw.code, title: raw.title, vendor: raw.vendor, category: raw.category, meta: raw.meta, ...raw };
  writeFileSync(path.join(dest, 'exam.json'), JSON.stringify(ordered, null, 2) + '\n');
  for (const dir of ['questions', 'study', 'imported']) {
    if (existsSync(path.join(src, dir))) cpSync(path.join(src, dir), path.join(dest, dir), { recursive: true });
  }
  console.log(`imported ${id} → ${path.relative(process.cwd(), dest)}`);
}
console.log('\nNext: npm run db:seed');
