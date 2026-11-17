import { TOTAL_STEPS, BAND_HALF_WIDTH, PERFECT_HALF_WIDTH, SCENES, TILT_LIMIT, COLLAPSE_SEC } from './config.js';
import { needlePosition } from './gauge.js';
import { speedForStep } from './tempo.js';
import { sceneForStep, stepsToSpace } from './scenery.js';
import {
  FONT, blockColor, drawBlock, drawDarumaHead, roundRect, SKY_COLORS, mixColor,
  drawStars, drawCloud, seeded,
} from './art.js';

const fmt = (n) => n.toLocaleString('ja-JP');
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const easeOut = (t) => 1 - (1 - t) * (1 - t);

export function layout(view) {
  const { width: w, height: h } = view;
  const bw = Math.min(w * 0.42, 180);
  const bh = bw * 0.32;
  const groundY = h - 150;
  const gauge = { x: w * 0.08, y: h - 84, w: w * 0.84, h: 30 };
  return { w, h, bw, bh, groundY, cx: w / 2, gauge };
}

export function resultButtons(view) {
  const { w, h } = layout(view);
  const bw = Math.min(w * 0.7, 300);
  const x = (w - bw) / 2;
  return {
    retry: { x, y: h * 0.62, w: bw, h: 58 },
    share: { x, y: h * 0.62 + 74, w: bw, h: 52 },
  };
}

// 景色の色:次の景色の手前 30% で少しずつ混ぜる
function skyAt(step) {
  let i = 0;
  for (let k = 0; k < SCENES.length; k++) if (SCENES[k].from <= step) i = k;
  const cur = SCENES[i];
  const next = SCENES[i + 1];
  let t = 0;
  if (next) {
    const span = (next.from - cur.from) * 0.3;
    t = clamp01((step - (next.from - span)) / span);
  }
  const a = SKY_COLORS[cur.id];
  const b = next ? SKY_COLORS[next.id] : a;
  return { top: mixColor(a[0], b[0], t), bottom: mixColor(a[1], b[1], t), weights: weightsFor(cur.id, next?.id, t) };
}

function weightsFor(curId, nextId, t) {
  const wts = { ground: 0, sky: 0, clouds: 0, stratosphere: 0, space: 0 };
  wts[curId] += 1 - t;
  if (nextId) wts[nextId] += t;
  return wts;
}

