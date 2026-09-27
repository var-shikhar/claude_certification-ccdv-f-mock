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

const NAV = [
  ['#/', 'Home', 'Home'],
  ['#/study', 'Study guide', 'Study'],
  ['#/practice', 'Practice', 'Practice'],
  ['#/history', 'History', 'History'],
  ['#/about', 'How scoring works', 'Scoring'],
];

function shell(content, { nav = true } = {}) {
  const route = (location.hash || '#/').split('?')[0];
  const link = ([href, label, short]) => {
    const on = href === '#/' ? route === '#/' : route.startsWith(href);
    return `<a href="${href}" class="${on ? 'active' : ''}" ${on ? 'aria-current="page"' : ''}><span class="nav-full">${label}</span><span class="nav-short">${short}</span></a>`;
  };
  return `
    ${nav ? `
    <header class="topbar no-print">
      <div class="wrap">
        <a class="brand" href="#/" aria-label="${esc(EXAM.code)} Mock Exam home"><span class="brand-mark" aria-hidden="true">CD</span><span class="brand-name">${esc(EXAM.code)} Mock Exam</span></a>
        <div class="nav-scroll"><nav class="nav" aria-label="Main">${NAV.map(link).join('')}</nav></div>
      </div>
    </header>` : ''}
    ${content}`;
}

function render(html) {
  app.innerHTML = html;
  window.scrollTo(0, 0);
  // Keep the active nav item in view on narrow screens, and drop the fade once fully scrolled.
  const nav = app.querySelector('.nav');
  if (nav) {
    const on = nav.querySelector('a.active');
    if (on) nav.scrollLeft = Math.max(0, on.offsetLeft - 12);
    updateNavFade(nav);
  }
}

function updateNavFade(nav) {
  const box = nav.parentElement;
  if (!box) return;
  box.classList.toggle('at-end', nav.scrollWidth - nav.clientWidth - nav.scrollLeft < 4);
  box.classList.toggle('scrolled', nav.scrollLeft > 4);
}

app.addEventListener('scroll', (e) => { if (e.target.classList?.contains('nav')) updateNavFade(e.target); }, true);

// ---------------------------------------------------------------- routing

function route() {
  stopTimer();
  // Query strings (e.g. #/practice?domains=1,2) belong to the view, not the route.
  const [, view, arg] = (location.hash || '#/').split('?')[0].split('/');
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
    case 'results': reviewIndex = 0; return viewResults(decodeURIComponent(arg ?? ''));
    case 'review': return viewAnswerReview(decodeURIComponent(arg ?? ''));
    case 'certificate': return viewCertificate(decodeURIComponent(arg ?? ''));
    case 'study': return viewStudy();
    case 'practice': return viewPracticeSetup();
    case 'history': return viewHistory();
    case 'about': return viewAbout();
    default: return viewNotFound();
  }
}

function viewNotFound() {
  render(shell(`
    <main class="wrap narrow">
      <section class="card empty">
        <span class="pill">404</span>
        <h2 class="mt-3">Page not found</h2>
        <p>There's nothing at <code>${esc(location.hash)}</code>. It may be an old link.</p>
        <div class="actions" style="justify-content:center">
          <a class="btn primary" href="#/">Go to Home</a>
          <a class="btn" href="#/history">Attempt history</a>
        </div>
      </section>
    </main>`));
}

window.addEventListener('hashchange', () => { if (EXAM) route(); });

// ---------------------------------------------------------------- home

