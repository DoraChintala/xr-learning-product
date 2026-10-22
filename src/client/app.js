// ---------------------------------------------------------------------------
// App shell — three screens: Login -> Select Anatomy -> Learn.
// Uses the REAL engine modules; only the active module's content changes.
//
// NOTE: the login here is a DEMO (front-end only, no real security). It exists
// to show the product flow. Real auth needs a backend with hashed passwords
// and sessions — a later milestone.
// ---------------------------------------------------------------------------
import { createLearnerState, processTurn } from '../engine/orchestrator.js';
import { MODALITY_LABELS } from '../engine/bandit.js';
import { overallCompetency } from '../engine/skill-graph.js';
import { MODULES, getModule } from '../shared/content.js';
import { buildAnatomy } from './anatomy.js';

const $ = (id) => document.getElementById(id);
const pct = (x) => Math.round(x * 100);
const MOD_CLASS = { 'sim-vr': 'vr', 'sim-ar': 'ar', 'sim-3d': 'd3', quiz: 'quiz' };
const MOD_ICON = { 'sim-vr': '🥽', 'sim-ar': '📱', 'sim-3d': '🖥️', quiz: '📝' };
const EVIDENCE = { fail: 0.15, ok: 0.6, good: 0.95 };

// ----- screen switching -----------------------------------------------------
function show(screen) {
  for (const s of ['login', 'anatomy', 'learn']) {
    $('screen-' + s).hidden = s !== screen;
  }
}

// ===== SCREEN 1: LOGIN ======================================================
function initLogin() {
  const form = $('login-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const user = $('login-user').value.trim();
    if (!user) { $('login-err').textContent = 'Enter a username to continue.'; return; }
    // Demo auth: any non-empty username works; remember it locally.
    localStorage.setItem('xrlp-user', user);
    $('who').textContent = user;
    initAnatomy();
    show('anatomy');
  });
  // one-click guest entry for visitors
  const guest = $('btn-guest');
  if (guest) guest.addEventListener('click', () => {
    const user = $('login-user').value.trim() || 'Guest';
    localStorage.setItem('xrlp-user', user);
    $('who').textContent = user;
    initAnatomy();
    show('anatomy');
  });

  // skip login if already "signed in" this browser
  const saved = localStorage.getItem('xrlp-user');
  if (saved) $('login-user').value = saved;
}

// ===== SCREEN 2: SELECT ANATOMY ============================================
function initAnatomy() {
  buildAnatomy($('anatomy-figure'), MODULES, startModule);

  // also render a text/card list beside the figure for clarity + a11y
  $('module-cards').innerHTML = MODULES.map((m) => `
    <button class="module-card" data-module="${m.id}">
      <span class="mc-icon">${m.icon}</span>
      <span class="mc-text"><b>${m.region}</b>${m.title}<em>${m.domain}</em></span>
    </button>`).join('');
  $('module-cards').querySelectorAll('.module-card').forEach((b) =>
    b.addEventListener('click', () => startModule(b.dataset.module)));
}

// ===== SCREEN 3: LEARN (adaptive engine) ===================================
let state, skills, current, activeModule;

function startModule(moduleId) {
  activeModule = getModule(moduleId);
  skills = activeModule.skills;
  state = createLearnerState(skills);
  current = { skillId: skills[0].id, modality: skills[0].psychomotor ? 'sim-3d' : 'quiz' };

  $('learn-competency').innerHTML = `<b>${activeModule.title}</b>${activeModule.domain}`;
  $('learn-region').textContent = `${activeModule.icon} ${activeModule.region}`;
  $('log').innerHTML = '';
  $('decision').textContent = 'Make an attempt to see the engine respond.';

  renderActivity(); renderMastery(); renderBandit();
  show('learn');
}

const skillById = (id) => skills.find((s) => s.id === id);

