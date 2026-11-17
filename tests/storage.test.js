import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStorage } from '../src/storage.js';

const mem = () => { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) }; };
test('自己ベストは大きいときだけ更新', () => {
  const s = createStorage(mem());
  assert.equal(s.saveBest(50), true);
  assert.equal(s.saveBest(30), false);
  assert.equal(s.getBest(), 50);
});
test('localStorage が例外を投げても止まらない', () => {
  const bad = { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); } };
  const s = createStorage(bad);
  assert.equal(s.getBest(), 0);
  assert.equal(s.saveBest(10), true);
  assert.equal(s.getBest(), 10);
  assert.equal(s.hasSeenOpening(), false);
});
test('localStorage が無くても動く', () => {
  const s = createStorage(undefined);
  s.markOpeningSeen();
  assert.equal(s.hasSeenOpening(), true);
});
test('音のオン・オフを覚える', () => {
  const s = createStorage(mem());
  assert.equal(s.isMuted(), false);
  s.setMuted(true);
  assert.equal(s.isMuted(), true);
});