export function createRenderer() {
  const fx = {
    prevHitMs: null,
    leanDir: 1,
    popped: [],
    perfectAt: -1e9,
    wobbleAt: -1e9,
    sceneId: 'ground',
    toast: null,
    hammerAt: -1e9,
  };

  function trackEvents(game, now) {
    if (game.lastHitMs !== fx.prevHitMs && game.lastHitMs != null) {
      fx.prevHitMs = game.lastHitMs;
      fx.hammerAt = now;
      fx.popped.push({ at: now, color: blockColor(game.tower.step - 1) });
      if (fx.popped.length > 8) fx.popped.shift();
      if (game.lastJudge?.perfect) fx.perfectAt = now;
      else {
        const pos = needlePosition(game.phase);
        fx.leanDir = pos >= 0 ? 1 : -1;
        if (game.lastJudge && game.lastJudge.offset > 0.55) fx.wobbleAt = now;
      }
      const scene = sceneForStep(game.tower.step);
      if (scene.id !== fx.sceneId) {
        fx.sceneId = scene.id;
        if (game.tower.step > 0) fx.toast = { text: `${scene.label}に到達!`, at: now };
      }
    }
    if (game.lastHitMs == null) {
      // もう一回のとき
      fx.prevHitMs = null;
      fx.sceneId = 'ground';
      fx.popped = [];
    }
  }

  function drawBackground(ctx, L, step, now) {
    const sky = skyAt(step);
    const g = ctx.createLinearGradient(0, 0, 0, L.h);
    g.addColorStop(0, sky.top);
    g.addColorStop(1, sky.bottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, L.w, L.h);
    const W = sky.weights;
    // 星
    drawStars(ctx, L.w, L.h, 0, W.space + W.stratosphere * 0.35);
    // 地球の縁(成層圏)
    if (W.stratosphere + W.space > 0) {
      ctx.save();
      ctx.globalAlpha = W.stratosphere + W.space * 0.6;
      const R = L.w * 2.2;
      const eg = ctx.createRadialGradient(L.cx, L.h + R * 0.86, R * 0.9, L.cx, L.h + R * 0.86, R * 1.02);
      eg.addColorStop(0, '#2f7fd6');
      eg.addColorStop(0.85, '#7fd3ff');
      eg.addColorStop(1, 'rgba(127,211,255,0)');
      ctx.fillStyle = eg;
      ctx.beginPath();
      ctx.arc(L.cx, L.h + R * 0.86, R * 1.02, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // 流れる雲(空)
    if (W.sky + W.ground * 0.5 > 0) {
      for (let i = 0; i < 6; i++) {
        const speed = 8 + seeded(i) * 12;
        const x = ((seeded(i + 30) * (L.w + 200) + now / 1000 * speed) % (L.w + 200)) - 100;
        const y = L.h * (0.08 + seeded(i + 60) * 0.45);
        drawCloud(ctx, x, y, 40 + seeded(i + 90) * 50, (W.sky + W.ground * 0.5) * 0.8);
      }
    }
    // 雲海(雲の上)
    if (W.clouds > 0) {
      for (let i = 0; i < 9; i++) {
        const x = (i / 8) * L.w + Math.sin(now / 2000 + i) * 10;
        drawCloud(ctx, x, L.groundY + 30 + seeded(i) * 20, 110, W.clouds);
      }
    }
    // 地面(地上)
    if (W.ground > 0) {
      ctx.save();
      ctx.globalAlpha = W.ground;
      ctx.fillStyle = '#9ccf7a';
      ctx.beginPath();
      ctx.moveTo(0, L.groundY + 20);
      for (let x = 0; x <= L.w; x += 20) ctx.lineTo(x, L.groundY - 10 - Math.sin(x / 70) * 14);
      ctx.lineTo(L.w, L.h);
      ctx.lineTo(0, L.h);
      ctx.fill();
      ctx.fillStyle = '#6fae4f';
      ctx.fillRect(0, L.groundY + 8, L.w, L.h);
      ctx.restore();
    }
  }

  function drawStand(ctx, L) {
    // だるまを置く台
    ctx.fillStyle = '#8a5a35';
    roundRect(ctx, L.cx - L.bw * 0.85, L.groundY, L.bw * 1.7, 14, 4);
    ctx.fill();
    ctx.fillStyle = '#6b4226';
    ctx.fillRect(L.cx - L.bw * 0.7, L.groundY + 14, 10, 40);
    ctx.fillRect(L.cx + L.bw * 0.7 - 10, L.groundY + 14, 10, 40);
  }

  function drawTower(ctx, L, game, now) {
    const { tower } = game;
    const t = now / 1000;
    const speed = speedForStep(tower.step);
    const rows = Math.ceil(L.groundY / L.bh) + 2;
    const sinceHit = fx.prevHitMs == null ? 1 : (now - fx.prevHitMs) / 90;
    const drop = L.bh * (1 - easeOut(clamp01(sinceHit)));
    const wobble = Math.exp(-(now - fx.wobbleAt) / 400) * 10 * Math.sin((now - fx.wobbleAt) / 40);
    const swayAmp = 2 + speed * 2.5 + tower.tilt * 22;
    const lean = (tower.tilt / TILT_LIMIT) * 0.14 * fx.leanDir;

    const collapsing = game.state === 'collapsing' || (game.state === 'result' && tower.collapsed);
    const ct = collapsing ? Math.min(game.collapseTime, COLLAPSE_SEC) : 0;

    ctx.save();
    if (collapsing) {
      const ang = fx.leanDir * Math.min(Math.PI * 0.55, 0.15 + ct * ct * 1.6);
      ctx.translate(L.cx, L.groundY);
      ctx.rotate(ang);
      ctx.translate(-L.cx, -L.groundY);
    }
    for (let r = 0; r < rows; r++) {
      const idx = tower.step + r;
      if (idx > TOTAL_STEPS) break;
      const heightPx = r * L.bh;
      const frac = heightPx / L.groundY;
      let x = L.cx + heightPx * lean + Math.sin(t * (1.2 + speed * 0.6)) * swayAmp * frac + wobble * frac;
      let y = L.groundY - L.bh / 2 - heightPx - drop;
      if (collapsing) {
        x += Math.sin(r * 1.7) * ct * ct * 40 * frac;
        y += ct * ct * 60 * frac;
      }
      if (idx === TOTAL_STEPS) {
        drawDarumaHead(ctx, x, y + L.bh / 2, L.bw * 0.95);
        break;
      }
      drawBlock(ctx, x, y, L.bw, L.bh, blockColor(idx));
    }
    ctx.restore();

    // 弾き飛ばされた段
    for (const p of fx.popped) {
      const s = (now - p.at) / 1000;
      if (s > 0.8) continue;
      const x = L.cx + s * 900;
      const y = L.groundY - L.bh / 2 - 60 * s + 900 * s * s;
      ctx.save();
      ctx.globalAlpha = 1 - s / 0.8;
      ctx.translate(x, y);
      ctx.rotate(s * 9);
      drawBlock(ctx, 0, 0, L.bw, L.bh, p.color);
      ctx.restore();
    }
  }

  function drawHammer(ctx, L, now) {
    // 横から一番下の段を打つ槌
    const s = clamp01((now - fx.hammerAt) / 160);
    const swing = s < 0.35 ? s / 0.35 : 1 - (s - 0.35) / 0.65; // 0=構え 1=打った瞬間
    const headW = L.bh * 0.9;
    const headH = L.bh * 1.15;
    const hx = L.cx - L.bw / 2 - headW / 2 - 4 - (1 - swing) * 34;
    const hy = L.groundY - L.bh / 2;
    ctx.fillStyle = '#b5834d';
    roundRect(ctx, hx - headW / 2 - 70, hy - 4, 72, 8, 4);
    ctx.fill();
    ctx.fillStyle = '#e8c48c';
    roundRect(ctx, hx - headW / 2, hy - headH / 2, headW, headH, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(90,50,20,0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function drawGauge(ctx, L, game, now) {
    const G = L.gauge;
    const mid = G.x + G.w / 2;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    roundRect(ctx, G.x - 4, G.y - 4, G.w + 8, G.h + 8, 12);
    ctx.fill();
    ctx.fillStyle = '#f4ead7';
    roundRect(ctx, G.x, G.y, G.w, G.h, 9);
    ctx.fill();
    const band = (G.w / 2) * BAND_HALF_WIDTH;
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(mid - band, G.y, band * 2, G.h);
    const perfect = (G.w / 2) * PERFECT_HALF_WIDTH;
    ctx.fillStyle = '#ef476f';
    ctx.fillRect(mid - perfect, G.y, perfect * 2, G.h);
    // 針
    const pos = game.state === 'playing' ? needlePosition(game.phase) : 0;
    const nx = mid + pos * (G.w / 2);
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(nx - 3, G.y - 8, 6, G.h + 16);
    ctx.beginPath();
    ctx.moveTo(nx - 9, G.y - 14);
    ctx.lineTo(nx + 9, G.y - 14);
    ctx.lineTo(nx, G.y - 4);
    ctx.fill();
    // ぴったり!
    const ps = (now - fx.perfectAt) / 600;
    if (ps < 1) {
      ctx.save();
      ctx.globalAlpha = 1 - ps;
      ctx.fillStyle = '#ffdf5e';
      ctx.strokeStyle = '#7a1f00';
      ctx.lineWidth = 5;
      ctx.font = `900 ${28 + ps * 8}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.strokeText('ぴったり!', mid, G.y - 30 - ps * 20);
      ctx.fillText('ぴったり!', mid, G.y - 30 - ps * 20);
      ctx.restore();
    }
  }

  function text(ctx, str, x, y, size, color = '#fff', align = 'center', weight = 800) {
    ctx.font = `${weight} ${size}px ${FONT}`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.lineWidth = Math.max(3, size / 7);
    ctx.strokeStyle = 'rgba(10,12,30,0.75)';
    ctx.strokeText(str, x, y);
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
  }

  function drawHud(ctx, L, game, now) {
    const step = game.tower.step;
    text(ctx, `${fmt(step)}段`, L.cx, 58, 44);
    text(ctx, `宇宙まであと ${fmt(stepsToSpace(step))}段`, L.cx, 98, 16, '#e6f0ff', 'center', 700);
    text(ctx, `自己ベスト ${fmt(game.best)}`, L.w - 14, 22, 13, '#ffe9a8', 'right', 700);
    if (game.state === 'playing' && step === 0) {
      const a = 0.6 + 0.4 * Math.sin(now / 250);
      ctx.save();
      ctx.globalAlpha = a;
      text(ctx, '赤い帯で タップ!', L.cx, L.gauge.y - 34, 22, '#fff');
      ctx.restore();
    }
    if (fx.toast) {
      const s = (now - fx.toast.at) / 1800;
      if (s < 1) {
        ctx.save();
        ctx.globalAlpha = s < 0.8 ? 1 : (1 - s) / 0.2;
        text(ctx, fx.toast.text, L.cx, 150, 26, '#fff5c2');
        ctx.restore();
      } else fx.toast = null;
    }
    // 危ないときは画面のはしが赤くなる
    const danger = clamp01((game.tower.tilt / TILT_LIMIT - 0.55) / 0.45);
    if (danger > 0 && game.state === 'playing') {
      const vg = ctx.createRadialGradient(L.cx, L.h / 2, Math.min(L.w, L.h) * 0.35, L.cx, L.h / 2, Math.max(L.w, L.h) * 0.75);
      vg.addColorStop(0, 'rgba(255,0,0,0)');
      vg.addColorStop(1, `rgba(220,20,40,${0.45 * danger * (0.75 + 0.25 * Math.sin(now / 120))})`);
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, L.w, L.h);
    }
  }

  function button(ctx, b, label, fill, color) {
    ctx.fillStyle = fill;
    roundRect(ctx, b.x, b.y, b.w, b.h, b.h / 2);
    ctx.fill();
    ctx.font = `800 ${b.h * 0.38}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.fillText(label, b.x + b.w / 2, b.y + b.h / 2 + 1);
  }

  function drawResult(ctx, L, game, view) {
    ctx.fillStyle = 'rgba(5,6,20,0.62)';
    ctx.fillRect(0, 0, L.w, L.h);
    const top = game.tower.reachedTop;
    if (top) {
      drawDarumaHead(ctx, L.cx, L.h * 0.3, Math.min(L.w * 0.4, 160));
      text(ctx, '宇宙到達!', L.cx, L.h * 0.36, 40, '#ffe066');
      text(ctx, '伝説のだるま落とし名人', L.cx, L.h * 0.42, 20, '#fff');
    } else {
      text(ctx, 'ガラガラ…', L.cx, L.h * 0.22, 22, '#ffd0d0');
      text(ctx, `${fmt(game.tower.step)}段`, L.cx, L.h * 0.32, 60, '#fff');
      text(ctx, 'まで到達!', L.cx, L.h * 0.39, 22, '#fff');
    }
    if (game.newBest) text(ctx, '自己ベスト更新!', L.cx, L.h * 0.47, 24, '#ffe066');
    else text(ctx, `自己ベスト ${fmt(game.best)}段`, L.cx, L.h * 0.47, 18, '#e6f0ff', 'center', 700);
    text(ctx, `宇宙まであと ${fmt(stepsToSpace(game.tower.step))}段`, L.cx, L.h * 0.53, 15, '#cfe0ff', 'center', 700);
    const B = resultButtons(view);
    button(ctx, B.retry, 'もう一回', '#ef476f', '#fff');
    button(ctx, B.share, '結果を共有', '#f4ead7', '#1a1a2e');
  }

  return {
    render(ctx, game, view, now) {
      const L = layout(view);
      trackEvents(game, now);
      drawBackground(ctx, L, game.tower.step, now);
      drawStand(ctx, L);
      drawTower(ctx, L, game, now);
      drawHammer(ctx, L, now);
      drawGauge(ctx, L, game, now);
      drawHud(ctx, L, game, now);
      if (game.state === 'result') drawResult(ctx, L, game, view);
    },
  };
}
