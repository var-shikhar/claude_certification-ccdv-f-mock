import * as bp from './engine/blueprint.js';
import { assembleForm } from './engine/assemble.js';
import { scoreAttempt, isCorrect } from './engine/scoring.js';
import { newSeed } from './engine/random.js';
import { store } from './engine/storage.js';
import { loadData } from './data-loader.js';

const LETTERS = 'ABCDEF';
// Printing is blocked when the app is embedded in a sandboxed frame.
const canPrint = (() => { try { return window.self === window.top; } catch { return false; } })();

// Filled in by boot() from data/*.json.
let EXAM, DOMAINS, SKILLS, DIFFICULTY, DIFFICULTY_MODES, QUESTIONS, QUESTION_MAP, STUDY, MODES, OFFICIAL_URL, SECONDS_PER_ITEM, IMPORTED;
const skillById = (id) => bp.skillById(EXAM, id);
const domainById = (id) => bp.domainById(EXAM, id);

const app = document.getElementById('app');
let active = null;        // the in-progress attempt
let timerHandle = null;
let reviewFilter = 'all';

// ---------------------------------------------------------------- helpers

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Escaped text with ```fenced``` blocks, `inline code` and line breaks.
function rich(text) {
  const parts = String(text ?? '').split(/```(?:[a-z]+\n)?([\s\S]*?)```/g);
  return parts.map((part, i) => {
    if (i % 2 === 1) return `<pre><code>${esc(part.replace(/^\n|\n$/g, ''))}</code></pre>`;
    return esc(part).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\n/g, '<br>');
  }).join('');
}

const fmtClock = (ms) => {
  const s = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h ? `${h}:` : ''}${String(m).padStart(h ? 2 : 1, '0')}:${String(sec).padStart(2, '0')}`;
};
const fmtDate = (ts) => new Date(ts).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
const pct = (n) => (n == null ? '—' : `${n}%`);

const diffOf = (r) => bp.difficultyMode(EXAM, r.difficulty);
const certificateEligible = (r) => r.mode === 'full' && r.score.passed && diffOf(r).certificate;

function verificationCode(result) {
  let h = 2166136261;
  for (const ch of `${result.id}|${result.score.scaled}|${result.finishedAt}`) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return `CCDVF-MOCK-${(h >>> 0).toString(36).toUpperCase().padStart(7, '0')}`;
}

function shell(content, { nav = true } = {}) {
  const route = location.hash || '#/';
  const link = (href, label) => `<a href="${href}" class="${route === href ? 'active' : ''}">${label}</a>`;
  return `
    ${nav ? `
    <header class="topbar no-print">
      <div class="wrap">
        <a class="brand" href="#/"><span class="brand-mark">CD</span><span>CCDV-F Mock Exam</span></a>
        <nav class="nav" aria-label="Main">
          ${link('#/', 'Home')}
          ${link('#/study', 'Study guide')}
          ${link('#/practice', 'Practice')}
          ${link('#/history', 'History')}
          ${link('#/about', 'How scoring works')}
        </nav>
      </div>
    </header>` : ''}
    ${content}`;
}

function render(html) {
  app.innerHTML = html;
  window.scrollTo(0, 0);
}

// ---------------------------------------------------------------- routing

function route() {
  stopTimer();
  const [, view, arg] = (location.hash || '#/').split('/');
  active = store.getActive();

  if (active && view !== 'exam') {
    // Timed attempts keep running while you're away; finish them if time ran out.
    if (active.deadline && Date.now() >= active.deadline) { finishAttempt(true); return; }
  }

  switch (view) {
    case '': case undefined: return viewHome();
    case 'start': return viewStart(arg);
    case 'exam': return active ? viewExam() : (location.hash = '#/');
    case 'submit': return active ? viewSubmitReview() : (location.hash = '#/');
    case 'results': return viewResults(decodeURIComponent(arg ?? ''));
    case 'review': return viewAnswerReview(decodeURIComponent(arg ?? ''));
    case 'certificate': return viewCertificate(decodeURIComponent(arg ?? ''));
    case 'study': return viewStudy();
    case 'practice': return viewPracticeSetup();
    case 'history': return viewHistory();
    case 'about': return viewAbout();
    default: location.hash = '#/';
  }
}

window.addEventListener('hashchange', () => { if (EXAM) route(); });

// ---------------------------------------------------------------- home

function viewHome() {
  const history = store.getHistory();
  const fulls = history.filter((r) => r.mode === 'full');
  const best = fulls.reduce((m, r) => Math.max(m, r.score.scaled), 0);
  const passedFull = fulls.find(certificateEligible);

  render(shell(`
    <main class="wrap">
      ${active ? `
        <div class="notice accent row" style="margin-bottom:20px">
          <div><b>You have an attempt in progress</b> — ${esc(MODES[active.mode].label)}, question ${active.current + 1} of ${active.itemIds.length}${active.deadline ? `, ${fmtClock(active.deadline - Date.now())} left on the clock` : ''}.</div>
          <span class="spacer"></span>
          <a class="btn primary sm" href="#/exam">Resume</a>
          <button class="btn sm danger" data-action="abandon">Abandon</button>
        </div>` : ''}

      <section class="hero">
        <span class="pill accent">Exam code ${EXAM.code} · Blueprint v1.0 (July 2026)</span>
        <h1 style="margin-top:12px">${EXAM.title}<br><span class="muted" style="font-weight:500">Mock Exam &amp; Practice Platform</span></h1>
        <p class="lead">A timed, proctored-style simulation of the real certification: ${EXAM.itemCount} scenario-based items drawn in blueprint proportions across all 8 domains, ${EXAM.timeLimitMinutes} minutes, multiple-choice and multiple-response items, and a scaled 100–1,000 score with a ${EXAM.scale.passing} cut. Every item comes with the correct answer and a reason why each option is right or wrong.</p>
      </section>

      <section class="grid grid-4" style="margin:8px 0 28px">
        <div class="stat"><b>${EXAM.itemCount}</b><span>items per form</span></div>
        <div class="stat"><b>${EXAM.timeLimitMinutes} min</b><span>time limit</span></div>
        <div class="stat"><b>${EXAM.scale.passing}</b><span>passing scaled score</span></div>
        <div class="stat"><b>${QUESTIONS.length}</b><span>items in the bank</span></div>
      </section>

      <section class="grid grid-3" style="margin-bottom:32px">
        <div class="card">
          <span class="pill ok">Certificate-eligible</span>
          <h3 style="margin-top:10px">Full Mock Exam</h3>
          <p class="muted">The complete ${EXAM.itemCount}-item, ${EXAM.timeLimitMinutes}-minute exam. No feedback until you submit. Pass it to unlock your readiness certificate and the path to the official exam.</p>
          <a class="btn primary" href="#/start/full">Start full mock</a>
        </div>
        <div class="card">
          <span class="pill">Warm-up</span>
          <h3 style="margin-top:10px">Quick Mock</h3>
          <p class="muted">${MODES.quick.items} blueprint-weighted items in ${MODES.quick.minutes} minutes. Same rules and scoring as the full exam, in a shorter sitting.</p>
          <a class="btn" href="#/start/quick">Start quick mock</a>
        </div>
        <div class="card">
          <span class="pill">Learn</span>
          <h3 style="margin-top:10px">Practice Drills</h3>
          <p class="muted">Pick the domains to work on and get instant feedback and explanations after every question. Untimed or timed.</p>
          <a class="btn" href="#/practice">Set up a drill</a>
        </div>
      </section>

      ${passedFull ? `
        <div class="notice row" style="margin-bottom:28px;background:var(--ok-soft)">
          <div><b>You've passed the full mock</b> (best score ${best}). Your readiness certificate is available and you're ready to sit the official exam.</div>
          <span class="spacer"></span>
          <a class="btn sm" href="#/certificate/${encodeURIComponent(passedFull.id)}">View certificate</a>
          <a class="btn sm primary" href="${OFFICIAL_URL}" target="_blank" rel="noopener">Official exam ↗</a>
        </div>` : ''}

      <section class="card">
        <h2>Exam blueprint</h2>
        <p class="muted small">Items are drawn per skill in these proportions (largest-remainder rounding to ${EXAM.itemCount} items), matching Section 6 of the official exam guide.</p>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Domain</th><th class="num">Weight</th><th class="num">Items / form</th><th class="num">In bank</th></tr></thead>
            <tbody>
              ${DOMAINS.map((d) => {
                const skills = SKILLS.filter((s) => s.domain === d.id);
                return `<tr><td><b>${d.id}. ${esc(d.name)}</b><div class="small muted">${skills.map((s) => `${esc(s.name)} (${s.weight}%)`).join(' · ')}</div></td>
                  <td class="num">${d.weight}%</td>
                  <td class="num">${formCountForDomain(d.id)}</td>
                  <td class="num">${QUESTIONS.filter((q) => q.domain === d.id).length}</td></tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </section>
    </main>`));
}

