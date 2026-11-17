import { COLLAPSE_SEC, TAP_GUARD_MS, RESULT_GUARD_SEC, SLOW_FACTOR } from './config.js';
import { applyItem, createRoulette, stopRoulette, updateRoulette } from './items.js';

const ROULETTE_HOLD_SEC = 1.0; // 止まったアイテムを見せる時間
import { needlePosition, advancePhase, judge } from './gauge.js';
import { speedForStep } from './tempo.js';
import { createTower, hit } from './tower.js';

// 画面状態: 'opening' | 'playing' | 'roulette' | 'collapsing' | 'result'
export function createGame(storage, rng = Math.random) {
  const finish = () => {
    game.state = 'result';
    game.resultTime = 0;
    game.newBest = storage.saveBest(game.tower.step);
    game.best = storage.getBest();
  };
  const game = {
    state: 'opening',
    tower: createTower(rng),
    roulette: null,
    rouletteHold: 0,
    lastItem: null,   // { item, seq } 最後に効いたアイテム(演出用)
    itemSeq: 0,

    speed() {
      return speedForStep(this.tower.step) * (this.tower.slowTaps > 0 ? SLOW_FACTOR : 1);
    },
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
        this.phase = advancePhase(this.phase, this.speed(), dtSec);
      } else if (this.state === 'roulette') {
        const r = this.roulette;
        updateRoulette(r, Math.min(Math.max(dtSec, 0), 0.1));
        if (r.done) {
          this.rouletteHold += Math.max(dtSec, 0);
          if (this.rouletteHold >= ROULETTE_HOLD_SEC) {
            this.tower = applyItem(this.tower, r.item, rng);
            this.lastItem = { item: r.item, seq: ++this.itemSeq };
            this.roulette = null;
            this.state = 'playing';
            if (this.tower.reachedTop) finish();
          }
        }
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
      if (this.state === 'roulette') {
        stopRoulette(this.roulette, rng);
        return;
      }
      if (this.state !== 'playing') return;
      this.lastJudge = judge(needlePosition(this.phase));
      this.tower = hit(this.tower, this.lastJudge, rng);
      this.lastHitMs = nowMs;
      if (this.tower.collapsed) {
        this.state = 'collapsing';
        this.collapseTime = 0;
      } else if (this.tower.reachedTop) {
        finish();
      } else if (this.tower.roulette) {
        this.state = 'roulette';
        this.roulette = createRoulette();
        this.rouletteHold = 0;
      }
    },

    finishOpening() {
      if (this.state !== 'opening') return;
      storage.markOpeningSeen();
      this.state = 'playing';
    },

    retry() {
      this.tower = createTower(rng);
      this.roulette = null;
      this.lastItem = null;
      this.phase = 0;
      this.newBest = false;
      this.lastJudge = null;
      this.lastHitMs = null;
      this.state = 'playing';
    },
  };
  return game;
}
