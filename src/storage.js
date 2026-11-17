const BEST_KEY = 'daruma-otoshi:best';
const OPENING_KEY = 'daruma-otoshi:openingSeen';

function safeLocalStorage() {
  try { return globalThis.localStorage; } catch { return undefined; }
}

// 端末内保存。使えない環境(プライベートモード等)ではメモリ上の値で動き続ける。
export function createStorage(backend = safeLocalStorage()) {
  const memory = new Map();
  const read = (key) => {
    if (memory.has(key)) return memory.get(key);
    try { return backend ? backend.getItem(key) : null; } catch { return null; }
  };
  const write = (key, value) => {
    memory.set(key, String(value));
    try { backend?.setItem(key, String(value)); } catch { /* 保存できなくても続ける */ }
  };
  return {
    getBest() {
      const n = Number.parseInt(read(BEST_KEY) ?? '0', 10);
      return Number.isFinite(n) && n > 0 ? n : 0;
    },
    saveBest(step) {
      if (step <= this.getBest()) return false;
      write(BEST_KEY, step);
      return true;
    },
    hasSeenOpening() { return read(OPENING_KEY) === '1'; },
    markOpeningSeen() { write(OPENING_KEY, '1'); },
  };
}
