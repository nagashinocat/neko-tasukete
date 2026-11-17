// お囃子風BGMの譜面。1小節16刻み。
export const BAR_STEPS = 16;
// 拍の時計(beatNow)から、lookaheadSec 先までに鳴らす16分音符を時刻つきで返す。
// 遅れた音符は飛ばす。step は曲の頭からの16分音符の番号
export function stepsToSchedule(nextStep, beatNow, bpm, lookaheadSec) {
  const out = [];
  const secPerBeat = 60 / bpm;
  const until = beatNow + lookaheadSec / secPerBeat;
  for (let s = nextStep; s / 4 < until; s++) {
    const inSec = (s / 4 - beatNow) * secPerBeat;
    if (inSec < -0.02) continue;
    out.push({ step: s, inSec });
  }
  return out;
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
