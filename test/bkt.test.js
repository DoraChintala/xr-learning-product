import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  clamp01, posterior, updateMastery, predictCorrect, isMastered, DEFAULT_BKT,
} from '../src/engine/bkt.js';

test('clamp01 bounds values to [0,1]', () => {
  assert.equal(clamp01(-5), 0);
  assert.equal(clamp01(5), 1);
  assert.equal(clamp01(0.42), 0.42);
});

test('a correct answer raises P(known)', () => {
  const p0 = 0.3;
  const p1 = posterior(p0, true);
  assert.ok(p1 > p0, `expected ${p1} > ${p0}`);
});

test('a wrong answer lowers P(known)', () => {
  const p0 = 0.6;
  const p1 = posterior(p0, false);
  assert.ok(p1 < p0, `expected ${p1} < ${p0}`);
});

test('updateMastery accepts a boolean and a [0,1] score consistently', () => {
  const boolUp = updateMastery(0.4, true);
  const scoreUp = updateMastery(0.4, 1); // score of 1 ~ a confident correct
  // Both should increase mastery; the perfect score should not be lower.
  assert.ok(boolUp > 0.4);
  assert.ok(scoreUp >= 0.4);
  assert.ok(Math.abs(boolUp - scoreUp) < 1e-9);
});

test('repeated correct practice converges mastery toward 1', () => {
  let p = DEFAULT_BKT.pInit;
  for (let i = 0; i < 25; i++) p = updateMastery(p, true);
  assert.ok(p > 0.95, `mastery should converge high, got ${p}`);
});

test('predictCorrect sits between guess and (1 - slip)', () => {
  const low = predictCorrect(0);
  const high = predictCorrect(1);
  assert.ok(low < high);
  // P is clamped into (0,1) by a small epsilon to avoid divide-by-zero, so
  // predictCorrect(0/1) lands very close to pGuess / (1 - pSlip), not exactly.
  assert.ok(Math.abs(low - DEFAULT_BKT.pGuess) < 1e-2);
  assert.ok(Math.abs(high - (1 - DEFAULT_BKT.pSlip)) < 1e-2);
});

test('isMastered respects the threshold', () => {
  assert.equal(isMastered(0.96), true);
  assert.equal(isMastered(0.5), false);
});
