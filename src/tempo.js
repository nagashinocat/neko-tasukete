import { SPEED_BASE, SPEED_MAX, SPEED_RAMP_STEPS } from './config.js';

// SPEED_BASE から始まり、SPEED_MAX に近づく(超えない)
export function speedForStep(step) {
  return SPEED_BASE + (SPEED_MAX - SPEED_BASE) * (1 - Math.exp(-Math.max(0, step) / SPEED_RAMP_STEPS));
}
