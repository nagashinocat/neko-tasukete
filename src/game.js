import { COLLAPSE_SEC, TAP_GUARD_MS, RESULT_GUARD_SEC, SLOW_FACTOR, BPM_MIN } from './config.js';
import { applyItem, createRoulette, stopRoulette, updateRoulette } from './items.js';
import { advanceBeats, judge } from './gauge.js';
import { bpmForStep, easeBpm } from './tempo.js';

const ROULETTE_HOLD_SEC = 1.0; // 止まったアイテムを見せる時間
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

    beats: 0,         // 拍の時計(BGMと針はこれに合わせる)
    bpm: BPM_MIN,     // 今のテンポ(目標へなめらかに近づく)
    targetBpm() {
      return bpmForStep(this.tower.step) * (this.tower.slowTaps > 0 ? SLOW_FACTOR : 1);
    },
    best: storage.getBest(),
    newBest: false,
    lastJudge: null,
    lastHitMs: null,     // 最後に段が抜けた時刻(演出用)
    collapseTime: 0,
    resultTime: 0,
    get resultReady() { return this.state === 'result' && this.resultTime >= RESULT_GUARD_SEC; },
    lastTapMs: -Infinity,

    update(dtSec) {
      if (this.state === 'playing' || this.state === 'roulette') {
        // リズムはルーレット中も止めない
        const dt = Math.min(Math.max(dtSec, 0), 0.1);
        this.bpm = easeBpm(this.bpm, this.targetBpm(), dt);
        this.beats = advanceBeats(this.beats, this.bpm, dt);
      }
      if (this.state === 'roulette') {
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
      this.lastJudge = judge(this.beats, this.bpm);
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
      this.beats = 0;
      this.bpm = BPM_MIN;
      this.newBest = false;
      this.lastJudge = null;
      this.lastHitMs = null;
      this.state = 'playing';
    },
  };
  return game;
}
