#!/usr/bin/env node
// Converts question CSVs in Udemy's practice-test import format into this
// app's question JSON, for personal practice with third-party sets.
//
//   node scripts/import-udemy-csv.js <name> <file.csv> [more.csv ...]
//
// Writes data/imported/<name>.json. Imported sets are kept apart from the
// reviewed bank: they are offered as a separate pool in practice drills and
// never drawn into the scored mock exams. Run `npm run sync` afterwards.
//
// The CSV has no per-option rationale, so each option's `why` is generic and
// the set's overall explanation is used as the item explanation.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const exam = JSON.parse(readFileSync('data/exam.json', 'utf8'));

// Reference sets number their domains differently; match by name.
const domainByName = new Map(exam.domains.map((d) => [d.name.toLowerCase(), d.id]));

// Keyword hints used to pick the skill within a domain. The first skill of
// the domain is the fallback.
const SKILL_HINTS = {
  'agent-architecture': /workflow|orchestrat|supervisor|subagent|multi-agent|routing|parallel|evaluator/i,
  'agent-construction': /agent sdk|managed agent|harness|custom loop|hook|sandbox|session/i,
  'agent-patterns': /memory|langgraph|strands|pydantic|framework|tool-use loop|context window/i,
  'requirements': /requirement|sla|latency budget|residency|compliance|stakeholder/i,
  'systems-life-cycle': /life ?cycle|deprecat|rollout|rollback|canary|monitor|maintenance|migration/i,
  'api-mechanics': /messages api|stop_reason|stream|batch|cache|vision|image|pdf|thinking|bedrock|vertex|foundry|files api|tool_result|tool_use/i,
  'software-engineering': /rest|http|idempoten|json|async|concurren|version control|pull request|code review|refactor|ci\b|pipeline/i,
  'application-design': /system prompt|claude\.ai|desktop|interface|xml tag|delimit|schema|session hygiene|plugin/i,
  'configuration-management': /claude\.md|settings\.json|pin|prompt version|plugin depend/i,
  'claude-code-operation': /claude code|slash command|headless|-p\b|claude\.md|subagent|skill/i,
  'debugging': /error|429|529|500|400|retry|trace|debug|failure|stop_reason/i,
  'llm-fundamentals': /token|context window|temperature|sampling|non-determin|thinking|effort|zero-shot|few-shot|fast mode/i,
  'technical-fundamentals': /sdk|websocket|sse|header|timeout|http client|rest api/i,
  'model-selection': /opus|sonnet|haiku|fable|model tier|model selection|smaller model|larger model|upgrade/i,
  'cost-tokens': /cost|cache|budget|usage|token count|batch discount|price/i,
  'context-engineering': /context (window|drift|bloat)|compact|prune|tool output|subagent|memory/i,
  'prompt-engineering': /prompt|few-shot|example|system versus|instruction|placement|sanitiz/i,
  'output-handling': /structured output|json schema|parse|validat|prefill|hallucinat|confident/i,
  'ai-security': /injection|jailbreak|untrusted|pii|leak|authentication|authorization|tenant/i,
  'guardrails': /guardrail|content policy|least privilege|approval|secure-by-design|iam/i,
  'hooks': /hook|pretooluse|posttooluse|exit code/i,
  'secrets': /api key|secret|credential|rotate|\.env|vault/i,
  'tool-implementation': /tool description|input_schema|tool_choice|is_error|parallel tool|server tool|client tool|approval/i,
  'mcp-development': /mcp|stdio|streamable|resource|transport/i,
  'agentic-customization': /skill|built-in tool|custom tool|mcp server|claude\.md|tradeoff/i,
};

function pickSkill(domainId, text) {
  const skills = exam.skills.filter((s) => s.domain === domainId);
  let best = skills[0];
  let bestScore = 0;
  for (const s of skills) {
    const re = SKILL_HINTS[s.id];
    const score = re ? (text.match(new RegExp(re.source, 'gi')) ?? []).length : 0;
    if (score > bestScore) { best = s; bestScore = score; }
  }
  return best.id;
}

// Minimal RFC 4180 parser: quoted fields, doubled quotes, newlines in quotes.
function parseCsv(text) {
  const rows = [];
  let row = [];
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
  const [header, ...body] = rows;
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h.trim(), (r[i] ?? '').trim()])));
}

function convert(records, name, source) {
  const items = [];
  const counters = {};
  for (const r of records) {
    const domainName = r.Domain.replace(/^D\d+\s+/i, '').toLowerCase();
    const domain = domainByName.get(domainName);
    if (!domain) { console.warn(`skip: unknown domain "${r.Domain}"`); continue; }
    const options = [];
    for (let i = 1; i <= 6; i++) {
      const text = r[`Answer Option ${i}`];
      if (text) options.push({ n: i, text, why: r[`Explanation ${i}`] });
    }
    const keys = new Set(r['Correct Answers'].split(/[,\s]+/).filter(Boolean).map(Number));
    if (options.length < 4 || !keys.size) { console.warn(`skip: malformed item "${r.Question.slice(0, 60)}"`); continue; }
    if (options.length > 6) options.length = 6;
    const multi = keys.size > 1;
    // Single-answer items need exactly 4 options; keep the key and the first
    // three distractors. Multi items need 5–6.
    let opts = options;
    if (!multi && options.length > 4) opts = options.filter((o) => keys.has(o.n)).concat(options.filter((o) => !keys.has(o.n))).slice(0, 4);
    if (multi && options.length < 5) { console.warn(`skip: multi item with ${options.length} options`); continue; }

    const skill = pickSkill(domain, `${r.Question} ${opts.map((o) => o.text).join(' ')}`);
    const code = skill.toUpperCase().replace(/-/g, '');
    counters[skill] = (counters[skill] ?? 0) + 1;
    const stem = multi && !/\((choose|select) /i.test(r.Question)
      ? `${r.Question} (Choose ${['', '', 'two', 'three'][keys.size] ?? keys.size}.)`
      : r.Question;
    items.push({
      id: `IMP-${name.toUpperCase().replace(/[^A-Z0-9]/g, '')}-${code}-${String(counters[skill]).padStart(3, '0')}`,
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
        why: o.why || (keys.has(o.n) ? 'Marked correct in the imported set\'s answer key.' : 'Not the keyed answer in the imported set; see the explanation.'),
      })),
      explanation: r['Overall Explanation'] || 'No explanation was provided in the imported set.',
      source,
    });
  }
  return items;
}

const [name, ...files] = process.argv.slice(2);
if (!name || !files.length) {
  console.error('usage: node scripts/import-udemy-csv.js <set-name> <file.csv> [more.csv ...]');
  process.exit(1);
}
const records = files.flatMap((f) => parseCsv(readFileSync(f, 'utf8')));
const items = convert(records, name, `Imported set "${name}" (Udemy CSV export)`);
mkdirSync('data/imported', { recursive: true });
const out = path.join('data/imported', `${name}.json`);
writeFileSync(out, JSON.stringify(items, null, 2) + '\n');
console.log(`${items.length} items written to ${out}. Run: npm run sync`);
