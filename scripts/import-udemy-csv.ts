// Converts Udemy practice-test CSVs into an imported question pool.
//
//   npm run import:csv -- <exam-id> <set-name> <file.csv> [more.csv ...]
//
// Writes content/exams/<exam-id>/imported/<set-name>.json; run `npm run db:seed`
// afterwards. Admins can do the same from the admin area without the CLI.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { CONTENT_ROOT, loadExamBundle } from '@/lib/content/load';
import { convertUdemyCsv, parseCsv } from '@/lib/content/csv';

const [examId, setName, ...files] = process.argv.slice(2);
if (!examId || !setName || !files.length) {
  console.error('usage: npm run import:csv -- <exam-id> <set-name> <file.csv> [more.csv ...]');
  process.exit(1);
}

const { config, dir } = loadExamBundle(examId);
const hintsFile = path.join(dir, 'skill-hints.json');
const hints = existsSync(hintsFile) ? JSON.parse(readFileSync(hintsFile, 'utf8')) : {};
const records = files.flatMap((f) => parseCsv(readFileSync(f, 'utf8')));
const { items, skipped } = convertUdemyCsv(config, records, { setName, hints });
for (const s of skipped) console.warn(`skip: ${s}`);

const outDir = path.join(CONTENT_ROOT, examId, 'imported');
mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, `${setName}.json`);
writeFileSync(out, JSON.stringify(items.map((q) => ({ ...q, source: `Imported set "${setName}" (Udemy CSV export)` })), null, 2) + '\n');
console.log(`${items.length} items written to ${out}. Run: npm run db:seed -- ${examId}`);
