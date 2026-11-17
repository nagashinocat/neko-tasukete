// 共通の絵:だるまの段、だるまの頭、背景の色
export const FONT = '"Hiragino Maru Gothic ProN", "Hiragino Sans", "Noto Sans JP", "Yu Gothic", system-ui, sans-serif';

const BLOCK_COLORS = ['#d7263d', '#1b4f9c', '#2a9d4b', '#f2b705', '#7b3fa0'];

export function blockColor(index) {
  return BLOCK_COLORS[((index % BLOCK_COLORS.length) + BLOCK_COLORS.length) % BLOCK_COLORS.length];
}

// 中心 (cx, cy)、幅 w、高さ h の段(木の円柱を横から見た形)
export function drawBlock(ctx, cx, cy, w, h, color) {
  const x = cx - w / 2;
  const y = cy - h / 2;
  const r = Math.min(10, h * 0.25);
  ctx.fillStyle = color;
  roundRect(ctx, x, y, w, h, r);
  ctx.fill();
  // つや
  const g = ctx.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0, 'rgba(0,0,0,0.25)');
  g.addColorStop(0.3, 'rgba(255,255,255,0.18)');
  g.addColorStop(0.55, 'rgba(255,255,255,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.3)');
  ctx.fillStyle = g;
  roundRect(ctx, x, y, w, h, r);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + r, y + h - 0.5);
  ctx.lineTo(x + w - r, y + h - 0.5);
  ctx.stroke();
}

