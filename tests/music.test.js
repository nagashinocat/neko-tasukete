import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bgmTempo, BAR_STEPS, pattern } from '../src/music.js';
import { SPEED_BASE, SPEED_MAX } from '../src/config.js';

test('BGMのテンポは針の速さに合わせて上がる', () => {
  assert.equal(bgmTempo(SPEED_BASE), 96);
  assert.equal(bgmTempo(SPEED_MAX), 176);
  assert.ok(bgmTempo(2) > bgmTempo(1));
});
test('1小節16刻みで、太鼓と笛の譜面がそろっている', () => {
  assert.equal(BAR_STEPS, 16);
  for (const bar of pattern.melody) assert.equal(bar.length, BAR_STEPS);
  assert.equal(pattern.drum.length, BAR_STEPS);
});
