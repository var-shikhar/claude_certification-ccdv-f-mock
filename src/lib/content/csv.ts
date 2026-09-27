// Converts question CSVs in Udemy's practice-test import format into
// certMonkey questions. Used by the admin bulk importer and the CLI script.
//
// The CSV has no per-option rationale, so each option's `why` is generic and
// the set's overall explanation becomes the item explanation. Imported items
// land in the separate "imported" pool: offered in practice, never drawn
// into scored mocks.

import type { ExamConfig, Question } from '@/lib/engine/types';

/** Minimal RFC 4180 parser: quoted fields, doubled quotes, newlines in quotes. */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some((f) => f !== '')) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f !== '')) rows.push(row);
  const [header = [], ...body] = rows;
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h.replace(/^﻿/, '').trim(), (r[i] ?? '').trim()])));
}

/** Picks the skill whose keyword hints (or name words) best match the text; the domain's first skill is the fallback. */
function pickSkill(exam: ExamConfig, domainId: number, text: string, hints: Record<string, string>): string {
  const skills = exam.skills.filter((s) => s.domain === domainId);
  let best = skills[0];
  let bestScore = 0;
  for (const s of skills) {
    const source = hints[s.id] ?? s.name.toLowerCase().split(/\W+/).filter((w) => w.length > 3).join('|');
    const score = source ? (text.match(new RegExp(source, 'gi')) ?? []).length : 0;
    if (score > bestScore) { best = s; bestScore = score; }
  }
  return best.id;
}

export interface CsvImportResult { items: Question[]; skipped: string[] }

export function convertUdemyCsv(
  exam: ExamConfig,
  records: Record<string, string>[],
  { setName, hints = {} }: { setName: string; hints?: Record<string, string> },
): CsvImportResult {
  const domainByName = new Map(exam.domains.map((d) => [d.name.toLowerCase(), d.id]));
  const items: Question[] = [];
  const skipped: string[] = [];
  const counters: Record<string, number> = {};
  const tag = setName.toUpperCase().replace(/[^A-Z0-9]/g, '');

  for (const r of records) {
    const question = r.Question ?? '';
    const domainName = (r.Domain ?? '').replace(/^D\d+\s+/i, '').toLowerCase();
    const domain = domainByName.get(domainName) ?? (/^\d+$/.test(r.Domain ?? '') ? Number(r.Domain) : undefined);
    if (!domain || !exam.domains.some((d) => d.id === domain)) { skipped.push(`unknown domain "${r.Domain}"`); continue; }

    const options: { n: number; text: string; why?: string }[] = [];
    for (let i = 1; i <= 6; i++) {
      const text = r[`Answer Option ${i}`];
      if (text) options.push({ n: i, text, why: r[`Explanation ${i}`] });
    }
    const keys = new Set((r['Correct Answers'] ?? r['Correct Response'] ?? '').split(/[,\s]+/).filter(Boolean).map(Number));
    if (options.length < 4 || !keys.size) { skipped.push(`malformed item "${question.slice(0, 60)}"`); continue; }
    const multi = keys.size > 1;
    // Single-answer items need exactly 4 options: keep the key and the first
    // three distractors. Multi items need 5–6.
    let opts = options;
    if (!multi && options.length > 4) opts = options.filter((o) => keys.has(o.n)).concat(options.filter((o) => !keys.has(o.n))).slice(0, 4);
    if (multi && options.length < 5) { skipped.push(`multi item with ${options.length} options`); continue; }

    const skill = pickSkill(exam, domain, `${question} ${opts.map((o) => o.text).join(' ')}`, hints);
    const code = skill.toUpperCase().replace(/-/g, '');
    counters[skill] = (counters[skill] ?? 0) + 1;
    const stem = multi && !/\((choose|select) /i.test(question)
      ? `${question} (Choose ${['', '', 'two', 'three'][keys.size] ?? keys.size}.)`
      : question;
    items.push({
      id: `IMP-${tag}-${code}-${String(counters[skill]).padStart(3, '0')}`,
      domain,
      skill,
      difficulty: 2,
      type: multi ? 'multi' : 'single',
      select: keys.size,
      stem,
      options: opts.map((o, i) => ({
        id: 'ABCDEF'[i],
        correct: keys.has(o.n),
        text: o.text,
        why: o.why || (keys.has(o.n) ? "Marked correct in the imported set's answer key." : 'Not the keyed answer in the imported set; see the explanation.'),
      })),
      explanation: r['Overall Explanation'] || 'No explanation was provided in the imported set.',
    });
  }
  return { items, skipped };
}
