# CCDV-F Mock Exam

A timed mock exam for the **Claude Certified Developer – Foundations (CCDV-F)**
certification. It mirrors the official exam format from the
[Exam Guide v1.0](https://anthropic-partners.skilljar.com/claude-certified-developer-foundations-certification):

| | Official exam | This mock |
|---|---|---|
| Items | 53 | 53, drawn in blueprint proportions (8 domains, 25 skills) |
| Time | 120 minutes | 120-minute timer, auto-submits at zero |
| Item types | Multiple choice + multiple response ("choose two") | Same; no partial credit |
| Score | Scaled 100–1,000, pass at 720 | Same scale and cut |
| Score report | Pass/fail, scaled score, % correct per domain | Same, plus a full answer review |

It is an independent practice tool. It is not affiliated with Anthropic, and
its readiness certificate is not the official credential.

## Run it

It is a static site: plain HTML, CSS and JavaScript, with the questions in
JSON. Any static web server works:

```bash
npm start                  # zero-dependency Node server → http://localhost:5173
# or
python3 -m http.server     # → http://localhost:8000
```

Opening `index.html` straight from disk won't work, because browsers block
loading the JSON files from `file://`.

## What you can do

- **Full Mock Exam**: 53 items in 120 minutes, run like the real exam. There
  is no feedback until you submit, and you can flag items and review them
  before you end the exam. Passing at Exam-realistic difficulty or harder
  unlocks the readiness certificate and a link to register for the official
  exam.
- **Quick Mock**: 20 items in 45 minutes, with the same rules and scoring.
- **Practice Drills**: pick the domains you want, then get the answer and
  explanation after each question. Drills can be untimed or run at exam pace.
- **Difficulty modes**: each preset sets the mix of item difficulties and the
  time limit.

  | Mode | Foundational / Intermediate / Advanced / Expert | Time |
  |---|---|---|
  | Foundational | 55 / 40 / 5 / 0 % | 100 % |
  | Exam-realistic | 20 / 55 / 20 / 5 % | 100 % |
  | Challenging | 5 / 35 / 40 / 20 % | 100 % |
  | Expert | 0 / 20 / 40 / 40 % | 100 % |
  | Max | 0 / 5 / 35 / 60 % | 80 % |

- **Answer review**: every item shows your answer, the correct answer, why
  each option is right or wrong, the overall explanation and a documentation
  reference. You can filter to incorrect, flagged or unanswered items.
- **Study guide**: key facts and common traps for all 25 skills, with links
  to the official docs.
- **History**: past attempts are kept in your browser's localStorage.

## How scoring works

Scoring lives in `src/engine/scoring.js`.

- Each item is all-or-nothing. A multiple-response item counts only when your
  selection exactly matches the key, and an unanswered item scores zero.
- Harder items weigh more: Foundational items count 1.0, Intermediate 1.5,
  Advanced 2.0 and Expert 2.5.
- Your difficulty-weighted percent correct maps linearly onto 100–1,000. A
  weighted 70% lands exactly on the 720 cut.
- The official cut comes from a confidential standard-setting study, so this
  mapping is an approximation. It is deliberately demanding.

## Project layout

```
index.html               page shell
src/app.js               UI: views, timer, navigation, results, certificate
src/styles.css
src/data-loader.js       loads data/exam.json and the files it lists
src/engine/              blueprint allocation, form assembly, scoring, storage
data/exam.json           exam definition: blueprint, timing, scale, modes, file list
data/questions/*.json    question bank
data/study/*.json        study notes per skill
schema/question.schema.json   the question template
scripts/validate-bank.js      bank validator and coverage report
test/                    engine tests (node --test)
```

## Question template

Every question file is a JSON array of items like this one
(`schema/question.schema.json` is the formal definition):

```json
{
  "id": "D2-API-001",
  "domain": 2,
  "skill": "api-mechanics",
  "difficulty": 2,
  "type": "single",
  "select": 1,
  "stem": "A developer must process 10,000 documents overnight ... Which approach best fits?",
  "options": [
    { "id": "A", "correct": false, "text": "…", "why": "Why this option is wrong." },
    { "id": "B", "correct": true,  "text": "…", "why": "Why this option is right." },
    { "id": "C", "correct": false, "text": "…", "why": "…" },
    { "id": "D", "correct": false, "text": "…", "why": "…" }
  ],
  "explanation": "The overall teaching point.",
  "reference": "Claude API docs — Batch processing"
}
```

- `type` is `single` (4 options, 1 correct) or `multi` (5–6 options, 2–3
  correct). For `multi`, `select` equals the number of correct options and the
  stem ends with "(Choose two.)" or "(Choose three.)".
- `difficulty` is 1 (Foundational: one concept applied in a scenario), 2
  (Intermediate: an applied scenario), 3 (Advanced: a multi-constraint
  tradeoff or a diagnosis) or 4 (Expert: several defensible options, only one
  satisfies every stated constraint).
- `skill` must be one of the skill ids in `data/exam.json`, and `domain` must
  be that skill's domain.
- Options are shuffled when the exam is delivered, so a `why` or
  `explanation` must never say "option B". Describe the option instead.

### Adding questions

1. Add items to an existing file in `data/questions/`, or create a new file
   and list it under `questionFiles` in `data/exam.json`.
2. Run `npm run validate`. It checks the template, the blueprint tags and
   common item-writing smells, and prints per-skill coverage.
3. Run `npm test`.

### Importing third-party question sets

Question CSVs in Udemy's practice-test import format can be loaded as a
separate pool for personal practice:

```bash
npm run import -- my-set path/to/*.csv   # writes data/imported/my-set.json
npm run sync
```

Imported sets appear as a "Question pool" choice in Practice Drills. They are
kept apart from the reviewed bank and are never drawn into the scored mock
exams, because they have no per-option rationale and were not reviewed here.
`data/imported/` is git-ignored.

Treat third-party keys with care. A cross-check of one popular 650-question
set against current docs found several answers that are now wrong: choosing a
low `temperature` for determinism (newer models reject non-default sampling
values), prefilling the assistant turn to force JSON (returns 400 on newer
models), and `tool_choice: any`/forced tools to guarantee a call (also 400 on
the newest models; use `auto` plus `strict: true`). The reviewed bank follows
the current docs on all of these.

## Tests

```bash
npm test          # blueprint math, form assembly, difficulty modes, scoring, bank validity
npm run validate  # question bank lint and coverage report
```
