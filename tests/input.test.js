import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tapTime } from '../src/input.js';

test('イベントの発生時刻で判定する', () => {
  assert.equal(tapTime({ timeStamp: 900 }, 950), 900);
});
test('おかしな時刻なら今の時刻を使う', () => {
  assert.equal(tapTime({ timeStamp: 0 }, 950), 950);
  assert.equal(tapTime({ timeStamp: 2000 }, 950), 950);
  assert.equal(tapTime({ timeStamp: 100 }, 950), 950); // 0.25秒以上前は信用しない
});
