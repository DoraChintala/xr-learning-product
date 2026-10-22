// ---------------------------------------------------------------------------
// UCB1 multi-armed bandit (Auer, Cesa-Bianchi & Fischer, 2002).
//
// Problem: the same skill can be taught several ways — full VR, phone AR,
// desktop 3D, or an adaptive quiz. Which modality grows *this* learner's
// mastery fastest? We don't know in advance and it varies per learner, so we
// treat each modality as a bandit "arm" and learn online.
//
// UCB1 balances exploitation (use the arm with the best observed reward) with
// exploration (try under-sampled arms) via an upper-confidence bound:
//
//     score(arm) = mean_reward(arm) + sqrt( 2 * ln(totalPulls) / pulls(arm) )
//
// The reward here is *mastery gain*, so the bandit optimizes for learning —
// not for engagement or time-on-task.
//
// Pure and dependency-free.
// ---------------------------------------------------------------------------
import { clamp01 } from './bkt.js';

export const MODALITIES = Object.freeze(['sim-vr', 'sim-ar', 'sim-3d', 'quiz']);

export const MODALITY_LABELS = Object.freeze({
  'sim-vr': 'VR simulation',
  'sim-ar': 'AR simulation',
  'sim-3d': '3D simulation',
  quiz: 'Adaptive quiz',
});

/** Fresh bandit state: per-arm pull count (n) and summed reward (total). */
export function createBandit(arms = MODALITIES) {
  const state = {};
  for (const a of arms) state[a] = { n: 0, total: 0 };
  return state;
}

/**
 * Convert a mastery gain (change in P(known), typically small) into a [0,1]
 * reward. A gain of 0.25 or more earns the full reward; negative gains give 0.
 */
export function gainToReward(gain) {
  return clamp01(gain * 4);
}

/** Record a reward for an arm, returning a NEW state (immutable update). */
export function recordReward(state, arm, reward) {
  const prev = state[arm] || { n: 0, total: 0 };
  return { ...state, [arm]: { n: prev.n + 1, total: prev.total + clamp01(reward) } };
}

/** Mean observed reward for an arm, or null if never pulled. */
export function armMean(state, arm) {
  const s = state[arm];
  return s && s.n > 0 ? s.total / s.n : null;
}

/**
 * Select an arm from `available` using UCB1.
 *
 * Cold start: any untried arm is chosen first, in the order given — so callers
 * can express a preference (e.g. try the cheaper 3D sim before VR). The
 * `available` list is set by the client from real device capability, so the
 * bandit never picks a modality the learner can't actually run (no headset ->
 * no VR arm offered).
 *
 * @returns {string|null} chosen arm, or null if none available
 */
export function selectArm(state, available = MODALITIES) {
  if (!available.length) return null;

  const untried = available.find((a) => !(state[a] && state[a].n > 0));
  if (untried) return untried;

  const totalN = available.reduce((sum, a) => sum + state[a].n, 0);
  let best = null;
  let bestScore = -Infinity;
  for (const a of available) {
    const { n, total } = state[a];
    const mean = total / n;
    const bonus = Math.sqrt((2 * Math.log(totalN)) / n);
    const score = mean + bonus;
    if (score > bestScore) {
      bestScore = score;
      best = a;
    }
  }
  return best;
}

/** Human-readable snapshot of what the bandit has learned so far. */
export function armStats(state) {
  return Object.entries(state).map(([arm, { n, total }]) => ({
    arm,
    label: MODALITY_LABELS[arm] || arm,
    pulls: n,
    mean: n ? total / n : null,
  }));
}
