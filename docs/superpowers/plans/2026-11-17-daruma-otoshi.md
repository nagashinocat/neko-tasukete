# だるま落としタイミングゲーム Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** スマホのブラウザで遊べる、約1万段のだるまをゲージのタイミングで叩き落として到達段数を競う2Dゲームを作る。

**Architecture:** ビルドなしの静的サイト(HTML + ES Modules + Canvas 2D)。ゲームのルール(ゲージ・傾き・テンポ・景色・記録)は描画から切り離した純粋なモジュールにして Node の標準テストで検証し、描画・入力・演出は薄い層として上に載せる。

**Tech Stack:** HTML5 Canvas 2D、素の JavaScript(ES Modules)、テストは `node --test`(依存パッケージなし)、公開は GitHub Pages。

**Spec:** `docs/superpowers/specs/2026-11-17-daruma-otoshi-design.md`

## Global Constraints

- サーバーなし。外部ライブラリ・ビルド工程なし。GitHub Pages でそのまま動くこと
- スマホ縦画面が主。PCブラウザでも遊べること
- 表示文言はすべて日本語
- だるまの総段数 `TOTAL_STEPS = 10000`。頭は宇宙
- タップすればどこで叩いても段は抜け、段数は進む。傾きは中心からのずれに比例して増え、「ぴったり」で戻る。傾きが限界で崩れて終了
- 針が通り過ぎてもタップしなければ何も起きない
- 景色の目安:100段で空 → 500段で雲の上 → 2,000段で成層圏 → 宇宙は10,000段の頂上のみ
- オープニングは初回だけ全部流し、2回目以降はタップで飛ばせる
- 記録は自己ベスト(端末内保存)と結果カード共有のみ。ランキング・セーブ再開なし
- リンク共有時に OGP 画像が出ること
- 反応の遅れ・判定のずれは失敗扱い。判定はタップした瞬間の時刻で行う

## Review Focus

1. **1回のタッチで2回反応する**(touchstart と click の二重発火、指2本)→ 1回のタップで抜けるのは1段だけ。Task 6 にテストあり
2. **タブを裏に回して戻る/処理落ちで1フレームが長くなる** → 針がワープせず、判定はタップ時刻の針の位置で決まる。Task 2 と Task 6 にテストあり
3. **オープニング中・崩れる演出中・結果画面でのタップ** → 段は抜けず、記録も変わらない。Task 6 にテストあり
4. **localStorage が使えない(プライベートモードなど)** → エラーで止まらず、自己ベストなしで遊べる。Task 5 にテストあり
5. **端末が画像つき共有に対応していない** → 画像の保存(ダウンロード)にフォールバックする。Task 8 で手動確認

---

## File Structure

```
daruma-otoshi/
  index.html            画面の器、OGPメタタグ
  style.css             全画面Canvas、余白なし
  ogp.png               共有用画像(1200x630)
  src/
    config.js           調整用の数値をすべてここに集める
    gauge.js            針の位置とタイミング判定
    tower.js            段数・傾き・崩れのルール
    tempo.js            段数→針の速さ
    scenery.js          段数→景色、宇宙までの残り段数
    storage.js          自己ベストと「オープニングを見たか」の保存
    game.js             画面状態(opening/playing/collapsing/result)とタップの受付
    render.js           Canvas描画(だるま・背景・ゲージ・HUD)
    opening.js          宇宙→地上のスクロール演出
    shareCard.js        結果カード画像の生成と共有
    main.js             起動、ループ、入力をつなぐ
  tests/
    gauge.test.js  tower.test.js  tempo.test.js  scenery.test.js
    storage.test.js  game.test.js
```

---

### Task 1: リポジトリと調整値

**Files:**
- Create: `index.html`, `style.css`, `src/config.js`, `src/main.js`, `.gitignore`, `README.md`

