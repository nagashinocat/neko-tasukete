import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shareBlob } from '../src/share.js';

test('作っておいた画像で、待たずにすぐ共有を呼ぶ', async () => {
  let called = false;
  globalThis.navigator ??= {};
  Object.defineProperty(globalThis, 'navigator', { value: { canShare: () => true, share: async () => { called = true; } }, configurable: true });
  globalThis.location = { href: 'https://example.com/#x' };
  const p = shareBlob(new Blob(['x'], { type: 'image/png' }), 12);
  assert.equal(called, true); // await をはさまずに呼ばれている
  assert.equal(await p, 'shared');
});
test('キャンセルは cancelled', async () => {
  Object.defineProperty(globalThis, 'navigator', { value: { canShare: () => true, share: async () => { const e = new Error('a'); e.name = 'AbortError'; throw e; } }, configurable: true });
  assert.equal(await shareBlob(new Blob(['x']), 12), 'cancelled');
});
