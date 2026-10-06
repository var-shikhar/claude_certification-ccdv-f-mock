# quizMonkey

Mock exams, quizzes and interview practice in one calm place. quizMonkey runs
timed certification mocks that follow each exam's official blueprint, drills
that explain every option, a readiness score that tells you when you're ready,
and AI mock interviews with rubric feedback.

It started as a static mock exam for the Claude Certified Developer
(CCDV-F) and now serves any number of exams from one Next.js app.

## What's inside

| For learners | For authors and admins |
|---|---|
| Exam catalog with blueprint-accurate full and quick mocks, server-timed | Question bank with live item statistics and bulk actions |
| Practice drills with instant explanations; retry mistakes; saved questions with notes | Question editor for 6 item types with live validation, preview and revision history |
| Diagnostic, adaptive test and spaced-repetition daily review | Draft → review → published workflow; learner reports queue |
| Readiness score, predicted score and a 7-day study plan | Item analysis: difficulty, discrimination, dead distractors, suspect keys |
| Results with domain breakdown, one recommended next step and full answer review | CSV and JSON import (validated per item) and JSON export |
| AI tutor on any revealed question; AI mock interviews with rubric reports | AI question drafts grounded in study notes and pasted sources |
| Streaks, XP, badges, weekly leaderboard, verifiable certificates | Role management (learner, author, admin) |
| Challenge links, teams with assignments, light integrity checks | Pricing and Stripe billing, switched on by environment keys |

The navigation has just four destinations (Home, Explore, Interviews,
Progress), and every page leads with a single recommended action. Advanced
options stay folded away until you need them.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · shadcn/ui ·
motion · a few Aceternity UI pieces · TanStack Query (optimistic updates) ·
Zustand · Drizzle ORM on Neon Postgres · Better Auth · OpenAI-compatible AI
(OpenAI or LiteLLM) · Stripe (optional) · Vitest.

## Quick start

Requirements: Node 20 or newer.

```bash
npm install
cp .env.example .env          # then fill in DATABASE_URL and BETTER_AUTH_SECRET
npm run db:setup              # apply migrations and load every exam in content/
npm run dev                   # http://localhost:3000
```

With no `DATABASE_URL` the app uses an embedded Postgres (PGlite) in
`.data/pglite`, which is handy for a quick look or offline work.

To make yourself an admin, put your email in `ADMIN_EMAILS` before you sign
up. The account menu then shows **Admin**.

## Configuration

Every setting is documented in [`.env.example`](.env.example).

| Setting | Needed for |
|---|---|
| `DATABASE_URL` | Neon pooled connection string (or omit for local PGlite) |
| `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` | Sessions; the URL is also used for links in the sitemap |
| `ADMIN_EMAILS` | Accounts that start as admins |
| `GOOGLE_*`, `GITHUB_*` | Optional social sign-in (buttons appear when both values are set) |
| `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `AI_MODEL` | AI tutor, mock interviews and question drafts. Point the base URL at a LiteLLM proxy's `/v1` to use any provider |
| `AI_DAILY_LIMIT`, `AI_DAILY_LIMIT_FREE` | AI requests per learner per day (authors and admins are unlimited) |
| `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET` | Pro subscriptions. Until these are set, everything is free and unlimited |
| `FREE_FULL_MOCKS_PER_MONTH` | Free-plan full mocks per exam every 30 days (only when billing is on) |

AI features show a clear "not switched on yet" state when no key is set;
nothing else depends on them.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm test` | Unit tests: engine, scoring, readiness, spaced review, study plan, adaptive selection, billing signatures, and validation of every exam in `content/` |
| `npm run typecheck` · `npm run lint` | TypeScript and ESLint |
| `npm run db:generate` | New migration from `src/db/schema.ts` |
| `npm run db:migrate` · `npm run db:seed` · `npm run db:setup` | Apply migrations, load content, or both |
| `npm run validate [-- <exam-id>]` | Lint question banks and report blueprint coverage |
| `npm run import:exam -- <source-root> <exam-id>…` | Validate and copy exam folders (classic `data/<id>/` layout) into `content/exams/` |
| `npm run import:csv -- <exam-id> <set-name> <file.csv>…` | Convert Udemy practice-test CSVs into an imported practice pool |

## Content

Each exam is a folder under `content/exams/<id>/`:

```
exam.json            blueprint (domains, skills, weights), timing, scale, difficulty modes, catalog metadata
questions/*.json     the reviewed bank: arrays of questions
imported/*.json      optional third-party practice pools (never used in scored mocks)
study/*.json         study notes keyed by skill id
```

Every JSON file in those folders is loaded, so there is no manifest to keep in
sync. The seed is idempotent and never overwrites a question after it has been
edited in the admin editor.

Question types: `single`, `multi` (choose N, no partial credit), `truefalse`,
`order` (`answerOrder`), `match` (`prompts` paired to options) and `fill`
(`accepted` answers, compared ignoring case and spacing). Options are shuffled
at delivery, so explanations should describe options rather than cite letters.
`content/question.schema.json` documents the format; `npm run validate`
enforces it along with item-writing checks.

The catalog currently holds CCDV-F, CCAO-F, CCAR-F and CCAR-P (Anthropic
certification mocks), System Design and JavaScript interview mocks (450
questions each, Basic to Expert levels), and a short JavaScript Essentials quiz
that exercises every question type and a case study. [`docs/ROADMAP.md`](docs/ROADMAP.md) lists the
subjects coming next.

## How scoring works

Items are all-or-nothing and weighted by difficulty (1.0 to 2.5). The weighted
percent correct maps linearly onto each exam's scale, anchored so that the
configured `cutRaw` lands exactly on the pass mark. Readiness blends recent,
difficulty-weighted accuracy per skill (starting from a cautious prior),
combines skills by blueprint weight into a predicted score, and reports the
chance of clearing the pass mark. The in-app page `/about/scoring` explains it
for learners.

## Project layout

```
src/app/(main)/        learner pages: landing, dashboard, explore, exam hub, results, progress, interviews, teams…
src/app/(focus)/       distraction-free pages: exam player, onboarding
src/app/(auth)/        sign in and sign up
src/app/admin/         authoring and moderation
src/app/api/           JSON API (attempts, bookmarks, AI, teams, billing, admin…)
src/components/        UI by feature; ui/ holds shadcn and Aceternity primitives
src/server/            server-only services (attempts, analytics, AI, billing, teams…)
src/lib/engine/        pure exam engine: blueprint allocation, form assembly, scoring, adaptive selection
src/lib/               shared pure logic (readiness, spaced review, study plan, validators…)
src/db/                Drizzle schema and client
content/exams/         exam content
scripts/               migrate, seed, validate, import tools
```

Answer keys never reach the browser during an attempt: the server sends
sanitised questions and reveals keys per item (drills) or after submission.
Deadlines are enforced on the server, autosave merges atomically, and guest
progress moves to the account when a guest signs up.

## Deploying (Vercel + Neon)

1. Create a Neon project and copy the pooled connection string.
2. Import the repository into Vercel and add the environment variables from
   `.env.example`. Set `BETTER_AUTH_URL` to your production URL.
3. Run `npm run db:setup` once against the production database (locally with
   the production `DATABASE_URL`, or from CI). Run `npm run db:migrate` again
   whenever the schema changes, and `npm run db:seed` whenever content changes.
4. For billing, add a Stripe webhook pointing at `/api/billing/webhook` for the
   `checkout.session.completed` and `customer.subscription.*` events.

## Disclaimer

quizMonkey is an independent practice platform. It is not affiliated with any
exam vendor, and readiness certificates are not official credentials.
