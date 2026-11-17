// 効果音とBGM(WebAudioでその場で鳴らす)。音が出ない端末でもそのまま遊べる。
import { BAR_STEPS, pattern, stepsToSchedule, swingOffsetBeats } from './music.js';

let ac = null;
let master = null;
let sfxBus = null;
let bgmBus = null;
let noise = null;
let muted = false;

function setup() {
  master = ac.createGain();
  master.gain.value = muted ? 0 : 1;
  master.connect(ac.destination);
  sfxBus = ac.createGain();
  sfxBus.gain.value = 0.9;
  sfxBus.connect(master);
  bgmBus = ac.createGain();
  bgmBus.gain.value = 0;
  bgmBus.connect(master);
  noise = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}

export function unlockAudio() {
  try {
    if (!ac) {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      setup();
      watchState();
    }
    if (ac.state === 'suspended') ac.resume();
    wake();
  } catch { ac = null; }
}

// 鳴っている(鳴る予定の)音。アプリから離れるときに全部止める
const live = new Set();
function track(...nodes) {
  for (const n of nodes) {
    live.add(n);
    n.onended = () => live.delete(n);
  }
}

// アプリから離れる瞬間:すぐ無音にして、予約ずみの音も止める
export function hush() {
  if (!ac) return;
  try {
    master.gain.cancelScheduledValues(ac.currentTime);
    master.gain.setValueAtTime(0, ac.currentTime);
    master.gain.value = 0;
  } catch { /* noop */ }
  for (const n of live) { try { n.stop(0); } catch { /* 止め済み */ } }
  live.clear();
}

// 戻ってきてタップしたとき:音を元に戻す
function wake() {
  if (!ac || !master) return;
  master.gain.cancelScheduledValues(ac.currentTime);
  master.gain.setValueAtTime(muted ? 0 : 1, ac.currentTime);
}

export function setMuted(m) {
  muted = m;
  if (ac && master) master.gain.setTargetAtTime(m ? 0 : 1, ac.currentTime, 0.02);
}

// ---- 部品 ----
function env(g, t, peak, attack, decay) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}

function osc(bus, t, type, f0, f1, peak, attack, decay) {
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + attack + decay);
  env(g, t, peak, attack, decay);
  o.connect(g).connect(bus);
  o.start(t);
  track(o);
  o.stop(t + attack + decay + 0.05);
}

function burst(bus, t, filterType, freq, q, peak, decay) {
  const s = ac.createBufferSource();
  s.buffer = noise;
  const f = ac.createBiquadFilter();
  f.type = filterType;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ac.createGain();
  env(g, t, peak, 0.002, decay);
  s.connect(f).connect(g).connect(bus);
  s.start(t, Math.random() * 0.3);
  track(s);
  s.stop(t + decay + 0.05);
}

// 木の段を槌で打つ「コン!」
function knock(t, pitch = 1) {
  if (ac.state !== 'running') return;
  burst(sfxBus, t, 'bandpass', 2600 * pitch, 2.5, 0.5, 0.025);       // 当たった瞬間のカッ
  osc(sfxBus, t, 'sine', 820 * pitch, 560 * pitch, 0.45, 0.002, 0.09); // 木の響き
  osc(sfxBus, t, 'triangle', 240 * pitch, 150 * pitch, 0.25, 0.002, 0.12); // 胴の鳴り
}