function viewHome() {
  const history = store.getHistory();
  const fulls = history.filter((r) => r.mode === 'full');
  const best = fulls.reduce((m, r) => Math.max(m, r.score.scaled), 0);
  const passedFull = fulls.find(certificateEligible);
  const latest = history[0];

  render(shell(`
    <main class="wrap">
      ${active ? `
        <section class="resume" aria-label="Attempt in progress">
          <div class="resume-title">Attempt in progress</div>
          <p class="resume-meta">${esc(MODES[active.mode].label)} · question ${active.current + 1} of ${active.itemIds.length}${active.deadline ? ` · <b>${fmtClock(active.deadline - Date.now())}</b> left on the clock` : ' · untimed'}</p>
          <div class="actions">
            <a class="btn primary" href="#/exam">Resume exam</a>
            <button class="btn ghost danger" data-action="abandon">Abandon attempt</button>
          </div>
        </section>` : ''}

      <section class="hero">
        <span class="pill accent">${EXAM.code} · Blueprint v1.0</span>
        <h1>${EXAM.title}<span class="sub">Mock exam &amp; practice</span></h1>
        <p class="lead">A timed simulation of the real certification: ${EXAM.itemCount} scenario items across all 8 domains in ${EXAM.timeLimitMinutes} minutes, scored ${EXAM.scale.min}–${EXAM.scale.max.toLocaleString()} with a ${EXAM.scale.passing} pass mark. Every item is explained.</p>
        ${active ? '' : `
        <div class="actions">
          <a class="btn primary lg" href="#/start/full">Start full mock</a>
          <a class="btn" href="#/practice">Practice a domain</a>
        </div>`}
      </section>

      <section class="stat-strip" aria-label="Exam facts">
        <div class="stat"><b>${EXAM.itemCount}</b><span>items per form</span></div>
        <div class="stat"><b>${EXAM.timeLimitMinutes} min</b><span>time limit</span></div>
        <div class="stat"><b>${EXAM.scale.passing}</b><span>passing score</span></div>
        <div class="stat"><b>${QUESTIONS.length}</b><span>items in the bank</span></div>
      </section>

      <section class="mode-cards" aria-label="Ways to practise">
        <a class="mode-card" href="#/start/full">
          <span class="mc-title">Full Mock Exam <span class="pill ok">Certificate</span></span>
          <p class="mc-desc">${EXAM.itemCount} items · ${EXAM.timeLimitMinutes} min · no feedback until you submit.</p>
          <span class="mc-cta">Start</span>
        </a>
        <a class="mode-card" href="#/start/quick">
          <span class="mc-title">Quick Mock <span class="pill">Warm-up</span></span>
          <p class="mc-desc">${MODES.quick.items} items · ${MODES.quick.minutes} min · same rules and scoring, shorter sitting.</p>
          <span class="mc-cta">Start</span>
        </a>
        <a class="mode-card" href="#/practice">
          <span class="mc-title">Practice Drill <span class="pill">Learn</span></span>
          <p class="mc-desc">Pick domains, get the answer and explanation after every question.</p>
          <span class="mc-cta">Set up</span>
        </a>
      </section>

      ${passedFull ? `
        <section class="notice ok with-actions mb-5">
          <p><b>You've passed the full mock</b> (best ${best}). Your readiness certificate is ready.</p>
          <div class="actions">
            <a class="btn sm" href="#/certificate/${encodeURIComponent(passedFull.id)}">View certificate</a>
            <a class="btn sm primary" href="${OFFICIAL_URL}" target="_blank" rel="noopener">Official exam ↗</a>
          </div>
        </section>` : latest ? `
        <section class="notice with-actions mb-5">
          <p><b>Last attempt:</b> ${esc(MODES[latest.mode].label)} · ${latest.score.scaled} <span class="pill ${latest.score.passed ? 'ok' : 'bad'}">${latest.score.passed ? 'Pass' : 'Fail'}</span> <span class="muted small">${fmtDate(latest.finishedAt)}</span></p>
          <div class="actions">
            <a class="btn sm" href="#/results/${encodeURIComponent(latest.id)}">Score report</a>
            <a class="btn sm" href="#/history">All attempts</a>
          </div>
        </section>` : ''}

      <section class="card">
        <div class="section-title"><h2>Exam blueprint</h2><span class="small muted">Weight → items per ${EXAM.itemCount}-item form</span></div>
        <p class="small muted">Items are drawn per skill in the official proportions (largest-remainder rounding), matching Section 6 of the exam guide.</p>
        <div class="dom-list wide">
          ${DOMAINS.map((d) => {
            const skills = SKILLS.filter((s) => s.domain === d.id);
            return `<div class="dom-row">
              <span class="dom-name">${d.id}. ${esc(d.name)}</span>
              <span class="dom-num"><b>${d.weight}%</b> · ${formCountForDomain(d.id)} items · ${QUESTIONS.filter((q) => q.domain === d.id).length} in bank</span>
              <span class="dom-sub">${skills.map((s) => `${esc(s.name)} (${s.weight}%)`).join(' · ')}</span>
            </div>`;
          }).join('')}
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
    <main class="wrap narrow">
      <div class="page-head">
        <h1>${esc(m.label)}</h1>
        <p class="page-meta">${m.items} items · ${m.minutes} min · scaled ${EXAM.scale.min}–${EXAM.scale.max.toLocaleString()} · pass at ${EXAM.scale.passing}${mode === 'full' ? ' · certificate on a pass' : ''}</p>
      </div>

      <form class="card" data-form="start" data-mode="${mode}">
        <fieldset class="plain">
          <legend>Difficulty</legend>
          <p class="small muted">Sets the mix of item difficulties and the time limit. You get a full score report in every mode.</p>
          ${difficultyPicker(prefs.difficulty ?? 'standard', m.minutes, mode === 'full')}
        </fieldset>

        <label class="field"><span>Candidate name <span class="hint">(optional — shown on your certificate)</span></span>
          <input type="text" name="candidate" maxlength="80" autocomplete="name" value="${esc(prefs.candidate ?? '')}" placeholder="Your name">
        </label>

        <details class="rules" open>
          <summary>Exam rules</summary>
          <ul>
            <li><b>Timer runs from Begin</b> — even if you leave or refresh. At zero the exam submits itself.</li>
            <li><b>No partial credit.</b> Multiple-response items score only when your selection matches the key exactly.</li>
            <li><b>Blank counts as wrong.</b> Answer everything; flag items to revisit before you submit.</li>
            <li><b>No feedback until you submit.</b> Then: scaled score, domain breakdown, every item explained.</li>
            <li><b>Exam conditions.</b> Closed book, no notes, no second screen.</li>
          </ul>
        </details>

        <label class="check mb-4">
          <input type="checkbox" name="agree" required>
          <span>I'll take this under exam conditions and understand it is an independent practice exam, not the official ${EXAM.code} exam or an Anthropic credential.</span>
        </label>
        <div class="sticky-cta actions">
          <button class="btn primary lg" type="submit">Begin exam</button>
        </div>
      </form>
      <p class="small muted mt-4" style="text-align:center"><a href="#/">Cancel and go back</a></p>
    </main>`));
  // Rules are a collapsible on phones only; start them closed there to keep the form short.
  if (window.matchMedia('(max-width: 600px)').matches) app.querySelector('.rules')?.removeAttribute('open');
}

