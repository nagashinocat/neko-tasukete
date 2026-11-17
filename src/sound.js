// 小さな効果音(WebAudio)。音が出ない端末でもそのまま遊べる。
let ac = null;

export function unlockAudio() {
  try {
    if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended') ac.resume();
  } catch { ac = null; }
}

function tone(freq, dur, type = 'triangle', gain = 0.25, slide = 0) {
  if (!ac) return;
  const t = ac.currentTime;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq * slide), t + dur);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(ac.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export const sfx = {
  pon() { tone(520, 0.09, 'square', 0.12, 0.6); },
  perfect() { tone(880, 0.12, 'triangle', 0.2); setTimeout(() => tone(1320, 0.16, 'triangle', 0.16), 50); },
  crash() { for (let i = 0; i < 6; i++) setTimeout(() => tone(140 + Math.random() * 120, 0.18, 'sawtooth', 0.12, 0.4), i * 90); },
};
