import { test } from 'node:test';
import assert from 'node:assert/strict';
import { needlePosition, advancePhase, judge } from '../src/gauge.js';

test('三角波の位置', () => {
  assert.equal(needlePosition(0), -1);
  assert.equal(needlePosition(0.25), 0);
  assert.equal(needlePosition(0.5), 1);
  assert.equal(needlePosition(0.75), 0);
});
test('長いフレームは0.1秒で頭打ち', () => {
  assert.equal(advancePhase(0, 1, 5), 0.1);
});
test('判定', () => {
  assert.deepEqual(judge(0.05), { offset: 0.05, perfect: true });
  assert.deepEqual(judge(-0.5), { offset: 0.5, perfect: false });
});
