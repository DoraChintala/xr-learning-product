import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLearnerState, processTurn } from '../src/engine/orchestrator.js';

const SKILLS = [
  { id: 'a', title: 'Basic positioning', prereqs: [], psychomotor: true },
  { id: 'b', title: 'Mask seal', prereqs: ['a'], psychomotor: true },
  { id: 'c', title: 'Bag-valve ventilation', prereqs: ['a', 'b'], psychomotor: true },
];

test('createLearnerState seeds mastery, cards, bandit and history', () => {
  const s = createLearnerState(SKILLS);
  assert.ok(s.mastery.a > 0 && s.mastery.a < 1);
  assert.deepEqual(s.history, []);
  assert.ok(s.bandit['sim-vr']);
});

test('a correct turn raises mastery and records history immutably', () => {
  const s0 = createLearnerState(SKILLS);
  const { state: s1, result } = processTurn(
    s0, SKILLS,
    { skillId: 'a', modality: 'quiz', evidence: true },
    { now: 1000 },
  );
  assert.ok(result.newMastery > result.priorMastery, 'mastery increased');
  assert.ok(result.masteryGain > 0);
  assert.equal(s0.history.length, 0, 'original state not mutated');
  assert.equal(s1.history.length, 1);
});

test('the bandit is rewarded for the modality used', () => {
  const s0 = createLearnerState(SKILLS);
  const { state: s1 } = processTurn(
    s0, SKILLS,
    { skillId: 'a', modality: 'sim-vr', evidence: 0.9 },
    { now: 1000 },
  );
  assert.equal(s1.bandit['sim-vr'].n, 1, 'VR arm pulled once');
});

test('a turn schedules the next review in the future on success', () => {
  const s0 = createLearnerState(SKILLS);
  const { result } = processTurn(
    s0, SKILLS,
    { skillId: 'a', modality: 'quiz', evidence: true },
    { now: 1000 },
  );
  assert.ok(result.nextReviewDue > 1000);
});

test('availableModalities constrains the next modality (no headset)', () => {
  const s0 = createLearnerState(SKILLS);
  const { result } = processTurn(
    s0, SKILLS,
    { skillId: 'a', modality: 'quiz', evidence: true },
    { now: 1000, availableModalities: ['quiz', 'sim-3d'] },
  );
  if (result.nextModality) {
    assert.ok(['quiz', 'sim-3d'].includes(result.nextModality));
  }
});

test('driving a skill to mastery eventually unlocks the next skill', () => {
  let state = createLearnerState(SKILLS);
  // Hammer skill 'a' with correct attempts until it is mastered.
  for (let i = 0; i < 30; i++) {
    const { state: next } = processTurn(
      state, SKILLS,
      { skillId: 'a', modality: 'sim-3d', evidence: true },
      { now: 1000 + i },
    );
    state = next;
  }
  assert.ok(state.mastery.a > 0.95, `a should be mastered, got ${state.mastery.a}`);
  // With 'a' mastered, 'b' (prereq a) must now be selectable.
  const { result } = processTurn(
    state, SKILLS,
    { skillId: 'a', modality: 'sim-3d', evidence: true },
    { now: 2000 },
  );
  assert.ok(result.nextSkill, 'there should be a next skill to study');
});