function formCountForDomain(domainId) {
  const form = assembleForm(EXAM, QUESTIONS, { seed: 1 });
  return form.itemIds.filter((id) => QUESTION_MAP.get(id).domain === domainId).length;
}

// ---------------------------------------------------------------- start / rules

function viewStart(mode) {
  if (!MODES[mode] || mode === 'practice') { location.hash = '#/'; return; }
  if (active) { location.hash = '#/exam'; return; }
  const m = MODES[mode];
  const prefs = store.getPrefs();

  render(shell(`
    <main class="wrap" style="max-width:760px">
      <h1>${esc(m.label)}</h1>
      <p class="muted">${m.items} items · ${m.minutes} minutes at exam-realistic difficulty · scaled score 100–1,000 · pass at ${EXAM.scale.passing}</p>

      <form class="card" data-form="start" data-mode="${mode}">
        <h3>Difficulty mode</h3>
        <p class="small muted">Each mode sets the mix of Foundational / Intermediate / Advanced items and the time limit. You get a full scored report at the end in every mode.</p>
        ${difficultyPicker(prefs.difficulty ?? 'standard', m.minutes, mode === 'full')}

        <label class="field"><span>Candidate name</span>
          <input type="text" name="candidate" maxlength="80" autocomplete="name" value="${esc(prefs.candidate ?? '')}" placeholder="As you want it on your certificate">
        </label>

        <h3>Exam rules</h3>
        <ul class="muted">
          <li>The timer starts when you begin and keeps running if you leave or refresh the page. When it reaches zero, the exam is submitted automatically.</li>
          <li>Each item says how many responses to select. Multiple-response items score only when your selection exactly matches the key — there is no partial credit.</li>
          <li>Unanswered items are scored as incorrect, so answer everything. You can flag items and return to them before you submit.</li>
          <li>You will not see whether answers are right until you submit. Afterwards you get your scaled score, a domain breakdown, and a full explanation of every item.</li>
          <li>Treat it like the real thing: closed book, no notes, no second screen, no talking to anyone.</li>
        </ul>

        <h3>Confidentiality</h3>
        <label class="check" style="margin-bottom:18px">
          <input type="checkbox" name="agree" required>
          <span>I will take this exam under exam conditions, and I understand this is an independent practice exam — not the official ${EXAM.code} exam or an Anthropic credential.</span>
        </label>
        <div class="row">
          <button class="btn primary" type="submit">Begin exam</button>
          <a class="btn ghost" href="#/">Cancel</a>
        </div>
      </form>
    </main>`));
}

function difficultyPicker(selected, baseMinutes, showCert) {
  return `<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;margin-bottom:18px">
    ${Object.entries(DIFFICULTY_MODES).map(([key, d]) => `
      <label class="opt ${key === selected ? 'selected' : ''}" style="grid-template-columns:22px minmax(0,1fr)" data-action="choose-difficulty">
        <input type="radio" name="difficulty" value="${key}" ${key === selected ? 'checked' : ''} style="position:static;opacity:1;pointer-events:auto;accent-color:var(--accent);margin-top:4px">
        <span><b>${esc(d.label)}</b>${showCert && d.certificate ? ' <span class="pill ok">Certificate</span>' : ''}
          <span class="small muted" style="display:block">${esc(d.blurb)}</span>
          <span class="small" style="display:block;margin-top:4px">${Object.keys(DIFFICULTY).filter((k) => d.mix[k]).map((k) => `${esc(DIFFICULTY[k].label.slice(0, 3))} ${Math.round(d.mix[k] * 100)}%`).join(' · ')}${baseMinutes ? ` · ${Math.ceil(baseMinutes * d.timeFactor)} min` : d.timeFactor !== 1 ? ` · ${Math.round(d.timeFactor * 100)}% time` : ''}</span>
        </span>
      </label>`).join('')}
  </div>`;
}

