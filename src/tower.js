import { TOTAL_STEPS, TILT_PER_OFFSET, TILT_RECOVER, TILT_LIMIT, COMBO_PER_EXTRA, MAX_POP } from './config.js';
import { nextRouletteGap } from './items.js';

export function createTower(rng = Math.random) {
  return {
    step: 0, tilt: 0, collapsed: false, reachedTop: false, combo: 0, popped: 0,
    rouletteAt: nextRouletteGap(rng), roulette: false, blasted: 0,
    charms: 0, slowTaps: 0, paintTaps: 0, gluedUntil: 0, glueHits: 0,
  };
}

// 1回たたく。ぴったりが続くとコンボが増え、10コンボごとに1回で飛ぶ段が増える(上限 MAX_POP)
export function hit(tower, { offset, perfect }, rng = Math.random) {
  if (tower.collapsed || tower.reachedTop) return tower;
  const charms = tower.charms ?? 0;
  const forgiven = !perfect && charms > 0; // お守り
  const combo = perfect ? (tower.combo ?? 0) + 1 : forgiven ? (tower.combo ?? 0) : 0;
  const glued = tower.step < (tower.gluedUntil ?? 0);

  let popped;
  let glueHits = tower.glueHits ?? 0;
  if (glued) {
    // のり:1回目ははがれるだけ、2回目で抜ける
    if (glueHits === 0) { popped = 0; glueHits = 1; } else { popped = 1; glueHits = 0; }
  } else {
    popped = perfect ? Math.min(MAX_POP, 1 + Math.floor(combo / COMBO_PER_EXTRA)) : 1;
    glueHits = 0;
  }
  popped = Math.min(popped, TOTAL_STEPS - tower.step);
  const step = tower.step + popped;

  let tilt = tower.tilt;
  if (perfect) tilt = Math.max(0, tilt - TILT_RECOVER);
  else if (!forgiven) tilt += offset * TILT_PER_OFFSET;

  const rouletteAt0 = tower.rouletteAt ?? Infinity;
  const roulette = popped > 0 && rouletteAt0 >= tower.step && rouletteAt0 < step;
  const rouletteAt = roulette || rouletteAt0 < step ? step + nextRouletteGap(rng) : rouletteAt0;

  return {
    ...tower,
    step,
    tilt,
    combo,
    popped,
    glueHits,
    roulette,
    rouletteAt,
    blasted: 0,
    charms: forgiven ? charms - 1 : charms,
    slowTaps: Math.max(0, (tower.slowTaps ?? 0) - 1),
    paintTaps: Math.max(0, (tower.paintTaps ?? 0) - 1),
    collapsed: tilt >= TILT_LIMIT,
    reachedTop: tilt < TILT_LIMIT && step >= TOTAL_STEPS,
  };
}
