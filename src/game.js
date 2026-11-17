import { COLLAPSE_SEC, TAP_GUARD_MS, RESULT_GUARD_SEC } from './config.js';
import { needlePosition, advancePhase, judge } from './gauge.js';
import { speedForStep } from './tempo.js';
import { createTower, hit } from './tower.js';

// 画面状態: 'opening' | 'playing' | 'collapsing' | 'result'
export function createGame(storage) {
  const finish = () => {
    game.state = 'result';
    game.resultTime = 0;
    game.newBest = storage.saveBest(game.tower.step);
    game.best = storage.getBest();
  };
  const game = {
    state: 'opening',
    tower: createTower(),
    phase: 0,
    best: storage.getBest(),
    newBest: false,
    lastJudge: null,
    lastHitMs: null,     // 最後に段が抜けた時刻(演出用)
    collapseTime: 0,
    resultTime: 0,
    get resultReady() { return this.state === 'result' && this.resultTime >= RESULT_GUARD_SEC; },
    lastTapMs: -Infinity,

    update(dtSec) {
      if (this.state === 'playing') {
        this.phase = advancePhase(this.phase, speedForStep(this.tower.step), dtSec);
      } else if (this.state === 'collapsing') {
        this.collapseTime += Math.max(dtSec, 0);
        if (this.collapseTime >= COLLAPSE_SEC) finish();
      } else if (this.state === 'result') {
        this.resultTime += Math.max(dtSec, 0);
      }
    },

    tap(nowMs) {
      if (nowMs - this.lastTapMs < TAP_GUARD_MS) return;
      this.lastTapMs = nowMs;
      if (this.state === 'opening') {
        if (storage.hasSeenOpening()) this.finishOpening();
        return;
      }
      if (this.state !== 'playing') return;
      this.lastJudge = judge(needlePosition(this.phase));
      this.tower = hit(this.tower, this.lastJudge);
      this.lastHitMs = nowMs;
      if (this.tower.collapsed) {
        this.state = 'collapsing';
        this.collapseTime = 0;
      } else if (this.tower.reachedTop) {
        finish();
      }
    },

    finishOpening() {
      if (this.state !== 'opening') return;
      storage.markOpeningSeen();
      this.state = 'playing';
    },

    retry() {
      this.tower = createTower();
      this.phase = 0;
      this.newBest = false;
      this.lastJudge = null;
      this.lastHitMs = null;
      this.state = 'playing';
    },
  };
  return game;
}
