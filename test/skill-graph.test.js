import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isUnlocked, availableSkills, selectNextSkill, overallCompetency,
} from '../src/engine/skill-graph.js';

const SKILLS = [
  { id: 'a', title: 'Basic positioning', prereqs: [] },
  { id: 'b', title: 'Mask seal', prereqs: ['a'] },
  { id: 'c', title: 'Bag-valve ventilation', prereqs: ['a', 'b'] },
];

test('a skill with no prereqs is always unlocked', () => {
  assert.equal(isUnlocked(SKILLS[0], {}), true);
});

test('a skill is locked until all prereqs are mastered', () => {
  const mastery = { a: 0.99, b: 0.2 };
  assert.equal(isUnlocked(SKILLS[2], mastery), false); // b not mastered
  const mastery2 = { a: 0.99, b: 0.99 };
  assert.equal(isUnlocked(SKILLS[2], mastery2), true);
});

test('availableSkills excludes locked and already-mastered skills', () => {
  const mastery = { a: 0.99, b: 0.3, c: 0.1 };
  const avail = availableSkills(SKILLS, mastery).map((s) => s.id);
  assert.deepEqual(avail, ['b']); // a mastered, c locked
});

test('selectNextSkill picks the unlocked skill with lowest mastery', () => {
  const mastery = { a: 0.5, b: 0.0, c: 0.0 };
  // Only 'a' is unlocked (b,c need a). Should pick a.
  const next = selectNextSkill(SKILLS, mastery, {}, 0);
  assert.equal(next.id, 'a');
});

test('selectNextSkill prioritizes a mastered skill that is due for review', () => {
  const mastery = { a: 0.99, b: 0.3, c: 0.0 };
  const now = 1000;
  const cards = { a: { due: 500 } }; // 'a' is overdue
  const next = selectNextSkill(SKILLS, mastery, cards, now);
  assert.equal(next.id, 'a', 'review beats new learning');
});

test('selectNextSkill returns null when everything is mastered', () => {
  const mastery = { a: 1, b: 1, c: 1 };
  assert.equal(selectNextSkill(SKILLS, mastery, {}, 0), null);
});

test('overallCompetency is the fraction of mastered skills', () => {
  assert.equal(overallCompetency(SKILLS, { a: 1, b: 1, c: 0 }), 2 / 3);
  assert.equal(overallCompetency(SKILLS, {}), 0);
});
