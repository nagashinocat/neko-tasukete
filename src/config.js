// 調整用の数値。試遊で調整する前提の初期値。
export const TOTAL_STEPS = 10000;
export const PERFECT_HALF_WIDTH = 0.10; // 針位置 -1..1 のうち中心±この幅が「ぴったり」
export const BAND_HALF_WIDTH = 0.25;    // 見た目の帯の半幅
export const TILT_PER_OFFSET = 0.35;    // ずれ1あたりに増える傾き
export const TILT_RECOVER = 0.12;       // ぴったりで戻る傾き
export const TILT_LIMIT = 1.0;          // これ以上で崩れる
export const SPEED_BASE = 0.6;          // 往復/秒
export const SPEED_MAX = 5.0;
export const SPEED_RAMP_STEPS = 4000;
export const SCENES = [
  { from: 0, id: 'ground', label: '地上' },
  { from: 100, id: 'sky', label: '空' },
  { from: 500, id: 'clouds', label: '雲の上' },
  { from: 2000, id: 'stratosphere', label: '成層圏' },
  { from: 10000, id: 'space', label: '宇宙' },
];
export const COLLAPSE_SEC = 1.5;  // 崩れ演出の長さ
export const TAP_GUARD_MS = 60;   // これより短い間隔のタップは二重発火として無視
export const RESULT_GUARD_SEC = 0.5; // 結果画面に入ってからボタンが効くまで
export const COMBO_PER_EXTRA = 10; // 10コンボごとに1回で飛ぶ段が1つ増える
export const MAX_POP = 10;         // 1回で飛ぶ段の上限
