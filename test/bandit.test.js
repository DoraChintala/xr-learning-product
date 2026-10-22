import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createBandit, gainToReward, recordReward, selectArm, armMean, MODALITIES,
} from '../src/engine/bandit.js';

test('createBandit initializes every arm at zero', () => {
  const b = createBandit();
  for (const a of MODALITIES) {
    assert.deepEqual(b[a], { n: 0, total: 0 });
  }
});

test('gainToReward maps mastery gain into [0,1]', () => {
  assert.equal(gainToReward(0), 0);
  assert.equal(gainToReward(0.25), 1);
  assert.equal(gainToReward(1), 1); // clamped
  assert.equal(gainToReward(-0.1), 0); // negative clamped
});

test('recordReward is immutable and accumulates', () => {
  const b0 = createBandit();
  const b1 = recordReward(b0, 'quiz', 1);
  assert.equal(b0.quiz.n, 0, 'original state untouched');
  assert.equal(b1.quiz.n, 1);
  assert.equal(b1.quiz.total, 1);
});

test('selectArm explores every untried arm before exploiting', () => {
  let b = createBandit();
  const available = ['quiz', 'sim-3d'];
  const first = selectArm(b, available);
  assert.equal(first, 'quiz', 'untried arms chosen in given order');
  b = recordReward(b, 'quiz', 1);
  const second = selectArm(b, available);
  assert.equal(second, 'sim-3d', 'still-untried arm chosen next');
});

test('selectArm exploits the better arm once all tried', () => {
  let b = createBandit();
  b = recordReward(b, 'quiz', 1.0); // great
  b = recordReward(b, 'sim-3d', 0.0); // poor
  const pick = selectArm(b, ['quiz', 'sim-3d']);
  assert.equal(pick, 'quiz');
});

test('selectArm never returns an unavailable modality', () => {
  const b = createBandit();
  const pick = selectArm(b, ['quiz']); // no headset available
  assert.equal(pick, 'quiz');
  assert.equal(selectArm(b, []), null);
});

test('armMean reports null before any pulls', () => {
  const b = createBandit();
  assert.equal(armMean(b, 'quiz'), null);
});
