import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BAR_STEPS, pattern, stepsToSchedule } from '../src/music.js';

test('毎拍の頭に太鼓のドンが入る', () => {
  for (const s of [0, 4, 8, 12]) assert.ok(['D', 'd'].includes(pattern.drum[s]));
});
test('拍の時計から、先読みぶんの16分音符を時刻つきで出す', () => {
  // いま2.0拍目、120BPM(16分=0.125秒)、0.3秒先まで
  const out = stepsToSchedule(8, 2.0, 120, 0.3);
  assert.deepEqual(out.map((o) => o.step), [8, 9, 10]);
  assert.ok(Math.abs(out[1].inSec - 0.125) < 1e-9);
  // 遅れている音符は飛ばす
  assert.deepEqual(stepsToSchedule(4, 2.0, 120, 0.1).map((o) => o.step), [8]);
});
test('1小節16刻みで、太鼓と笛の譜面がそろっている', () => {
  assert.equal(BAR_STEPS, 16);
  for (const bar of pattern.melody) assert.equal(bar.length, BAR_STEPS);
  assert.equal(pattern.drum.length, BAR_STEPS);
});
