import { createStorage } from './storage.js';
import { createGame } from './game.js';
import { createRenderer, resultButtons, muteButton, drawMuteButton } from './render.js';
import { createOpening } from './opening.js';
import { unlockAudio, sfx, bgm, setMuted } from './sound.js';
import { speedForStep } from './tempo.js';
import { prepareShareImage } from './shareCard.js';
import { shareBlob } from './share.js';
import { tapTime } from './input.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const storage = createStorage();
const game = createGame(storage);
const renderer = createRenderer();
const opening = createOpening({ canSkip: storage.hasSeenOpening(), onDone: () => game.finishOpening() });
window.__game = game; // 動作確認用
let muted = storage.isMuted();
setMuted(muted);

const view = { width: 0, height: 0, dpr: 1 };
function resize() {
  view.dpr = Math.min(window.devicePixelRatio || 1, 3);
  view.width = window.innerWidth;
  view.height = window.innerHeight;
  canvas.width = Math.round(view.width * view.dpr);
  canvas.height = Math.round(view.height * view.dpr);
}
window.addEventListener('resize', resize);
resize();

let last = performance.now();
let prevHit = null;
let prevState = game.state;

function afterInput() {
  if (game.lastHitMs !== prevHit && game.lastHitMs != null) {
    prevHit = game.lastHitMs;
    if (game.lastJudge?.perfect) sfx.perfect(); else sfx.pon();
  }
  if (game.state === 'collapsing' && prevState !== 'collapsing') sfx.crash();
  if (game.state === 'result' && prevState !== 'result') {
    shareImage = null;
    const step = game.tower.step;
    prepareShareImage(step, game.newBest).then((blob) => { if (game.state === 'result' && game.tower.step === step) shareImage = blob; });
  }
  prevState = game.state;
}

const inside = (b, x, y) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
let sharing = false;
let shareImage = null;

canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  unlockAudio();
  if (inside(muteButton(), e.clientX, e.clientY)) {
    muted = !muted;
    setMuted(muted);
    storage.setMuted(muted);
    return;
  }
  const now = tapTime(e, performance.now());
  if (game.state === 'result') {
    if (!game.resultReady) return; // 連打のまま「もう一回」を押してしまわないように
    const B = resultButtons(view);
    if (inside(B.retry, e.clientX, e.clientY)) { game.retry(); prevHit = null; prevState = game.state; }
    else if (inside(B.share, e.clientX, e.clientY) && !sharing) {
      sharing = true;
      const go = shareImage
        ? shareBlob(shareImage, game.tower.step)
        : prepareShareImage(game.tower.step, game.newBest).then((b) => (b ? shareBlob(b, game.tower.step) : 'cancelled'));
      go.finally(() => { sharing = false; });
    }
    return;
  }
  // 判定はタップした瞬間の針の位置で行う
  game.update((now - last) / 1000);
  last = Math.max(last, now);
  game.tap(now);
  afterInput();
}, { passive: false });

function frame(now) {
  const dt = (now - last) / 1000;
  last = now;
  if (game.state === 'opening') opening.update(dt);
  game.update(dt);
  afterInput();
  if (game.state === 'playing') {
    bgm.setSpeed(speedForStep(game.tower.step));
    if (!bgm.playing) bgm.start();
  } else if (bgm.playing) bgm.stop();
  ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
  if (game.state === 'opening') opening.draw(ctx, view);
  else renderer.render(ctx, game, view, now);
  drawMuteButton(ctx, muted);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