function beginAttempt({ mode, candidate, domains, count, timed, instant, difficulty = EXAM.defaultDifficultyMode, pool = 'bank' }) {
  const seed = newSeed();
  const total = mode === 'practice' ? count : MODES[mode].items;
  const preset = bp.difficultyMode(EXAM, difficulty);
  const source = mode !== 'practice' || pool === 'bank' ? QUESTIONS
    : pool === 'imported' ? IMPORTED : [...QUESTIONS, ...IMPORTED];
  const form = assembleForm(EXAM, source, { seed, total, domains, difficulty });
  const baseMinutes = mode === 'practice'
    ? (timed ? (form.itemIds.length * SECONDS_PER_ITEM) / 60 : null)
    : MODES[mode].minutes;
  const minutes = baseMinutes ? Math.ceil(baseMinutes * preset.timeFactor) : null;
  const now = Date.now();

  active = {
    id: `${mode}-${now.toString(36)}-${seed.toString(36)}`,
    mode,
    difficulty,
    pool,
    candidate: candidate?.trim() || '',
    seed,
    domains: domains ?? null,
    itemIds: form.itemIds,
    optionOrder: form.optionOrder,
    responses: {},
    flags: {},
    checked: {},
    instant: Boolean(instant),
    current: 0,
    startedAt: now,
    minutes,
    deadline: minutes ? now + minutes * 60_000 : null,
  };
  store.setActive(active);
  location.hash = '#/exam';
}

// ---------------------------------------------------------------- exam

function currentItem() {
  return QUESTION_MAP.get(active.itemIds[active.current]);
}

function viewExam() {
  const q = currentItem();
  if (!q) { store.clearActive(); location.hash = '#/'; return; }
  const n = active.itemIds.length;
  const idx = active.current;
  const selected = active.responses[q.id] ?? [];
  const flagged = Boolean(active.flags[q.id]);
  const revealed = active.instant && active.checked[q.id];
  const answeredCount = Object.values(active.responses).filter((r) => r.length).length;
  const multi = q.type === 'multi';
  const words = ['zero', 'one', 'two', 'three', 'four'];

  const optionsHtml = active.optionOrder[q.id].map((optId, i) => {
    const o = q.options.find((x) => x.id === optId);
    const isSel = selected.includes(o.id);
    let cls = 'opt' + (multi ? ' multi' : '') + (isSel ? ' selected' : '');
    if (revealed) cls += (o.correct ? ' key' : isSel ? ' wrong' : '') + ' locked';
    return `
      <label class="${cls}">
        <input type="${multi ? 'checkbox' : 'radio'}" name="opt" value="${o.id}" ${isSel ? 'checked' : ''} ${revealed ? 'disabled' : ''} data-action="pick">
        <span class="letter">${LETTERS[i]}</span>
        <span>${rich(o.text)}</span>
        ${revealed ? `<span class="why"><b>${o.correct ? 'Correct' : 'Incorrect'}.</b> ${rich(o.why)}</span>` : ''}
      </label>`;
  }).join('');

  const verdict = revealed ? isCorrect(q, selected) : null;

  render(shell(`
    <div class="exam-bar">
      <div class="wrap">
        <b>${esc(MODES[active.mode].label)}</b>
        <span class="pill">${esc(diffOf(active).label)}</span>
        <span class="muted small">Item ${idx + 1} of ${n} · ${answeredCount} answered</span>
        <span class="spacer"></span>
        ${active.deadline ? `<span class="timer" id="timer" aria-label="Time remaining">${fmtClock(active.deadline - Date.now())}</span>` : ''}
        <a class="btn sm" href="#/submit">Review &amp; submit</a>
      </div>
      <div class="progress"><i style="width:${(answeredCount / n) * 100}%"></i></div>
    </div>

    <main class="wrap">
      <div class="exam-layout">
        <section class="card">
          <div class="q-meta">
            <span class="pill">Question ${idx + 1}</span>
            ${active.mode === 'practice' ? `<span class="pill">Domain ${q.domain} · ${esc(skillById(q.skill).name)}</span>` : ''}
            ${flagged ? '<span class="pill warn">Flagged for review</span>' : ''}
          </div>
          <div class="q-stem">${rich(q.stem)}</div>
          <p class="q-select">${multi ? `Select ${words[q.select] ?? q.select}.` : 'Select one.'}</p>
          <fieldset class="options" aria-label="Answer options">${optionsHtml}</fieldset>

          ${revealed ? `
            <div class="notice explain" style="background:${verdict ? 'var(--ok-soft)' : 'var(--bad-soft)'}">
              <h3>${verdict ? '✓ Correct' : '✗ Incorrect'}</h3>
              <p style="margin:0">${rich(q.explanation)}</p>
              ${q.reference ? `<p class="small muted" style="margin:8px 0 0">Reference: ${esc(q.reference)}</p>` : ''}
            </div>` : ''}

          <div class="q-actions">
            <button class="btn" data-action="prev" ${idx === 0 ? 'disabled' : ''}>← Previous</button>
            <button class="btn ${flagged ? 'primary' : ''}" data-action="flag" aria-pressed="${flagged}">⚑ ${flagged ? 'Unflag' : 'Flag'}</button>
            ${active.instant && !revealed ? `<button class="btn primary" data-action="check" ${selected.length ? '' : 'disabled'}>Check answer</button>` : ''}
            <span class="spacer"></span>
            ${idx < n - 1
              ? `<button class="btn ${active.instant && !revealed ? '' : 'primary'}" data-action="next">Next →</button>`
              : `<a class="btn primary" href="#/submit">Finish →</a>`}
          </div>
          <p class="small muted" style="margin:14px 0 0">Keys: A–F select · ← / → move · F flag${active.instant ? ' · Enter check' : ''}</p>
        </section>

        <aside class="card navigator" aria-label="Question navigator">
          <h3>Questions</h3>
          ${navigatorGrid()}
        </aside>
      </div>
    </main>`, { nav: false }));

  startTimer();
}

function navigatorGrid() {
  const cells = active.itemIds.map((id, i) => {
    const q = QUESTION_MAP.get(id);
    const ans = (active.responses[id] ?? []).length > 0;
    let cls = 'nav-cell';
    if (active.instant && active.checked[id]) cls += isCorrect(q, active.responses[id]) ? ' is-ok' : ' is-bad';
    else if (ans) cls += ' answered';
    if (active.flags[id]) cls += ' flagged';
    if (i === active.current) cls += ' current';
    return `<button class="${cls}" data-action="goto" data-index="${i}" aria-label="Question ${i + 1}${ans ? ', answered' : ''}${active.flags[id] ? ', flagged' : ''}">${i + 1}</button>`;
  }).join('');
  return `<div class="nav-grid">${cells}</div>
    <div class="legend"><span><i style="background:var(--surface-2);border-color:var(--muted)"></i>Answered</span><span><i></i>Unanswered</span><span><i style="background:var(--warn);border-color:var(--warn);border-radius:50%"></i>Flagged</span></div>`;
}

