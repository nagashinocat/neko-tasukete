import { test } from 'node:test';
import assert from 'node:assert/strict';
import { needlePosition, advanceBeats, judge, zoneWidths } from '../src/gauge.js';
import { PERFECT_MS } from '../src/config.js';

test('針は1拍ごとに端に着く(偶数拍で左、奇数拍で右)', () => {
  assert.equal(needlePosition(0), -1);
  assert.equal(needlePosition(0.5), 0);
  assert.equal(needlePosition(1), 1);
  assert.equal(needlePosition(1.5), 0);
  assert.equal(needlePosition(2), -1);
  assert.equal(needlePosition(7), 1);
});
test('拍はBPMで進み、長いフレームは0.1秒で頭打ち', () => {
  assert.equal(advanceBeats(0, 120, 0.05), 0.1);
  assert.equal(advanceBeats(0, 120, 5), 0.2);
});
test('判定は拍からのずれ(ミリ秒)で決まる', () => {
  // 120BPM:1拍500ms
  assert.deepEqual(judge(3, 120), { ms: 0, offset: 0, perfect: true });
  const j = judge(3.06, 120); // 30ms 遅い
  assert.ok(Math.abs(j.ms - 30) < 1e-6);
  assert.equal(j.perfect, true);
  const k = judge(2.8, 120);  // 100ms 早い
  assert.equal(k.perfect, false);
  assert.ok(Math.abs(k.offset - 0.4) < 1e-9); // 半拍(250ms)に対する割合
  assert.equal(judge(3.5, 120).offset, 1);
  assert.ok(PERFECT_MS >= 40 && PERFECT_MS <= 60);
});
test('帯の幅はテンポが速いほど広く見える', () => {
  const slow = zoneWidths(80);
  const fast = zoneWidths(200);
  assert.ok(fast.perfect > slow.perfect);
  assert.ok(slow.good > slow.perfect);
});
