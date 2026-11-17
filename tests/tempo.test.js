import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bpmForStep, easeBpm } from '../src/tempo.js';
import { BPM_MIN, BPM_MAX } from '../src/config.js';

test('0段目は80BPMから', () => assert.equal(bpmForStep(0), BPM_MIN));
test('段が進むほど速くなる', () => assert.ok(bpmForStep(500) > bpmForStep(100)));
test('上限を超えない', () => assert.ok(bpmForStep(10000) <= BPM_MAX));
test('テンポは急に変わらず、なめらかに近づく', () => {
  const b = easeBpm(80, 140, 0.1);
  assert.ok(b > 80 && b < 82);
  assert.equal(easeBpm(100, 100, 1), 100);
  assert.ok(easeBpm(140, 80, 0.1) < 140);
});