function pick(optId) {
  const q = currentItem();
  if (active.instant && active.checked[q.id]) return;
  let sel = [...(active.responses[q.id] ?? [])];
  if (q.type === 'single') {
    sel = [optId];
  } else if (sel.includes(optId)) {
    sel = sel.filter((x) => x !== optId);
  } else {
    // Like the real exam, you can't select more options than the item asks for.
    if (sel.length >= q.select) sel.shift();
    sel.push(optId);
  }
  active.responses[q.id] = sel;
  store.setActive(active);
  viewExam();
}

function go(index) {
  active.current = Math.max(0, Math.min(active.itemIds.length - 1, index));
  store.setActive(active);
  if (location.hash !== '#/exam') location.hash = '#/exam';
  else viewExam();
}

function startTimer() {
  stopTimer();
  if (!active?.deadline) return;
  const tick = () => {
    const left = active.deadline - Date.now();
    const el = document.getElementById('timer');
    if (el) {
      el.textContent = fmtClock(left);
      el.classList.toggle('low', left <= 15 * 60_000 && left > 5 * 60_000);
      el.classList.toggle('critical', left <= 5 * 60_000);
    }
    if (left <= 0) finishAttempt(true);
  };
  tick();
  timerHandle = setInterval(tick, 1000);
}

function stopTimer() {
  if (timerHandle) clearInterval(timerHandle);
  timerHandle = null;
}

// ---------------------------------------------------------------- review before submit

function viewSubmitReview() {
  const ids = active.itemIds;
  const unanswered = ids.filter((id) => !(active.responses[id] ?? []).length);
  const flagged = ids.filter((id) => active.flags[id]);

  render(shell(`
    <div class="exam-bar">
      <div class="wrap">
        <b>${esc(MODES[active.mode].label)} — Review</b>
        <span class="spacer"></span>
        ${active.deadline ? `<span class="timer" id="timer">${fmtClock(active.deadline - Date.now())}</span>` : ''}
      </div>
    </div>
    <main class="wrap" style="max-width:820px">
      <h1>Review before you submit</h1>
      <div class="grid grid-4" style="margin-bottom:20px">
        <div class="stat"><b>${ids.length - unanswered.length}</b><span>answered</span></div>
        <div class="stat"><b>${unanswered.length}</b><span>unanswered</span></div>
        <div class="stat"><b>${flagged.length}</b><span>flagged</span></div>
      </div>
      ${unanswered.length ? `<div class="notice warn" style="margin-bottom:16px">${unanswered.length} item${unanswered.length > 1 ? 's are' : ' is'} unanswered and will be scored as incorrect.</div>` : ''}
      <div class="card" style="margin-bottom:20px">
        <h3>Jump to a question</h3>
        ${navigatorGrid()}
        <div class="row" style="margin-top:16px">
          ${unanswered.length ? `<button class="btn sm" data-action="goto" data-index="${ids.indexOf(unanswered[0])}">First unanswered</button>` : ''}
          ${flagged.length ? `<button class="btn sm" data-action="goto" data-index="${ids.indexOf(flagged[0])}">First flagged</button>` : ''}
          <a class="btn sm" href="#/exam">Back to exam</a>
        </div>
      </div>
      <div class="row">
        <button class="btn primary" data-action="submit">End exam and see results</button>
        <span class="muted small">You can't change answers after this.</span>
      </div>
    </main>`, { nav: false }));
  startTimer();
}

function finishAttempt(timedOut = false) {
  stopTimer();
  const attempt = active ?? store.getActive();
  if (!attempt) return;
  const items = attempt.itemIds.map((id) => QUESTION_MAP.get(id)).filter(Boolean);
  const finishedAt = timedOut && attempt.deadline ? Math.min(Date.now(), attempt.deadline) : Date.now();
  const result = {
    id: attempt.id,
    mode: attempt.mode,
    difficulty: attempt.difficulty ?? 'standard',
    candidate: attempt.candidate,
    domains: attempt.domains,
    startedAt: attempt.startedAt,
    finishedAt,
    minutes: attempt.minutes,
    timedOut,
    itemIds: attempt.itemIds,
    optionOrder: attempt.optionOrder,
    responses: attempt.responses,
    flags: attempt.flags,
    score: scoreAttempt(EXAM, items, attempt.responses),
  };
  store.addToHistory(result);
  store.clearActive();
  active = null;
  location.hash = `#/results/${encodeURIComponent(result.id)}`;
  if (timedOut) sessionStorageFlag('timedout', result.id);
}

function sessionStorageFlag(key, value) {
  try { sessionStorage.setItem(`ccdvf.${key}`, value); } catch { /* ignore */ }
}

// ---------------------------------------------------------------- results

function scaleBar(scaled, passed) {
  const pos = (v) => ((v - EXAM.scale.min) / (EXAM.scale.max - EXAM.scale.min)) * 100;
  return `
    <div class="scale ${passed ? 'pass' : ''}" role="img" aria-label="Scaled score ${scaled} of ${EXAM.scale.max}; passing score ${EXAM.scale.passing}">
      <div class="fill" style="width:${pos(scaled)}%"></div>
      <div class="cut" style="left:${pos(EXAM.scale.passing)}%"><span>Pass ${EXAM.scale.passing}</span></div>
      <div class="ticks"><span>${EXAM.scale.min}</span><span>${EXAM.scale.max}</span></div>
    </div>`;
}

