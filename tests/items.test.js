import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTower, hit } from '../src/tower.js';
import { ITEMS, applyItem, nextRouletteGap, createRoulette, stopRoulette, updateRoulette } from '../src/items.js';
import { TILT_PER_OFFSET } from '../src/config.js';

const P = { offset: 0, perfect: true };
const MISS = { offset: 0.5, perfect: false };
const fixed = (v) => () => v;

test('ルーレット段は30〜60段おき', () => {
  assert.equal(nextRouletteGap(fixed(0)), 30);
  assert.equal(nextRouletteGap(fixed(0.999)), 60);
  const t = createTower(fixed(0));
  assert.equal(t.rouletteAt, 30);
});
test('槌でルーレット段を抜くとルーレットが回る', () => {
  // 段の番号は下から0,1,2…。step=30 のとき一番下にあるのが30番(ルーレット段)
  let t = { ...createTower(fixed(0)), step: 30 };
  t = hit(t, P, fixed(0));
  assert.equal(t.roulette, true);
  assert.equal(t.rouletteAt, 61); // 次は抜いた後の段から30段先
  assert.equal(hit(t, P, fixed(0)).roulette, false);
});
test('まとめ飛ばしでルーレット段を含んでも回る', () => {
  const t = hit({ ...createTower(fixed(0)), step: 28, combo: 19 }, P, fixed(0)); // 3段
  assert.equal(t.roulette, true);
});
test('爆弾は10段、ミサイルは30段吹き飛ばし、ルーレットは回さない', () => {
  const t0 = { ...createTower(fixed(0)), step: 25 };
  const b = applyItem(t0, 'bomb', fixed(0));
  assert.equal(b.step, 35);
  assert.equal(b.blasted, 10);
  assert.equal(b.roulette, false);
  assert.equal(b.rouletteAt, 65);
  const m = applyItem(t0, 'missile', fixed(0));
  assert.equal(m.step, 55);
  assert.equal(m.blasted, 30);
  assert.equal(applyItem({ ...t0, step: 9990 }, 'missile', fixed(0)).step, 10000);
});
test('お守り:1回だけ外してもコンボも傾きもそのまま', () => {
  let t = applyItem({ ...createTower(fixed(0.5)), combo: 12, tilt: 0.2 }, 'charm', fixed(0));
  t = hit(t, MISS, fixed(0.5));
  assert.equal(t.combo, 12);
  assert.equal(t.tilt, 0.2);
  assert.equal(t.charms, 0);
  t = hit(t, MISS, fixed(0.5));
  assert.equal(t.combo, 0);
  assert.ok(Math.abs(t.tilt - (0.2 + 0.5 * TILT_PER_OFFSET)) < 1e-9);
});
test('砂時計とペンキは10回で切れる', () => {
  let t = applyItem(applyItem(createTower(fixed(0.5)), 'hourglass', fixed(0)), 'paint', fixed(0));
  assert.equal(t.slowTaps, 10);
  assert.equal(t.paintTaps, 10);
  for (let i = 0; i < 10; i++) t = hit(t, P, fixed(0.5));
  assert.equal(t.slowTaps, 0);
  assert.equal(t.paintTaps, 0);
});
test('のり:10段のあいだは2回叩いて1段、まとめ飛ばしはお休み', () => {
  let t = applyItem({ ...createTower(fixed(0.99)), step: 100, rouletteAt: 500, combo: 30 }, 'glue', fixed(0));
  t = hit(t, P, fixed(0.99));
  assert.equal(t.step, 100);
  assert.equal(t.popped, 0);
  assert.equal(t.combo, 31);
  t = hit(t, P, fixed(0.99));
  assert.equal(t.step, 101);
  assert.equal(t.popped, 1);
  for (let i = 0; i < 18; i++) t = hit(t, P, fixed(0.99));
  assert.equal(t.step, 110);
  t = hit(t, P, fixed(0.99));
  assert.ok(t.popped > 1); // のりが終わるとまとめ飛ばしに戻る
});
test('ルーレットはタップ後にだんだん止まり、アイテムが決まる', () => {
  const r = createRoulette();
  updateRoulette(r, 0.5);
  assert.equal(r.done, false);
  stopRoulette(r, fixed(0));
  for (let i = 0; i < 600 && !r.done; i++) updateRoulette(r, 1 / 60);
  assert.equal(r.done, true);
  assert.ok(ITEMS.includes(r.item));
  assert.equal(ITEMS.length, 6);
});
