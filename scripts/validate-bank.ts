// Validates exam content against the question template and each blueprint.
//
//   npm run validate            every exam under content/exams
//   npm run validate -- ccdv-f  one exam
//
// Exits non-zero on any error; prints warnings for item-writing smells.

import { loadAllExams, loadExamBundle } from '@/lib/content/load';
import { coverageReport, validateQuestions } from '@/lib/content/validate';

const only = process.argv[2];
const bundles = only ? [loadExamBundle(only)] : loadAllExams();
let totalErrors = 0;

for (const { config: exam, questions, imported, study } of bundles) {
  console.log(`\n${exam.code} — ${exam.title}`);
  const { errors, warnings } = validateQuestions(exam, questions);
  for (const w of warnings) console.warn(`  warn  ${w}`);
  for (const e of errors) console.error(`  error ${e}`);

  console.log(`  Coverage (items per ${exam.itemCount}-item form vs. bank; bank split F/I/A/X):`);
  const report = coverageReport(exam, questions);
  for (const r of report) {
    console.log(`    ${r.ok ? ' ' : '!'} D${r.domain} ${r.skill.padEnd(26)} form ${String(r.perForm).padStart(2)}  bank ${String(r.inBank).padStart(3)}  (${r.byLevel.join('/')})`);
  }
  const short = report.filter((r) => !r.ok);
  if (short.length) errors.push(`${short.length} skill(s) have fewer bank items than a form needs`);

  for (const id of Object.keys(study)) {
    if (!exam.skills.some((s) => s.id === id)) errors.push(`study notes for unknown skill ${id}`);
  }

  if (imported.length) {
    const imp = validateQuestions(exam, imported);
    for (const e of imp.errors) console.error(`  error [imported] ${e}`);
    errors.push(...imp.errors);
    console.log(`  ${imported.length} imported item(s) (kept out of scored mocks)`);
  }
  console.log(`  ${questions.length} questions, ${errors.length} error(s), ${warnings.length} warning(s)`);
  totalErrors += errors.length;
}

process.exit(totalErrors ? 1 : 0);