function viewResults(id) {
  const r = store.getResult(id);
  if (!r) { render(shell(`<main class="wrap"><h1>Result not found</h1><a class="btn" href="#/">Home</a></main>`)); return; }
  const s = r.score;
  const mode = MODES[r.mode];
  const certEligible = certificateEligible(r);
  const weakest = [...s.bySkill].filter((x) => x.percent < 70).sort((a, b) => a.percent - b.percent).slice(0, 5);
  const duration = r.finishedAt - r.startedAt;

  render(shell(`
    <main class="wrap">
      ${r.timedOut ? '<div class="notice warn" style="margin-bottom:16px">Time expired — your exam was submitted automatically.</div>' : ''}
      <p class="muted" style="margin-bottom:6px">${esc(mode.label)} · ${esc(diffOf(r).label)} difficulty · ${fmtDate(r.finishedAt)}${r.candidate ? ` · ${esc(r.candidate)}` : ''}</p>

      <section class="card score-hero" style="margin-bottom:20px">
        <div>
          <div class="verdict ${s.passed ? 'pass' : 'fail'}">${s.passed ? 'PASS' : 'FAIL'}</div>
          <div class="scaled">${s.scaled}<span class="muted" style="font-size:1.2rem;font-weight:500"> / ${EXAM.scale.max}</span></div>
          <p class="muted" style="margin-top:8px">Scaled score. Passing score is ${EXAM.scale.passing}.</p>
        </div>
        <div>
          ${scaleBar(s.scaled, s.passed)}
          <div class="grid grid-4">
            <div class="stat"><b>${s.correctCount}/${s.itemCount}</b><span>items correct</span></div>
            <div class="stat"><b>${s.answeredCount}</b><span>answered</span></div>
            <div class="stat"><b>${fmtClock(duration)}</b><span>time used${r.minutes ? ` of ${r.minutes}m` : ''}</span></div>
          </div>
        </div>
      </section>

      ${certEligible ? `
        <section class="notice row" style="background:var(--ok-soft);margin-bottom:20px">
          <div><b>Congratulations — you passed the full mock exam.</b> Your readiness certificate is ready, and you can now register for the official ${EXAM.code} exam with confidence.</div>
          <span class="spacer"></span>
          <a class="btn primary" href="#/certificate/${encodeURIComponent(r.id)}">Get certificate</a>
          <a class="btn" href="${OFFICIAL_URL}" target="_blank" rel="noopener">Register for the official exam ↗</a>
        </section>` : ''}
      ${!s.passed && r.mode === 'full' ? `
        <section class="notice warn" style="margin-bottom:20px">
          You need ${EXAM.scale.passing} to pass. Review every explanation below, drill your weakest domains, then retake the full mock — each attempt draws a fresh form from the bank.
        </section>` : ''}
      ${s.passed && r.mode === 'full' && !diffOf(r).certificate ? `
        <section class="notice" style="margin-bottom:20px">Nice pass at ${esc(diffOf(r).label)} difficulty. The certificate needs a full-mock pass at Exam-realistic difficulty or harder — <a href="#/start/full">step up a level</a>.</section>` : ''}
      ${s.passed && r.mode === 'quick' ? `
        <section class="notice" style="margin-bottom:20px">Good result. The certificate is awarded for passing the <b>full</b> ${EXAM.itemCount}-item mock — <a href="#/start/full">take it next</a>.</section>` : ''}

      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(320px,1fr));margin-bottom:20px">
        <section class="card">
          <h2>Performance by domain</h2>
          <p class="small muted">Percent correct per content domain, as on the official score report. These are for feedback only — pass/fail is decided by the total scaled score.</p>
          <table>
            <thead><tr><th>Domain</th><th class="num">Items</th><th class="num">Correct</th><th></th></tr></thead>
            <tbody>
              ${s.byDomain.map((d) => `
                <tr><td>${d.id}. ${esc(d.name)}</td><td class="num">${d.total}</td><td class="num">${pct(d.percent)}</td>
                <td style="width:30%"><div class="bar ${d.percent >= 70 ? 'ok' : 'bad'}"><i style="width:${d.percent}%"></i></div></td></tr>`).join('')}
            </tbody>
          </table>
        </section>
        <section class="card">
          <h2>What to study next</h2>
          ${weakest.length ? `
            <p class="small muted">Skills where you scored under 70% on this form:</p>
            <ul>${weakest.map((x) => `<li><b>${esc(x.name)}</b> — ${x.correct}/${x.total} (${x.percent}%)<br><span class="small muted">Domain ${skillById(x.id).domain}: ${esc(domainById(skillById(x.id).domain).name)}</span></li>`).join('')}</ul>
            <a class="btn sm" href="#/practice?domains=${[...new Set(weakest.map((x) => skillById(x.id).domain))].join(',')}">Drill these domains</a>
          ` : '<p>No skill below 70% on this form. Keep your edge by reviewing the explanations for anything you guessed on.</p>'}
        </section>
      </div>

      <div class="row">
        <a class="btn primary" href="#/review/${encodeURIComponent(r.id)}">Review answers &amp; explanations</a>
        <a class="btn" href="#/start/${r.mode === 'practice' ? 'full' : r.mode}">${r.mode === 'practice' ? 'Take the full mock' : 'Retake with a new form'}</a>
        <a class="btn ghost" href="#/">Home</a>
      </div>
    </main>`));
}

// ---------------------------------------------------------------- answer review

function viewAnswerReview(id) {
  const r = store.getResult(id);
  if (!r) { location.hash = '#/history'; return; }
  const rows = r.score.perItem;
  const filters = {
    all: () => true,
    incorrect: (x) => !x.correct,
    correct: (x) => x.correct,
    flagged: (x) => r.flags[x.id],
    unanswered: (x) => !x.answered,
  };
  const filter = filters[reviewFilter] ? reviewFilter : 'all';
  const count = (k) => rows.filter(filters[k]).length;

  const items = rows.map((row, i) => ({ row, i })).filter(({ row }) => filters[filter](row)).map(({ row, i }) => {
    const q = QUESTION_MAP.get(row.id);
    if (!q) return '';
    const order = r.optionOrder[q.id] ?? q.options.map((o) => o.id);
    const keyLetters = order.map((oid, k) => (q.options.find((o) => o.id === oid).correct ? LETTERS[k] : null)).filter(Boolean);
    const yourLetters = order.map((oid, k) => (row.selected.includes(oid) ? LETTERS[k] : null)).filter(Boolean);
    return `
      <article class="review-item" id="item-${i + 1}">
        <div class="q-meta">
          <span class="pill">Question ${i + 1}</span>
          <span class="pill ${row.correct ? 'ok' : 'bad'}">${row.correct ? 'Correct' : row.answered ? 'Incorrect' : 'Unanswered'}</span>
          <span class="pill">D${q.domain} · ${esc(skillById(q.skill).name)}</span>
          <span class="pill">${DIFFICULTY[q.difficulty].label}</span>
          ${r.flags[q.id] ? '<span class="pill warn">Flagged</span>' : ''}
          ${q.source?.startsWith('Imported') ? '<span class="pill">Imported set</span>' : ''}
        </div>
        <div class="q-stem">${rich(q.stem)}</div>
        <p class="small"><b>Your answer:</b> ${yourLetters.join(', ') || '—'} &nbsp; <b>Correct answer:</b> ${keyLetters.join(', ')}</p>
        <div class="options">
          ${order.map((oid, k) => {
            const o = q.options.find((x) => x.id === oid);
            const mine = row.selected.includes(oid);
            const cls = 'opt locked' + (q.type === 'multi' ? ' multi' : '') + (o.correct ? ' key' : mine ? ' wrong' : '');
            return `<div class="${cls}"><span class="letter">${LETTERS[k]}</span><span>${rich(o.text)}${mine ? ' <span class="pill">your choice</span>' : ''}</span>
              <span class="why"><b>${o.correct ? 'Why it’s right:' : 'Why it’s wrong:'}</b> ${rich(o.why)}</span></div>`;
          }).join('')}
        </div>
        <div class="notice explain">
          <h3>Explanation</h3>
          <p style="margin:0">${rich(q.explanation)}</p>
          ${q.reference ? `<p class="small muted" style="margin:8px 0 0">Reference: ${esc(q.reference)}</p>` : ''}
        </div>
      </article>`;
  }).join('');

  render(shell(`
    <main class="wrap" style="max-width:900px">
      <div class="row" style="margin-bottom:8px">
        <h1 style="margin:0">Answer review</h1>
        <span class="spacer"></span>
        <a class="btn sm" href="#/results/${encodeURIComponent(r.id)}">← Score report</a>
      </div>
      <p class="muted">${esc(MODES[r.mode].label)} · ${r.score.scaled} / ${EXAM.scale.max} · ${r.score.passed ? 'Pass' : 'Fail'}</p>
      <div class="tabs" role="tablist" style="margin-bottom:12px">
        ${Object.keys(filters).map((k) => `<button role="tab" aria-selected="${k === filter}" class="${k === filter ? 'active' : ''}" data-action="filter" data-filter="${k}">${k[0].toUpperCase() + k.slice(1)} (${count(k)})</button>`).join('')}
      </div>
      <section class="card">${items || '<p class="muted" style="margin:0">Nothing in this view.</p>'}</section>
    </main>`));
}