export const sfx = {
  pon() {
    if (!ac) return;
    knock(ac.currentTime, 0.94 + Math.random() * 0.12);
  },
  // n段まとめて飛ぶときはパンパンパンと続けて鳴らす(gapSec 間隔)
  perfect(n = 1, gapSec = 0.055) {
    if (!ac) return;
    const t = ac.currentTime;
    for (let i = 0; i < n; i++) knock(t + i * gapSec, 1.12 + i * 0.04);
    const end = t + (n - 1) * gapSec + 0.02;
    osc(sfxBus, end, 'sine', 1568, 1568, 0.18, 0.003, 0.45); // チーン
    osc(sfxBus, end, 'sine', 2349, 2349, 0.09, 0.003, 0.3);
  },
  peel() {
    if (!ac) return;
    const t = ac.currentTime;
    burst(sfxBus, t, 'highpass', 2500, 0.8, 0.35, 0.09); // ペリッ
    osc(sfxBus, t, 'sawtooth', 300, 900, 0.06, 0.005, 0.07);
  },
  tick() {
    if (!ac) return;
    osc(sfxBus, ac.currentTime, 'square', 1800, 1800, 0.06, 0.001, 0.025);
  },
  item(good) {
    if (!ac) return;
    const t = ac.currentTime;
    const notes = good ? [784, 988, 1175, 1568] : [523, 494, 466, 415];
    notes.forEach((f, i) => osc(sfxBus, t + i * 0.08, 'triangle', f, f, 0.16, 0.005, 0.18));
  },
  boom() {
    if (!ac) return;
    const t = ac.currentTime;
    burst(sfxBus, t, 'lowpass', 900, 0.6, 1.0, 0.7);
    osc(sfxBus, t, 'sine', 110, 35, 0.8, 0.005, 0.6);
    for (let i = 0; i < 6; i++) knock(t + 0.05 + i * 0.03, 0.7 + Math.random() * 0.6);
  },
  missile() {
    if (!ac) return;
    const t = ac.currentTime;
    burst(sfxBus, t, 'bandpass', 1200, 0.6, 0.5, 0.6);
    osc(sfxBus, t, 'sawtooth', 220, 880, 0.08, 0.02, 0.5);
    for (let i = 0; i < 10; i++) knock(t + 0.05 + i * 0.04, 0.8 + Math.random() * 0.6);
  },
  splat() {
    if (!ac) return;
    const t = ac.currentTime;
    for (let i = 0; i < 4; i++) burst(sfxBus, t + i * 0.07, 'lowpass', 700, 1.2, 0.6, 0.12);
  },
  crash() {
    if (!ac) return;
    const t = ac.currentTime;
    burst(sfxBus, t, 'lowpass', 380, 0.7, 0.6, 0.9); // ゴロゴロ
    for (let i = 0; i < 9; i++) knock(t + 0.05 + i * 0.07 + Math.random() * 0.04, 0.6 + Math.random() * 0.6);
  },
};

// ---- BGM(ジャズ・トリオ風。ゲームの拍の時計に合わせて鳴らす:毎拍のバスドラで針が端に着く) ----
const midiHz = (m) => 440 * Math.pow(2, (m - 69) / 12);
let timer = null;
let nextStep = 0;
let getClock = null; // () => { beat, bpm }

// ---- ジャズ・トリオの楽器 ----
// バスドラ:叩くタイミング。いちばん大きく、アタックをはっきり
function kick(t) {
  osc(bgmBus, t, 'sine', 150, 42, 1.0, 0.002, 0.28);
  osc(bgmBus, t, 'triangle', 95, 45, 0.35, 0.002, 0.18);
  burst(bgmBus, t, 'bandpass', 3200, 1.2, 0.35, 0.012); // ビーターのアタック
}

// ライドシンバル(小さめ)
function ride(t, accent) {
  const p = accent ? 0.055 : 0.035;
  burst(bgmBus, t, 'highpass', 6500, 0.7, p, 0.32);
  osc(bgmBus, t, 'square', 3520, 3520, p * 0.25, 0.001, 0.18);
  osc(bgmBus, t, 'square', 5280, 5280, p * 0.18, 0.001, 0.14);
}

function hat(t) {
  burst(bgmBus, t, 'highpass', 7500, 0.8, 0.05, 0.035);
}

// ウッドベース:はじいた音
function bass(midi, t, dur) {
  const f = midiHz(midi);
  const o = ac.createOscillator();
  const o2 = ac.createOscillator();
  const lp = ac.createBiquadFilter();
  const g = ac.createGain();
  o.type = 'triangle';
  o2.type = 'sine';
  o.frequency.value = f;
  o2.frequency.value = f * 2;
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(900, t);
  lp.frequency.exponentialRampToValueAtTime(260, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.32, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.12, t + 0.12);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  const g2 = ac.createGain();
  g2.gain.value = 0.25;
  o.connect(lp);
  o2.connect(g2).connect(lp);
  lp.connect(g).connect(bgmBus);
  o.start(t); o2.start(t);
  track(o, o2);
  o.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
}

