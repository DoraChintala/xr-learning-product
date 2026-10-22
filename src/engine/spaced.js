// ---------------------------------------------------------------------------
// SM-2 spaced repetition (SuperMemo 2, Woźniak 1990).
//
// Mastering a skill once is not enough — knowledge decays along the forgetting
// curve. SM-2 schedules each skill to resurface for review just before it is
// likely to be forgotten, stretching the interval each time recall succeeds and
// collapsing it when recall fails.
//
// Per-skill "card" state:
//   reps     consecutive successful recalls
//   interval days until the next review
//   ease     ease factor (>= 1.3); higher = intervals grow faster
//   due      epoch-ms timestamp when the card is next due
//
// Pure and dependency-free.
// ---------------------------------------------------------------------------
import { clamp01 } from './bkt.js';

export const DAY_MS = 24 * 60 * 60 * 1000;

/** A brand-new card, due immediately. */
export function newCard(now = Date.now()) {
  return { reps: 0, interval: 0, ease: 2.5, due: now };
}

/**
 * Review a card with a recall quality in 0..5 (SM-2 convention):
 *   0-2 = failed recall (reset), 3-5 = successful recall (advance).
 *
 * @returns {{reps:number, interval:number, ease:number, due:number}} new card
 */
export function reviewCard(card, quality, now = Date.now()) {
  const q = Math.max(0, Math.min(5, Math.round(quality)));
  let { reps, interval, ease } = card;

  if (q < 3) {
    // Lapse: start the schedule over, review again tomorrow.
    reps = 0;
    interval = 1;
  } else {
    reps += 1;
    if (reps === 1) interval = 1;
    else if (reps === 2) interval = 6;
    else interval = Math.round(interval * ease);
  }

  // Update the ease factor per the SM-2 formula, with the 1.3 floor.
  ease = Math.max(1.3, ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));

  return { reps, interval, ease, due: now + interval * DAY_MS };
}

/** Map a mastery/score in [0,1] onto an SM-2 quality 0..5. */
export function scoreToQuality(score) {
  return Math.round(clamp01(score) * 5);
}

/** Is this card due for review at time `now`? */
export function isDue(card, now = Date.now()) {
  return card.due <= now;
}

/** Days overdue (0 if not yet due) — useful for prioritizing reviews. */
export function overdueDays(card, now = Date.now()) {
  return Math.max(0, (now - card.due) / DAY_MS);
}
