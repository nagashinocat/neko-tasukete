import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bpmForStep, easeBpm, tempoLevel } from '../src/tempo.js';
import { BPM_MIN, BPM_MAX } from '../src/config.js';

test('500段ごとに1段階ずつテンポが上がる', () => {
  assert.equal(bpmForStep(0), BPM_MIN);
  assert.equal(bpmForStep(499), BPM_MIN);
  assert.equal(bpmForStep(500), 109);
  assert.equal(bpmForStep(999), 109);
  assert.equal(bpmForStep(1000), 133);
  assert.ok(bpmForStep(1499) === bpmForStep(1000));
  assert.equal(tempoLevel(0), 1);
  assert.equal(tempoLevel(1000), 3);
});
test('上限は240', () => {
  assert.ok(bpmForStep(10000) >= 235);
  assert.ok(bpmForStep(20000) <= BPM_MAX);
});
test('段階が変わるときは短い時間でさっと切り替わる', () => {
  const b = easeBpm(80, 88, 0.25);
  assert.ok(b > 82 && b < 88);
  assert.equal(easeBpm(80, 88, 1), 88);
  assert.equal(easeBpm(100, 100, 1), 100);
});