// ---------------------------------------------------------------- certificate

function viewCertificate(id) {
  const r = store.getResult(id);
  if (!r || !certificateEligible(r)) {
    render(shell(`<main class="wrap" style="max-width:700px"><h1>Certificate not available</h1>
      <p class="muted">The readiness certificate is awarded only for passing the full ${EXAM.itemCount}-item, ${EXAM.timeLimitMinutes}-minute mock exam at Exam-realistic difficulty or harder, with a scaled score of ${EXAM.scale.passing} or higher.</p>
      <a class="btn primary" href="#/start/full">Take the full mock</a></main>`));
    return;
  }
  const name = r.candidate || 'Candidate';
  render(shell(`
    <main class="wrap">
      <div class="row no-print" style="margin-bottom:16px">
        <form class="row" data-form="rename" data-id="${esc(r.id)}" style="flex:1;min-width:260px">
          <input type="text" name="candidate" maxlength="80" value="${esc(r.candidate)}" placeholder="Name on certificate" style="max-width:320px" aria-label="Name on certificate">
          <button class="btn sm" type="submit">Update name</button>
        </form>
        ${canPrint ? '<button class="btn primary" data-action="print">Print / Save as PDF</button>' : ''}
        <a class="btn" href="${OFFICIAL_URL}" target="_blank" rel="noopener">Register for the official exam ↗</a>
      </div>
      <div class="cert">
        <div class="seal">MOCK<br>PASSED</div>
        <div class="sub" style="letter-spacing:.2em;text-transform:uppercase;font-size:.8rem;font-family:var(--sans)">Certificate of Mock Exam Completion</div>
        <h1>${EXAM.title}</h1>
        <div class="sub">Practice Exam (${EXAM.code} blueprint) — this certifies that</div>
        <div class="who">${esc(name)}</div>
        <div class="sub">passed a full, timed ${EXAM.itemCount}-item mock examination covering all eight ${EXAM.code} content domains,<br>meeting the ${EXAM.scale.passing} scaled-score passing standard.</div>
        <div class="meta">
          <div><b>${r.score.scaled} / ${EXAM.scale.max}</b>Scaled score</div>
          <div><b>${r.score.correctCount} / ${r.score.itemCount}</b>Items correct</div>
          <div><b>${esc(diffOf(r).label)}</b>Difficulty</div>
          <div><b>${new Date(r.finishedAt).toLocaleDateString(undefined, { dateStyle: 'long' })}</b>Date</div>
          <div><b style="font-family:var(--mono);font-size:.95rem">${verificationCode(r)}</b>Reference</div>
        </div>
        <p class="disclaimer">This is a readiness certificate from an independent practice exam. It is not issued by Anthropic and is not the Claude Certified Developer – Foundations credential. The official credential is earned only by passing the proctored ${EXAM.code} exam delivered by Pearson VUE through the Anthropic Partner Academy.</p>
      </div>
    </main>`));
}

// ---------------------------------------------------------------- practice setup

function viewPracticeSetup() {
  if (active) { location.hash = '#/exam'; return; }
  const q = new URLSearchParams(location.hash.split('?')[1] ?? '');
  const pre = (q.get('domains') ?? '').split(',').map(Number).filter(Boolean);

  render(shell(`
    <main class="wrap" style="max-width:820px">
      <h1>Practice drill</h1>
      <p class="muted">Choose domains to focus on. Drills spread questions across every skill in the chosen domains and can show the answer and explanation straight after each question.</p>
      <form class="card" data-form="practice">
        <h3>Domains</h3>
        <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:10px;margin-bottom:18px">
          ${DOMAINS.map((d) => `
            <label class="check"><input type="checkbox" name="domain" value="${d.id}" ${!pre.length || pre.includes(d.id) ? 'checked' : ''}>
              <span>${d.id}. ${esc(d.name)} <span class="muted small">(${QUESTIONS.filter((x) => x.domain === d.id).length} items)</span></span></label>`).join('')}
        </div>
        <h3>Difficulty mode</h3>
        ${difficultyPicker(store.getPrefs().difficulty ?? 'standard', null, false)}
        ${IMPORTED.length ? `
        <label class="field"><span>Question pool</span>
          <select name="pool" id="practice-pool">
            <option value="bank">Reviewed bank (${QUESTIONS.length} items)</option>
            <option value="imported">Imported sets only (${IMPORTED.length} items)</option>
            <option value="both">Both</option>
          </select>
          <span class="small muted" style="font-weight:400">Imported sets are third-party question files you added under <code>data/imported/</code>. They are not reviewed, may contain answers that predate current model behaviour, and are never used in the scored mocks.</span>
        </label>` : ''}
        <div class="grid grid-3">
          <label class="field"><span>Number of questions</span>
            <select name="count">${[10, 15, 20, 30, 53].map((n) => `<option value="${n}" ${n === 15 ? 'selected' : ''}>${n}</option>`).join('')}<option value="999">All available</option></select>
          </label>
          <label class="field"><span>Feedback</span>
            <select name="instant"><option value="1">After each question</option><option value="0">At the end</option></select>
          </label>
          <label class="field"><span>Timer</span>
            <select name="timed"><option value="0">Untimed</option><option value="1">Exam pace (~${(SECONDS_PER_ITEM / 60).toFixed(1)} min per item)</option></select>
          </label>
        </div>
        <p class="notice warn" data-role="form-error" role="alert" hidden></p>
        <button class="btn primary" type="submit">Start drill</button>
      </form>
    </main>`));
}

// ---------------------------------------------------------------- study guide

