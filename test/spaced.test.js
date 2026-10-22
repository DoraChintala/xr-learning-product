import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  newCard, reviewCard, scoreToQuality, isDue, overdueDays, DAY_MS,
} from '../src/engine/spaced.js';

const T0 = 1_700_000_000_000; // fixed reference time

test('newCard is due immediately', () => {
  const c = newCard(T0);
  assert.equal(c.due, T0);
  assert.equal(c.reps, 0);
  assert.ok(isDue(c, T0));
});

test('successful reviews lengthen the interval', () => {
  let c = newCard(T0);
  c = reviewCard(c, 5, T0); // first success -> 1 day
  assert.equal(c.interval, 1);
  c = reviewCard(c, 5, T0); // second -> 6 days
  assert.equal(c.interval, 6);
  const prev = c.interval;
  c = reviewCard(c, 5, T0); // third -> interval * ease
  assert.ok(c.interval > prev, 'interval keeps growing');
});

test('a failed review resets reps and shortens interval', () => {
  let c = newCard(T0);
  c = reviewCard(c, 5, T0);
  c = reviewCard(c, 5, T0);
  c = reviewCard(c, 1, T0); // lapse
  assert.equal(c.reps, 0);
  assert.equal(c.interval, 1);
});

test('ease factor never drops below 1.3', () => {
  let c = newCard(T0);
  for (let i = 0; i < 10; i++) c = reviewCard(c, 0, T0); // repeated failures
  assert.ok(c.ease >= 1.3);
});

test('scoreToQuality maps [0,1] onto 0..5', () => {
  assert.equal(scoreToQuality(0), 0);
  assert.equal(scoreToQuality(1), 5);
  assert.equal(scoreToQuality(0.6), 3);
});

test('due date moves into the future after a successful review', () => {
  const c = reviewCard(newCard(T0), 5, T0);
  assert.equal(c.due, T0 + 1 * DAY_MS);
  assert.ok(!isDue(c, T0));
  assert.ok(isDue(c, T0 + 1 * DAY_MS));
});

test('overdueDays is zero before due, positive after', () => {
  const c = reviewCard(newCard(T0), 5, T0); // due in 1 day
  assert.equal(overdueDays(c, T0), 0);
  assert.equal(overdueDays(c, c.due + 2 * DAY_MS), 2);
});
