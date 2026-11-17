import { layout } from './render.js';
import {
  FONT, blockColor, drawBlock, drawDarumaHead, SKY_COLORS, mixColor, drawStars, drawCloud, seeded, roundRect,
} from './art.js';

const HOLD = 1.4;    // 宇宙のだるまの頭を見せる時間
const SCROLL = 3.8;  // 下へスクロールする時間
const SETTLE = 0.4;
export const OPENING_SEC = HOLD + SCROLL + SETTLE;

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp01 = (v) => Math.max(0, Math.min(1, v));

// p: 0=宇宙 → 1=地上
const STOPS = [
  [0.0, 'space'],
  [0.35, 'stratosphere'],
  [0.6, 'clouds'],
  [0.82, 'sky'],
  [1.0, 'ground'],
];

function skyFor(p) {
  for (let i = 0; i < STOPS.length - 1; i++) {
    const [p0, a] = STOPS[i];
    const [p1, b] = STOPS[i + 1];
    if (p <= p1) {
      const t = clamp01((p - p0) / (p1 - p0));
      return [mixColor(SKY_COLORS[a][0], SKY_COLORS[b][0], t), mixColor(SKY_COLORS[a][1], SKY_COLORS[b][1], t)];
    }
  }
  return SKY_COLORS.ground;
}

export function createOpening({ onDone, canSkip }) {
  let time = 0;
  let done = false;
  return {
    get done() { return done; },
    update(dt) {
      if (done) return;
      time += Math.min(Math.max(dt, 0), 0.1);
      if (time >= OPENING_SEC) {
        done = true;
        onDone();
      }
    },
    draw(ctx, view) {
      const L = layout(view);
      const p = ease(clamp01((time - HOLD) / SCROLL));
      const S = L.h * 6;          // スクロールする全長
      const off = (1 - p) * S;    // 画面に足すずれ(高いところにいるほど地上は下)

      const [top, bottom] = skyFor(p);
      const g = ctx.createLinearGradient(0, 0, 0, L.h);
      g.addColorStop(0, top);
      g.addColorStop(1, bottom);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, L.w, L.h);

      drawStars(ctx, L.w, L.h, -off * 0.04, clamp01(1 - p / 0.45));

      // 地球の青い縁
      const rim = clamp01(1 - Math.abs(p - 0.32) / 0.2);
      if (rim > 0) {
        ctx.save();
        ctx.globalAlpha = rim;
        const R = L.w * 2.4;
        const cy = L.h + R * 0.8 - (p - 0.32) * L.h * 2.5;
        const eg = ctx.createRadialGradient(L.cx, cy, R * 0.9, L.cx, cy, R * 1.03);
        eg.addColorStop(0, '#2f7fd6');
        eg.addColorStop(0.85, '#8fe0ff');
        eg.addColorStop(1, 'rgba(143,224,255,0)');
        ctx.fillStyle = eg;
        ctx.beginPath();
        ctx.arc(L.cx, cy, R * 1.03, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // だるまの塔
      const rows = Math.round((S + L.groundY - L.h * 0.55) / L.bh); // 最初の画面で頭が真ん中あたりに来る段数
      const rFrom = Math.max(0, Math.floor((L.groundY + off - L.h - L.bh) / L.bh));
      const rTo = Math.min(rows - 1, Math.ceil((L.groundY + off + L.bh) / L.bh));
      for (let r = rFrom; r <= rTo; r++) {
        const y = L.groundY - L.bh / 2 - r * L.bh + off;
        drawBlock(ctx, L.cx, y, L.bw, L.bh, blockColor(r));
      }
      const headBottom = L.groundY - rows * L.bh + off;
      if (headBottom > -L.bw && headBottom < L.h + L.bw * 1.2) {
        drawDarumaHead(ctx, L.cx, headBottom, L.bw * 0.95);
      }

      // 雲を突き抜ける(手前の雲は速く流れる)
      const cloudBand = clamp01(1 - Math.abs(p - 0.68) / 0.16);
      if (cloudBand > 0) {
        for (let i = 0; i < 14; i++) {
          const baseY = seeded(i) * L.h * 2.2 - L.h * 0.6;
          const y = baseY + (p - 0.68) * L.h * (6 + seeded(i + 7) * 5);
          const x = seeded(i + 20) * L.w;
          drawCloud(ctx, x, y, 90 + seeded(i + 40) * 120, cloudBand * 0.95);
        }
      }

      // 地面と台
      const groundTop = L.groundY + off;
      if (groundTop < L.h + 40) {
        ctx.fillStyle = '#9ccf7a';
        ctx.beginPath();
        ctx.moveTo(0, groundTop + 20);
        for (let x = 0; x <= L.w; x += 20) ctx.lineTo(x, groundTop - 10 - Math.sin(x / 70) * 14);
        ctx.lineTo(L.w, L.h + off);
        ctx.lineTo(0, L.h + off);
        ctx.fill();
        ctx.fillStyle = '#6fae4f';
        ctx.fillRect(0, groundTop + 8, L.w, L.h);
        ctx.fillStyle = '#8a5a35';
        roundRect(ctx, L.cx - L.bw * 0.85, groundTop, L.bw * 1.7, 14, 4);
        ctx.fill();
      }

      // タイトル
      const ta = clamp01(1 - (time - HOLD + 0.3) / 0.8);
      if (ta > 0) {
        ctx.save();
        ctx.globalAlpha = ta;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff';
        ctx.font = `900 ${Math.min(L.w * 0.12, 54)}px ${FONT}`;
        ctx.fillText('だるま落とし', L.cx, L.h * 0.2);
        ctx.font = `700 ${Math.min(L.w * 0.045, 18)}px ${FONT}`;
        ctx.fillStyle = '#cfe0ff';
        ctx.fillText('頭は、宇宙にある。', L.cx, L.h * 0.2 + 44);
        ctx.restore();
      }
      if (canSkip) {
        ctx.save();
        ctx.globalAlpha = 0.75;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fff';
        ctx.font = `700 14px ${FONT}`;
        ctx.fillText('タップで飛ばす', L.cx, L.h - 24);
        ctx.restore();
      }
    },
  };
}
