import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTower, hit } from '../src/tower.js';
import { TILT_PER_OFFSET, TILT_LIMIT } from '../src/config.js';

test('外しても段は進む', () => {
  const t = hit(createTower(), { offset: 0.9, perfect: false });
  assert.equal(t.step, 1);
  assert.ok(Math.abs(t.tilt - 0.9 * TILT_PER_OFFSET) < 1e-9);
});
test('ぴったりで傾きが戻る(0未満にならない)', () => {
  let t = { ...createTower(), tilt: 0.05 };
  t = hit(t, { offset: 0, perfect: true });
  assert.equal(t.tilt, 0);
});
test('傾きが限界で崩れ、その後は進まない', () => {
  let t = { ...createTower(), tilt: TILT_LIMIT - 0.01 };
  t = hit(t, { offset: 1, perfect: false });
  assert.equal(t.collapsed, true);
  assert.equal(hit(t, { offset: 0, perfect: true }).step, t.step);
});
test('1万段で頂上', () => {
  const t = hit({ ...createTower(), step: 9999 }, { offset: 0, perfect: true });
  assert.equal(t.reachedTop, true);
});
