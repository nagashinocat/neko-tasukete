import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BAR_STEPS, pattern, stepsToSchedule, swingOffsetBeats } from '../src/music.js';

test('叩くタイミング(毎拍の頭)にはバスドラが必ず入る', () => {
  for (let k = 0; k < BAR_STEPS; k++) assert.equal(!!pattern.kick[k], k % 4 === 0);
});
test('ジャズ:4小節のコード進行、ウォーキングベースは1拍に1音', () => {
  assert.equal(pattern.chords.length, 4);
  for (const bar of pattern.bass) assert.equal(bar.filter((n) => typeof n === 'number').length, 4);
});
test('スウィング:裏の8分は3連符の位置へずらす', () => {
  assert.equal(swingOffsetBeats(0), 0);
  assert.equal(swingOffsetBeats(4), 0);
  assert.ok(Math.abs(swingOffsetBeats(2) - 1 / 6) < 1e-9);
  assert.ok(Math.abs(swingOffsetBeats(14) - 1 / 6) < 1e-9);
});
test('拍の時計から、先読みぶんの16分音符を時刻つきで出す', () => {
  // いま2.0拍目、120BPM(16分=0.125秒)、0.3秒先まで
  const out = stepsToSchedule(8, 2.0, 120, 0.3);
  assert.deepEqual(out.map((o) => o.step), [8, 9, 10]);
  assert.ok(Math.abs(out[1].inSec - 0.125) < 1e-9);
  // 遅れている音符は飛ばす
  assert.deepEqual(stepsToSchedule(4, 2.0, 120, 0.1).map((o) => o.step), [8]);
});
test('1小節16刻みで、各パートの譜面がそろっている', () => {
  assert.equal(BAR_STEPS, 16);
  for (const part of [pattern.kick, pattern.ride, pattern.hat, pattern.comp]) assert.equal(part.length, BAR_STEPS);
  for (const bar of pattern.bass) assert.equal(bar.length, BAR_STEPS);
});