// だるまの頭。(cx, bottom) は頭の下端中央、size は横幅
export function drawDarumaHead(ctx, cx, bottom, size) {
  const r = size / 2;
  const cy = bottom - r * 1.05;
  ctx.save();
  // 体
  ctx.fillStyle = '#d7263d';
  ctx.beginPath();
  ctx.ellipse(cx, cy, r, r * 1.05, 0, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createRadialGradient(cx - r * 0.4, cy - r * 0.5, r * 0.1, cx, cy, r * 1.1);
  g.addColorStop(0, 'rgba(255,255,255,0.35)');
  g.addColorStop(1, 'rgba(0,0,0,0.25)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(cx, cy, r, r * 1.05, 0, 0, Math.PI * 2);
  ctx.fill();
  // 顔
  const fy = cy - r * 0.12;
  ctx.fillStyle = '#fbf3e4';
  ctx.beginPath();
  ctx.ellipse(cx, fy, r * 0.62, r * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // 眉
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineCap = 'round';
  ctx.lineWidth = r * 0.09;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + s * r * 0.12, fy - r * 0.28);
    ctx.quadraticCurveTo(cx + s * r * 0.3, fy - r * 0.42, cx + s * r * 0.5, fy - r * 0.22);
    ctx.stroke();
  }
  // 目
  for (const s of [-1, 1]) {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(cx + s * r * 0.27, fy - r * 0.02, r * 0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = r * 0.03;
    ctx.stroke();
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(cx + s * r * 0.27, fy - r * 0.02, r * 0.08, 0, Math.PI * 2);
    ctx.fill();
  }
  // ひげと口
  ctx.lineWidth = r * 0.05;
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.2, fy + r * 0.3);
  ctx.quadraticCurveTo(cx, fy + r * 0.2, cx + r * 0.2, fy + r * 0.3);
  ctx.stroke();
  // 金の模様
  ctx.strokeStyle = '#f2c14e';
  ctx.lineWidth = r * 0.06;
  ctx.beginPath();
  ctx.arc(cx, cy + r * 0.62, r * 0.25, Math.PI * 1.1, Math.PI * 1.9);
  ctx.stroke();
  ctx.restore();
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// 景色ごとの空の色(上, 下)
export const SKY_COLORS = {
  ground: ['#7ec8f0', '#e8f6ff'],
  sky: ['#3d8fd8', '#a9dbff'],
  clouds: ['#1f5fae', '#7fb6ea'],
  stratosphere: ['#0b1d4a', '#2c5aa0'],
  space: ['#020309', '#0a0f2a'],
};

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function mixColor(a, b, t) {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  const c = A.map((v, i) => Math.round(v + (B[i] - v) * t));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

// 0..1 で決まる、毎回同じ並びの疑似乱数(星や雲の配置用)
export function seeded(i) {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function drawStars(ctx, w, h, offsetY, alpha) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#fff';
  for (let i = 0; i < 90; i++) {
    const x = seeded(i) * w;
    const y = ((seeded(i + 500) * h * 1.5 + offsetY) % (h * 1.5)) - h * 0.25;
    const s = seeded(i + 900) * 1.6 + 0.4;
    ctx.fillRect(x, y, s, s);
  }
  ctx.restore();
}

export function drawCloud(ctx, x, y, s, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x, y, s * 0.5, 0, Math.PI * 2);
  ctx.arc(x + s * 0.45, y + s * 0.1, s * 0.38, 0, Math.PI * 2);
  ctx.arc(x - s * 0.45, y + s * 0.12, s * 0.34, 0, Math.PI * 2);
  ctx.arc(x + s * 0.1, y + s * 0.25, s * 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ルーレット段:金色に光る段に「?」
export function drawRouletteBlock(ctx, cx, cy, w, h, now) {
  const x = cx - w / 2;
  const y = cy - h / 2;
  const r = Math.min(10, h * 0.25);
  const g = ctx.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0, '#a8740c');
  g.addColorStop(0.35, '#ffe48a');
  g.addColorStop(0.55, '#f5c02a');
  g.addColorStop(1, '#9a6a08');
  ctx.fillStyle = g;
  roundRect(ctx, x, y, w, h, r);
  ctx.fill();
  // 光の帯が流れる
  const sx = x + ((now / 900) % 1) * (w + 60) - 30;
  ctx.save();
  roundRect(ctx, x, y, w, h, r);
  ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.moveTo(sx, y); ctx.lineTo(sx + 16, y); ctx.lineTo(sx - 4, y + h); ctx.lineTo(sx - 20, y + h);
  ctx.fill();
  ctx.restore();
  ctx.font = `900 ${h * 0.62}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#7a4a00';
  ctx.fillText('?', cx, cy + 1);
  // きらきら
  ctx.fillStyle = '#fff';
  for (let i = 0; i < 3; i++) {
    const p = (now / 700 + i / 3) % 1;
    const a = Math.sin(p * Math.PI);
    const px = x + w * (0.15 + 0.35 * i);
    const py = y + h * (i % 2 ? 0.25 : 0.7);
    const s = 5 * a;
    ctx.globalAlpha = a;
    ctx.beginPath();
    ctx.moveTo(px, py - s); ctx.lineTo(px + s * 0.3, py); ctx.lineTo(px, py + s); ctx.lineTo(px - s * 0.3, py);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(px - s, py); ctx.lineTo(px, py + s * 0.3); ctx.lineTo(px + s, py); ctx.lineTo(px, py - s * 0.3);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// のりでくっついた段(peeled=1回目ではがれかけ)
export function drawGlue(ctx, cx, cy, w, h, peeled) {
  const x = cx - w / 2;
  const y = cy - h / 2;
  ctx.save();
  ctx.fillStyle = peeled ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.55)';
  roundRect(ctx, x - 2, y - 2, w + 4, h + 4, 10);
  ctx.fill();
  // たれ
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  const drips = peeled ? 1 : 3;
  for (let i = 0; i < drips; i++) {
    const dx = x + w * (0.2 + 0.3 * i);
    ctx.beginPath();
    ctx.moveTo(dx - 5, y + h - 2);
    ctx.quadraticCurveTo(dx, y + h + 12, dx + 5, y + h - 2);
    ctx.fill();
  }
  if (peeled) {
    ctx.strokeStyle = 'rgba(80,80,90,0.6)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.strokeRect(x + 3, y + 3, w - 6, h - 6);
  }
  ctx.restore();
}

// インクのしみ
export function drawSplat(ctx, sp, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = sp.color;
  ctx.beginPath();
  ctx.arc(sp.x, sp.y, sp.r, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 9; i++) {
    const a = seeded(sp.seed + i) * Math.PI * 2;
    const d = sp.r * (0.8 + seeded(sp.seed + i + 20) * 0.9);
    const rr = sp.r * (0.12 + seeded(sp.seed + i + 40) * 0.3);
    ctx.beginPath();
    ctx.arc(sp.x + Math.cos(a) * d, sp.y + Math.sin(a) * d, rr, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 3; i++) {
    const dx = sp.x + (seeded(sp.seed + i + 60) - 0.5) * sp.r * 1.2;
    const len = sp.r * (0.6 + seeded(sp.seed + i + 70));
    ctx.fillRect(dx - 4, sp.y, 8, len);
    ctx.beginPath();
    ctx.arc(dx, sp.y + len, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