function renderActivity() {
  const skill = skillById(current.skillId);
  $('skill-title').textContent = skill.title;
  $('skill-blurb').textContent = skill.blurb;
  const mod = current.modality;
  $('modality-chip').textContent = MODALITY_LABELS[mod];
  $('modality-chip').className = 'modality-chip ' + MOD_CLASS[mod];
  $('scene-inner').textContent = MOD_ICON[mod];
  $('prompt').textContent = `Practice: ${skill.title}. How did the learner perform?`;
}

function renderMastery() {
  $('mastery-list').innerHTML = skills.map((s) => {
    const m = state.mastery[s.id] ?? 0;
    const mastered = m >= 0.95;
    return `<div class="row ${mastered ? 'mastered' : ''}">
        <span class="name">${s.title}</span>
        <span class="val">${pct(m)}%${mastered ? ' ✓' : ''}</span>
        <div class="meter ${mastered ? 'mastered' : ''}"><div style="width:${pct(m)}%"></div></div>
      </div>`;
  }).join('');
  const comp = overallCompetency(skills, state.mastery);
  $('overall-fill').style.width = pct(comp) + '%';
  $('overall-pct').textContent = pct(comp) + '%';
}

function renderBandit() {
  const colors = { 'sim-vr': 'var(--vr)', 'sim-ar': 'var(--ar)', 'sim-3d': 'var(--d3)', quiz: 'var(--quiz)' };
  $('bandit-list').innerHTML = Object.entries(state.bandit).map(([arm, s]) => {
    const mean = s.n ? s.total / s.n : 0;
    return `<div class="bandit-row">
        <span>${MODALITY_LABELS[arm]}</span>
        <div class="bandit-meter"><div style="width:${pct(mean)}%;background:${colors[arm]}"></div></div>
        <span class="pulls">${s.n}×</span>
      </div>`;
  }).join('');
}

function logTurn(title, modality, gain) {
  const dir = gain >= 0 ? 'up' : 'down';
  const arrow = gain >= 0 ? '▲' : '▼';
  const item = document.createElement('div');
  item.className = 'log-item';
  item.innerHTML = `<b>${title}</b> via ${MODALITY_LABELS[modality]} — mastery
    <span class="${dir}">${arrow} ${gain >= 0 ? '+' : ''}${pct(gain)}%</span>`;
  $('log').prepend(item);
}

function doTurn(evidence) {
  const { state: next, result } = processTurn(state, skills, {
    skillId: current.skillId, modality: current.modality, evidence,
  });
  state = next;
  logTurn(skillById(result.skillId).title, current.modality, result.masteryGain);

  if (result.done) {
    $('decision').innerHTML = `<b>All skills mastered.</b> Competency complete — spaced
      reviews will resurface over time to maintain retention.`;
  } else {
    $('decision').innerHTML = `Mastery of <b>${skillById(result.skillId).title}</b>:
      ${pct(result.priorMastery)}% → <b>${pct(result.newMastery)}%</b>.<br/>
      Next: <b>${skillById(result.nextSkill.id).title}</b> via <b>${result.nextModalityLabel}</b>.`;
    current = { skillId: result.nextSkill.id, modality: result.nextModality };
  }
  renderActivity(); renderMastery(); renderBandit();
}

function initLearnControls() {
  $('btn-fail').addEventListener('click', () => doTurn(EVIDENCE.fail));
  $('btn-ok').addEventListener('click', () => doTurn(EVIDENCE.ok));
  $('btn-good').addEventListener('click', () => doTurn(EVIDENCE.good));
  $('btn-auto').addEventListener('click', () => {
    let i = 0;
    const timer = setInterval(() => {
      const roll = Math.random();
      doTurn(roll < 0.75 ? EVIDENCE.good : roll < 0.9 ? EVIDENCE.ok : EVIDENCE.fail);
      if (++i >= 20) clearInterval(timer);
    }, 320);
  });
  $('btn-back').addEventListener('click', () => show('anatomy'));
  $('btn-logout').addEventListener('click', () => {
    localStorage.removeItem('xrlp-user');
    show('login');
  });
}

// ----- boot -----------------------------------------------------------------
initLogin();
initLearnControls();
show('login');
