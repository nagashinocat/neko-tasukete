import { TOTAL_STEPS, SCENES, TILT_LIMIT, COLLAPSE_SEC } from './config.js';
import { needlePosition, zoneWidths } from './gauge.js';
import { sceneForStep, stepsToSpace } from './scenery.js';
import {
  FONT, blockColor, drawBlock, drawCat, roundRect, SKY_COLORS, mixColor,
  drawStars, drawCloud, seeded, drawRouletteBlock, drawGlue, drawSplat,
} from './art.js';
import { ITEMS, ITEM_INFO } from './items.js';

const fmt = (n) => n.toLocaleString('ja-JP');
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const easeOut = (t) => 1 - (1 - t) * (1 - t);
export const POP_GAP_MS = 55; // まとめて飛ぶときの1段ごとの間隔(パンパンパン)

export function layout(view) {
  const { width: w, height: h } = view;
  const bw = Math.min(w * 0.42, 180);
  const bh = bw * 0.32;
  const groundY = h - 150;
  const gauge = { x: w * 0.08, y: h - 84, w: w * 0.84, h: 30 };
  return { w, h, bw, bh, groundY, cx: w / 2, gauge };
}

// 音のオン・オフボタン(左上)
export function muteButton() {
  return { x: 6, y: 6, w: 46, h: 46 };
}

