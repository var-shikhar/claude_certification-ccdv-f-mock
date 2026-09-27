// Reads exam content from content/exams/<id>/ (Node only; used by the seed
// script, the validator and tests). Each exam folder holds:
//
//   exam.json          blueprint, rules, catalog metadata
//   questions/*.json   reviewed bank (arrays of questions)
//   imported/*.json    optional third-party practice pools
//   study/*.json       study notes keyed by skill id
//
// Every JSON file in those folders is loaded, so adding content only takes
// dropping a file in; no manifest to keep in sync.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { ExamConfig, Question } from '@/lib/engine/types';
import type { ExamCategory, ExamMeta, StudyNote } from '@/db/schema';

export const CONTENT_ROOT = path.resolve(process.cwd(), 'content', 'exams');

export type ContentQuestion = Question & { source?: string };

export interface ExamBundle {
  dir: string;
  config: ExamConfig;
  vendor: string | null;
  category: ExamCategory;
  meta: ExamMeta;
  /** position in the catalog (lower first) */
  sortOrder: number;
  questions: ContentQuestion[];
  imported: ContentQuestion[];
  study: Record<string, StudyNote>;
  scenarios: { id: string; title: string; scenario: string }[];
}

const readJson = <T>(file: string): T => JSON.parse(readFileSync(file, 'utf8')) as T;

function readFolder<T>(dir: string): T[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    // official samples first so they keep a stable, recognisable position
    .sort((a, b) => (a.startsWith('official') ? -1 : b.startsWith('official') ? 1 : a.localeCompare(b)))
    .map((f) => readJson<T>(path.join(dir, f)));
}

const ENGINE_KEYS = [
  'id', 'code', 'title', 'vendor', 'blueprintVersion', 'officialUrl', 'itemCount', 'timeLimitMinutes', 'scale',
  'domains', 'skills', 'difficultyLevels', 'difficultyModes', 'defaultDifficultyMode', 'modes',
] as const;

export function listExamIds(root = CONTENT_ROOT): string[] {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(path.join(root, d.name, 'exam.json')))
    .map((d) => d.name)
    .sort();
}

export function loadExamBundle(id: string, root = CONTENT_ROOT): ExamBundle {
  const dir = path.join(root, id);
  const raw = readJson<Record<string, unknown>>(path.join(dir, 'exam.json'));
  const config = Object.fromEntries(ENGINE_KEYS.filter((k) => k in raw).map((k) => [k, raw[k]])) as unknown as ExamConfig;
  const rawScenarios = Array.isArray(raw.scenarios) ? (raw.scenarios as Record<string, unknown>[]) : [];
  return {
    dir,
    config,
    vendor: (raw.vendor as string) ?? null,
    category: (raw.category as ExamCategory) ?? 'certification',
    meta: (raw.meta as ExamMeta) ?? {},
    sortOrder: Number(raw.sortOrder ?? 100),
    questions: readFolder<ContentQuestion[]>(path.join(dir, 'questions')).flat(),
    imported: readFolder<ContentQuestion[]>(path.join(dir, 'imported')).flat(),
    study: Object.assign({}, ...readFolder<Record<string, StudyNote>>(path.join(dir, 'study'))),
    scenarios: rawScenarios.map((s, i) => ({
      id: String(s.id ?? `S${i + 1}`),
      title: String(s.title ?? s.name ?? `Scenario ${i + 1}`),
      scenario: String(s.scenario ?? s.description ?? s.summary ?? ''),
    })),
  };
}

export const loadAllExams = (root = CONTENT_ROOT) => listExamIds(root).map((id) => loadExamBundle(id, root));
