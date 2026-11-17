import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTower, hit } from '../src/tower.js';
import { judge } from '../src/gauge.js';
import { speedForStep } from '../src/tempo.js';

// 真ん中を狙う人のタップ時刻のずれを正規分布(標準偏差 sigmaMs)とみなしてプレイを再現する
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function gauss(r) { return Math.sqrt(-2 * Math.log(r() || 1e-12)) * Math.cos(2 * Math.PI * r()); }
function play(sigmaMs, r) {
  let t = createTower();
  while (!t.collapsed && !t.reachedTop) {
    const v = 4 * speedForStep(t.step); // 針の速さ(位置/秒)
    const pos = Math.max(-1, Math.min(1, v * gauss(r) * sigmaMs / 1000));
    t = hit(t, judge(pos));
  }
  return t.step;
}
function median(sigmaMs, n = 400) {
  const r = rng(42);
  const a = Array.from({ length: n }, () => play(sigmaMs, r)).sort((x, y) => x - y);
  return a[n >> 1];
}

test('ふつうの人(ずれ30ms)でも雲の上(500段)に届く', () => {
  assert.ok(median(30) >= 500, `median=${median(30)}`);
});
test('ずれ40msの人でも空(100段)は越える', () => {
  assert.ok(median(40) >= 150, `median=${median(40)}`);
});
test('上手な人(ずれ12ms)でも1万段は簡単には届かない', () => {
  assert.ok(median(12) < 10000, `median=${median(12)}`);
});
