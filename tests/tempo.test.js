import { test } from 'node:test';
import assert from 'node:assert/strict';
import { speedForStep } from '../src/tempo.js';
import { SPEED_BASE, SPEED_MAX } from '../src/config.js';

test('0段目はベース速度', () => assert.equal(speedForStep(0), SPEED_BASE));
test('単調増加', () => assert.ok(speedForStep(200) > speedForStep(100)));
test('上限を超えない', () => assert.ok(speedForStep(10000) <= SPEED_MAX));
