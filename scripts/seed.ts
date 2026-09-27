// Loads content/exams/* into the database.
//
//   npm run db:seed              upsert every exam folder
//   npm run db:seed -- ccdv-f    just one exam
//
// Safe to re-run: exams and study notes are upserted, and questions are
// upserted only while they still come from the seed files. Once a question
// has been edited in the admin editor (source != 'seed') the seed leaves it
// alone, so content fixes made in the app are never overwritten.

import 'dotenv/config';
import { and, eq, sql } from 'drizzle-orm';
import { db, usingPglite } from '@/db';
import { caseStudy, exam, question, studyNote } from '@/db/schema';
import { loadAllExams, loadExamBundle, type ContentQuestion } from '@/lib/content/load';

const BATCH = 200;

function toRow(examId: string, q: ContentQuestion, pool: 'bank' | 'imported') {
  return {
    id: q.id,
    examId,
    pool,
    status: 'published' as const,
    domain: q.domain,
    skill: q.skill,
    difficulty: q.difficulty,
    type: q.type,
    select: q.select ?? 1,
    stem: q.stem,
    options: q.options ?? [],
    answerOrder: q.answerOrder ?? null,
    prompts: q.prompts ?? null,
    accepted: q.accepted ?? null,
    explanation: q.explanation,
    reference: q.reference ?? null,
    caseId: q.caseId ?? null,
    source: 'seed',
    provenance: q.source ?? null,
  };
}

async function seedExam(id: string, sortOrder: number) {
  const bundle = loadExamBundle(id);
  const { config } = bundle;

  await db.insert(exam).values({
    id: config.id,
    code: config.code,
    title: config.title,
    vendor: bundle.vendor,
    category: bundle.category,
    config,
    meta: bundle.meta,
    sortOrder,
  }).onConflictDoUpdate({
    target: exam.id,
    set: { code: config.code, title: config.title, vendor: bundle.vendor, category: bundle.category, config, meta: bundle.meta, updatedAt: new Date() },
  });

  for (const s of bundle.scenarios) {
    const caseId = `${config.id}:${s.id}`;
    await db.insert(caseStudy).values({ id: caseId, examId: config.id, title: s.title, scenario: s.scenario })
      .onConflictDoUpdate({ target: caseStudy.id, set: { title: s.title, scenario: s.scenario } });
  }

  const rows = [
    ...bundle.questions.map((q) => toRow(config.id, q, 'bank')),
    ...bundle.imported.map((q) => toRow(config.id, q, 'imported')),
  ];
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    await db.insert(question).values(chunk).onConflictDoUpdate({
      target: question.id,
      // Only refresh rows the seed still owns.
      setWhere: eq(question.source, 'seed'),
      set: Object.fromEntries(
        ['pool', 'domain', 'skill', 'difficulty', 'type', 'select', 'stem', 'options', 'answerOrder', 'prompts', 'accepted', 'explanation', 'reference', 'caseId', 'provenance']
          .map((k) => [k, sql.raw(`excluded.${k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)}`)]),
      ),
    });
  }

  for (const [skillId, content] of Object.entries(bundle.study)) {
    await db.insert(studyNote).values({ examId: config.id, skillId, content })
      .onConflictDoUpdate({ target: [studyNote.examId, studyNote.skillId], set: { content, updatedAt: new Date() } });
  }

  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(question)
    .where(and(eq(question.examId, config.id), eq(question.status, 'published')));
  console.log(`  ${config.code.padEnd(8)} ${bundle.questions.length} bank + ${bundle.imported.length} imported items, ${Object.keys(bundle.study).length} study notes → ${count} published in DB`);
}

async function main() {
  const only = process.argv[2];
  const ids = only ? [only] : loadAllExams().map((b) => b.config.id);
  console.log(`Seeding ${ids.length} exam(s) into ${usingPglite() ? 'local PGlite' : 'Neon'}:`);
  for (const [i, id] of ids.entries()) await seedExam(id, i);
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