function difficultyPicker(selected, baseMinutes, showCert) {
  const levels = Object.keys(DIFFICULTY);
  return `<div class="mode-grid" role="radiogroup" aria-label="Difficulty">
    ${Object.entries(DIFFICULTY_MODES).map(([key, d]) => `
      <label class="mode ${key === selected ? 'selected' : ''}" data-action="choose-difficulty">
        <input type="radio" name="difficulty" value="${key}" ${key === selected ? 'checked' : ''}>
        <span class="mode-body">
          <span class="mode-title"><b>${esc(d.label)}</b>${showCert && d.certificate ? ' <span class="pill ok">Certificate</span>' : ''}<span class="mode-time">${baseMinutes ? `${Math.ceil(baseMinutes * d.timeFactor)} min` : `${Math.round(d.timeFactor * 100)}% time`}</span></span>
          <span class="mode-detail">
            <span class="small muted">${esc(d.blurb)}</span>
            <span class="mix-bar" aria-hidden="true">${levels.map((k) => `<i class="lv${k}" style="flex:${Math.round((d.mix[k] ?? 0) * 100)}"></i>`).join('')}</span>
            <span class="mix-legend small">${levels.filter((k) => d.mix[k]).map((k) => `<span><i class="lv${k}"></i>${esc(DIFFICULTY[k].label)} ${Math.round(d.mix[k] * 100)}%</span>`).join('')}</span>
          </span>
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
  const last = idx === n - 1;

  const optionsHtml = active.optionOrder[q.id].map((optId, i) => {
    const o = q.options.find((x) => x.id === optId);
    const isSel = selected.includes(o.id);
    let cls = 'opt' + (multi ? ' multi' : '') + (isSel ? ' selected' : '');
    if (revealed) cls += (o.correct ? ' key' : isSel ? ' wrong' : '') + ' locked';
    return `
      <label class="${cls}">
        <input type="${multi ? 'checkbox' : 'radio'}" name="opt" value="${o.id}" ${isSel ? 'checked' : ''} ${revealed ? 'disabled' : ''} data-action="pick">
        <span class="letter" aria-hidden="true">${LETTERS[i]}</span>
        <span class="opt-text">${rich(o.text)}</span>
        ${revealed ? `<span class="why"><b>${o.correct ? 'Correct' : 'Incorrect'}.</b> ${rich(o.why)}</span>` : ''}
      </label>`;
  }).join('');

  const verdict = revealed ? isCorrect(q, selected) : null;
  const title = active.mode === 'practice' ? 'Practice Drill' : `${EXAM.code} · ${MODES[active.mode].label}`;

  render(`
    <div class="exam-shell">
      <header class="exam-head">
        <div class="exam-head-row">
          <div class="exam-id">
            <span class="exam-title">${esc(title)}</span>
            <span class="exam-cand">${esc(active.candidate || diffOf(active).label)}</span>
          </div>
          <div class="exam-count" aria-live="polite"><b>${idx + 1}</b><span>/ ${n}</span></div>
          ${active.deadline
            ? `<div class="exam-clock"><span class="clock-label">Time remaining</span><span class="timer" id="timer" role="timer" aria-live="off">${fmtClock(active.deadline - Date.now())}</span></div>`
            : '<div class="exam-clock"><span class="clock-label">Untimed</span><span class="timer">--:--</span></div>'}
        </div>
        <div class="progress" aria-hidden="true"><i style="width:${(answeredCount / n) * 100}%"></i></div>
      </header>

      <div class="exam-body">
        <main class="exam-main" id="exam-main">
          <div class="q-head">
            <span class="q-num">Question ${idx + 1}</span>
            ${active.mode === 'practice' ? `<span class="pill">D${q.domain} · ${esc(skillById(q.skill).name)}</span>` : ''}
            ${flagged ? '<span class="pill warn">⚑ Flagged</span>' : ''}
          </div>
          <div class="q-stem">${rich(q.stem)}</div>
          <p class="q-select">${multi ? `Select ${words[q.select] ?? q.select}.` : 'Select one.'}</p>
          <fieldset class="options" aria-label="Answer options">${optionsHtml}</fieldset>

          ${revealed ? `
            <div class="notice explain ${verdict ? 'good' : 'bad'}">
              <h3>${verdict ? '✓ Correct' : '✗ Incorrect'}</h3>
              <p style="margin:0">${rich(q.explanation)}</p>
              ${q.reference ? `<p class="small muted" style="margin:8px 0 0">Reference: ${esc(q.reference)}</p>` : ''}
            </div>` : ''}
          ${active.instant && !revealed ? `<div class="q-check"><button class="btn primary" data-action="check" ${selected.length ? '' : 'disabled'}>Check answer</button></div>` : ''}
          <p class="small muted key-hint">Keys: A–F select · ← → move · F flag · N navigator${active.instant ? ' · Enter check' : ''}</p>
        </main>

        <aside class="exam-nav ${navOpen ? 'open' : ''}" id="exam-nav" aria-label="Question navigator">
          <div class="exam-nav-head">
            <b>Questions</b>
            <span class="muted small">${answeredCount} answered · ${Object.values(active.flags).filter(Boolean).length} flagged</span>
            <button class="btn sm ghost nav-close" data-action="toggle-nav" aria-label="Close navigator">✕</button>
          </div>
          ${navigatorGrid()}
          <div class="exam-nav-foot">
            <a class="btn sm" href="#/submit">Review all &amp; end exam</a>
          </div>
        </aside>
        <div class="exam-backdrop ${navOpen ? 'open' : ''}" data-action="toggle-nav"></div>
      </div>

      <footer class="exam-foot">
        <button class="btn" data-action="prev" ${idx === 0 ? 'disabled' : ''} aria-label="Previous question">‹ <span class="lbl">Previous</span></button>
        <button class="btn ${flagged ? 'flag-on' : ''}" data-action="flag" aria-pressed="${flagged}">⚑ <span class="lbl">${flagged ? 'Flagged' : 'Flag'}</span></button>
        <button class="btn nav-toggle" data-action="toggle-nav" aria-controls="exam-nav" aria-expanded="${navOpen}">▦ <span class="lbl">${answeredCount}/${n}</span></button>
        <span class="spacer"></span>
        ${last
          ? `<a class="btn primary" href="#/submit">End exam</a>`
          : `<button class="btn primary" data-action="next">Next ›</button>`}
      </footer>
      <div class="toast" id="toast" role="status" aria-live="polite" hidden></div>
    </div>`);

  document.documentElement.classList.add('in-exam');
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
    return `<button class="${cls}" data-action="goto" data-index="${i}" aria-label="Question ${i + 1}${ans ? ', answered' : ', unanswered'}${active.flags[id] ? ', flagged' : ''}" ${i === active.current ? 'aria-current="true"' : ''}>${i + 1}</button>`;
  }).join('');
  return `<div class="nav-grid">${cells}</div>
    <div class="legend"><span><i class="lg-ans"></i>Answered</span><span><i></i>Unanswered</span><span><i class="lg-flag"></i>Flagged</span><span><i class="lg-cur"></i>Current</span></div>`;
}

let navOpen = false;
const TIME_WARNINGS = [30, 15, 5, 1];

