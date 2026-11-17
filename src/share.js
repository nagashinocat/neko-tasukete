import { TOTAL_STEPS } from './config.js';

const fmt = (n) => n.toLocaleString('ja-JP');

export function shareText(step) {
  return step >= TOTAL_STEPS
    ? `だるま落としで宇宙まで到達!(${fmt(step)}段)`
    : `だるま落としで${fmt(step)}段まで到達!`;
}

function pageUrl() {
  return location.href.split('#')[0];
}

function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// 作っておいた画像で共有する。タップの許可が切れないよう、共有を呼ぶまで await をはさまない。
export function shareBlob(blob, step) {
  const name = `daruma-otoshi-${step}.png`;
  let file = null;
  try { file = new File([blob], name, { type: 'image/png' }); } catch { file = null; }
  let shareCall = null;
  try {
    if (file && navigator.canShare?.({ files: [file] })) {
      shareCall = navigator.share({ files: [file], text: `${shareText(step)}\n${pageUrl()}` });
    }
  } catch { shareCall = null; }
  if (shareCall) {
    return shareCall.then(() => 'shared', (e) => {
      if (e && e.name === 'AbortError') return 'cancelled';
      download(blob, name);
      return 'downloaded';
    });
  }
  download(blob, name);
  return Promise.resolve('downloaded');
}
