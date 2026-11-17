import { TOTAL_STEPS } from './config.js';
import { sceneForStep, stepsToSpace } from './scenery.js';
import { FONT, blockColor, drawBlock, drawCat, SKY_COLORS, drawStars, drawCloud, roundRect } from './art.js';

const fmt = (n) => n.toLocaleString('ja-JP');
const TITLE = ['ちょっと、', 'うちの猫ちゃんを', '助けてあげて'];

// 1080×1080 の結果カード
export function drawShareCard(step, isBest) {
  const S = 1080;
  const c = document.createElement('canvas');
  c.width = S;
  c.height = S;
  const ctx = c.getContext('2d');
  const top = step >= TOTAL_STEPS;
  const scene = sceneForStep(step);
  const [c0, c1] = SKY_COLORS[scene.id];
  const g = ctx.createLinearGradient(0, 0, 0, S);
  g.addColorStop(0, c0);
  g.addColorStop(1, c1);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  if (scene.id === 'space' || scene.id === 'stratosphere') drawStars(ctx, S, S, 0, 1);
  if (scene.id === 'sky' || scene.id === 'ground') {
    drawCloud(ctx, 760, 160, 120, 0.8);
    drawCloud(ctx, 900, 420, 90, 0.7);
  }
  if (scene.id === 'clouds') for (let i = 0; i < 6; i++) drawCloud(ctx, i * 200 + 40, 1000, 200, 0.95);

  // だるまの塔(左側)
  const bw = 260;
  const bh = 84;
  const cx = 250;
  const headBottom = 330;
  const rows = top ? Math.floor((S - 60 - headBottom) / bh) : 14;
  for (let r = 0; r < rows; r++) drawBlock(ctx, cx, S - 60 - bh / 2 - r * bh, bw, bh, blockColor(step + r));
  if (top) drawCat(ctx, cx, S - 60 - rows * bh + 6, 330, 'happy');

  // 文字(右側)
  const tx = 760;
  const txt = (s, y, size, color = '#fff', weight = 900) => {
    ctx.font = `${weight} ${size}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = size / 6;
    ctx.strokeStyle = 'rgba(10,12,30,0.8)';
    ctx.strokeText(s, tx, y);
    ctx.fillStyle = color;
    ctx.fillText(s, tx, y);
  };
  txt(TITLE[0], 80, 38, '#fff', 800);
  txt(TITLE[1], 136, 50);
  txt(TITLE[2], 200, 58, '#ffe066');
  if (top) {
    txt('宇宙到達!', 430, 110, '#ffe066');
    txt('猫ちゃん救出成功!', 560, 48);
  } else {
    txt(`${fmt(step)}段`, 420, step >= 1000 ? 130 : 150);
    txt('まで到達!', 540, 56);
    txt(`宇宙まであと ${fmt(stepsToSpace(step))}段`, 650, 40, '#e6f0ff', 800);
  }
  if (isBest) {
    ctx.save();
    ctx.translate(tx, 800);
    ctx.rotate(-0.06);
    ctx.fillStyle = '#ef476f';
    roundRect(ctx, -210, -50, 420, 100, 50);
    ctx.fill();
    ctx.font = `900 50px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText('自己ベスト更新!', 0, 2);
    ctx.restore();
  }
  return c;
}

// 結果カードの画像を作る(結果画面に入ったときに先に作っておく)
export function prepareShareImage(step, isBest) {
  const canvas = drawShareCard(step, isBest);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}