function showToast(message, ms = 6000) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = message;
  t.hidden = false;
  clearTimeout(showToast.h);
  showToast.h = setTimeout(() => { t.hidden = true; }, ms);
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
    const minutesLeft = Math.ceil(left / 60_000);
    active.warned ??= {};
    for (const m of TIME_WARNINGS) {
      if (minutesLeft <= m && !active.warned[m]) {
        active.warned[m] = true;
        store.setActive(active);
        showToast(m === 1 ? 'Less than 1 minute remaining. The exam will submit automatically.' : `${m} minutes remaining.`);
      }
    }
    if (left <= 0) finishAttempt(true);
  };
  tick();
  timerHandle = setInterval(tick, 1000);
}

function stopTimer() {
  if (timerHandle) clearInterval(timerHandle);
  timerHandle = null;
  document.documentElement.classList.remove('in-exam');
}

// ---------------------------------------------------------------- review before submit

function viewSubmitReview() {
  const ids = active.itemIds;
  const unanswered = ids.filter((id) => !(active.responses[id] ?? []).length);
  const flagged = ids.filter((id) => active.flags[id]);

  render(`
    <header class="exam-head">
      <div class="exam-head-row">
        <div class="exam-id"><span class="exam-title">${esc(MODES[active.mode].label)} · Review</span><span class="exam-cand">${esc(active.candidate || diffOf(active).label)}</span></div>
        <div class="exam-count"><b>${ids.length - unanswered.length}</b><span>/ ${ids.length} answered</span></div>
        ${active.deadline ? `<div class="exam-clock"><span class="clock-label">Time remaining</span><span class="timer" id="timer">${fmtClock(active.deadline - Date.now())}</span></div>` : '<div class="exam-clock"><span class="clock-label">Untimed</span><span class="timer">--:--</span></div>'}
      </div>
    </header>
    <main class="wrap" style="max-width:820px">
      <h1>Review before you end the exam</h1>
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
      <div class="card end-box">
        <h3>End exam</h3>
        <p class="muted">Once you end the exam you can't change answers. Your score report and full explanations appear immediately.</p>
        <button class="btn primary" data-action="submit">End exam and see results</button>
      </div>
    </main>
    <div class="toast" id="toast" role="status" aria-live="polite" hidden></div>`);
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
  if (!r) {
    render(shell(`<main class="wrap narrow"><section class="card empty"><h2>Result not found</h2><p>This attempt isn't stored in this browser.</p>
      <div class="actions" style="justify-content:center"><a class="btn primary" href="#/history">Attempt history</a><a class="btn ghost" href="#/">Home</a></div></section></main>`));
    return;
  }
  const s = r.score;
  const mode = MODES[r.mode];
  const certEligible = certificateEligible(r);
  const weakest = [...s.bySkill].filter((x) => x.percent < 70).sort((a, b) => a.percent - b.percent).slice(0, 5);
  const weakDomains = [...new Set(weakest.map((x) => skillById(x.id).domain))];
  const duration = r.finishedAt - r.startedAt;
  const reviewHref = `#/review/${encodeURIComponent(r.id)}`;

  render(shell(`
    <main class="wrap">
      ${r.timedOut ? '<div class="notice warn mb-4">Time expired — your exam was submitted automatically.</div>' : ''}
      <div class="page-head">
        <h1>Score report</h1>
        <p class="page-meta">${esc(mode.label)} · ${esc(diffOf(r).label)} · ${fmtDate(r.finishedAt)}${r.candidate ? ` · ${esc(r.candidate)}` : ''}</p>
      </div>

      <section class="card score-hero mb-4">
        <div class="score-main">
          <div class="verdict ${s.passed ? 'pass' : 'fail'}">${s.passed ? 'PASS' : 'FAIL'}</div>
          <div class="scaled">${s.scaled}<span class="of"> / ${EXAM.scale.max}</span></div>
          <p class="muted small" style="margin:6px 0 0">Scaled score · pass mark ${EXAM.scale.passing}</p>
        </div>
        <div class="score-side">
          ${scaleBar(s.scaled, s.passed)}
          <div class="score-stats">
            <div class="stat"><b>${s.correctCount}/${s.itemCount}</b><span>correct</span></div>
            <div class="stat"><b>${s.answeredCount}/${s.itemCount}</b><span>answered</span></div>
            <div class="stat"><b>${fmtClock(duration)}</b><span>time${r.minutes ? ` of ${r.minutes} min` : ''}</span></div>
          </div>
        </div>
        <div class="score-cta actions">
          <a class="btn primary lg" href="${reviewHref}">Review answers &amp; explanations</a>
          ${certEligible ? `<a class="btn" href="#/certificate/${encodeURIComponent(r.id)}">Get certificate</a>` : ''}
        </div>
      </section>

      ${certEligible ? `
        <section class="notice ok with-actions mb-4">
          <p><b>Congratulations — you passed the full mock.</b> You're ready to register for the official ${EXAM.code} exam.</p>
          <div class="actions"><a class="btn sm" href="${OFFICIAL_URL}" target="_blank" rel="noopener">Register for the official exam ↗</a></div>
        </section>` : ''}
      ${!s.passed && r.mode === 'full' ? `
        <section class="notice warn mb-4">
          You need ${EXAM.scale.passing} to pass. Review every explanation, drill your weakest domains, then retake — each attempt draws a fresh form.
        </section>` : ''}
      ${s.passed && r.mode === 'full' && !diffOf(r).certificate ? `
        <section class="notice mb-4">Nice pass at ${esc(diffOf(r).label)} difficulty. The certificate needs a full-mock pass at Exam-realistic difficulty or harder — <a href="#/start/full">step up a level</a>.</section>` : ''}
      ${s.passed && r.mode === 'quick' ? `
        <section class="notice mb-4">Good result. The certificate is awarded for passing the <b>full</b> ${EXAM.itemCount}-item mock — <a href="#/start/full">take it next</a>.</section>` : ''}

      <div class="grid grid-2 mb-4">
        <section class="card">
          <h2>Performance by domain</h2>
          <p class="small muted">Percent correct per domain, as on the official score report. Feedback only — pass/fail comes from the scaled score.</p>
          <div class="dom-list">
            ${s.byDomain.map((d) => `
              <div class="dom-row ${d.percent != null && d.percent < 70 ? 'low' : ''}">
                <span class="dom-name">${d.id}. ${esc(d.name)}</span>
                <span class="dom-num"><b>${pct(d.percent)}</b> · ${d.correct}/${d.total}</span>
                <div class="bar ${d.percent >= 70 ? 'ok' : 'bad'}" aria-hidden="true"><i style="width:${d.percent ?? 0}%"></i></div>
              </div>`).join('')}
          </div>
        </section>
        <section class="card">
          <h2>What to study next</h2>
          ${weakest.length ? `
            <p class="small muted">Skills under 70% on this form. Tap one to drill its domain.</p>
            <div class="next-list">
              ${weakest.map((x) => {
                const dom = skillById(x.id).domain;
                return `<a class="next-item" href="#/practice?domains=${dom}">
                  <span class="ni-name">${esc(x.name)}</span>
                  <span class="ni-sub">Domain ${dom} · ${esc(domainById(dom).name)}</span>
                  <span class="ni-score">${x.correct}/${x.total}</span>
                </a>`;
              }).join('')}
            </div>
            <div class="actions">
              <a class="btn" href="#/practice?domains=${weakDomains.join(',')}">Drill all weak domains</a>
              <a class="btn ghost" href="#/study">Study guide</a>
            </div>
          ` : `<p>No skill below 70% on this form. Keep your edge by reviewing the explanations for anything you guessed on.</p>
            <div class="actions"><a class="btn" href="#/study">Study guide</a></div>`}
        </section>
      </div>

      <div class="actions">
        <a class="btn" href="#/start/${r.mode === 'practice' ? 'full' : r.mode}">${r.mode === 'practice' ? 'Take the full mock' : 'Retake with a new form'}</a>
        <a class="btn ghost" href="#/history">All attempts</a>
        <a class="btn ghost" href="#/">Home</a>
      </div>
    </main>`));
}