**Interfaces:**
- Produces: `src/config.js` の名前付き export
  - `TOTAL_STEPS = 10000`
  - `PERFECT_HALF_WIDTH = 0.06`(針の位置 -1..1 のうち、中心から ±0.06 が「ぴったり」)
  - `BAND_HALF_WIDTH = 0.25`(見た目の帯の半幅)
  - `TILT_PER_OFFSET = 0.35`(ずれ1あたりに増える傾き)
  - `TILT_RECOVER = 0.12`(ぴったりで戻る傾き)
  - `TILT_LIMIT = 1.0`(これ以上で崩れる)
  - `SPEED_BASE = 0.6`、`SPEED_MAX = 3.0`、`SPEED_RAMP_STEPS = 400`(往復/秒。Task 3 で使用)
  - `SCENES = [{from:0,id:'ground',label:'地上'},{from:100,id:'sky',label:'空'},{from:500,id:'clouds',label:'雲の上'},{from:2000,id:'stratosphere',label:'成層圏'},{from:10000,id:'space',label:'宇宙'}]`
  - 数値は試遊での調整前提。`PERFECT_HALF_WIDTH` 以外はすべて作り手判断の初期値

- [ ] **Step 1:** `git init`、`index.html`(縦画面向け viewport、`user-scalable=no`、`<canvas id="game">`、`<script type="module" src="src/main.js">`、タイトル「だるま落とし」)、`style.css`(canvas を全画面、`touch-action: none`、選択・長押しメニュー無効)、`src/config.js`、空の `src/main.js` を作る
- [ ] **Step 2:** `python3 -m http.server` で開き、真っ黒な全画面 Canvas が出てコンソールにエラーがないことを確認
- [ ] **Step 3:** Commit `chore: scaffold daruma-otoshi`

---

### Task 2: ゲージ(針の位置と判定)

**Files:**
- Create: `src/gauge.js`
- Test: `tests/gauge.test.js`

**Interfaces:**
- Consumes: `PERFECT_HALF_WIDTH`
- Produces:
  - `needlePosition(phase: number) -> number` … phase(往復の進み、1で1往復)から -1..1 の位置。三角波:phase 0 で -1、0.25 で 0、0.5 で +1、0.75 で 0
  - `advancePhase(phase: number, speed: number, dtSec: number) -> number` … `(phase + speed*dt) % 1`。`dtSec` は 0.1 で頭打ち(タブ復帰時のワープ防止)
  - `judge(position: number) -> { offset: number, perfect: boolean }` … `offset = |position|`、`perfect = offset <= PERFECT_HALF_WIDTH`

- [ ] **Step 1: 失敗するテストを書く**

```js
test('三角波の位置', () => {
  assert.equal(needlePosition(0), -1);
  assert.equal(needlePosition(0.25), 0);
  assert.equal(needlePosition(0.5), 1);
  assert.equal(needlePosition(0.75), 0);
});
test('長いフレームは0.1秒で頭打ち', () => {
  assert.equal(advancePhase(0, 1, 5), 0.1);
});
test('判定', () => {
  assert.deepEqual(judge(0.05), { offset: 0.05, perfect: true });
  assert.deepEqual(judge(-0.5), { offset: 0.5, perfect: false });
});
```

- [ ] **Step 2:** `node --test tests/gauge.test.js` → FAIL(未定義)
- [ ] **Step 3:** `src/gauge.js` を実装
- [ ] **Step 4:** `node --test tests/gauge.test.js` → PASS
- [ ] **Step 5:** Commit `feat: gauge timing`

---

### Task 3: テンポ(段数→針の速さ)

**Files:**
- Create: `src/tempo.js`
- Test: `tests/tempo.test.js`

**Interfaces:**
- Consumes: `SPEED_BASE`, `SPEED_MAX`, `SPEED_RAMP_STEPS`
- Produces: `speedForStep(step: number) -> number` … `SPEED_BASE` から始まり、段数とともに単調に増え、`SPEED_MAX` を超えない。曲線は `SPEED_MAX - (SPEED_MAX-SPEED_BASE) * exp(-step/SPEED_RAMP_STEPS)`

- [ ] **Step 1: テスト**

```js
test('0段目はベース速度', () => assert.equal(speedForStep(0), SPEED_BASE));
test('単調増加', () => assert.ok(speedForStep(200) > speedForStep(100)));
test('上限を超えない', () => assert.ok(speedForStep(10000) <= SPEED_MAX));
```

- [ ] **Step 2:** `node --test tests/tempo.test.js` → FAIL
- [ ] **Step 3:** 実装
- [ ] **Step 4:** → PASS
- [ ] **Step 5:** Commit `feat: tempo ramp`

