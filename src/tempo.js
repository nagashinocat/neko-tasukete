import { BPM_MIN, BPM_MAX, BPM_RAMP_STEPS, BPM_RATE } from './config.js';

// 段数 → 目標のテンポ(BPM)。80から始まり200に近づく
export function bpmForStep(step) {
  return BPM_MIN + (BPM_MAX - BPM_MIN) * (1 - Math.exp(-Math.max(0, step) / BPM_RAMP_STEPS));
}

// 今のテンポを目標へなめらかに近づける(急に速くならない)
export function easeBpm(bpm, target, dtSec) {
  const max = BPM_RATE * Math.max(0, dtSec);
  return bpm + Math.max(-max, Math.min(max, target - bpm));
}