// エレピ(ローズ)っぽいやわらかい和音
function keys(notes, t, dur) {
  for (const m of notes) {
    const f = midiHz(m);
    const o = ac.createOscillator();
    const bell = ac.createOscillator();
    const g = ac.createGain();
    const gb = ac.createGain();
    o.type = 'sine';
    bell.type = 'sine';
    o.frequency.value = f;
    bell.frequency.value = f * 4;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.045, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.018, t + 0.25);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    gb.gain.setValueAtTime(0.012, t);
    gb.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
    o.connect(g).connect(bgmBus);
    bell.connect(gb).connect(bgmBus);
    o.start(t); bell.start(t);
    track(o, bell);
    o.stop(t + dur + 0.05); bell.stop(t + dur + 0.05);
  }
}

function schedule() {
  if (!ac || !getClock) return;
  const { beat, bpm } = getClock();
  // 音が止められている間(コントロールセンター・ホーム画面など)は予約しない。
  // 予約すると、戻ったときにたまった音がいっせいに鳴ってピーッとなる
  if (ac.state !== 'running') {
    nextStep = Math.ceil(beat * 4);
    return;
  }
  const lookahead = 0.12;
  const latency = ac.outputLatency || ac.baseLatency || 0; // 聞こえる瞬間を針に合わせる
  for (const { step, inSec } of stepsToSchedule(nextStep, beat, bpm, lookahead)) {
    const k = step % BAR_STEPS;
    const bar = Math.floor(step / BAR_STEPS) % pattern.chords.length;
    // バスドラはずらさない(叩くタイミングそのもの)。ほかは裏をスウィング
    const tOn = Math.max(ac.currentTime, ac.currentTime + inSec - latency);
    const tSw = Math.max(ac.currentTime, tOn + swingOffsetBeats(k) * (60 / bpm));
    if (pattern.kick[k]) kick(tOn);
    if (pattern.ride[k]) ride(tSw, pattern.ride[k] === 'R');
    if (pattern.hat[k]) hat(tSw);
    const b = pattern.bass[bar][k];
    if (typeof b === 'number') bass(b, tOn, (60 / bpm) * 0.95);
    if (pattern.comp[k]) keys(pattern.chords[bar], tSw, k === 0 ? (60 / bpm) * 1.4 : (60 / bpm) * 2.2);
  }
  nextStep = Math.max(nextStep, Math.ceil((beat + lookahead * bpm / 60) * 4));
}

export const bgm = {
  start(clock) {
    if (!ac || timer) return;
    getClock = clock;
    nextStep = Math.ceil(clock().beat * 4);
    bgmBus.gain.cancelScheduledValues(ac.currentTime);
    bgmBus.gain.setTargetAtTime(0.55, ac.currentTime, 0.05);
    timer = setInterval(schedule, 25);
    schedule();
  },
  stop() {
    if (!timer) return;
    clearInterval(timer);
    timer = null;
    if (!ac) return;
    bgmBus.gain.cancelScheduledValues(ac.currentTime);
    if (ac.state === 'running') bgmBus.gain.setTargetAtTime(0, ac.currentTime, 0.15);
    else bgmBus.gain.value = 0;
  },
  get playing() { return timer !== null; },
};

// 音が止められた(電話・コントロールセンター・ほかのアプリ)ことを知らせる
let interruptedCb = null;
export function onAudioInterrupted(cb) { interruptedCb = cb; }

// タブを裏に回したら止め、戻ったら続ける
document.addEventListener('visibilitychange', () => {
  if (!ac) return;
  if (document.hidden) { hush(); ac.suspend(); }
  else ac.resume();
});

function watchState() {
  if (!ac || ac.__watched) return;
  ac.__watched = true;
  ac.addEventListener('statechange', () => {
    if (ac.state !== 'running' && interruptedCb) interruptedCb();
  });
}