// ---------------------------------------------------------------- answer review

let reviewIndex = 0;

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
  const list = rows.map((row, i) => ({ row, i })).filter(({ row }) => filters[filter](row));

  if (!list.length) {
    render(shell(`<main class="wrap" style="max-width:900px">
      ${reviewHeader(r, filter, count)}
      <section class="card"><p class="muted" style="margin:0">Nothing in this view.</p></section></main>`));
    return;
  }

  reviewIndex = Math.max(0, Math.min(list.length - 1, reviewIndex));
  const { row, i } = list[reviewIndex];
  const q = QUESTION_MAP.get(row.id);
  const order = r.optionOrder[q.id] ?? q.options.map((o) => o.id);
  const keyLetters = order.map((oid, k) => (q.options.find((o) => o.id === oid).correct ? LETTERS[k] : null)).filter(Boolean);
  const yourLetters = order.map((oid, k) => (row.selected.includes(oid) ? LETTERS[k] : null)).filter(Boolean);

  const navCells = list.map(({ row: x, i: qi }, li) => {
    let cls = 'nav-cell ' + (x.correct ? 'is-ok' : x.answered ? 'is-bad' : 'is-blank');
    if (r.flags[x.id]) cls += ' flagged';
    if (li === reviewIndex) cls += ' current';
    return `<button class="${cls}" data-action="review-goto" data-index="${li}" aria-label="Question ${qi + 1}, ${x.correct ? 'correct' : x.answered ? 'incorrect' : 'unanswered'}">${qi + 1}</button>`;
  }).join('');

  render(shell(`
    <main class="wrap" style="max-width:1100px">
      ${reviewHeader(r, filter, count)}
      <div class="review-layout">
        <section class="card review-card">
          <div class="q-head">
            <span class="q-num">Question ${i + 1} of ${rows.length}</span>
            <span class="pill ${row.correct ? 'ok' : 'bad'}">${row.correct ? '✓ Correct' : row.answered ? '✗ Incorrect' : '— Unanswered'}</span>
            <span class="pill">D${q.domain} · ${esc(skillById(q.skill).name)}</span>
            <span class="pill">${esc(DIFFICULTY[q.difficulty].label)}</span>
            ${r.flags[q.id] ? '<span class="pill warn">⚑ Flagged</span>' : ''}
            ${q.source?.startsWith('Imported') ? '<span class="pill">Imported set</span>' : ''}
          </div>
          <div class="q-stem">${rich(q.stem)}</div>
          <p class="answer-line"><span>Your answer: <b>${yourLetters.join(', ') || '—'}</b></span><span>Correct answer: <b>${keyLetters.join(', ')}</b></span></p>
          <div class="options">
            ${order.map((oid, k) => {
              const o = q.options.find((x) => x.id === oid);
              const mine = row.selected.includes(oid);
              const cls = 'opt locked' + (q.type === 'multi' ? ' multi' : '') + (o.correct ? ' key' : mine ? ' wrong' : '');
              return `<div class="${cls}"><span class="letter" aria-hidden="true">${LETTERS[k]}</span><span class="opt-text">${rich(o.text)}${mine ? ' <span class="pill">your choice</span>' : ''}</span>
                <span class="why"><b>${o.correct ? 'Why it’s right:' : 'Why it’s wrong:'}</b> ${rich(o.why)}</span></div>`;
            }).join('')}
          </div>
          <div class="notice explain ${row.correct ? 'good' : 'bad'}">
            <h3>Explanation</h3>
            <p style="margin:0">${rich(q.explanation)}</p>
            ${q.reference ? `<p class="small muted" style="margin:8px 0 0">Reference: ${esc(q.reference)}</p>` : ''}
          </div>
          <div class="review-actions">
            <button class="btn" data-action="review-prev" ${reviewIndex === 0 ? 'disabled' : ''}>‹ Previous</button>
            <span class="muted small">${reviewIndex + 1} of ${list.length} in this view</span>
            <span class="spacer"></span>
            ${reviewIndex < list.length - 1
              ? '<button class="btn primary" data-action="review-next">Next ›</button>'
              : `<a class="btn primary" href="#/results/${encodeURIComponent(r.id)}">Back to score report</a>`}
          </div>
          <p class="small muted key-hint" style="margin-top:12px">Keys: ← → move between questions</p>
        </section>
        <aside class="card review-nav" aria-label="Question navigator">
          <h3 style="margin-bottom:8px">Questions</h3>
          <div class="nav-grid">${navCells}</div>
          <div class="legend"><span><i class="lg-ok"></i>Correct</span><span><i class="lg-bad"></i>Incorrect</span><span><i></i>Unanswered</span><span><i class="lg-flag"></i>Flagged</span></div>
        </aside>
      </div>
    </main>`));
}

