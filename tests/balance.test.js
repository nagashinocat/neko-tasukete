import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTower, hit } from '../src/tower.js';
import { judge } from '../src/gauge.js';
import { bpmForStep } from '../src/tempo.js';

// 拍に合わせて叩く人のずれを正規分布(標準偏差 sigmaMs)とみなしてプレイを再現する
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function gauss(r) { return Math.sqrt(-2 * Math.log(r() || 1e-12)) * Math.cos(2 * Math.PI * r()); }
function play(sigmaMs, r) {
  let t = { ...createTower(r), rouletteAt: Infinity };
  let bpm = bpmForStep(0);
  while (!t.collapsed && !t.reachedTop) {
    bpm += Math.max(-1.5, Math.min(1.5, bpmForStep(t.step) - bpm)); // 1拍ごとになめらかに
    const beatMs = 60000 / bpm;
    const errBeats = Math.max(-0.5, Math.min(0.5, gauss(r) * sigmaMs / beatMs));
    t = hit(t, judge(7 + errBeats, bpm), r);
  }
  return t.step;
}
function median(sigmaMs, n = 300) {
  const r = rng(42);
  const a = Array.from({ length: n }, () => play(sigmaMs, r)).sort((x, y) => x - y);
  return a[n >> 1];
}

test('ふつうの人(ずれ40ms)でも雲の上(500段)に届く', () => {
  assert.ok(median(40) >= 500, `median=${median(40)}`);
});
test('ずれ55msの人でも空(100段)は越える', () => {
  assert.ok(median(55) >= 150, `median=${median(55)}`);
});
test('上手な人(ずれ25ms)でも1万段は簡単には届かない', () => {
  assert.ok(median(25) < 10000, `median=${median(25)}`);
});
