const MAX_AGE_MS = 250;

// タップの時刻:イベントが起きた瞬間(e.timeStamp)を使う。おかしな値なら今の時刻。
export function tapTime(e, nowMs) {
  const ts = e?.timeStamp;
  if (Number.isFinite(ts) && ts > 0 && ts <= nowMs && nowMs - ts < MAX_AGE_MS) return ts;
  return nowMs;
}
