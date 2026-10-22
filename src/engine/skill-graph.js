// ---------------------------------------------------------------------------
// Skill graph + next-skill selector.
//
// Clinical competencies are ordered: you don't practice "rapid sequence
// intubation" before "basic airway positioning". We model skills as nodes in a
// directed acyclic graph where an edge A -> B means "A is a prerequisite of B".
//
// The selector answers: given what the learner has mastered so far, which skill
// should they work on next? Rule:
//   1. Prefer a skill that is DUE for spaced review (fight forgetting first).
//   2. Otherwise pick an UNLOCKED, not-yet-mastered skill (all prereqs mastered),
//      choosing the one at the edge of ability (lowest mastery among unlocked).
//
// Pure and dependency-free.
// ---------------------------------------------------------------------------
import { isMastered } from './bkt.js';
import { isDue } from './spaced.js';

/**
 * @typedef {Object} Skill
 * @property {string} id
 * @property {string} title
 * @property {string[]} prereqs  ids of prerequisite skills
 * @property {boolean} [psychomotor] hands-on skill (favors immersive modalities)
 */

/** Are all of a skill's prerequisites mastered? (No prereqs => unlocked.) */
export function isUnlocked(skill, mastery, threshold = 0.95) {
  return (skill.prereqs || []).every((pid) => isMastered(mastery[pid] ?? 0, threshold));
}

/** Skills the learner can work on now: unlocked and not yet mastered. */
export function availableSkills(skills, mastery, threshold = 0.95) {
  return skills.filter(
    (s) => isUnlocked(s, mastery, threshold) && !isMastered(mastery[s.id] ?? 0, threshold),
  );
}

/**
 * Pick the next skill to study.
 *
 * @param {Skill[]} skills
 * @param {Record<string, number>} mastery   skillId -> P(known)
 * @param {Record<string, object>} cards      skillId -> SM-2 card (optional)
 * @param {number} now                        epoch ms
 * @param {number} threshold                  mastery threshold
 * @returns {Skill|null}
 */
export function selectNextSkill(skills, mastery, cards = {}, now = Date.now(), threshold = 0.95) {
  // 1. Any mastered skill that is due for review wins — retention first.
  const dueForReview = skills
    .filter((s) => isMastered(mastery[s.id] ?? 0, threshold))
    .filter((s) => cards[s.id] && isDue(cards[s.id], now))
    .sort((a, b) => (cards[a.id].due - cards[b.id].due));
  if (dueForReview.length) return dueForReview[0];

  // 2. Otherwise, an unlocked unmastered skill at the edge of ability
  //    (lowest current mastery — the most useful place to practice).
  const available = availableSkills(skills, mastery, threshold);
  if (!available.length) return null;
  return available.sort((a, b) => (mastery[a.id] ?? 0) - (mastery[b.id] ?? 0))[0];
}

/** Fraction of all skills mastered — overall competency for a dashboard. */
export function overallCompetency(skills, mastery, threshold = 0.95) {
  if (!skills.length) return 0;
  const mastered = skills.filter((s) => isMastered(mastery[s.id] ?? 0, threshold)).length;
  return mastered / skills.length;
}
