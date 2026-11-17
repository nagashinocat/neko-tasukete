// 調整用の数値。試遊で調整する前提の初期値。
export const TOTAL_STEPS = 10000;
export const PERFECT_MS = 50;           // 拍から±この時間なら「ぴったり」
export const GOOD_MS = 110;             // 黄色い帯(見た目の目安)
export const PERFECT_FRAC = 0.08;       // 速いテンポでは「ぴったり」は1拍のこの割合まで狭くなる
export const TILT_PER_OFFSET = 0.35;    // ずれ1あたりに増える傾き
export const TILT_RECOVER = 0.12;       // ぴったりで戻る傾き
export const TILT_LIMIT = 1.0;          // これ以上で崩れる
export const BPM_MIN = 80;              // テンポ(1拍ごとに針が端に着く)
export const BPM_MAX = 240;
export const BPM_RAMP_STEPS = 2500;     // テンポの上がり方
export const BPM_RATE = 4;              // テンポが変わる速さ(BPM/秒)
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
export const ROULETTE_GAP_MIN = 30;  // ルーレット段の間隔
export const ROULETTE_GAP_MAX = 60;
export const BOMB_BLOCKS = 100;
export const MISSILE_BLOCKS = 300;
export const ITEM_TAPS = 10;         // 砂時計・ペンキが続く回数
export const GLUE_BLOCKS = 10;
export const SLOW_FACTOR = 0.7;      // 砂時計中のテンポ
