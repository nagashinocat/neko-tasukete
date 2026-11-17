import { SPEED_BASE, SPEED_MAX, SPEED_RAMP_STEPS } from './config.js';

export function speedForStep(step) {
  return SPEED_MAX - (SPEED_MAX - SPEED_BASE) * Math.exp(-Math.max(0, step) / SPEED_RAMP_STEPS);
}
