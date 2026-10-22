// ---------------------------------------------------------------------------
// Bayesian Knowledge Tracing (Corbett & Anderson, 1994).
//
// BKT models a learner's latent knowledge of a single skill as a two-state
// Hidden Markov Model: the skill is either "known" or "not known". We never
// observe the state directly — we only see noisy evidence (a quiz answer, a
// graded simulation). BKT maintains P(known) and updates it after each attempt.
//
// Four parameters govern the model:
//   pInit    P(known) before any practice  (prior)
//   pTransit P(not-known -> known) on each practice opportunity (learning rate)
//   pSlip    P(wrong | known)     (a mistake despite mastery)
//   pGuess   P(correct | not-known) (a lucky correct answer)
//
// This module is pure and dependency-free so every clinical/learning decision
// it drives is unit-testable in isolation.
// ---------------------------------------------------------------------------

export const DEFAULT_BKT = Object.freeze({
  pInit: 0.2,
  pTransit: 0.12,
  pSlip: 0.1,
  pGuess: 0.2,
});

const EPS = 1e-3;

/** Clamp any number into the [0, 1] probability range. */
export function clamp01(x) {
  return Math.min(1, Math.max(0, x));
}

/** Keep a probability strictly inside (0, 1) to avoid divide-by-zero. */
function clampP(p) {
  return Math.min(1 - EPS, Math.max(EPS, p));
}

/**
 * Posterior P(known | observation) via Bayes' rule, BEFORE the learning
 * transition is applied.
 *
 * @param {number} pKnown  current P(known) in [0,1]
 * @param {boolean} correct whether the observed attempt was correct
 * @param {object} params  BKT parameters
 * @returns {number} updated P(known) given the observation
 */
export function posterior(pKnown, correct, params = DEFAULT_BKT) {
  const p = clampP(pKnown);
  const { pSlip, pGuess } = params;
  if (correct) {
    // P(known | correct) = P(correct | known)P(known) / P(correct)
    const num = p * (1 - pSlip);
    return num / (num + (1 - p) * pGuess);
  }
  // P(known | wrong) = P(wrong | known)P(known) / P(wrong)
  const num = p * pSlip;
  return num / (num + (1 - p) * (1 - pGuess));
}

/**
 * Full BKT update for one piece of evidence: apply the observation, then the
 * learning transition (the learner may have *learned* during this attempt).
 *
 * Accepts either a boolean (quiz right/wrong) OR a graded score in [0,1] for
 * simulations, which is treated as a soft observation — a weighted blend of the
 * "correct" and "wrong" posteriors. This lets one mastery model consume
 * evidence from every modality (quiz, 3D, AR, VR) on a comparable scale.
 *
 * @param {number} pKnown   current P(known)
 * @param {boolean|number} evidence  true/false, or a score in [0,1]
 * @param {object} params   BKT parameters
 * @returns {number} new P(known) after observation + transition
 */
export function updateMastery(pKnown, evidence, params = DEFAULT_BKT) {
  const s =
    typeof evidence === 'boolean'
      ? evidence
        ? 1
        : 0
      : clamp01(Number(evidence) || 0);

  const post =
    s * posterior(pKnown, true, params) + (1 - s) * posterior(pKnown, false, params);

  // Learning transition: even if they didn't know it, practice may teach it.
  return clampP(post + (1 - post) * params.pTransit);
}

/**
 * P(next attempt correct) given current mastery — the model's prediction,
 * useful for selecting items at the edge of a learner's ability and for
 * evaluating the model against held-out attempts.
 */
export function predictCorrect(pKnown, params = DEFAULT_BKT) {
  const p = clampP(pKnown);
  const { pSlip, pGuess } = params;
  return p * (1 - pSlip) + (1 - p) * pGuess;
}

/** Convenience: is this skill considered mastered at the given threshold? */
export function isMastered(pKnown, threshold = 0.95) {
  return pKnown >= threshold;
}
