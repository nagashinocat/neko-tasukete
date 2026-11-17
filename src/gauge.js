import { PERFECT_HALF_WIDTH } from './config.js';

const MAX_DT = 0.1;

// phase 0..1(1で1往復)→ 針の位置 -1..1(三角波)
export function needlePosition(phase) {
  const p = ((phase % 1) + 1) % 1;
  return p < 0.5 ? -1 + 4 * p : 3 - 4 * p;
}

export function advancePhase(phase, speed, dtSec) {
  const dt = Math.min(Math.max(dtSec, 0), MAX_DT);
  return (phase + speed * dt) % 1;
}

export function judge(position) {
  const offset = Math.abs(position);
  return { offset, perfect: offset <= PERFECT_HALF_WIDTH };
}
