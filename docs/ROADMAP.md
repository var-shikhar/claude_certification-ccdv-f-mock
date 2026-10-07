# quizzMonkey roadmap

Agreed with the product owner on 6 October 2026. We work through it one step at
a time and update the status column as items land.

## 1. Subject banks for IT mocks

Goal: one place to take mocks in every common IT subject. Each subject gets
questions at four levels (Basic, Intermediate, Advanced, Expert), and the upper
levels need deep reasoning, not recall. Every subject targets 400–500 questions
based on real interview topics, spread evenly over skills and levels. Banks are
built one subject at a time, in this order:

| # | Subject | Exam id | Status |
|---|---|---|---|
| 1 | System Design | `system-design` | Done (6 Oct 2026): 450 items, 45 per skill, 4 levels, 6 case studies |
| 2 | JavaScript | `javascript` (the 20-item `js-essentials` quiz stays as a taster) | Done (6 Oct 2026): 450 items, 45 per skill, 4 levels |
| 3 | TypeScript | `typescript` | Done (6 Oct 2026): 450 items, 45 per skill, checked with tsc 6.0.3 |
| 4 | React | `react` | Done (6 Oct 2026): 450 items, 60% Advanced or Expert, checked by running React 19.3 |
| 5 | Node.js | `nodejs` | Done (7 Oct 2026): 450 items, 58% Advanced or Expert, verified on Node 24 |
| 6 | Python | `python` | Done (7 Oct 2026): 450 items, 58% Advanced or Expert, verified on CPython 3.13 |
| 7 | Next.js | `nextjs` | Done (7 Oct 2026): 450 items, 58% Advanced or Expert, based on the bundled Next.js 16.3 docs |
| 8 | Docker | `docker` | Done (7 Oct 2026): 450 items, based on the official Docker docs |
| 9 | SQL | `sql` | Done (7 Oct 2026): 450 items, run on PostgreSQL 18 and SQLite |
| 10 | Kubernetes | `kubernetes` | Done (7 Oct 2026): 450 items, based on kubernetes.io |
| 11 | Git & GitHub | `vcs` | Done (7 Oct 2026): 450 items, checked against real Git 2.55 |
| 12 | Data Structures and Algorithms | `dsa` | Done (7 Oct 2026): 450 items, code run on Python 3.13 |
| 13 | Concurrency and Parallel Processing (senior level) | `concurrency` | Done (7 Oct 2026): 450 items, two-thirds Advanced or Expert |
| … | Further subjects (AWS, Linux, networking, …) | | Later |

Subjects 8–13 were added to the pipeline on 7 October 2026. Each one follows
the same process as 1–7. The writing is weighted toward Advanced and Expert
(8/11/14/12 per skill), and every answer is checked by running real tools
where possible (Docker CLI, a SQL engine, `kubectl` manifests, `git`, code).

Subject 13 is a cross-language senior track. It covers threads vs processes,
locks and lock-free techniques, memory models and visibility, deadlock,
livelock and starvation, the actor model, async I/O, multiprocessing and
worker pools, parallel algorithms, and the concurrency models of Go, Java,
Python and Node.js.

The Git & GitHub exam uses the id `vcs` because tooling in this repo treats paths containing "git" specially.

Each bank uses the standard layout under `content/exams/<id>/`: `exam.json`
with the blueprint and four levels, `questions/`, and `study/`. It must pass
`npm run validate -- <id>` with no errors.

### Coverage against roadmap.sh

