# quizMonkey roadmap

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
| 2 | JavaScript | `javascript` (the 20-item `js-essentials` quiz stays as a taster) | Planned |
| 3 | TypeScript | `typescript` | Planned |
| 4 | React | `react` | Planned |
| 5 | Node.js | `nodejs` | Planned |
| 6 | Python | `python` | Planned |
| 7 | Next.js | `nextjs` | Planned |
| … | More IT subjects (SQL, Docker/Kubernetes, AWS, DSA, Git, …) | | Later |

Each bank uses the standard layout under `content/exams/<id>/`: `exam.json`
with the blueprint and four levels, `questions/`, and `study/`. It must pass
`npm run validate -- <id>` with no errors.

## 2. Rename certMonkey to quizMonkey

Done in code, content and docs. Still outside the repo: the Vercel project
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
