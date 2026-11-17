import { BPM_MIN, BPM_MAX, TEMPO_STEP_BLOCKS, BPM_RAMP_STEPS, BPM_RATE } from './config.js';

// テンポの段階(1から)。500段ごとに1つ上がる
export function tempoLevel(step) {
  return 1 + Math.floor(Math.max(0, step) / TEMPO_STEP_BLOCKS);
}

// 段数 → 目標のテンポ(BPM)。500段ごとの段階で上がる。
// 上がり幅は最初の段階ほど大きく、上へ行くほど小さくなり、BPM_MAX に近づく
export function bpmForStep(step) {
  const base = (tempoLevel(step) - 1) * TEMPO_STEP_BLOCKS;
  return Math.round(BPM_MIN + (BPM_MAX - BPM_MIN) * (1 - Math.exp(-base / BPM_RAMP_STEPS)));
}

// 今のテンポを目標へ近づける(段階が変わるときは0.5秒ほどでさっと切り替わる)
export function easeBpm(bpm, target, dtSec) {
  const max = BPM_RATE * Math.max(0, dtSec);
  return bpm + Math.max(-max, Math.min(max, target - bpm));
}
