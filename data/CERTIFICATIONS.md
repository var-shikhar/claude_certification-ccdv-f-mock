# Additional certification datasets

The live app still serves the CCDV-F bank from `data/exam.json`, `data/questions/` and
`data/study/`. The folders below hold question banks for the other Claude certifications, in the
same JSON format, ready to be wired in later. Nothing in the app reads them yet.

| Folder | Exam | Official form | Domains |
|---|---|---|---|
| `data/ccar-f/` | Claude Certified Architect – Foundations (CCAR-F) | 60 items, 120 min, pass 720 | 5 |
| `data/ccar-p/` | Claude Certified Architect – Professional (CCAR-P) | 63 items, 120 min, pass 720 | 7 |
| `data/ccao-f/` | Claude Certified Associate – Foundations (CCAO-F) | 60 items, 120 min, pass 720 | 7 |

All four Anthropic exams (including CCDV-F) share the same scale (100–1,000, cut 720), timing
(120 minutes), item types (multiple choice and multiple response) and delivery (Pearson VUE
through the Anthropic Partner Academy). Blueprints come from each exam's official Exam Guide
v1.0 (effective July 2026); the guide URL is in each `exam.json` as `examGuideUrl`.

## Layout

Each folder mirrors the CCDV-F layout:

```
data/<exam-id>/exam.json           blueprint, timing, scale, difficulty modes, file lists
data/<exam-id>/questions/*.json    question bank (same template as schema/question.schema.json)
data/<exam-id>/questions/official-samples.json   the guide's published sample items, verbatim
data/<exam-id>/study/*.json        study notes per skill
```

Item ids are prefixed per exam so banks can never collide: `ARF-D1-T1-001` (Architect
Foundations, domain 1, task 1.1), `ARP-D3-T5-002` (Architect Professional), `AOF-D6-T2-003`
(Associate Foundations), and `ARF-SAMPLE-01` etc. for official samples.

## Skills and weights

CCDV-F is the only exam whose guide publishes per-skill weights. For the three exams here the
guide publishes domain weights only, so each domain's weight is split evenly across its task
statements (the `skills` list in `exam.json`). The split keeps forms proportional per domain,
which is what the real exam guarantees; the per-task figure is an approximation and is noted in
each `exam.json` under `notes`.

CCAR-F is scenario-based on the real exam (each form presents 4 of 6 published scenarios). The
app has no scenario-context feature, so every CCAR-F item is self-contained, but items are
written inside those six scenario settings, which are listed in `exam.json` under `scenarios`.

## Validating

```bash
node scripts/validate-cert.js ccar-f            # whole dataset + coverage report
node scripts/validate-cert.js ccar-f --sync     # also relist questions/ and study/ files in exam.json
node scripts/validate-cert.js ccar-f data/ccar-f/questions/d2-tools-mcp.json   # one file
```

The script reuses the same checks as `npm run validate` (template, blueprint tags, item-writing
smells, per-skill coverage) and additionally checks that skill weights add up to their domain
weights. It does not touch `data/exam.json` or the existing scripts.