export function drawMuteButton(ctx, muted) {
  const b = muteButton();
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  ctx.save();
  ctx.fillStyle = 'rgba(10,12,30,0.45)';
  ctx.beginPath();
  ctx.arc(cx, cy, 17, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  // スピーカー
  ctx.beginPath();
  ctx.moveTo(cx - 9, cy - 4);
  ctx.lineTo(cx - 5, cy - 4);
  ctx.lineTo(cx + 1, cy - 9);
  ctx.lineTo(cx + 1, cy + 9);
  ctx.lineTo(cx - 5, cy + 4);
  ctx.lineTo(cx - 9, cy + 4);
  ctx.closePath();
  ctx.fill();
  if (muted) {
    ctx.beginPath();
    ctx.moveTo(cx + 4, cy - 5); ctx.lineTo(cx + 11, cy + 5);
    ctx.moveTo(cx + 11, cy - 5); ctx.lineTo(cx + 4, cy + 5);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(cx + 2, cy, 5, -0.9, 0.9);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + 2, cy, 9.5, -0.9, 0.9);
    ctx.stroke();
  }
  ctx.restore();
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
      const n = game.tower.popped || 0;
      if (n === 0) {
        fx.peelAt = now; // のり:ペリッ
      } else {
        const first = game.tower.step - n;
        fx.group = { at: now, n, gap: POP_GAP_MS };
        for (let i = 0; i < n; i++) fx.popped.push({ at: now + i * POP_GAP_MS, color: blockColor(first + i), lane: i });
        if (fx.popped.length > 40) fx.popped.splice(0, fx.popped.length - 40);
      }
      if (game.tower.combo >= 2) fx.comboAt = now;
      if (game.lastJudge?.perfect) fx.perfectAt = now;
      else {
        fx.leanDir = game.beats - Math.round(game.beats) >= 0 ? 1 : -1; // 遅れたら右、早かったら左
        if (game.lastJudge && game.lastJudge.offset > 0.55) fx.wobbleAt = now;
      }
      const scene = sceneForStep(game.tower.step);
      if (scene.id !== fx.sceneId) {
        fx.sceneId = scene.id;
        if (game.tower.step > 0) fx.toast = { text: `${scene.label}に到達!`, at: now };
      }
    }
    // アイテムが効いたとき
    if (game.lastItem && game.lastItem.seq !== fx.itemSeq) {
      fx.itemSeq = game.lastItem.seq;
      const item = game.lastItem.item;
      fx.itemToast = { item, at: now };
      if (item === 'bomb' || item === 'missile') {
        const n = game.tower.blasted || 0;
        const gap = item === 'bomb' ? 22 : 12;
        const first = game.tower.step - n;
        fx.group = { at: now, n, gap };
        for (let i = 0; i < n; i++) fx.popped.push({ at: now + i * gap, color: blockColor(first + i), lane: i * 7 + (item === 'bomb' ? 1 : 0), side: item === 'missile' && i % 2 ? -1 : 1, boom: item === 'bomb' });
        if (fx.popped.length > 40) fx.popped.splice(0, fx.popped.length - 40);
        if (item === 'bomb') fx.boomAt = now; else fx.missileAt = now;
      }
      if (item === 'paint') {
        const r = () => Math.random();
        fx.splats = Array.from({ length: 4 }, (_, i) => ({
          x: 0.15 + r() * 0.7, y: i === 3 ? 0.9 : 0.15 + r() * 0.6, r: 38 + r() * 34,
          color: ['#e8368f', '#2d7dd2', '#1b998b', '#3d2c8d', '#f46036'][Math.floor(r() * 5)], seed: Math.floor(r() * 1000),
        }));
      }
    }
    if (game.lastHitMs == null && !game.lastItem) {
      // もう一回のとき
      fx.splats = null;
      fx.prevHitMs = null;
      fx.sceneId = 'ground';
      fx.popped = [];
      fx.group = null;
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
    const speed = (game.bpm || 80) / 100;
    const rows = Math.ceil(L.groundY / L.bh) + 2;
    // まとめて飛ぶときは、まだ弾かれていない段を下に残し、1段ずつ落とす
    let pending = 0;
    let drop = 0;
    if (fx.group) {
      const el = now - fx.group.at;
      const gap = fx.group.gap;
      const launched = Math.min(fx.group.n, Math.floor(el / gap) + 1);
      pending = fx.group.n - launched;
      const sinceLast = (el - (launched - 1) * gap) / Math.min(90, gap * 1.6);
      drop = L.bh * (1 - easeOut(clamp01(sinceLast)));
    }
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
      const idx = tower.step - pending + r;
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
        drawCat(ctx, x, y + L.bh / 2 + 4, L.bw * 1.25, tower.reachedTop ? 'happy' : 'scared', now);
        break;
      }
      if (idx === tower.rouletteAt && pending === 0) drawRouletteBlock(ctx, x, y, L.bw, L.bh, now);
      else drawBlock(ctx, x, y, L.bw, L.bh, blockColor(idx));
      if (idx < (tower.gluedUntil || 0) && pending === 0) drawGlue(ctx, x, y, L.bw, L.bh, r === 0 && tower.glueHits === 1);
    }
    ctx.restore();

    // 弾き飛ばされた段
    for (const p of fx.popped) {
      const s = (now - p.at) / 1000;
      if (s < 0 || s > 0.8) continue;
      const up = (p.boom ? 400 : 60) + (p.lane % 4) * 70; // まとめて飛ぶときは少しずつ違う高さへ
      const x = L.cx + (p.side || 1) * s * (900 - (p.lane % 3) * 120);
      const y = L.groundY - L.bh / 2 - up * s + 900 * s * s;
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
    let hitAt = fx.hammerAt;
    if (fx.group) {
      const launched = Math.min(fx.group.n, Math.floor((now - fx.group.at) / fx.group.gap) + 1);
      hitAt = fx.group.at + (launched - 1) * fx.group.gap;
    }
    const s = clamp01((now - hitAt) / (fx.group && fx.group.n > 1 ? Math.max(fx.group.gap, 40) : 160));
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
    // 両端が的:黄色の内側に赤い「ぴったり」
    const z = zoneWidths(game.bpm || 80);
    const goodPx = G.w * z.good;
    const perfPx = G.w * z.perfect;
    ctx.save();
    roundRect(ctx, G.x, G.y, G.w, G.h, 9);
    ctx.clip();
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(G.x, G.y, goodPx, G.h);
    ctx.fillRect(G.x + G.w - goodPx, G.y, goodPx, G.h);
    ctx.fillStyle = '#ef476f';
    ctx.fillRect(G.x, G.y, perfPx, G.h);
    ctx.fillRect(G.x + G.w - perfPx, G.y, perfPx, G.h);
    // 拍の瞬間に端が光る
    const live = game.state === 'playing' || game.state === 'roulette';
    if (live) {
      const nearest = Math.round(game.beats);
      const glow = Math.max(0, 1 - Math.abs(game.beats - nearest) * 5);
      if (glow > 0) {
        const right = ((nearest % 2) + 2) % 2 === 1;
        ctx.fillStyle = `rgba(255,255,255,${0.7 * glow})`;
        ctx.fillRect(right ? G.x + G.w - perfPx : G.x, G.y, perfPx, G.h);
      }
    }
    ctx.restore();
    // 針
    const pos = live ? needlePosition(game.beats) : 0;
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
    // アイテムの残り(左側)
    const st = [];
    const t = game.tower;
    if (t.charms > 0) st.push(['お守り', '#ffc2dc']);
    if (t.slowTaps > 0) st.push([`砂時計 あと${t.slowTaps}回`, '#ffe6a6']);
    if (t.gluedUntil > t.step) st.push([`のり あと${t.gluedUntil - t.step}段`, '#e6e6f0']);
    st.forEach(([label, color], i) => text(ctx, label, 10, L.h * 0.36 + i * 26, 15, color, 'left', 800));
    // ペリッ
    const pk = (now - (fx.peelAt ?? -1e9)) / 500;
    if (pk < 1) {
      ctx.save();
      ctx.globalAlpha = 1 - pk;
      text(ctx, 'ペリッ', L.cx + L.bw * 0.2, L.groundY - L.bh * 1.4 - pk * 20, 22, '#fff', 'center', 900);
      ctx.restore();
    }
    // コンボ(右側)
    const combo = game.tower.combo || 0;
    if (combo >= 2 && game.state === 'playing') {
      const ps = clamp01((now - (fx.comboAt ?? 0)) / 220);
      const scale = 1 + (1 - ps) * 0.35;
      const x = L.w - Math.max(56, (L.w - L.bw) / 4);
      const y = L.h * 0.42;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scale, scale);
      const hot = combo >= 10;
      text(ctx, String(combo), 0, 0, combo >= 100 ? 34 : 40, hot ? '#ffdf5e' : '#fff', 'center', 900);
      text(ctx, 'コンボ', 0, 30, 15, '#fff', 'center', 800);
      const n = Math.min(10, 1 + Math.floor(combo / 10));
      if (n >= 2) text(ctx, `${n}段とばし`, 0, 54, 14, '#ffb3c6', 'center', 800);
      ctx.restore();
    }
    if (game.state === 'playing' && step === 0) {
      const a = 0.6 + 0.4 * Math.sin(now / 250);
      ctx.save();
      ctx.globalAlpha = a;
      text(ctx, 'ドンに合わせて 端の赤でタップ!', L.cx, L.gauge.y - 34, 19, '#fff');
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

  function drawResult(ctx, L, game, view, now) {
    ctx.fillStyle = 'rgba(5,6,20,0.62)';
    ctx.fillRect(0, 0, L.w, L.h);
    const top = game.tower.reachedTop;
    if (top) {
      drawCat(ctx, L.cx, L.h * 0.31, Math.min(L.w * 0.55, 240), 'happy');
      text(ctx, '宇宙到達!', L.cx, L.h * 0.36, 40, '#ffe066');
      text(ctx, '猫ちゃん救出成功!', L.cx, L.h * 0.42, 22, '#fff');
    } else {
      drawCat(ctx, L.cx, L.h * 0.2, Math.min(L.w * 0.34, 140), 'scared', now);
      text(ctx, 'ガラガラ…', L.cx, L.h * 0.23, 22, '#ffd0d0');
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

  function drawEffects(ctx, L, now) {
    // 爆発
    const b = (now - (fx.boomAt ?? -1e9)) / 500;
    if (b < 1) {
      const R = 40 + b * Math.max(L.w, 300) * 0.6;
      const g = ctx.createRadialGradient(L.cx, L.groundY - L.bh, 0, L.cx, L.groundY - L.bh, R);
      g.addColorStop(0, `rgba(255,250,200,${1 - b})`);
      g.addColorStop(0.4, `rgba(255,160,40,${0.8 * (1 - b)})`);
      g.addColorStop(1, 'rgba(255,60,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(L.cx, L.groundY - L.bh, R, 0, Math.PI * 2);
      ctx.fill();
    }
    // ミサイル
    const m = (now - (fx.missileAt ?? -1e9)) / 650;
    if (m < 1) {
      const y = L.groundY - m * (L.groundY + 120);
      ctx.save();
      ctx.translate(L.cx, y);
      const fl = ctx.createLinearGradient(0, 20, 0, 120);
      fl.addColorStop(0, 'rgba(255,230,120,0.95)');
      fl.addColorStop(1, 'rgba(255,90,20,0)');
      ctx.fillStyle = fl;
      ctx.beginPath();
      ctx.moveTo(-14, 30); ctx.lineTo(14, 30); ctx.lineTo(0, 130 + Math.sin(now / 20) * 10);
      ctx.fill();
      ctx.fillStyle = '#e9edf2';
      roundRect(ctx, -14, -40, 28, 72, 10);
      ctx.fill();
      ctx.fillStyle = '#d64545';
      ctx.beginPath();
      ctx.moveTo(-14, -30); ctx.quadraticCurveTo(0, -75, 14, -30);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-14, 18); ctx.lineTo(-28, 36); ctx.lineTo(-14, 32);
      ctx.moveTo(14, 18); ctx.lineTo(28, 36); ctx.lineTo(14, 32);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawSplats(ctx, L, game) {
    if (!fx.splats || !(game.tower.paintTaps > 0)) return;
    const a = Math.min(1, 0.15 + game.tower.paintTaps / 10);
    for (const sp of fx.splats) drawSplat(ctx, { ...sp, x: sp.x * L.w, y: sp.y * L.h }, a);
  }

  const ITEM_SHOUT = { bomb: 'ドカーン!', missile: 'ズドーン!', charm: 'お守りゲット!', hourglass: '砂時計!', paint: 'ベチャッ!', glue: 'ベタッ…' };

  function drawItemToast(ctx, L, now) {
    if (!fx.itemToast) return;
    const s = (now - fx.itemToast.at) / 1300;
    if (s >= 1) { fx.itemToast = null; return; }
    const info = ITEM_INFO[fx.itemToast.item];
    ctx.save();
    ctx.globalAlpha = s < 0.75 ? 1 : (1 - s) / 0.25;
    const sc = 1 + Math.max(0, 0.25 - s) * 1.6;
    ctx.translate(L.cx, L.h * 0.3);
    ctx.scale(sc, sc);
    text(ctx, ITEM_SHOUT[fx.itemToast.item], 0, 0, 40, info.good ? '#ffe066' : '#c8f1ff', 'center', 900);
    ctx.restore();
  }

  // サイコロの目(1〜6)のドット
  function pips(ctx, n, x, y, size, color) {
    const P = {
      1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]],
      4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
      6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
    }[n];
    ctx.fillStyle = color;
    for (const [px, py] of P) {
      ctx.beginPath();
      ctx.arc(x + px * size * 0.3, y + py * size * 0.3, size * 0.11, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // サイコロ1個(中心 x,y、一辺 S、回転 rot)。面にアイテムと目を描く
  function drawDie(ctx, x, y, S, rot, itemIdx, squash = 1) {
    const info = ITEM_INFO[ITEMS[itemIdx]];
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(1 / squash, squash);
    // 厚み
    ctx.fillStyle = '#c9c2b4';
    roundRect(ctx, -S / 2 + 6, -S / 2 + 8, S, S, S * 0.2);
    ctx.fill();
    // 面
    ctx.fillStyle = '#fffaf0';
    roundRect(ctx, -S / 2, -S / 2, S, S, S * 0.2);
    ctx.fill();
    ctx.strokeStyle = '#2a2a3a';
    ctx.lineWidth = 3;
    ctx.stroke();
    // アイテムの色の丸と名前
    ctx.fillStyle = info.color;
    ctx.beginPath();
    ctx.arc(0, S * 0.04, S * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = `900 ${S * (info.label.length > 3 ? 0.13 : 0.17)}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText(info.label, 0, S * 0.05);
    // 左上に小さく目の数
    pips(ctx, itemIdx + 1, -S * 0.33, -S * 0.33, S * 0.26, '#d7263d');
    ctx.restore();
  }

  function drawRoulette(ctx, L, game, now) {
    const r = game.roulette;
    if (!r) return;
    ctx.fillStyle = 'rgba(5,6,20,0.55)';
    ctx.fillRect(0, 0, L.w, L.h);
    const n = ITEMS.length;
    const idx = ((Math.round(r.pos) % n) + n) % n;
    const S = Math.min(L.w * 0.42, 170);
    const floor = L.h * 0.44 + S / 2;
    text(ctx, 'アイテムサイコロ', L.cx, L.h * 0.44 - S / 2 - 70, 26, '#ffe066', 'center', 900);

    let x = L.cx;
    let y = floor - S / 2;
    let rot = 0;
    let squash = 1;
    if (!r.stopping && !r.done) {
      // 手の中でカラカラふっている
      y += Math.sin(now / 45) * 6 - 10;
      x += Math.sin(now / 70) * 8;
      rot = Math.sin(now / 60) * 0.25;
    } else if (!r.done) {
      // 投げられて、はねながら転がる(速いほど高くはねる)
      const v = Math.min(1, r.vel / 14);
      const bounce = Math.abs(Math.sin(r.pos * Math.PI)) * (20 + 90 * v);
      y -= bounce;
      rot = r.pos * 1.4 * v;
      squash = bounce < 6 ? 0.88 : 1;
    } else {
      // 止まった:ポンとはずむ
      const k = Math.max(0, 1 - game.rouletteHold / 0.25);
      squash = 1 - 0.12 * k;
    }
    // 影
    const lift = floor - S / 2 - y;
    ctx.fillStyle = `rgba(0,0,0,${0.35 - Math.min(0.25, lift / 400)})`;
    ctx.beginPath();
    ctx.ellipse(L.cx, floor + 8, S * (0.55 - Math.min(0.2, lift / 600)), S * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
    drawDie(ctx, x, y, S, rot, idx, squash);

    // どの目が何か(一覧)
    const chipW = Math.min(108, (L.w - 40) / 3);
    const gy = floor + 34;
    ITEMS.forEach((it, i) => {
      const cx = L.cx + ((i % 3) - 1) * (chipW + 6);
      const cy = gy + Math.floor(i / 3) * 34;
      const on = r.done && i === idx;
      ctx.fillStyle = on ? ITEM_INFO[it].color : 'rgba(255,255,255,0.14)';
      roundRect(ctx, cx - chipW / 2, cy, chipW, 28, 14);
      ctx.fill();
      if (on) {
        ctx.strokeStyle = '#ffe066';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      pips(ctx, i + 1, cx - chipW / 2 + 16, cy + 14, 20, on ? '#fff' : '#ffd0d8');
      ctx.font = `800 13px ${FONT}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff';
      ctx.fillText(ITEM_INFO[it].label, cx - chipW / 2 + 32, cy + 15);
    });

    const ty = gy + 90;
    if (r.done) {
      const info = ITEM_INFO[r.item];
      text(ctx, `${info.label}!`, L.cx, ty, 34, info.good ? '#ffe066' : '#c8f1ff', 'center', 900);
      text(ctx, info.desc, L.cx, ty + 36, 16, '#fff', 'center', 800);
    } else if (!r.stopping) {
      ctx.save();
      ctx.globalAlpha = 0.6 + 0.4 * Math.sin(now / 200);
      text(ctx, 'タップで投げる!', L.cx, ty, 24, '#fff', 'center', 900);
      ctx.restore();
    }
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
      drawEffects(ctx, L, now);
      drawSplats(ctx, L, game);
      drawItemToast(ctx, L, now);
      if (game.state === 'roulette') drawRoulette(ctx, L, game, now);
      if (game.state === 'result') drawResult(ctx, L, game, view, now);
    },
  };
}
