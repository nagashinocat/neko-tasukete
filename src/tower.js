import { TOTAL_STEPS, TILT_PER_OFFSET, TILT_RECOVER, TILT_LIMIT } from './config.js';

export function createTower() {
  return { step: 0, tilt: 0, collapsed: false, reachedTop: false };
}

export function hit(tower, { offset, perfect }) {
  if (tower.collapsed || tower.reachedTop) return tower;
  const step = tower.step + 1;
  const tilt = perfect ? Math.max(0, tower.tilt - TILT_RECOVER) : tower.tilt + offset * TILT_PER_OFFSET;
  return {
    step,
    tilt,
    collapsed: tilt >= TILT_LIMIT,
    reachedTop: tilt < TILT_LIMIT && step >= TOTAL_STEPS,
  };
}
