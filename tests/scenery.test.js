import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sceneForStep, stepsToSpace } from '../src/scenery.js';

test('景色', () => {
  assert.equal(sceneForStep(99).id, 'ground');
  assert.equal(sceneForStep(100).id, 'sky');
  assert.equal(sceneForStep(500).id, 'clouds');
  assert.equal(sceneForStep(2000).id, 'stratosphere');
  assert.equal(sceneForStep(9999).id, 'stratosphere');
  assert.equal(sceneForStep(10000).id, 'space');
  assert.equal(stepsToSpace(127), 9873);
});
