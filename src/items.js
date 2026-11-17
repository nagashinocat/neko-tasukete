import {
  TOTAL_STEPS, ROULETTE_GAP_MIN, ROULETTE_GAP_MAX, BOMB_BLOCKS, MISSILE_BLOCKS, ITEM_TAPS, GLUE_BLOCKS,
} from './config.js';

export const ITEMS = ['bomb', 'missile', 'charm', 'hourglass', 'paint', 'glue'];
export const ITEM_INFO = {
  bomb: { label: '爆弾', desc: `${BOMB_BLOCKS}段ふきとばす!`, good: true, color: '#3a3a4a' },
  missile: { label: 'ミサイル', desc: `${MISSILE_BLOCKS}段つらぬく!`, good: true, color: '#d64545' },
  charm: { label: 'お守り', desc: '1回だけ外しても大丈夫', good: true, color: '#e85d9a' },
  hourglass: { label: '砂時計', desc: `${ITEM_TAPS}回のあいだ針がゆっくり`, good: true, color: '#c99a3b' },
  paint: { label: 'ペンキ', desc: 'インクで見えにくい!', good: false, color: '#3aa7a0' },
  glue: { label: 'のり', desc: `${GLUE_BLOCKS}段が2回叩かないと抜けない`, good: false, color: '#9a9aa8' },
};

export function nextRouletteGap(rng = Math.random) {
  return ROULETTE_GAP_MIN + Math.floor(rng() * (ROULETTE_GAP_MAX - ROULETTE_GAP_MIN + 1));
}

// 爆弾・ミサイルで一気に飛ばす(ルーレット段は回さずに次の位置へ)
function blast(tower, n, rng) {
  const blasted = Math.min(n, TOTAL_STEPS - tower.step);
  const step = tower.step + blasted;
  let rouletteAt = tower.rouletteAt;
  if (rouletteAt < step) rouletteAt = step + nextRouletteGap(rng);
  return {
    ...tower, step, blasted, roulette: false, rouletteAt, popped: 0,
    gluedUntil: Math.max(tower.gluedUntil ?? 0, step) > step ? tower.gluedUntil : 0,
    reachedTop: step >= TOTAL_STEPS,
  };
}

export function applyItem(tower, item, rng = Math.random) {
  const t = { ...tower, roulette: false, blasted: 0 };
  switch (item) {
    case 'bomb': return blast(t, BOMB_BLOCKS, rng);
    case 'missile': return blast(t, MISSILE_BLOCKS, rng);
    case 'charm': return { ...t, charms: 1 };
    case 'hourglass': return { ...t, slowTaps: ITEM_TAPS };
    case 'paint': return { ...t, paintTaps: ITEM_TAPS };
    case 'glue': return { ...t, gluedUntil: t.step + GLUE_BLOCKS, glueHits: 0 };
    default: return t;
  }
}

// ルーレット:回り続け、タップでだんだん遅くなって止まる
export function createRoulette() {
  return { pos: 0, vel: 12, stopping: false, done: false, item: null };
}

export function stopRoulette(r, rng = Math.random) {
  if (r.stopping || r.done) return;
  r.stopping = true;
  r.vel = 9 + rng() * 7; // 止まる位置は完全には狙えない
}

export function updateRoulette(r, dt) {
  if (r.done) return;
  r.pos += r.vel * dt;
  if (r.stopping) {
    r.vel *= Math.exp(-1.8 * dt);
    if (r.vel < 0.7) {
      r.pos = Math.round(r.pos);
      r.vel = 0;
      r.done = true;
      const n = ITEMS.length;
      r.item = ITEMS[((r.pos % n) + n) % n];
    }
  }
}
