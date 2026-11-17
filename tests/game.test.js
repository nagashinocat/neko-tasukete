import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';
import { createStorage } from '../src/storage.js';
import { TILT_LIMIT, SPEED_BASE } from '../src/config.js';

const mem = () => { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) }; };

test('二重発火は1段だけ', () => {
  const g = createGame(createStorage(mem()));
  g.finishOpening();
  g.tap(1000); g.tap(1010);
  assert.equal(g.tower.step, 1);
  g.tap(1100);
  assert.equal(g.tower.step, 2);
});
test('初回オープニング中のタップは無視、2回目以降は飛ばせる', () => {
  const st = createStorage(mem());
  const g1 = createGame(st);
  g1.tap(0);
  assert.equal(g1.state, 'opening');
  g1.finishOpening();
  const g2 = createGame(st);
  g2.tap(0);
  assert.equal(g2.state, 'playing');
  assert.equal(g2.tower.step, 0);
});
test('崩れ演出中・結果画面のタップでは段が増えない', () => {
  const g = createGame(createStorage(mem()));
  g.finishOpening();
  g.tower = { ...g.tower, tilt: TILT_LIMIT - 0.001 };
  g.phase = 0; // 端=ずれ最大
  g.tap(1000);
  assert.equal(g.state, 'collapsing');
  const s = g.tower.step;
  g.tap(2000);
  g.update(2);
  assert.equal(g.state, 'result');
  g.tap(3000);
  assert.equal(g.tower.step, s);
});
test('長いフレームでも針はワープしない', () => {
  const g = createGame(createStorage(mem()));
  g.finishOpening();
  g.update(10);
  assert.ok(g.phase <= SPEED_BASE * 0.1 + 1e-9);
});
test('結果で自己ベスト更新', () => {
  const g = createGame(createStorage(mem()));
  g.finishOpening();
  g.tower = { ...g.tower, step: 41, tilt: TILT_LIMIT - 0.001 };
  g.phase = 0;
  g.tap(1000); g.update(2);
  assert.equal(g.best, 42);
  assert.equal(g.newBest, true);
});
test('もう一回はオープニングなしで最初から', () => {
  const g = createGame(createStorage(mem()));
  g.finishOpening();
  g.tower = { ...g.tower, step: 10, tilt: TILT_LIMIT - 0.001 };
  g.phase = 0;
  g.tap(1000); g.update(2);
  g.retry();
  assert.equal(g.state, 'playing');
  assert.equal(g.tower.step, 0);
  assert.equal(g.newBest, false);
});
test('結果画面に入った直後はボタンが効かない', () => {
  const g = createGame(createStorage(mem()));
  g.finishOpening();
  g.tower = { ...g.tower, tilt: TILT_LIMIT - 0.001 };
  g.phase = 0;
  g.tap(1000); g.update(2);
  assert.equal(g.state, 'result');
  assert.equal(g.resultReady, false);
  g.update(0.6);
  assert.equal(g.resultReady, true);
});