function reviewHeader(r, filter, count) {
  const filters = ['all', 'incorrect', 'correct', 'flagged', 'unanswered'];
  return `
    <div class="row" style="margin-bottom:6px">
      <h1 style="margin:0">Answer review</h1>
      <span class="spacer"></span>
      <a class="btn sm" href="#/results/${encodeURIComponent(r.id)}">← Score report</a>
    </div>
    <p class="muted">${esc(MODES[r.mode].label)} · ${r.score.scaled} / ${EXAM.scale.max} · ${r.score.passed ? 'Pass' : 'Fail'}</p>
    <div class="tabs" role="tablist" style="margin-bottom:14px">
      ${filters.map((k) => `<button role="tab" aria-selected="${k === filter}" class="${k === filter ? 'active' : ''}" data-action="filter" data-filter="${k}">${k[0].toUpperCase() + k.slice(1)} (${count(k)})</button>`).join('')}
    </div>`;
}

// ---------------------------------------------------------------- certificate

function viewCertificate(id) {
  const r = store.getResult(id);
  if (!r || !certificateEligible(r)) {
    render(shell(`<main class="wrap narrow"><section class="card empty"><h2>Certificate not available</h2>
      <p>The readiness certificate is awarded for passing the full ${EXAM.itemCount}-item, ${EXAM.timeLimitMinutes}-minute mock at Exam-realistic difficulty or harder, with a scaled score of ${EXAM.scale.passing} or higher.</p>
      <div class="actions" style="justify-content:center"><a class="btn primary" href="#/start/full">Take the full mock</a><a class="btn ghost" href="#/history">Attempt history</a></div></section></main>`));
    return;
  }
  const name = r.candidate || 'Candidate';
  render(shell(`
    <main class="wrap">
      <div class="page-head no-print">
        <h1>Your certificate</h1>
        <p class="page-meta">Full mock passed · ${r.score.scaled} / ${EXAM.scale.max} · ${fmtDate(r.finishedAt)}</p>
      </div>
      <div class="cert-tools no-print">
        <form class="rename" data-form="rename" data-id="${esc(r.id)}">
          <label class="field"><span>Name on certificate</span>
            <input type="text" name="candidate" maxlength="80" value="${esc(r.candidate)}" placeholder="Your name" autocomplete="name">
          </label>
          <button class="btn" type="submit">Update</button>
        </form>
        <div class="actions">
          ${canPrint ? '<button class="btn primary" data-action="print">Print / Save as PDF</button>' : ''}
          <a class="btn ${canPrint ? '' : 'primary'}" href="${OFFICIAL_URL}" target="_blank" rel="noopener">Register for the official exam ↗</a>
        </div>
      </div>
      <div class="cert">
        <div class="seal">MOCK<br>PASSED</div>
        <div class="kicker">Certificate of Mock Exam Completion</div>
        <h1>${EXAM.title}</h1>
        <div class="sub">Practice Exam (${EXAM.code} blueprint) — this certifies that</div>
        <div class="who">${esc(name)}</div>
        <div class="sub">passed a full, timed ${EXAM.itemCount}-item mock examination covering all eight ${EXAM.code} content domains, meeting the ${EXAM.scale.passing} scaled-score passing standard.</div>
        <div class="meta">
          <div><b>${r.score.scaled} / ${EXAM.scale.max}</b>Scaled score</div>
          <div><b>${r.score.correctCount} / ${r.score.itemCount}</b>Items correct</div>
          <div><b>${esc(diffOf(r).label)}</b>Difficulty</div>
          <div><b>${new Date(r.finishedAt).toLocaleDateString(undefined, { dateStyle: 'long' })}</b>Date</div>
          <div><b class="ref">${verificationCode(r)}</b>Reference</div>
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
  const countOf = (d) => QUESTIONS.filter((x) => x.domain === d.id).length;

  render(shell(`
    <main class="wrap narrow">
      <div class="page-head">
        <h1>Practice drill</h1>
        <p class="page-meta">Pick the domains to work on. Questions spread across every skill in them, with the answer and explanation after each one.</p>
      </div>
      <form class="card" data-form="practice">
        <fieldset class="plain">
          <div class="legend-row">
            <legend>Domains</legend>
            <button class="btn sm ghost" type="button" data-action="select-domains" data-value="all">Select all</button>
            <button class="btn sm ghost" type="button" data-action="select-domains" data-value="none">None</button>
            <span class="small muted" data-role="domain-count" aria-live="polite"></span>
          </div>
          <div class="chips domains">
            ${DOMAINS.map((d) => `
              <label class="chip"><input type="checkbox" name="domain" value="${d.id}" ${!pre.length || pre.includes(d.id) ? 'checked' : ''}>
                <span class="tick" aria-hidden="true">✓</span><span>${d.id}. ${esc(d.name)}</span><span class="cnt">${countOf(d)}</span></label>`).join('')}
          </div>
        </fieldset>

        <fieldset class="plain">
          <legend>Difficulty</legend>
          ${difficultyPicker(store.getPrefs().difficulty ?? 'standard', null, false)}
        </fieldset>

        ${IMPORTED.length ? `
        <label class="field"><span>Question pool</span>
          <select name="pool" id="practice-pool">
            <option value="bank">Reviewed bank (${QUESTIONS.length} items)</option>
            <option value="imported">Imported sets only (${IMPORTED.length} items)</option>
            <option value="both">Both</option>
          </select>
          <span class="hint">Imported sets are unreviewed third-party files from <code>data/imported/</code>; they're never used in scored mocks.</span>
        </label>` : ''}
        <div class="grid grid-3" style="gap:0 16px">
          <label class="field"><span>Questions</span>
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
        <div class="sticky-cta actions">
          <button class="btn primary lg" type="submit">Start drill</button>
        </div>
      </form>
    </main>`));
  updateDomainCount();
}

function updateDomainCount() {
  const form = app.querySelector('[data-form="practice"]');
  if (!form) return;
  const picked = [...form.querySelectorAll('input[name="domain"]:checked')].map((i) => Number(i.value));
  const items = QUESTIONS.filter((q) => picked.includes(q.domain)).length;
  const out = form.querySelector('[data-role="domain-count"]');
  if (out) out.textContent = picked.length ? `${picked.length} of ${DOMAINS.length} · ${items} items` : 'Pick at least one';
  const err = form.querySelector('[data-role="form-error"]');
  if (err && picked.length) err.hidden = true;
}

// ---------------------------------------------------------------- study guide

function viewStudy() {
  render(shell(`
    <main class="wrap mid">
      <div class="page-head">
        <h1>Study guide</h1>
        <p class="page-meta">Key facts, rules of thumb and common traps for all ${SKILLS.length} skills in the ${EXAM.code} blueprint, with links to the official docs. Read a domain, then drill it.</p>
      </div>
      <nav class="jump-bar" aria-label="Jump to domain">
        <div class="chips">${DOMAINS.map((d) => `<a class="chip" href="#/study" data-action="jump" data-target="domain-${d.id}">${d.id}. ${esc(d.name)}</a>`).join('')}</div>
      </nav>
      ${DOMAINS.map((d) => `
        <section aria-labelledby="domain-${d.id}-title">
          <div class="domain-head" id="domain-${d.id}">
            <h2 id="domain-${d.id}-title">Domain ${d.id}: ${esc(d.name)} <span class="pill">${d.weight}%</span></h2>
            <a class="chip drill" href="#/practice?domains=${d.id}">Drill domain</a>
          </div>
          ${SKILLS.filter((s) => s.domain === d.id).map((s) => {
            const note = STUDY[s.id];
            return `<details class="card skill" ${d.id === 1 && s === SKILLS[0] ? 'open' : ''}>
              <summary><span class="sk-name">${esc(s.name)}</span><span class="sk-meta">${s.weight}% · ${QUESTIONS.filter((q) => q.skill === s.id).length} items</span><a class="chip drill" href="#/practice?domains=${d.id}" data-action="drill">Drill</a></summary>
              <div class="skill-body">
              ${note ? `
                <p>${rich(note.summary)}</p>
                <ul>${note.points.map((p) => `<li>${rich(p)}</li>`).join('')}</ul>
                ${note.docs?.length ? `<p class="small" style="margin:0"><b>Official docs:</b> ${note.docs.map((x) => `<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.title)}</a>`).join(' · ')}</p>` : ''}`
              : '<p class="muted" style="margin:0">Notes coming soon.</p>'}
              </div>
            </details>`;
          }).join('')}
        </section>`).join('')}
    </main>`));
}

// ---------------------------------------------------------------- history

function viewHistory() {
  const list = store.getHistory();
  render(shell(`
    <main class="wrap mid">
      <div class="page-head">
        <h1>Attempt history</h1>
        ${list.length ? '<div class="page-side"><button class="btn sm ghost danger" data-action="clear-history">Clear history</button></div>' : ''}
        <p class="page-meta">${list.length ? `${list.length} attempt${list.length > 1 ? 's' : ''}, stored only in this browser.` : 'Stored only in this browser.'}</p>
      </div>
      ${list.length ? `
      <div class="hist">
        ${list.map((r) => `
          <article class="card hist-row">
            <div class="h-mode">${esc(MODES[r.mode].label)} <span class="pill">${esc(diffOf(r).label)}</span>${certificateEligible(r) ? '<span class="pill ok">Certificate</span>' : ''}</div>
            <p class="h-meta">${fmtDate(r.finishedAt)} · ${r.score.correctCount}/${r.score.itemCount} correct${r.domains ? ` · domains ${r.domains.join(', ')}` : ''}</p>
            <div class="h-score"><b>${r.score.scaled}</b><span class="pill ${r.score.passed ? 'ok' : 'bad'}">${r.score.passed ? 'Pass' : 'Fail'}</span></div>
            <div class="h-actions">
              <a class="btn sm" href="#/results/${encodeURIComponent(r.id)}">Report</a>
              <a class="btn sm" href="#/review/${encodeURIComponent(r.id)}">Review</a>
              ${certificateEligible(r) ? `<a class="btn sm" href="#/certificate/${encodeURIComponent(r.id)}">Certificate</a>` : ''}
            </div>
          </article>`).join('')}
      </div>` : `
      <section class="card empty">
        <h2>No attempts yet</h2>
        <p>Your score reports and answer reviews will appear here after your first mock or drill.</p>
        <div class="actions" style="justify-content:center">
          <a class="btn primary" href="#/start/full">Start the full mock</a>
          <a class="btn" href="#/practice">Run a practice drill</a>
        </div>
      </section>`}
    </main>`));
}

// ---------------------------------------------------------------- about scoring

function viewAbout() {
  const levels = Object.values(DIFFICULTY);
  render(shell(`
    <main class="wrap narrow">
      <div class="page-head">
        <h1>How scoring works</h1>
        <p class="page-meta">How each mock form is built, judged and scaled, and what the certificate means.</p>
      </div>
      <div class="stack">
        <section class="card">
          <h2>Exam format</h2>
          <p>Each full mock mirrors the official ${EXAM.code} format: ${EXAM.itemCount} items, ${EXAM.timeLimitMinutes} minutes, multiple-choice and multiple-response items that state how many responses to select, and a scaled score from ${EXAM.scale.min} to ${EXAM.scale.max} with a passing score of ${EXAM.scale.passing}.</p>
          <p style="margin:0">Items are drawn skill by skill in the proportions of the official blueprint (8 domains, ${SKILLS.length} skills), then shuffled so domains are interleaved. Answer options are shuffled too, so every retake is a different form.</p>
        </section>
        <section class="card">
          <h2>The judging system</h2>
          <ul>
            <li><b>Criterion-referenced.</b> You're measured against a fixed standard, not against other candidates.</li>
            <li><b>All-or-nothing items.</b> A multiple-response item counts only if your selection exactly matches the key. Unanswered items score zero.</li>
            <li><b>Harder items weigh more.</b> Each item is tagged ${levels.map((d) => `${esc(d.label)} (×${d.weight})`).join(', ')}.</li>
            <li><b>Scaled score.</b> Your difficulty-weighted percent correct is mapped onto ${EXAM.scale.min}–${EXAM.scale.max}. A weighted ${Math.round(EXAM.scale.cutRaw * 100)}% lands exactly on the ${EXAM.scale.passing} cut; below it the scale runs linearly down to ${EXAM.scale.min}, above it up to ${EXAM.scale.max}.</li>
            <li><b>Domain report.</b> Like the official score report, you get percent-correct per domain. It's feedback only — pass or fail comes from the total scaled score.</li>
          </ul>
          <p class="small muted" style="margin:0">The official cut score comes from a confidential standard-setting study, so no mock can reproduce it exactly. This model is deliberately demanding: if you pass here consistently, you are in good shape for the real exam.</p>
        </section>
        <section class="card">
          <h2>Difficulty modes</h2>
          <div class="table-wrap"><table class="stackable">
            <thead><tr><th>Mode</th>${levels.map((d) => `<th class="num">${esc(d.label)}</th>`).join('')}<th class="num">Time</th><th>Certificate</th></tr></thead>
            <tbody>${Object.values(DIFFICULTY_MODES).map((d) => `<tr><td><b>${esc(d.label)}</b><div class="small muted">${esc(d.blurb)}</div></td>
              ${Object.entries(DIFFICULTY).map(([k, lv]) => `<td class="num" data-label="${esc(lv.label)}">${Math.round((d.mix[k] ?? 0) * 100)}%</td>`).join('')}
              <td class="num" data-label="Time">${Math.round(d.timeFactor * 100)}%</td><td class="num" data-label="Certificate">${d.certificate ? 'Eligible' : '—'}</td></tr>`).join('')}</tbody>
          </table></div>
          <p class="small muted" style="margin:12px 0 0">Mix is the target share of each difficulty per skill; if a skill runs short of a level, the nearest level fills in. Time is relative to the exam's ${EXAM.timeLimitMinutes} minutes.</p>
        </section>
        <section class="card">
          <h2>Certificate</h2>
          <p>Passing the <b>full</b> timed mock at Exam-realistic difficulty or harder unlocks a printable readiness certificate and a link to register for the official exam on the Anthropic Partner Academy. The mock certificate is not an Anthropic credential; only the proctored ${EXAM.code} exam grants that.</p>
          <div class="actions"><a class="btn primary" href="#/start/full">Start full mock</a><a class="btn ghost" href="${OFFICIAL_URL}" target="_blank" rel="noopener">Official exam page ↗</a></div>
        </section>
      </div>
    </main>`));
}

// ---------------------------------------------------------------- events

app.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const action = el.dataset.action;

  switch (action) {
    case 'choose-difficulty':
      el.closest('.mode-grid').querySelectorAll('.mode').forEach((x) => x.classList.toggle('selected', x === el));
      break;
    case 'pick':
      e.preventDefault();
      pick(el.value);
      break;
    case 'prev': go(active.current - 1); break;
    case 'next': go(active.current + 1); break;
    case 'goto': navOpen = false; go(Number(el.dataset.index)); break;
    case 'toggle-nav':
      navOpen = !navOpen;
      document.getElementById('exam-nav')?.classList.toggle('open', navOpen);
      document.querySelector('.exam-backdrop')?.classList.toggle('open', navOpen);
      document.querySelector('.nav-toggle')?.setAttribute('aria-expanded', String(navOpen));
      break;
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
      reviewIndex = 0;
      route();
      break;
    case 'review-goto': reviewIndex = Number(el.dataset.index); route(); break;
    case 'review-prev': reviewIndex -= 1; route(); break;
    case 'review-next': reviewIndex += 1; route(); break;
    case 'print': window.print(); break;
    case 'jump': {
      e.preventDefault();
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      document.getElementById(el.dataset.target)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      break;
    }
    case 'drill':
      // A link inside <summary>: follow it without toggling the accordion.
      e.preventDefault();
      location.hash = el.getAttribute('href');
      break;
    case 'select-domains': {
      const on = el.dataset.value === 'all';
      el.closest('form')?.querySelectorAll('input[name="domain"]').forEach((i) => { i.checked = on; });
      updateDomainCount();
      break;
    }
    case 'clear-history':
      if (confirmTwice(el, 'Click again to delete all history')) { store.clearHistory(); route(); }
      break;
    default: break;
  }
});

app.addEventListener('change', (e) => {
  if (e.target.matches('input[name="domain"]')) updateDomainCount();
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
  if (location.hash.startsWith('#/review/') && !e.metaKey && !e.ctrlKey && !e.altKey && !e.target.closest('input, textarea, select')) {
    if (e.key === 'ArrowRight') { e.preventDefault(); el('[data-action="review-next"]')?.click(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); el('[data-action="review-prev"]')?.click(); }
    return;
  }
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
  else if (key === 'N') { e.preventDefault(); el('.nav-toggle')?.click(); }
  else if (e.key === 'Escape' && navOpen) { el('.nav-toggle')?.click(); }
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

window.addEventListener('beforeunload', (e) => {
  if (!active) return;
  store.setActive(active);
  if (active.deadline) { e.preventDefault(); e.returnValue = ''; }
});

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