function viewStudy() {
  render(shell(`
    <main class="wrap" style="max-width:900px">
      <h1>Study guide</h1>
      <p class="muted">Key facts, rules of thumb and common traps for all 25 skills in the ${EXAM.code} blueprint, with links to the official documentation. Read a domain, then run a practice drill on it.</p>
      <nav class="card" style="margin-bottom:20px" aria-label="Domains">
        <div class="row">${DOMAINS.map((d) => `<a class="btn sm" href="#/study" data-action="jump" data-target="domain-${d.id}">${d.id}. ${esc(d.name)}</a>`).join('')}</div>
      </nav>
      ${DOMAINS.map((d) => `
        <section id="domain-${d.id}" style="margin-bottom:28px">
          <div class="row" style="margin-bottom:10px">
            <h2 style="margin:0">Domain ${d.id}: ${esc(d.name)} <span class="pill">${d.weight}% of exam</span></h2>
            <span class="spacer"></span>
            <a class="btn sm" href="#/practice?domains=${d.id}">Drill this domain</a>
          </div>
          ${SKILLS.filter((s) => s.domain === d.id).map((s) => {
            const note = STUDY[s.id];
            return `<details class="card" style="margin-bottom:10px" ${d.id === 1 && s === SKILLS[0] ? 'open' : ''}>
              <summary style="cursor:pointer"><b>${esc(s.name)}</b> <span class="muted small">· ${s.weight}% of exam · ${QUESTIONS.filter((q) => q.skill === s.id).length} practice items</span></summary>
              ${note ? `
                <p style="margin-top:12px">${rich(note.summary)}</p>
                <ul>${note.points.map((p) => `<li style="margin-bottom:6px">${rich(p)}</li>`).join('')}</ul>
                ${note.docs?.length ? `<p class="small" style="margin:0"><b>Official docs:</b> ${note.docs.map((x) => `<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.title)}</a>`).join(' · ')}</p>` : ''}`
              : '<p class="muted" style="margin-top:12px">Notes coming soon.</p>'}
            </details>`;
          }).join('')}
        </section>`).join('')}
    </main>`));
}

// ---------------------------------------------------------------- history

