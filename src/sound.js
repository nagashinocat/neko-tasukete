// 効果音とBGM(WebAudioでその場で鳴らす)。音が出ない端末でもそのまま遊べる。
import { BAR_STEPS, bgmTempo, pattern } from './music.js';

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
    }
    if (ac.state === 'suspended') ac.resume();
  } catch { ac = null; }
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
  s.stop(t + decay + 0.05);
}

// 木の段を槌で打つ「コン!」
function knock(t, pitch = 1) {
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
  crash() {
    if (!ac) return;
    const t = ac.currentTime;
    burst(sfxBus, t, 'lowpass', 380, 0.7, 0.6, 0.9); // ゴロゴロ
    for (let i = 0; i < 9; i++) knock(t + 0.05 + i * 0.07 + Math.random() * 0.04, 0.6 + Math.random() * 0.6);
  },
};

// ---- BGM(お囃子風。テンポはゲームの速さに合わせる) ----
const midiHz = (m) => 440 * Math.pow(2, (m - 69) / 12);
let timer = null;
let nextTime = 0;
let stepIdx = 0;
let barIdx = 0;
let bpm = bgmTempo(0);

function drum(kind, t) {
  if (kind === 'D' || kind === 'd') {
    const p = kind === 'D' ? 0.7 : 0.4;
    osc(bgmBus, t, 'sine', 120, 52, p, 0.004, 0.32);
    burst(bgmBus, t, 'lowpass', 600, 0.8, p * 0.35, 0.06);
  } else if (kind === 'k') {
    burst(bgmBus, t, 'bandpass', 3200, 3, 0.22, 0.03);
    osc(bgmBus, t, 'square', 1250, 1250, 0.05, 0.001, 0.025);
  }
}

// 篠笛っぽい音(ゆれのある正弦波)
function flute(midi, t, dur) {
  const o = ac.createOscillator();
  const lfo = ac.createOscillator();
  const lfoGain = ac.createGain();
  const g = ac.createGain();
  const f = midiHz(midi);
  o.type = 'sine';
  o.frequency.setValueAtTime(f * 0.985, t);
  o.frequency.exponentialRampToValueAtTime(f, t + 0.04);
  lfo.frequency.value = 5.5;
  lfoGain.gain.value = f * 0.006;
  lfo.connect(lfoGain).connect(o.frequency);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.12, t + 0.03);
  g.gain.setValueAtTime(0.12, t + Math.max(0.04, dur - 0.05));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.04);
  o.connect(g).connect(bgmBus);
  o.start(t);
  lfo.start(t);
  o.stop(t + dur + 0.1);
  lfo.stop(t + dur + 0.1);
}

function schedule() {
  if (!ac) return;
  while (nextTime < ac.currentTime + 0.12) {
    const stepDur = 60 / bpm / 4;
    const d = pattern.drum[stepIdx];
    if (d) drum(d, nextTime);
    const bar = pattern.melody[barIdx];
    const note = bar[stepIdx];
    if (typeof note === 'number') {
      let len = 1;
      while (stepIdx + len < BAR_STEPS && bar[stepIdx + len] === '~') len++;
      flute(note, nextTime, len * stepDur * 0.95);
    }
    nextTime += stepDur;
    stepIdx++;
    if (stepIdx >= BAR_STEPS) {
      stepIdx = 0;
      barIdx = (barIdx + 1) % pattern.melody.length;
    }
  }
}

export const bgm = {
  start() {
    if (!ac || timer) return;
    stepIdx = 0;
    barIdx = 0;
    nextTime = ac.currentTime + 0.05;
    bgmBus.gain.cancelScheduledValues(ac.currentTime);
    bgmBus.gain.setTargetAtTime(0.55, ac.currentTime, 0.05);
    timer = setInterval(schedule, 25);
    schedule();
  },
  stop() {
    if (!timer) return;
    clearInterval(timer);
    timer = null;
    if (ac) bgmBus.gain.setTargetAtTime(0, ac.currentTime, 0.15);
  },
  setSpeed(speed) { bpm = bgmTempo(speed); },
  get playing() { return timer !== null; },
};

// タブを裏に回したら止め、戻ったら続ける
document.addEventListener('visibilitychange', () => {
  if (!ac) return;
  if (document.hidden) ac.suspend();
  else ac.resume();
});
