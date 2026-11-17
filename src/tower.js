import { TOTAL_STEPS, TILT_PER_OFFSET, TILT_RECOVER, TILT_LIMIT, COMBO_PER_EXTRA, MAX_POP } from './config.js';

export function createTower() {
  return { step: 0, tilt: 0, collapsed: false, reachedTop: false, combo: 0, popped: 0 };
}

// 1回たたく。ぴったりが続くとコンボが増え、10コンボごとに1回で飛ぶ段が増える(上限 MAX_POP)
export function hit(tower, { offset, perfect }) {
  if (tower.collapsed || tower.reachedTop) return tower;
  const combo = perfect ? (tower.combo ?? 0) + 1 : 0;
  const want = perfect ? Math.min(MAX_POP, 1 + Math.floor(combo / COMBO_PER_EXTRA)) : 1;
  const popped = Math.min(want, TOTAL_STEPS - tower.step);
  const step = tower.step + popped;
  const tilt = perfect ? Math.max(0, tower.tilt - TILT_RECOVER) : tower.tilt + offset * TILT_PER_OFFSET;
  return {
    step,
    tilt,
    combo,
    popped,
    collapsed: tilt >= TILT_LIMIT,
    reachedTop: tilt < TILT_LIMIT && step >= TOTAL_STEPS,
  };
}