---

### Task 4: だるまの塔(段数・傾き・崩れ)と景色

**Files:**
- Create: `src/tower.js`, `src/scenery.js`
- Test: `tests/tower.test.js`, `tests/scenery.test.js`

**Interfaces:**
- Consumes: `TOTAL_STEPS`, `TILT_*`, `SCENES`, `judge` の戻り値の形
- Produces:
  - `createTower() -> { step: 0, tilt: 0, collapsed: false, reachedTop: false }`
  - `hit(tower, { offset, perfect }) -> tower`(新しいオブジェクトを返す)
    - 崩れ済み・頂上到達済みなら変化なし
    - `step + 1`
    - perfect なら `tilt = max(0, tilt - TILT_RECOVER)`、そうでなければ `tilt += offset * TILT_PER_OFFSET`
    - `tilt >= TILT_LIMIT` で `collapsed = true`
    - `step >= TOTAL_STEPS` で `reachedTop = true`
  - `sceneForStep(step: number) -> { id, label }` … `SCENES` のうち `from <= step` の最後
  - `stepsToSpace(step: number) -> number` … `max(0, TOTAL_STEPS - step)`

- [ ] **Step 1: テスト**

```js
test('外しても段は進む', () => {
  const t = hit(createTower(), { offset: 0.9, perfect: false });
  assert.equal(t.step, 1);
  assert.ok(Math.abs(t.tilt - 0.9 * TILT_PER_OFFSET) < 1e-9);
});
test('ぴったりで傾きが戻る(0未満にならない)', () => {
  let t = { ...createTower(), tilt: 0.05 };
  t = hit(t, { offset: 0, perfect: true });
  assert.equal(t.tilt, 0);
});
test('傾きが限界で崩れ、その後は進まない', () => {
  let t = { ...createTower(), tilt: TILT_LIMIT - 0.01 };
  t = hit(t, { offset: 1, perfect: false });
  assert.equal(t.collapsed, true);
  assert.equal(hit(t, { offset: 0, perfect: true }).step, t.step);
});
test('1万段で頂上', () => {
  const t = hit({ ...createTower(), step: 9999 }, { offset: 0, perfect: true });
  assert.equal(t.reachedTop, true);
});
test('景色', () => {
  assert.equal(sceneForStep(99).id, 'ground');
  assert.equal(sceneForStep(100).id, 'sky');
  assert.equal(sceneForStep(500).id, 'clouds');
  assert.equal(sceneForStep(2000).id, 'stratosphere');
  assert.equal(sceneForStep(9999).id, 'stratosphere');
  assert.equal(sceneForStep(10000).id, 'space');
  assert.equal(stepsToSpace(127), 9873);
});
```

- [ ] **Step 2:** `node --test tests/tower.test.js tests/scenery.test.js` → FAIL
- [ ] **Step 3:** 実装
- [ ] **Step 4:** → PASS
- [ ] **Step 5:** Commit `feat: tower rules and scenery`

---

### Task 5: 保存(自己ベスト・オープニング既読)

**Files:**
- Create: `src/storage.js`
- Test: `tests/storage.test.js`

**Interfaces:**
- Produces:
  - `createStorage(backend = globalThis.localStorage)` → `{ getBest(): number, saveBest(step: number): boolean, hasSeenOpening(): boolean, markOpeningSeen(): void }`
  - キーは `daruma-otoshi:best`、`daruma-otoshi:openingSeen`
  - `saveBest` は記録を更新したとき true を返す
  - backend が undefined、または読み書きで例外を投げる場合は、メモリ上の値で動き続ける(例外を外に出さない)

- [ ] **Step 1: テスト**

```js
const mem = () => { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) }; };
test('自己ベストは大きいときだけ更新', () => {
  const s = createStorage(mem());
  assert.equal(s.saveBest(50), true);
  assert.equal(s.saveBest(30), false);
  assert.equal(s.getBest(), 50);
});
test('localStorage が例外を投げても止まらない', () => {
  const bad = { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); } };
  const s = createStorage(bad);
  assert.equal(s.getBest(), 0);
  assert.equal(s.saveBest(10), true);
  assert.equal(s.getBest(), 10);
  assert.equal(s.hasSeenOpening(), false);
});
```

