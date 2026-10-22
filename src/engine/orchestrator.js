// ---------------------------------------------------------------------------
// Orchestrator — the single entry point the app calls each "learning turn".
//
// It ties the four engine pieces together:
//   BKT         -> update how well the learner knows the skill they just practiced
//   bandit      -> learn which modality (VR/AR/3D/quiz) grows mastery best
//   SM-2        -> schedule the skill's next review
//   skill graph -> choose the next skill to work on
//
// A "turn" is: the learner finished an activity -> we record the result and
// decide what comes next. One pure function does the whole thing, so the same
// logic runs on the server (authoritative) and in the browser demo.
//
// Pure and dependency-free — no I/O, no persistence. The caller owns storage.
// ---------------------------------------------------------------------------
import { updateMastery, DEFAULT_BKT } from './bkt.js';
import { createBandit, gainToReward, recordReward, selectArm, MODALITY_LABELS } from './bandit.js';
import { newCard, reviewCard, scoreToQuality } from './spaced.js';
import { selectNextSkill } from './skill-graph.js';

/** Build an empty learner state for a given set of skills. */
export function createLearnerState(skills) {
  const mastery = {};
  const cards = {};
  for (const s of skills) mastery[s.id] = DEFAULT_BKT.pInit;
  return { mastery, cards, bandit: createBandit(), history: [] };
}

/**
 * Process one completed activity and decide what to do next.
 *
 * @param {object} state   learner state from createLearnerState (not mutated)
 * @param {Skill[]} skills skill graph
 * @param {object} attempt { skillId, modality, evidence }  evidence = bool or [0,1] score
 * @param {object} opts    { availableModalities?, now?, threshold? }
 * @returns {{ state: object, result: object }}
 */
export function processTurn(state, skills, attempt, opts = {}) {
  const now = opts.now ?? Date.now();
  const threshold = opts.threshold ?? 0.95;
  const availableModalities = opts.availableModalities; // let bandit default if omitted

  const { skillId, modality, evidence } = attempt;

  // --- 1. Update mastery for the practiced skill (BKT) --------------------
  const prior = state.mastery[skillId] ?? DEFAULT_BKT.pInit;
  const posterior = updateMastery(prior, evidence, DEFAULT_BKT);
  const gain = posterior - prior;

  // --- 2. Reward the modality that produced this gain (bandit) ------------
  const bandit = recordReward(state.bandit, modality, gainToReward(gain));

  // --- 3. Schedule the skill's next review (SM-2) -------------------------
  const quality = typeof evidence === 'boolean'
    ? (evidence ? 4 : 1)
    : scoreToQuality(evidence);
  const card = state.cards[skillId] ?? newCard(now);
  const nextCard = reviewCard(card, quality, now);

  // --- 4. Assemble the new state (immutably) ------------------------------
  const nextState = {
    ...state,
    mastery: { ...state.mastery, [skillId]: posterior },
    cards: { ...state.cards, [skillId]: nextCard },
    bandit,
    history: [...state.history, { skillId, modality, evidence, gain, at: now }],
  };

  // --- 5. Decide the next skill (skill graph) + modality (bandit) ---------
  const nextSkill = selectNextSkill(skills, nextState.mastery, nextState.cards, now, threshold);
  const chosenModality = nextSkill
    ? chooseModality(nextState.bandit, nextSkill, availableModalities)
    : null;

  return {
    state: nextState,
    result: {
      skillId,
      priorMastery: prior,
      newMastery: posterior,
      masteryGain: gain,
      nextReviewDue: nextCard.due,
      nextSkill: nextSkill ? { id: nextSkill.id, title: nextSkill.title } : null,
      nextModality: chosenModality,
      nextModalityLabel: chosenModality ? MODALITY_LABELS[chosenModality] : null,
      done: !nextSkill, // null nextSkill = all skills mastered
    },
  };
}

/**
 * Choose a modality for the next skill. Psychomotor (hands-on) skills prefer
 * immersive arms first at cold start; the bandit takes over once it has data.
 */
function chooseModality(bandit, skill, availableModalities) {
  let available = availableModalities;
  if (!available) {
    available = skill.psychomotor
      ? ['sim-vr', 'sim-ar', 'sim-3d', 'quiz']
      : ['quiz', 'sim-3d', 'sim-ar', 'sim-vr'];
  }
  return selectArm(bandit, available);
}
