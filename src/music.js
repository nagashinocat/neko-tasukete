import { SPEED_BASE, SPEED_MAX } from './config.js';

// お囃子風BGMの譜面。1小節16刻み。
export const BAR_STEPS = 16;
const TEMPO_MIN = 96;
const TEMPO_MAX = 176;

// 針の速さ → BGMのテンポ(BPM)
export function bgmTempo(speed) {
  const t = Math.max(0, Math.min(1, (speed - SPEED_BASE) / (SPEED_MAX - SPEED_BASE)));
  return Math.round(TEMPO_MIN + (TEMPO_MAX - TEMPO_MIN) * t);
}

// 笛:陽音階(レ ミ ソ ラ シ)の MIDI 番号。null は休み、'~' はのばす
const D = 74, E = 76, G = 79, A = 81, B = 83, D2 = 86, E2 = 88;
const _ = null, L = '~';
export const pattern = {
  // D=大太鼓どん、d=小さくどん、k=縁のカッ
  drum: ['D', _, 'k', _, 'd', _, 'k', 'k', 'D', _, 'k', _, 'd', 'k', 'k', _],
  melody: [
    [A, L, B, A, G, L, E, L, G, A, G, E, D, L, L, _],
    [D, E, G, L, A, L, B, L, D2, L, B, A, G, L, L, _],
    [E2, L, D2, B, A, L, B, L, A, G, E, G, A, L, L, _],
    [G, A, G, E, D, L, E, L, G, L, A, L, D, L, L, _],
  ],
};