- [ ] **Step 2:** `node --test tests/storage.test.js` → FAIL
- [ ] **Step 3:** 実装
- [ ] **Step 4:** → PASS
- [ ] **Step 5:** Commit `feat: best score storage`

---

### Task 6: 画面の流れとタップの受付

**Files:**
- Create: `src/game.js`
- Test: `tests/game.test.js`

**Interfaces:**
- Consumes: Task 2〜5 のすべて
- Produces:
  - `createGame(storage)` → `game` オブジェクト。`game.state` は `'opening' | 'playing' | 'collapsing' | 'result'`。`game.tower`、`game.phase`、`game.best`、`game.newBest: boolean`、`game.lastJudge`
  - `game.update(dtSec)` … playing 中は `advancePhase(phase, speedForStep(tower.step), dt)`。collapsing は `COLLAPSE_SEC = 1.5` 経過で result へ(このとき `saveBest`)
  - `game.tap(nowMs)` … 状態ごと:
    - opening:`storage.hasSeenOpening()` が true ならスキップして playing へ。初回は無視
    - `game.finishOpening()` … opening → playing、`markOpeningSeen()`
    - playing:`judge(needlePosition(phase))` で `hit`。崩れたら collapsing、頂上なら result
    - collapsing:無視
    - result:`game.retry()` は別ボタンから呼ぶので、tap では何もしない
    - 直前の受付から `TAP_GUARD_MS = 60` 未満のタップは無視(二重発火対策)
  - `game.retry()` … 新しい塔・phase 0 で playing へ(オープニングは流さない)

- [ ] **Step 1: テスト**

```js
test('二重発火は1段だけ', () => {
  const g = createGame(createStorage(mem()));
  g.finishOpening();
  g.tap(1000); g.tap(1010);
  assert.equal(g.tower.step, 1);
  g.tap(1100);
  assert.equal(g.tower.step, 2);
});
test('初回オープニング中のタップは無視、2回目以降は飛ばせる', () => {
  const st = createStorage(mem());
  const g1 = createGame(st);
  g1.tap(0);
  assert.equal(g1.state, 'opening');
  g1.finishOpening();
  const g2 = createGame(st);
  g2.tap(0);
  assert.equal(g2.state, 'playing');
  assert.equal(g2.tower.step, 0);
});
test('崩れ演出中・結果画面のタップでは段が増えない', () => {
  const g = createGame(createStorage(mem()));
  g.finishOpening();
  g.tower = { ...g.tower, tilt: TILT_LIMIT - 0.001 };
  g.phase = 0; // 端=ずれ最大
  g.tap(1000);
  assert.equal(g.state, 'collapsing');
  const s = g.tower.step;
  g.tap(2000);
  g.update(2);
  assert.equal(g.state, 'result');
  g.tap(3000);
  assert.equal(g.tower.step, s);
});
test('長いフレームでも針はワープしない', () => {
  const g = createGame(createStorage(mem()));
  g.finishOpening();
  g.update(10);
  assert.ok(g.phase <= SPEED_BASE * 0.1 + 1e-9);
});
test('結果で自己ベスト更新', () => {
  const g = createGame(createStorage(mem()));
  g.finishOpening();
  g.tower = { ...g.tower, step: 41, tilt: TILT_LIMIT - 0.001 };
  g.tap(1000); g.update(2);
  assert.equal(g.best, 42);
  assert.equal(g.newBest, true);
});
```

- [ ] **Step 2:** `node --test tests/game.test.js` → FAIL
- [ ] **Step 3:** 実装
- [ ] **Step 4:** `node --test tests/` → 全 PASS
- [ ] **Step 5:** Commit `feat: game state and input`

---

### Task 7: 描画・入力・オープニング(遊べる版)

**Files:**
- Create: `src/render.js`, `src/opening.js`
- Modify: `src/main.js`

