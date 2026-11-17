import { PERFECT_MS, GOOD_MS, PERFECT_FRAC } from './config.js';

const perfectMs = (beatMs) => Math.min(PERFECT_MS, beatMs * PERFECT_FRAC);

const MAX_DT = 0.1;

// 拍(beats)→ 針の位置 -1..1。偶数拍で左端、奇数拍で右端に着く三角波
export function needlePosition(beats) {
  const p = ((beats % 2) + 2) % 2;
  return p <= 1 ? -1 + 2 * p : 3 - 2 * p;
}

export function advanceBeats(beats, bpm, dtSec) {
  const dt = Math.min(Math.max(dtSec, 0), MAX_DT);
  return beats + (bpm / 60) * dt;
}

// 一番近い拍からのずれで判定。offset は半拍に対する割合(0..1)
export function judge(beats, bpm) {
  const d = Math.abs(beats - Math.round(beats));
  const beatMs = 60000 / bpm;
  const ms = d * beatMs;
  return { ms, offset: Math.min(1, d * 2), perfect: ms <= perfectMs(beatMs) };
}

// ゲージ全幅に対する、端の赤(perfect)と黄色(good)の幅の割合
export function zoneWidths(bpm) {
  const beatMs = 60000 / bpm;
  return { perfect: Math.min(0.45, perfectMs(beatMs) / beatMs), good: Math.min(0.5, GOOD_MS / beatMs) };
}
