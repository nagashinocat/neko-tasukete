// ジャズ・トリオ風BGMの譜面(ドラム・ウッドベース・ピアノ)。1小節16刻み。
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

// スウィング:拍の裏の8分(16分の2つ目)を3連符の位置(拍の2/3)へずらす
export function swingOffsetBeats(step) {
  return step % 4 === 2 ? 2 / 3 - 1 / 2 : 0;
}

const _ = null;
// MIDI 番号
const D2 = 38, E2 = 40, F2 = 41, G2 = 43, A2 = 45, B2 = 47, C3 = 48, Cs3 = 49, D3 = 50, E3 = 52, F3 = 53, G3 = 55, A3 = 57;
export const pattern = {
  // バスドラ:叩くタイミング(毎拍の頭)に必ず。これが一番目立つ
  kick: ['K', _, _, _, 'K', _, _, _, 'K', _, _, _, 'K', _, _, _],
  // ライド:チーン、チーチキ(裏はスウィング)
  ride: ['R', _, _, _, 'R', _, 'r', _, 'R', _, _, _, 'R', _, 'r', _],
  // ハイハット(足):2拍目と4拍目
  hat: [_, _, _, _, 'H', _, _, _, _, _, _, _, 'H', _, _, _],
  // ii-V-I-VI(Dm9 → G13 → Cmaj9 → A7)。ピアノの和音(MIDI)
  chords: [
    [53, 57, 60, 64],  // Dm9:F A C E
    [53, 57, 59, 64],  // G13:F A B E
    [52, 55, 59, 62],  // Cmaj9:E G B D
    [55, 58, 61, 65],  // A7(b9):G Bb C# F
  ],
  // ピアノを鳴らす場所(1拍目と2拍目の裏=チャールストン)
  comp: [1, _, _, _, _, _, 1, _, _, _, _, _, _, _, _, _],
  // ウォーキングベース(1拍に1音)
  bass: [
    [D3, _, _, _, F3, _, _, _, A3, _, _, _, A2, _, _, _],
    [G2, _, _, _, B2, _, _, _, D3, _, _, _, F3, _, _, _],
    [E3, _, _, _, C3, _, _, _, G2, _, _, _, B2, _, _, _],
    [A2, _, _, _, Cs3, _, _, _, E3, _, _, _, E2, _, _, _],
  ],
};