**Interfaces:**
- Consumes: `createGame`, `sceneForStep`, `stepsToSpace`, `needlePosition`, config の帯幅
- Produces:
  - `render(ctx, game, view)` … view は `{ width, height, dpr }`
  - `createOpening({ onDone })` → `{ update(dt), draw(ctx, view), done: boolean }`。所要 約5秒
  - main.js:`pointerdown` で `game.tap(performance.now())`(`preventDefault`)。`requestAnimationFrame` ループで `update` → `render`。devicePixelRatio 対応、リサイズ追従

描画で決まっていること:
- 画面下にゲージ。往復する針、中央の帯(`BAND_HALF_WIDTH`)、さらに細い「ぴったり」帯(`PERFECT_HALF_WIDTH`)
- 画面に映るだるまの段だけ描く(十数段)。だるまは左右に揺れ、揺れ幅は `tilt` とテンポで大きくなる。段が抜けるとポンと横に飛び、上の段が1段落ちる
- 画面上部に「○段」と「宇宙まであと ○段」、端に自己ベスト
- 背景は `sceneForStep` の id ごとに色と飾り(雲・星など)を変え、切り替わり時はなめらかに色を移す
- ぴったり時は小さな「ぴったり!」表示と、傾きが戻る見た目
- 崩れ演出:だるまが倒れ崩れる(1.5秒)
- 結果画面:到達段数、自己ベスト更新なら「自己ベスト!」、「もう一回」ボタン(`retry`)、「結果を共有」ボタン(Task 8)
- 頂上到達時:宇宙でだるまの頭が見える特別表示
- オープニング:宇宙に浮かぶだるまの頭 → 下へスクロール(星 → 地球の青い縁 → 雲を突き抜ける → 地上)。背景は複数の層を違う速さで流す。終わったら `game.finishOpening()`

見た目の具体(絵柄・色・効果音)は作り手に任せる。効果音を入れる場合はタップ時に鳴らし、音が出ない端末でも遊べること。

- [ ] **Step 1:** render.js・opening.js・main.js を実装
- [ ] **Step 2:** ローカルサーバーで開き、確認:初回はオープニングが最後まで流れてから開始/リロード後はタップで飛ばせる/叩くたびに1段抜けて段数が増える/続けると針が速くなる/ずれると揺れが大きくなり崩れる/結果画面から「もう一回」でオープニングなしに再開
- [ ] **Step 3:** スマホ幅(390×844)で表示が欠けないこと、連打してもカクつかないことを確認
- [ ] **Step 4:** `node --test tests/` → 全 PASS
- [ ] **Step 5:** Commit `feat: playable build with opening`

---

### Task 8: 結果カードの共有と公開準備

**Files:**
- Create: `src/shareCard.js`, `ogp.png`
- Modify: `src/render.js`(共有ボタン)、`src/main.js`、`index.html`(OGP メタタグ)、`README.md`

**Interfaces:**
- Produces:
  - `drawShareCard(step: number, isBest: boolean) -> HTMLCanvasElement` … 1080×1080。だるまの塔、「○段まで到達!」、「宇宙まであと ○段」、ゲーム名。頂上なら「宇宙到達!」
  - `shareResult(step, isBest) -> Promise<'shared'|'downloaded'|'cancelled'>` … `navigator.canShare({ files })` が使えれば画像つき共有、だめなら PNG をダウンロード。共有文「だるま落としで○段まで到達!」+ ページURL

- [ ] **Step 1:** 実装し、結果画面の「結果を共有」から呼ぶ
- [ ] **Step 2:** PCブラウザ(画像つき共有なし)でダウンロードされること、スマホで共有シートが出ること、キャンセルしてもエラーにならないことを確認
- [ ] **Step 3:** `ogp.png`(1200×630)を作り、`index.html` に `og:title`・`og:description`・`og:image`(絶対URL。リポジトリ名確定後に GitHub Pages のURLを入れる)・`twitter:card=summary_large_image` を追加
- [ ] **Step 4:** README に遊び方、ローカルでの起動方法(`python3 -m http.server`)、テスト方法(`node --test tests/`)、調整値は `src/config.js` にあることを書く
- [ ] **Step 5:** `node --test tests/` → 全 PASS
- [ ] **Step 6:** Commit `feat: share card and OGP`

GitHub リポジトリの作成と Pages の公開は、リポジトリ名を本人に確認してから行う(この計画の範囲外)。
