# Argon Review — Pass 3 (Draft PR #6: `cursor/bdb-pass3-7221`)

- **PR reviewed:** [`jfeldman9-rgb/bdb-rwb#6`](https://github.com/jfeldman9-rgb/bdb-rwb/pull/6) (`cursor/bdb-pass3-7221` @ `1eb6f3a` into `cursor/bdb-pass2-d377` @ `c9cf35a`)
- **Diff scope:** 13 commits, 34 files changed (`+703 / -116` lines)
- **Reviewer:** Gemini 4 Argon (read-only code & test review; zero game code modified)
- **Test run (`npm test`):** **FAIL — Exit code 1 (`179 pass, 5 fail` out of `184` subtests)**, contradicting the PR description's claim of `192 / 192` passing.

---

## 1. Executive Score: **6.5 / 10** *(9.1 / 10 once the uncommitted `P3-12` files are committed)*

Twelve of the thirteen items in Pass 3 (`P3-1` through `P3-11` and `P3-13`) are cleanly designed and well-tested:
- **Nightmare full-stage finishability (`P3-1`):** Persisting Wingman HP across deaths (`src/campaign.js:132-144,240-243`) and draining `dad_callin` in `tools/bot-sim.mjs:16` makes Nightmare Stage 2 (`262.0s`, 6 deaths) and Stage 3 (`322.7s`, 10 deaths) cleanly bot-clearable at 60 Hz without touching PR #2's Choirmaster balance numbers.
- **Voice queue & cutscene lifecycle (`P3-2`, `P3-3`, `P3-5`, `P3-6`):** Scripted lines (`SCRIPTED_VOICE`) wait behind active speech (`src/audio.js:431-434`), all queued entries stretch when any line starts (`src/audio.js:498`), Stage 2 emits `kidnap` before `nar_ch2` (`src/campaign.js:57-59`), Dad's `<video>` element persists across stages and is blessed before the first call without unmute-skipping (`src/dad-call-cutscene.js:59-93`), Dad's catchphrase fires on the swatter impact frame (`src/campaign.js:328`), and Chapters 2–3 skip the 61.6s opening clip while `createStoryPlayer` parks Phaser behind all full-screen clips (`src/title-flow.js:6-19`, `src/cutscene-hooks.js:21`).
- **Combat, HUD & recovery polish (`P3-4`, `P3-7`, `P3-8`, `P3-9`, `P3-10`, `P3-11`, `P3-13`):** Wingman telegraphs align with `laneY(i)` (`src/game-scene.js:138`), `installStageRecovery` wires a wall-clock freeze guard (`FREEZE_MS = 8000`) and stage-aware reload (`src/recovery.js:64-105`), Papacito's wipe cascades per enemy with the runner front (`src/papacito.js:5-10,58-64`), Lecturer grab release only hurts Bob on timeout via `hurtBob` (`src/bob.js:45-50`, `src/campaign.js:334`), Wingman HP bars sit side-by-side with `W1`/`W2` labels (`src/hud.js:7-22,41,55-58`), and boss mercy clears `phaseCalls[phaseKey]` (`src/dad-call.js:57`).

**Why the score is 6.5 / 10 as pushed:**
In commit `84428f4` (*"Turn the regex-only checks into behaviour tests."*), the author staged `src/game-scene.js`, `src/main.js`, and `src/hud.js` — which already held the call-site edits for `P3-12` — **without committing the rest of the `P3-12` files (`src/shot-feel.js`, `src/rotate-block.js`, `src/perf.js`, `src/fx.js`, `src/campaign.js`, and the `P3-12` tests)**. As a result, `cursor/bdb-pass3-7221` @ `1eb6f3a` **cannot boot in the browser** and **fails `npm test` with 5 broken test suites** due to three missing module/symbol imports (`./shot-feel.js`, `bindRotatePause`, and `noteRenderer`).

---

## 2. Locked Rules Audit

All four locked rules were re-verified against `cursor/bdb-pass3-7221` @ `1eb6f3a`:

| Locked Rule | Verdict | Evidence |
|---|---|---|
| **Eggplant fires straight (`vy = 0`), no aiming** | **PASS** | `src/eggplant.js:4` (`vy: 0`) and `src/eggplant.js:15` (`shot.vy = 0`) are untouched; `tests/feel.test.mjs:68-69` and `tests/nightmare-clear.test.mjs:27-31,173` assert `shot.vy === 0` on every step. |
| **`CAM_LEAD` is `0.28` (Bob in left third)** | **PASS** | `src/config.js:4` (`export const CAM_LEAD = 0.28`), re-exported by `src/camera.js:4`, used at `src/campaign.js:256`, pinned by `tests/camera.test.mjs`. |
| **No upgrade shop** | **PASS** | Zero shop, currency, or upgrade code in `src/` or `index.html`; pinned by `tests/save.test.mjs`. |
| **Quoted lines exact** | **PASS** | `src/voice-lines.js:5-22` and `src/story.js:7` are untouched and match `docs/BOB-LINES.md` word-for-word (`"I brought the eggplant."`, `"Die, Yetti, die!"`, `"Ha! Dead!"`, `"Not now, ladies!"`, `"I'm back, baby!"`, `"Dad! Now!"`, `"Need the ladies!"`, and Dad's swatter catchphrase). Pinned by `tests/voice-cues.test.mjs:11-29`. |

---

## 3. `npm test` Execution & Bot Pacing Verification

### `npm test` Output Summary
Running `npm test` (`node --test tests/*.test.mjs`) on `cursor/bdb-pass3-7221` @ `1eb6f3a` exits with **code 1**:
- **Total subtests:** `184` (`179 pass`, `5 fail` — 8 fewer subtests than the `192` claimed in the PR body because the `P3-12` test additions were never committed).
- **The 5 failing tests (all caused by Finding #1 below):**
  1. `tests/boot.test.mjs:14` — `every source module imports under a DOM stub; all local dependencies exist` → `ENOENT: no such file or directory, access '/workspace/src/shot-feel.js'`
  2. `tests/clip-hold.test.mjs:1` → `ERR_MODULE_NOT_FOUND: Cannot find module '/workspace/src/shot-feel.js' imported from /workspace/src/game-scene.js`
  3. `tests/corpses-scene.test.mjs:1` → `ERR_MODULE_NOT_FOUND: Cannot find module '/workspace/src/shot-feel.js' imported from /workspace/src/game-scene.js`
  4. `tests/stage-cutscene.test.mjs:1` → `ERR_MODULE_NOT_FOUND: Cannot find module '/workspace/src/shot-feel.js' imported from /workspace/src/game-scene.js`
  5. `tests/victory-claudia.test.mjs:1` → `ERR_MODULE_NOT_FOUND: Cannot find module '/workspace/src/shot-feel.js' imported from /workspace/src/game-scene.js`

### Headless Bot Pacing (`node tools/bot-sim.mjs`)
- **Adventure (30 / 60 / 120 Hz):** All stages clear inside the `140–240 s` RWB band:
  - **30 Hz:** `163.1s / 176.6s / 213.3s` (campaign `560.6s`, 4 deaths, 29 hurts)
  - **60 Hz:** `166.4s / 190.4s / 215.4s` (campaign `579.8s`, 6 deaths, 32 hurts)
  - **120 Hz:** `163.3s / 178.3s / 204.6s` (campaign `553.7s`, 4 deaths, 29 hurts)
- **Nightmare (60 Hz):** Full campaign and all individual stages clear (`stage1`: `210.6s`, 4 deaths; `stage2`: `262.0s`, 6 deaths; `stage3`: `322.7s`, 10 deaths; full `campaign`: `823.5s`, 21 deaths).

---

## 4. Prioritized Findings (with `file:line`)

### P0 — Ship Blocker (Broken Boot & Failing Test Suite)

#### 1. [P0 · Correctness / Architecture] Uncommitted `P3-12` files in commit `84428f4` leave dangling imports in `src/game-scene.js` and `src/main.js`, breaking browser boot and 5 test files
- **Where:**
  - `src/game-scene.js:19,21,71,81,145,175`
  - `src/main.js:13,65`
  - `src/rotate-block.js:1-18`
  - `src/perf.js:1-190`
  - `src/fx.js:5,51,57`
  - `src/campaign.js:364`
- **Evidence:**
  1. **Missing module `./shot-feel.js` (`src/game-scene.js:21,81,145,175`):** `src/game-scene.js:21` imports `{ RECOIL_KICK, stepRecoil, hostileShape } from './shot-feel.js'`, and `GameScene` calls `stepRecoil(this.recoil, dt)` (`:81`), `hostileShape(p.kind)` (`:145`), and `RECOIL_KICK` (`:175`). However, `src/shot-feel.js` was never added to git (`git status` is clean, and `git log --stat` shows no commit ever created `src/shot-feel.js`).
  2. **Missing export `bindRotatePause` (`src/game-scene.js:19,71` vs. `src/rotate-block.js:1-18`):** `src/game-scene.js:19` imports `{ bindRotatePause } from './rotate-block.js'` and calls `this.offRotate = bindRotatePause(this)` in `GameScene.create()` (`:71`), but `src/rotate-block.js` was never committed in Pass 3 and only exports `PORTRAIT_BLOCK` (`:2`), `portraitBlocksPlay` (`:4`), and `syncRotatePause` (`:13`).
  3. **Missing export `noteRenderer` (`src/main.js:13,65` vs. `src/perf.js:1-190`):** `src/main.js:13` imports `{ perf, noteRenderer } from './perf.js'` and calls `noteRenderer(renderer)` on `game.events.once('ready')` (`:65`), but `src/perf.js` was never committed in Pass 3 and does not export `noteRenderer`.
  4. **Uncommitted `P3-12` edits in `src/fx.js` and `src/campaign.js`:** Although the PR body and `docs/OVERNIGHT-STATUS.md:70` state *"Dead `FX.slowmo` / `FX.hitstop` removed. Snowball knockback follows travel"*, `src/fx.js:5,51,57` still initializes and writes `this.hitstop` and `this.slowmo`, and `src/campaign.js:364` still calls `this.hurtBob(false, p.x)` instead of `this.hurtBob(false, this.bob.x - p.dir)`. (That missing `src/campaign.js` edit also explains why the PR description quotes 60 Hz Adventure stage times of `166.4 / 196.8 / 210.2 s` while the committed code produces `166.4 / 190.4 / 215.4 s`.)
- **Fix:** Commit the missing `P3-12` changes (`src/shot-feel.js`, `bindRotatePause` in `src/rotate-block.js`, `noteRenderer` in `src/perf.js`, dead-field removal in `src/fx.js:5,51,57`, `p.dir` knockback in `src/campaign.js:364`, and the `P3-12` unit tests in `tests/feel.test.mjs` / `tests/rotate-block.test.mjs`) and verify `npm test` passes `192 / 192` on a clean checkout.

---

### P2 — Medium-Priority Correctness, Architecture & Mobile Performance Issues

#### 2. [P2 · Correctness / Boss Respawn] `startBoss(phase)` clamps a dead Wingman's saved `0 HP` back up to `1 HP` on Phase 3 respawn
- **Where:** `src/campaign.js:137-144`, `src/campaign.js:240-243`
- **Evidence:**
  - On death during the Stage 3 boss fight, `Campaign.respawn()` (`src/campaign.js:242`) records `this.checkpoint.wingHp = wings.map(e => e.alive ? e.hp : 0)`.
  - On respawn, `Campaign.startBoss(phase)` (`src/campaign.js:141-142`) restores each Wingman's HP with:
    ```js
    const floor = phase >= 3 ? 1 : 0;
    e.hp = Math.max(floor, Math.min(e.maxHp, wingHp[i]));
    ```
  - Because `floor` is `1` in Phase 3, any entry where `wingHp[i] === 0` (a Wingman that was already defeated) is clamped up to `e.hp = 1` with `e.alive = true` instead of remaining dead (`e.hp = 0; e.alive = false; e.state = 'dead'`). While normal Phase 3 play floors both Wingmen at `1 HP` until the Papacito finisher sweeps them, if a Wingman ever dies before Bob's respawn completes, `wingHp[i] === 0` revives it.
- **Fix:** In `src/campaign.js:140-143`, handle `wingHp[i] <= 0` explicitly (`if (wingHp[i] <= 0) { e.hp = 0; e.alive = false; e.state = 'dead'; return; }`).

#### 3. [P2 · Architecture / Lifecycle] `showStuck` stacks duplicate click listeners on `#startup-retry`, and `installStageRecovery` never tears down its `1 Hz` timer on `game.destroy()`
- **Where:** `src/recovery.js:24-34,64-105`, `src/startup.js:40,59`, `src/main.js:61`
- **Evidence:**
  - `createStartupGuard` (`src/startup.js:59`) attaches `byId('startup-retry')?.addEventListener('click', reload)` (which calls `resumeGame(root, root.__game)`), and `guard.ready()` (`src/startup.js:40`) now keeps that listener attached during gameplay.
  - When `showStuck(root, error, game)` (`src/recovery.js:31`) fires on a freeze or runtime error, it calls `by('startup-retry')?.addEventListener?.('click', () => resumeGame(root, game))` a second time on the same button (`{ once: true }` is not used, nor does it rely on the existing listener), causing a single click on `#startup-retry` to invoke `resumeGame` twice.
  - In `src/main.js:61`, `const recovery = installStageRecovery(game);` is never hooked to `game.events.once('destroy', () => recovery.destroy())` (unlike `installAudioLifecycle` at `src/audio.js:62` and `installGraphicsLifecycle` at `src/graphics-lifecycle.js:61`), leaving the `1000 ms` `setInterval` and `window` `'error'` listener in `installFreezeGuard` (`src/recovery.js:78,89`) active if `game` is destroyed.
- **Fix:** Bind `game.events?.once?.('destroy', () => recovery.destroy())` inside `installStageRecovery` (`src/recovery.js:101-105`), and either pass `{ once: true }` in `showStuck` (`src/recovery.js:31`) or let `#startup-retry`'s existing listener in `src/startup.js:59` handle the click when present.

#### 4. [P2 · Architecture / Cutscene Pause Ownership] Redundant `pauseForClip(this.game)` in `GameScene.startHeldClip` (`src/game-scene.js:154`) and single `resume` slot in `createStoryPlayer` (`src/cutscene-hooks.js:14,21-24`)
- **Where:** `src/cutscene-hooks.js:13-25`, `src/game-scene.js:151-161`
- **Evidence:**
  - `createStoryPlayer.play` (`src/cutscene-hooks.js:21`) now calls `const unpause = pauseForClip(game); resume = unpause;`.
  - `GameScene.startHeldClip` (`src/game-scene.js:154-158`) still calls `const unpause = pauseForClip(this.game);` *before* calling `this.game.story.play(key, ...)`. Because `startHeldClip` pauses `this.game` first, `createStoryPlayer.play` sees `game.isPaused === true`, so `createStoryPlayer`'s own `resume` closure is a no-op `() => {}`!
  - If `story.destroy()` (`src/cutscene-hooks.js:25`) is called while an in-stage cutscene (`kidnap`, `rescue_pre_boss`, `victory`) is active, `story.destroy()` calls its no-op `resume()`, leaving `this.game` permanently paused because `startHeldClip` held the real `unpause` closure inside its `done` callback (which `handle.abort()` does not invoke).
- **Fix:** Remove the duplicate `const unpause = pauseForClip(this.game)` from `GameScene.startHeldClip` (`src/game-scene.js:154,158`) so `createStoryPlayer` is the single owner of `pauseForClip(game)` across both `play()` completion and `destroy()`.

#### 5. [P2 · Mobile Performance] Per-frame array allocations in `GameScene.syncViews` / `effects` (`src/game-scene.js:101,111,133,148`) and Stage 2 music start-then-fade blip (`src/game-scene.js:69,73,152`)
- **Where:** `src/game-scene.js:69,73,100-112,133,148,152`
- **Evidence:**
  - `HUD.paintTouch` (`src/hud.js:62-79`) cleanly fixed the per-frame `getElementById` and `textContent`/`classList` DOM writes on `#tbPapi` and `#tbDad`.
  - However, once `bindRotatePause` is committed to `src/rotate-block.js` (Finding #1), `GameScene.syncViews` and `GameScene.effects` still allocate `[w.bob, ...w.enemies.filter(e => e.alive)]` (`:101`), `[...this.views]` (`:111`), `w.enemies.filter(e => e.alive)` (`:133`), and `this.particles.filter(p => p.life > 0)` (`:148`) on every 60 Hz frame (~240 short-lived array/Set allocations/sec on iPhone Safari).
  - On Stage 2 entry (`src/game-scene.js:69,73`), `GameScene.create()` calls `playTrack('stage2')` at line `69` and then `presentStage(this)` at line `73`, which drains `cutscene: 'kidnap'` and immediately calls `playTrack(null, { fade: .4 })` (`:152`) — starting and immediately fading out the Stage 2 music element on the same frame (deferred Kimi `F8a`).

---

## 5. Test Gaps Analysis

1. **No pre-push clean-worktree test gate (`tests/boot.test.mjs:14-20`):**
   - `tests/boot.test.mjs:14-20` is an excellent test — it statically parses every relative `import` in `src/*.js`, checks `access(path.resolve('src', ref))`, and dynamically imports every module. It immediately caught the missing `./shot-feel.js` file on the pushed branch, proving that `npm test` was run against a dirty working tree before commit `84428f4` rather than after `git status` / `git commit`.
2. **No test importing `src/main.js` and invoking `bootGame()` under stubs (`tests/press-governor.test.mjs:33-39`):**
   - While `P3-13` converted several regex tests into behavioral tests (`tests/input-map.test.mjs:10-25`, `tests/voice-policy.test.mjs:30-37`, `tests/wingman-sim.test.mjs:14-40`), `tests/press-governor.test.mjs:33-39` still regex-matches `src/main.js` (`readFile('src/main.js', 'utf8')`). The only test that actually imports `src/main.js` is `tests/boot.test.mjs:18` (which aborted early on `src/game-scene.js` before reaching `src/main.js`'s broken `import { noteRenderer } from './perf.js'`).
3. **Missing committed tests for `P3-12` (`tests/feel.test.mjs`, `tests/rotate-block.test.mjs`, `tests/wingman-sim.test.mjs`):**
   - `tests/rotate-block.test.mjs` still tests `syncRotatePause` (`:4,20-27`) and has no test for `bindRotatePause` (which `src/game-scene.js:19,71` now calls).
   - `tests/feel.test.mjs` has no test for `RECOIL_KICK`, `stepRecoil`, `hostileShape`, snowball travel-direction knockback (`p.dir`), or the removal of `FX.hitstop` / `FX.slowmo`.
   - `tests/wingman-sim.test.mjs:14-40` tests `HUD.update()` and `bossBarLayout()`, but does not assert that `HUD.paintTouch()` skips redundant DOM `textContent` / `classList.toggle` writes when charges are unchanged.

---

## 6. Pass 3 Item-by-Item Verification Table (`P3-1` – `P3-13`)

| ID | Claim in PR #6 | Status on `1eb6f3a` | Verification & `file:line` |
|---|---|---|---|
| **P3-1** | Nightmare stages finish; Wingman HP survives death; `bot-sim` drains `dad_callin`; full-stage S2/S3 Nightmare test | **Verified Fixed** | `src/campaign.js:132-144,240-243`, `tools/bot-sim.mjs:16`, `tests/nightmare-clear.test.mjs:152-184`. Choirmaster numbers untouched. (See Finding #2 for minor `wingHp = 0` clamp edge case.) |
| **P3-2** | Scripted voice not starved (incl. 3rd queued line); Stage 2 narration waits out kidnap clip | **Verified Fixed** *(clip-hold test blocked by P3-12)* | `src/audio.js:431-434,498`, `src/campaign.js:57-59`, `tests/voice-queue.test.mjs:92-149`. (`tests/clip-hold.test.mjs:37-49` fails to import `src/game-scene.js` until `src/shot-feel.js` is committed.) |
| **P3-3** | Dad unmute does not skip clip; video element & bless survive stages; iOS sound blessed before first call | **Verified Fixed** | `src/dad-call-cutscene.js:54-93`, `src/main.js:38`, `src/game-scene.js:70`, `tests/dad-cutscene.test.mjs:94-128`. |
| **P3-4** | Wingman telegraph uses the same lanes as halos | **Verified Fixed** | `src/game-scene.js:90,138`, `src/wingman.js:20,52`, `src/yettis.js:27-29,150`, `tests/wingman-sim.test.mjs:6-13`. |
| **P3-5** | Dad's catchphrase plays on swatter impact; wording unchanged | **Verified Fixed** | `src/campaign.js:232,328`, `tests/voice-cues.test.mjs:80-84`. |
| **P3-6** | Chapters 2 & 3 do not replay 61s intro; Phaser pauses behind story clips | **Verified Fixed** | `src/title-flow.js:6-19`, `src/main.js:42`, `src/cutscene-hooks.js:13,21-24`, `tests/title-flow.test.mjs:6-107`. (See Finding #4 on redundant `pauseForClip` in `startHeldClip`.) |
| **P3-7** | Reload stays wired after title; stall & gameplay error call `showStuck`; graphics retry reopens running stage | **Verified Fixed** *(minor listener nit)* | `src/startup.js:20,40`, `src/recovery.js:64-105`, `src/main.js:61`, `src/game-scene.js:190`, `tests/recovery.test.mjs:65-156`. (See Finding #3.) |
| **P3-8** | Each Papi target falls when front runner reaches it | **Verified Fixed** | `src/papacito.js:5-10,57-64`, `src/papacito-fx.js:2,10`, `src/campaign.js:203,316-325`, `tests/papacito.test.mjs:14-29`. |
| **P3-9** | Dead Lecturer lets go without hurting Bob; grab timeout goes through `hurtBob` | **Verified Fixed** | `src/bob.js:45-50`, `src/campaign.js:334`, `tests/bob.test.mjs:9-18`. |
| **P3-10** | Wingman bars sit side-by-side, labeled `W1`/`W2`, including dead Wingman | **Verified Fixed** | `src/hud.js:7-22,41,55-58`, `tests/wingman-sim.test.mjs:14-40`. |
| **P3-11** | Mercy clears that phase's swat lock; respawn sets `camMax` to checkpoint camera | **Verified Fixed** | `src/dad-call.js:50-58`, `src/campaign.js:251,256`, `tests/nightmare-clear.test.mjs:92-118`. |
| **P3-12** | One rotate listener; touch labels write on change; perf meter kept; dead `FX.slowmo`/`FX.hitstop` removed; snowball knockback follows travel; recoil kick; distinct hostile shapes | **BROKEN (Uncommitted Files)** | Only `src/hud.js:62-79` and the call sites in `src/game-scene.js:19,21,71,81,145,175` & `src/main.js:13,65` were committed. Missing `src/shot-feel.js`, `bindRotatePause` in `src/rotate-block.js`, `noteRenderer` in `src/perf.js`, `src/fx.js` cleanup, `src/campaign.js:364` snowball `p.dir`, and `P3-12` tests (Finding #1). |
| **P3-13** | Pause, recovery, title/Enter, HUD-band, and voice-policy checks call the code; heal test renamed | **Verified Fixed** | `src/input.js:9-15`, `src/audio.js:425-428`, `tests/input-map.test.mjs:10-25`, `tests/voice-policy.test.mjs:30-37`, `tests/wingman-sim.test.mjs:14-40`, `tests/length-difficulty.test.mjs:93`. |