Every bank is mapped to the matching official [roadmap.sh](https://roadmap.sh)
roadmap, so we can mark which topics are covered and fill the gaps. The
roadmap content is open source in `nilbuild/developer-roadmap` on GitHub
(formerly `kamranahmedse/developer-roadmap`), with one Markdown file per topic
under `roadmaps/<name>/content/`.

| Subject | roadmap.sh roadmap | Topics | Coverage |
|---|---|---|---|
| System Design | `system-design` | 147 | 77% → 100% (+37 questions) |
| JavaScript | `javascript` | 126 | 83% → 100% (+48 questions) |
| TypeScript | `typescript` | 93 | 91% → 100% (+29 questions) |
| React | `react` | 83 | 53% → 91% (+39 questions) |
| Node.js | `nodejs` | 113 | 86% → 100% (+27 questions) |
| Python | `python` | 87 | 74% → 95% (+35 questions) |
| Next.js | `nextjs` | 94 | 71% → 98% (+44 questions) |
| Docker | `docker` | 56 | Written from the roadmap |
| SQL | `sql` | 112 | Written from the roadmap |
| Kubernetes | `kubernetes` | 67 | Written from the roadmap |
| Git & GitHub | `git-github` | 155 | Written from the roadmap |
| DSA | `datastructures-and-algorithms` | 107 | Written from the roadmap |
| Concurrency | none (parts of `computer-science` and `backend`) | — | Written from those roadmaps |

Audit steps:
1. Pull each roadmap's topic list.
2. Tag every question with the roadmap.sh topics it covers.
3. Write `docs/coverage/<subject>.md`, marking each topic as covered,
   partly covered or missing.
4. Add questions for the missing topics.
5. Record the final coverage percentage in the table above.

## 2. Rename certMonkey to quizzMonkey

Done in code, content and docs on 7 October 2026. The product name is
**quizzMonkey**, with a double z. Still outside the repo: the Vercel project
name, any custom domain, OAuth app names and callback URLs for Google and
GitHub, the Stripe product name, and `BETTER_AUTH_URL` if the domain changes.

## 3. Realistic proctored exam mode (research first)

Goal: a mode where the exam feels like a test centre. The learner stays on the
exam tab, and we detect the screen being changed, suspicious keys, location,
identity and motion.

**Today:** the player counts tab switches (`visibilitychange`) and full-screen
exits, and the result page shows them (`src/components/player/exam-player.tsx`).

**Likely shape:** a separate proctoring service that this app talks to. It
would ingest events and webcam snapshots, run the checks, build a risk score
per attempt, and hold evidence for review. Media and biometric processing then
stays out of the main app.

**What a browser can and cannot do (to confirm in research):**

| Want | Possible in a normal browser tab | Needs a lockdown browser or desktop app |
|---|---|---|
| Stay on the exam tab | Detect leaving it (`visibilitychange`, `blur`, exiting full screen) and pause or flag the attempt | Stop it happening at all |
| See other screens | Ask the learner to share their entire screen (`getDisplayMedia` with the monitor surface). Detect extra monitors with the Window Management API (Chromium only) | Block extra monitors and virtual machines |
| Key detection | Log and block in-page shortcuts (copy, paste, print, DevTools keys, right-click) | OS shortcuts such as Alt+Tab, Cmd+Tab and the Windows key can't be blocked in a tab |
| Location | Geolocation API (needs consent; GPS, Wi-Fi or IP based) plus IP checks on the server, VPN detection | Same |
| Identity | Photo ID capture plus a selfie, with face match and liveness check (vendor or self-hosted model) | Same |
| Motion | On-device webcam analysis (for example MediaPipe): no face, more than one face, looking away, phone in view; microphone voice detection | Same |

**Research to do before building:**
1. Build vs buy: proctoring vendors' SDKs against our own service. Compare cost per exam, accuracy and data residency.
2. Lockdown option: Safe Exam Browser or our own Electron or Tauri shell for high-stakes mode. Keep the in-browser mode for practice.
3. Privacy and law: consent screens, retention limits and the right to delete. Biometric rules apply (India DPDP Act 2023, GDPR Article 9, Illinois BIPA). Plan for accessibility exemptions.
4. False positives: flags should go to human review and never auto-fail an attempt.
5. Architecture: event schema, transport (WebSocket or batched HTTP), media storage, review UI for admins, and cost at scale.

**Proposed delivery steps (each one shipped and reviewed before the next):**
1. Stricter in-browser mode: full screen required, the exam pauses on tab or
   window loss, in-page key and clipboard logging, and an integrity timeline in
   admin.
2. Identity check before the exam (ID and selfie match) and location capture.
3. Webcam and microphone monitoring during the exam, analysed on device, with
   snapshots sent to the proctoring service.
4. Review dashboard and a risk score.
5. Optional lockdown desktop client for high-stakes exams.
