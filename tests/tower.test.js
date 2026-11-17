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

test('ぴったりが続くとコンボが増え、10コンボで2段飛ぶ', () => {
  let t = createTower();
  for (let i = 0; i < 9; i++) t = hit(t, { offset: 0, perfect: true });
  assert.equal(t.combo, 9);
  assert.equal(t.popped, 1);
  assert.equal(t.step, 9);
  t = hit(t, { offset: 0, perfect: true });
  assert.equal(t.combo, 10);
  assert.equal(t.popped, 2);
  assert.equal(t.step, 11);
});
test('20コンボで3段、90コンボ以上は10段が上限', () => {
  assert.equal(hit({ ...createTower(), combo: 19 }, { offset: 0, perfect: true }).popped, 3);
  assert.equal(hit({ ...createTower(), combo: 89 }, { offset: 0, perfect: true }).popped, 10);
  assert.equal(hit({ ...createTower(), combo: 150 }, { offset: 0, perfect: true }).popped, 10);
});
test('ずれるとコンボは0に戻り、1段だけ', () => {
  const t = hit({ ...createTower(), combo: 35 }, { offset: 0.3, perfect: false });
  assert.equal(t.combo, 0);
  assert.equal(t.popped, 1);
});
test('まとめて飛んでも1万段を超えない', () => {
  const t = hit({ ...createTower(), step: 9995, combo: 89 }, { offset: 0, perfect: true });
  assert.equal(t.step, 10000);
  assert.equal(t.popped, 5);
  assert.equal(t.reachedTop, true);
});