function viewHistory() {
  const list = store.getHistory();
  render(shell(`
    <main class="wrap">
      <div class="row"><h1 style="margin:0">Attempt history</h1><span class="spacer"></span>
        ${list.length ? '<button class="btn sm danger" data-action="clear-history">Clear history</button>' : ''}</div>
      <p class="muted">Stored only in this browser.</p>
      ${list.length ? `
      <div class="card table-wrap">
        <table>
          <thead><tr><th>Date</th><th>Mode</th><th class="num">Score</th><th>Result</th><th class="num">Correct</th><th></th></tr></thead>
          <tbody>
            ${list.map((r) => `
              <tr>
                <td>${fmtDate(r.finishedAt)}</td>
                <td>${esc(MODES[r.mode].label)} <span class="pill">${esc(diffOf(r).label)}</span>${r.domains ? `<div class="small muted">Domains ${r.domains.join(', ')}</div>` : ''}</td>
                <td class="num"><b>${r.score.scaled}</b></td>
                <td><span class="pill ${r.score.passed ? 'ok' : 'bad'}">${r.score.passed ? 'Pass' : 'Fail'}</span></td>
                <td class="num">${r.score.correctCount}/${r.score.itemCount}</td>
                <td class="num"><a href="#/results/${encodeURIComponent(r.id)}">Report</a> · <a href="#/review/${encodeURIComponent(r.id)}">Review</a>${certificateEligible(r) ? ` · <a href="#/certificate/${encodeURIComponent(r.id)}">Certificate</a>` : ''}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>` : '<div class="card"><p style="margin:0">No attempts yet. <a href="#/start/full">Start the full mock</a> or <a href="#/practice">run a practice drill</a>.</p></div>'}
    </main>`));
}

// ---------------------------------------------------------------- about scoring

function viewAbout() {
  render(shell(`
    <main class="wrap" style="max-width:820px">
      <h1>How this mock is built and scored</h1>
      <section class="card" style="margin-bottom:16px">
        <h2>Exam format</h2>
        <p>Each full mock mirrors the official ${EXAM.code} format: ${EXAM.itemCount} items, ${EXAM.timeLimitMinutes} minutes, multiple-choice and multiple-response items that state how many responses to select, and a scaled score from ${EXAM.scale.min} to ${EXAM.scale.max} with a passing score of ${EXAM.scale.passing}.</p>
        <p style="margin:0">Items are drawn skill by skill in the proportions of the official blueprint (8 domains, 25 skills), then shuffled so domains are interleaved. Answer options are shuffled too, so every retake is a different form.</p>
      </section>
      <section class="card" style="margin-bottom:16px">
        <h2>The judging system</h2>
        <ul>
          <li><b>Criterion-referenced.</b> You're measured against a fixed standard, not against other candidates.</li>
          <li><b>All-or-nothing items.</b> A multiple-response item counts only if your selection exactly matches the key. Unanswered items score zero.</li>
          <li><b>Harder items weigh more.</b> Each item is tagged ${Object.values(DIFFICULTY).map((d) => `${esc(d.label)} (weight ${d.weight})`).join(', ')}.</li>
          <li><b>Scaled score.</b> Your difficulty-weighted percent correct is mapped onto ${EXAM.scale.min}–${EXAM.scale.max}. A weighted ${Math.round(EXAM.scale.cutRaw * 100)}% lands exactly on the ${EXAM.scale.passing} cut; below it the scale runs linearly down to ${EXAM.scale.min}, above it up to ${EXAM.scale.max}.</li>
          <li><b>Domain report.</b> Like the official score report, you get percent-correct per domain. It's feedback only — pass or fail comes from the total scaled score.</li>
        </ul>
        <p class="small muted" style="margin:0">The official cut score comes from a confidential standard-setting study, so no mock can reproduce it exactly. This model is deliberately set at a demanding standard: if you pass here consistently, you are in good shape for the real exam.</p>
      </section>
      <section class="card" style="margin-bottom:16px">
        <h2>Difficulty modes</h2>
        <div class="table-wrap"><table>
          <thead><tr><th>Mode</th>${Object.values(DIFFICULTY).map((d) => `<th class="num">${esc(d.label)}</th>`).join('')}<th class="num">Time</th><th>Certificate</th></tr></thead>
          <tbody>${Object.values(DIFFICULTY_MODES).map((d) => `<tr><td><b>${esc(d.label)}</b><div class="small muted">${esc(d.blurb)}</div></td>
            ${Object.keys(DIFFICULTY).map((k) => `<td class="num">${Math.round((d.mix[k] ?? 0) * 100)}%</td>`).join('')}
            <td class="num">${Math.round(d.timeFactor * 100)}%</td><td>${d.certificate ? 'Eligible' : '—'}</td></tr>`).join('')}</tbody>
        </table></div>
        <p class="small muted" style="margin:8px 0 0">Mix is the target share of each difficulty per skill; if a skill runs short of a level, the nearest level fills in. Time is relative to the exam's ${EXAM.timeLimitMinutes} minutes.</p>
      </section>
      <section class="card">
        <h2>Certificate</h2>
        <p style="margin:0">Passing the <b>full</b> timed mock at Exam-realistic difficulty or harder unlocks a printable readiness certificate and a link to register for the official exam on the Anthropic Partner Academy. The mock certificate is not an Anthropic credential; only the proctored ${EXAM.code} exam grants that.</p>
      </section>
    </main>`));
}

// ---------------------------------------------------------------- events

app.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const action = el.dataset.action;

  switch (action) {
    case 'choose-difficulty':
      el.closest('.grid').querySelectorAll('.opt').forEach((x) => x.classList.toggle('selected', x === el));
      break;
    case 'pick':
      e.preventDefault();
      pick(el.value);
      break;
    case 'prev': go(active.current - 1); break;
    case 'next': go(active.current + 1); break;
    case 'goto': go(Number(el.dataset.index)); break;
    case 'flag': {
      const id = active.itemIds[active.current];
      active.flags[id] = !active.flags[id];
      store.setActive(active);
      viewExam();
      break;
    }
    case 'check': {
      const id = active.itemIds[active.current];
      if (!(active.responses[id] ?? []).length) return;
      active.checked[id] = true;
      store.setActive(active);
      viewExam();
      break;
    }
    case 'submit':
      finishAttempt(false);
      break;
    case 'abandon':
      if (confirmTwice(el, 'Click again to abandon')) {
        store.clearActive();
        active = null;
        route();
      }
      break;
    case 'filter':
      reviewFilter = el.dataset.filter;
      route();
      break;
    case 'print': window.print(); break;
    case 'jump':
      e.preventDefault();
      document.getElementById(el.dataset.target)?.scrollIntoView({ behavior: 'smooth' });
      break;
    case 'clear-history':
      if (confirmTwice(el, 'Click again to delete all history')) { store.clearHistory(); route(); }
      break;
    default: break;
  }
});

app.addEventListener('submit', (e) => {
  const form = e.target;
  e.preventDefault();
  const data = new FormData(form);

  if (form.dataset.form === 'start') {
    if (!data.get('agree')) return;
    const candidate = String(data.get('candidate') ?? '');
    store.setPrefs({ candidate });
    const difficulty = String(data.get('difficulty') ?? 'standard');
    store.setPrefs({ candidate, difficulty });
    beginAttempt({ mode: form.dataset.mode, candidate, difficulty });
  }

  if (form.dataset.form === 'practice') {
    const domains = data.getAll('domain').map(Number);
    if (!domains.length) {
      const msg = form.querySelector('[data-role="form-error"]');
      if (msg) { msg.hidden = false; msg.textContent = 'Pick at least one domain to start a drill.'; }
      return;
    }
    beginAttempt({
      mode: 'practice',
      candidate: store.getPrefs().candidate,
      domains,
      count: Number(data.get('count')),
      difficulty: String(data.get('difficulty') ?? 'standard'),
      pool: String(data.get('pool') ?? 'bank'),
      instant: data.get('instant') === '1',
      timed: data.get('timed') === '1',
    });
  }

  if (form.dataset.form === 'rename') {
    const r = store.getResult(form.dataset.id);
    if (!r) return;
    r.candidate = String(data.get('candidate') ?? '').trim();
    store.addToHistory(r);
    store.setPrefs({ candidate: r.candidate });
    route();
  }
});

document.addEventListener('keydown', (e) => {
  if (!active || location.hash !== '#/exam') return;
  if (e.target.closest('input[type="text"], textarea, select') || e.metaKey || e.ctrlKey || e.altKey) return;
  const key = e.key.toUpperCase();
  const order = active.optionOrder[active.itemIds[active.current]];
  const letterIdx = LETTERS.indexOf(key);
  if (letterIdx >= 0 && letterIdx < order.length && key.length === 1) { e.preventDefault(); pick(order[letterIdx]); return; }
  if (/^[1-6]$/.test(e.key) && Number(e.key) <= order.length) { e.preventDefault(); pick(order[Number(e.key) - 1]); return; }
  if (e.key === 'ArrowRight') { e.preventDefault(); go(active.current + 1); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); go(active.current - 1); }
  else if (key === 'F') { e.preventDefault(); el('[data-action="flag"]')?.click(); }
  else if (e.key === 'Enter' && active.instant) { el('[data-action="check"]')?.click(); }
});

const el = (sel) => app.querySelector(sel);

// Browser dialogs aren't available everywhere this app is hosted, so
// destructive actions confirm with a second click on the same button.
function confirmTwice(button, prompt) {
  if (button.dataset.armed === '1') return true;
  button.dataset.armed = '1';
  const original = button.textContent;
  button.textContent = prompt;
  setTimeout(() => { button.dataset.armed = ''; button.textContent = original; }, 4000);
  return false;
}

window.addEventListener('beforeunload', () => { if (active) store.setActive(active); });

async function boot() {
  try {
    const data = await loadData();
    EXAM = data.exam;
    DOMAINS = EXAM.domains;
    SKILLS = EXAM.skills;
    DIFFICULTY = EXAM.difficultyLevels;
    DIFFICULTY_MODES = EXAM.difficultyModes;
    QUESTIONS = data.questions;
    IMPORTED = data.imported ?? [];
    // Imported sets are looked up for display but never drawn into scored mocks.
    QUESTION_MAP = new Map([...QUESTIONS, ...IMPORTED].map((q) => [q.id, q]));
    STUDY = data.study;
    OFFICIAL_URL = EXAM.officialUrl;
    SECONDS_PER_ITEM = (EXAM.timeLimitMinutes * 60) / EXAM.itemCount;
    MODES = { ...EXAM.modes, practice: { label: 'Practice Drill', items: null, minutes: null, certificate: false } };
    document.title = `${EXAM.code} Mock Exam`;
    route();
  } catch (err) {
    app.innerHTML = `<main class="wrap"><h1>Couldn't load the exam data</h1>
      <p>${esc(err.message)}</p>
      <p class="muted">Open this app through a local web server (run <code>npm start</code> or <code>python3 -m http.server</code> in the project folder), not by double-clicking index.html — browsers block loading JSON files from disk.</p></main>`;
  }
}

boot();
