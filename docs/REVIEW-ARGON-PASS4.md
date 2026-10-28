# Argon Review — Pass 4 (Draft PR #11: `cursor/bdb-pass4-cfe0`)

- **PR reviewed:** [`jfeldman9-rgb/bdb-rwb#11`](https://github.com/jfeldman9-rgb/bdb-rwb/pull/11) (`cursor/bdb-pass4-cfe0` @ `3f76903` into `cursor/bdb-pass3-7221` @ `298879e`)
- **Diff scope:** 20 commits (`8bcc19a..3f76903`), 30 files changed (`+515 / -84` lines)
- **Reviewer:** Gemini 4 Argon (read-only code & test review; zero game code modified)

---

## 1. Executive Score: **9.2 / 10**

Pass 4 cleanly resolves all 18 items (`P4-1` through `P4-18`) from `docs/FIX-LIST.md` on top of the clean-boot baseline (`298879e`):
- **Clean-clone boot & test gate:** A fresh `git clone` of `cursor/bdb-pass4-cfe0` (`3f76903`) runs `npm ci` cleanly and passes **`210 / 210`** unit and full-campaign simulation tests (`0` failures). Every browser-entry script, ES module import edge, and exported symbol binding resolves with zero missing files or exports.
- **Nightmare 30 Hz & Stage 1 finishability (`P4-1`, `P4-4`):** Phase-3 Wingmen floored at `1 HP` return `canBeHit = false` (`src/wingman.js:35`), allowing straight-flying eggplants to pass through the front partner to weaken the back partner at `30 Hz`. Full Nightmare Stage 1, 2, and 3 bot clears now pass at `30 Hz`, `60 Hz`, and `120 Hz` (`tests/nightmare-clear.test.mjs:200-221`).
- **Recovery, lifecycle & cutscene ownership (`P4-2`, `P4-5`, `P4-6`, `P4-8`, `P4-18`):** `GameScene.started` stays `false` until the end of `create()` (`src/game-scene.js:53,82`), `installFreezeGuard` ignores active asset loads (`s.load.isLoading()`), cross-origin/empty-filename errors, and single stray throws (`src/recovery.js:77,88-101`), `showStuck` no longer stacks a duplicate click handler on `#startup-retry` (`src/recovery.js:31-36`), `installStageRecovery` tears down its `1 Hz` interval on `game.destroy` (`src/recovery.js:118-129`), `createStoryPlayer` is the single owner of `pauseForClip(game)` (`src/cutscene-hooks.js:18,22-26`, `src/game-scene.js:171-179`), Stage 2 music no longer blips before the `kidnap` clip (`src/game-scene.js:23-26,75-76`), and post-title asset errors report chapter load failure (`src/startup.js:13,25`).
- **Readability, voice & mobile GC (`P4-3`, `P4-7`, `P4-9`–`P4-17`):** `dad_catchphrase` is included in `SCRIPTED_VOICE` (`src/audio.js:435`), per-frame array/Set allocations in `Campaign.update`, `GameScene.syncViews`/`effects`, `HUD.update`, and `separateEnemies` are replaced with in-place compaction and reusable scratch buffers, and the choir 300px aura, guard shield cracks + rising clang pitch, deterministic same-lane Yetti separation (`SEPARATE_GAP = 46`), and `1.2s` boss corpse hold all land within the `140–240 s` Adventure bot band.

The remaining `0.8` deduction is for minor correctness/readability and mobile-perf items detailed in §4 (most notably: `HUD.update` drawing `66%`/`33%` phase-gate ticks on Wingman's `W1`/`W2` bars which have no `66%`/`33%` gates, `isBossFinisherReady` deadlocking Phase 3 if one Wingman is actually dead as tested in `P4-4`, and `installFreezeGuard`'s lifetime `strikes` counter never resetting across healthy frames or stage transitions).

---

## 2. Fresh Clone, `npm ci`, `npm test`, and Browser-Entry Import Audit

Executed from a fresh clone of `https://github.com/jfeldman9-rgb/bdb-rwb.git` (`--branch cursor/bdb-pass4-cfe0`, HEAD `3f7690343c4f6170023ade111593fa3d358157a1`):

1. **`npm ci`:** Succeeded (`added 0 packages, audited 1 package`, `0 vulnerabilities`).
2. **`npm test`:** Succeeded (`Exit code 0`) — **`210 / 210` tests pass** (`210` pass, `0` fail, `duration_ms: 1043.2`).
3. **Browser-entry import & export resolution count:**
   - **HTML entry (`index.html:83`):** Loads **2** scripts (`lib/phaser.min.js` and `src/bootstrap.js`); both exist on disk.
   - **Reachable ES modules from `src/bootstrap.js`:** **`53 / 53` modules** resolve and load cleanly (out of `58` total `.js` files in `src/`; the `5` unreferenced files in `src/` are `src/crate-texture.js`, `src/cutscene-scene.js`, `src/music.js`, `src/page-base.js`, and `src/perf-panel.js`).
   - **Browser-entry module import edges:** **`100 / 100` import edges** resolve (`99` static `import ... from './...'` statements + `1` dynamic `await import('./main.js')` at `src/bootstrap.js:5`). Across all `58` files in `src/`, **`102 / 102`** import edges resolve.
   - **Browser-entry imported symbol bindings:** **`214 / 214` imported symbols** (`213` static named/default bindings + `1` dynamic `bootGame` export) resolve against their target modules' exports. Across all `58` files in `src/`, **`217 / 217`** symbol bindings resolve.

---

## 3. Locked Rules & Headless Bot Pacing Audit

### Locked Rules Verification

| Locked Rule | Verdict | Evidence (`file:line`) |
|---|---|---|
| **Eggplant fires straight (`vy = 0`), no aiming** | **PASS** | `src/eggplant.js:4` (`vy: 0`), `src/eggplant.js:15` (`shot.vy = 0`), `src/input.js:1` (`ACTIONS = ['fire','jump','dash','papi','dad']`). Verified on every step in `tests/nightmare-clear.test.mjs:27-31,208` and `tests/feel.test.mjs:68-69`. |
| **`CAM_LEAD` is `0.28`** | **PASS** | `src/config.js:4` (`export const CAM_LEAD = 0.28`), re-exported at `src/camera.js:4`, used in `Campaign.respawn` at `src/campaign.js:10,269`. Verified in `tests/camera.test.mjs:39-53`. |
| **No upgrade shop** | **PASS** | Zero shop, currency, or upgrade code in `src/` or `index.html`; `src/save.js` strips legacy shop keys. |
| **Quoted lines exact** | **PASS** | `src/voice-lines.js:5-22` and `src/story.js:7` are untouched and match `docs/BOB-LINES.md` word-for-word, including Dad's swatter catchphrase (`"Son, sometimes you just need to use the fly swatter to keep the women away!"`). Verified in `tests/voice-cues.test.mjs:11-29`. |
| **Other locks (`intro_v3.mp4`, Choirmaster numbers)** | **PASS** | `assets/cutscenes/intro_v3.mp4` is untouched; Choirmaster remains at `hp: 1140` (`src/yettis.js:11`) with unchanged `BOSS_ADDS` and `BOSS_COOL` (`src/yettis.js:21,23`). |

### Headless Bot Pacing (`node tools/bot-sim.mjs`)

| Difficulty | Tick Rate | Stage 1 | Stage 2 | Stage 3 | Full Campaign (`stageTimes` / total) | Band Check |
|---|---|---|---|---|---|---|
| **Adventure** | `60 Hz` | `165.1s` (0d) | `189.0s` (2d) | `206.5s` (2d) | `165.1 / 187.1 / 212.9s` (`572.6s`, 4d) | **PASS** (`140–240s`) |
| **Adventure** | `30 Hz` | `165.0s` (0d) | `194.1s` (3d) | `198.2s` (2d) | `165.0 / 184.7 / 206.6s` (`563.7s`, 4d) | **PASS** (`140–240s`) |
| **Adventure** | `120 Hz` | `161.4s` (0d) | `193.3s` (3d) | `203.8s` (2d) | `161.4 / 197.6 / 206.9s` (`573.4s`, 5d) | **PASS** (`140–240s`) |
| **Nightmare** | `60 Hz` | `237.6s` (6d) | `267.6s` (6d) | `320.0s` (11d) | `237.6 / 293.8 / 313.1s` (`852.1s`, 24d) | **PASS** (all clear) |
| **Nightmare** | `30 Hz` | `249.0s` (6d) | `252.3s` (5d) | `283.9s` (7d) | `249.0 / 294.7 / 282.3s` (`833.4s`, 20d) | **PASS** (all clear) |
| **Nightmare** | `120 Hz` | `241.8s` (6d) | `267.4s` (6d) | `271.4s` (7d) | `241.8 / 266.6 / 300.0s` (`816.0s`, 21d) | **PASS** (all clear) |

---

## 4. Prioritized Findings (with `file:line`)

### P2 — Correctness & Architecture

#### 1. [P2 · Correctness / Boss Finisher & Respawn] A dead Phase-3 Wingman (`P4-4`) prevents `isBossFinisherReady` from ever turning true, soft-locking Stage 3; and `startBoss` still revives `wingHp[i] === 0` when `wingDead` is absent
- **Where:** `src/wingman.js:10-16,31-36,82`, `src/papacito.js:31-43`, `src/campaign.js:146-154`
- **Evidence:**
  1. `P4-4` (`src/campaign.js:150,253-254`, `tests/nightmare-clear.test.mjs:154-172`) preserves a dead Wingman (`alive: false, hp: 0, state: 'dead'`) across a Phase-3 respawn while the surviving partner remains alive.
  2. However, `isBossFinisherReady(phase, bosses)` (`src/wingman.js:14-15`) requires **both** Wingmen to be `alive`:
     ```js
     const liveBosses = bosses.filter((boss) => boss.alive);
     return phase === 3 && liveBosses.length === 2 && liveBosses.every((boss) => boss.hp <= 1);
     ```
  3. Once the surviving Wingman reaches `hp === 1`, `Wingman.canBeHit` (`src/wingman.js:35`) returns `false` and `callEffect` (`src/dad-call.js:68,72`) floors its HP at `1`, so neither Bob nor Dad can kill it. Meanwhile, because `liveBosses.length` is `1` instead of `2`, `isBossFinisherReady` returns `false`, `Wingmen.update` (`src/wingman.js:83-85`) never drops finisher softlock shakes, and `canActivatePapacito` (`src/papacito.js:38-40`) rejects Papacito with `"WEAKEN BOTH WINGMEN FIRST"` (`bosses.some(b => b.alive) && !finisher`). The fight becomes permanently unwinnable.
  4. Additionally, in `Campaign.startBoss` (`src/campaign.js:150-152`), `if (wingDead?.[i])` only checks the new `wingDead` array; if a caller or test supplies `checkpoint.wingHp = [40, 0]` without `wingDead` (the contract stated in `docs/FIX-LIST.md:14`: *"`wingHp <= 0` stays dead"*), `Math.max(floor, wingHp[i])` still revives `0 HP` to `1 HP`.
- **Fix:** Check `if (wingDead?.[i] || wingHp[i] <= 0)` in `src/campaign.js:150`, and in `isBossFinisherReady` (`src/wingman.js:14-15`) treat a 2-Wingman Phase-3 roster where at least one is alive and every live Wingman has `hp <= 1` (`bosses.length === 2 && liveBosses.length >= 1 && liveBosses.every(b => b.hp <= 1)`) as finisher-ready.

#### 2. [P2 · Readability / HUD] `HUD.update` draws `66%` and `33%` phase-gate ticks on Wingman HP bars, including the twin Phase-3 `W1` / `W2` bars that have no phase gates
- **Where:** `src/hud.js:89-95`, `src/wingman.js:22,70`
- **Evidence:**
  - `HUD.update` (`src/hud.js:89-95`) draws `BOSS_GATES[1]` (`0.66`) and `BOSS_GATES[2]` (`0.33`) tick marks inside the `for (const b of bars)` loop for **every** boss bar.
  - While Stage 1 (`Interventionist`) and Stage 2 (`Choirmaster`) run a single continuous HP bar with phase transitions at `66%` and `33%` (`src/yettis.js:14-15`), Stage 3 (`Wingman`) uses separate per-phase HP pools (`WINGMAN_HP = { 1: 360, 2: 360, 3: 200 }` at `src/wingman.js:22`) that advance only when HP reaches `0` (`src/wingman.js:70`), and in Phase 3 renders two side-by-side `240px` bars (`W1` and `W2`) that drain straight to `1 HP` for the Papacito finisher. Drawing `66%` and `33%` phase ticks on `W1` and `W2` signals nonexistent sub-phases to the player.
- **Fix:** Only draw the `BOSS_GATES[1]` and `BOSS_GATES[2]` tick marks when `!w.wingmen` (or when `bars.length === 1 && !w.wingmen`).

#### 3. [P2 · Architecture / Freeze Guard] `installFreezeGuard`'s `strikes` counter never resets across healthy frames or stage transitions
- **Where:** `src/recovery.js:74-102`
- **Evidence:**
  - `installFreezeGuard` (`src/recovery.js:70`) is instantiated once for the entire `Phaser.Game` session (`src/main.js:61`).
  - `strikes` (`src/recovery.js:74,89,99-101`) is a monotonic counter that increments on any same-origin `window` `'error'` event during gameplay (`scene()?.started`) and trips `showStuck` as soon as `strikes >= 2`.
  - Because `note()` (`game.beat`, called every frame at `src/game-scene.js:208`) and healthy interval checks (`src/recovery.js:86-91`) never reset `strikes = 0`, two isolated non-fatal errors separated by minutes of healthy 60 Hz gameplay (for example, one in Chapter 1 and one in Chapter 3) will trip the fatal `"This stage stopped running"` overlay while the stage is still running smoothly.
- **Fix:** Reset `strikes = 0` and `pendingError = null` inside the `setInterval` check (`src/recovery.js:86-91`) whenever the loop has beaten since the error (or inside `note()` when `clock() - errorAt > limit`), so only repeated errors within the same window or errors that actually stop the frame loop trigger `showStuck`.

---

### P3 — Minor Architecture, Mobile Performance & Test Gaps

#### 4. [P3 · Correctness / Enemy Separation] `separateEnemies` pushes a Lecturer during an active `hold` grab or a Yetti mid-`telegraph`
- **Where:** `src/yettis.js:95-118`, `src/campaign.js:393`, `src/game-scene.js:158`
- **Evidence:**
  - `separateEnemies` (`src/yettis.js:99-100`) collects every `e?.alive && !e.boss` minion without excluding `e.state === 'hold'` or `e.state === 'telegraph'`.
  - When a Lecturer grabs Bob (`e.state === 'hold'`, `src/yettis.js:186`) and another same-lane minion walks within `46 px`, `separateEnemies` slides the holding Lecturer up to `8 px/step` (`480 px/s` at 60 Hz) away from stationary `bob.x`. Similarly, pushing a minion in `e.state === 'telegraph'` shifts the red telegraph rectangle (`src/game-scene.js:158`, drawn from `e.x`) relative to `e.attackX` (`src/yettis.js:222`).
- **Fix:** Exclude `e.state === 'hold'` (or make a holding Lecturer immovable in the pair, like a boss) in `separateEnemies` (`src/yettis.js:100`).

#### 5. [P3 · Mobile Performance] `perf.tick` allocates `deviceMetadata()`, `URLSearchParams`, and `JSON.stringify` on every active 60 Hz frame, plus minor `.filter()` calls in `Wingmen.update`, `stagePrompt`, and `stepShot`
- **Where:** `src/perf.js:40-61,86,91-94,112`, `src/wingman.js:14,69,80,89`, `src/hud.js:58`, `src/eggplant.js:10,16`, `src/fx.js:70`
- **Evidence:**
  - `P4-7` eliminated the per-frame allocations in `Campaign.update`, `GameScene.syncViews`, `GameScene.effects`, and `HUD.bossBars`/`bossBarLayout`.
  - However, `GameScene.update` (`src/game-scene.js:216`) calls `perf.tick(...)` every frame, which invokes `deviceMetadata()` (`src/perf.js:40-61,91`) and `JSON.stringify([sampleContext, currentMetadata])` (`src/perf.js:94`) 60 times per second — allocating a `new URLSearchParams`, 6 nested objects, and a multi-hundred-character JSON string every frame even when neither context nor viewport has changed.
  - Smaller hot-path allocations remain in `Wingmen.update` (`src/wingman.js:14,69,89`, 3 `.filter()` arrays per step during the Stage 3 boss), `stagePrompt` (`src/hud.js:58`, `w.enemies.filter(e => e.alive)` every frame in Stage 1), `stepShot` (`src/eggplant.js:16`, `.filter().sort()` per active eggplant per frame), and `FX.update` (`src/fx.js:70`, `this.booms.slice()` every frame even when `booms` is empty).
- **Fix:** Cache `deviceMetadata()` in `perf.js` (invalidating only on resize, quality change, or stage change) and skip `this.booms.slice()` when `!this.booms.length`.

#### 6. [P3 · Architecture / Lifecycle] `GameScene` `loaderror` does not abort `create()`, and `5` unreferenced modules remain in `src/`
- **Where:** `src/game-scene.js:61-62,65-83`, `src/crate-texture.js`, `src/cutscene-scene.js`, `src/music.js`, `src/page-base.js`, `src/perf-panel.js`
- **Evidence:**
  - When a chapter file fails to load after the title (`src/game-scene.js:61`), `loadError` calls `window.__bdbStartup?.fail('Asset ...', 'assets')` (`P4-18`), which reveals `#startup-error`. However, Phaser still fires `complete` and enters `GameScene.create()` (`src/game-scene.js:65-83`), which sets `this.started = true` and starts stage audio/simulation behind the error card unless `create()` checks `if (window.__bdbStartup?.failed) return;`.
  - Five modules in `src/` (`src/crate-texture.js`, `src/cutscene-scene.js`, `src/music.js`, `src/page-base.js`, `src/perf-panel.js`) have zero importers from `src/bootstrap.js`.
- **Fix:** Guard `GameScene.create()` with `if (window.__bdbStartup?.failed) return;` so a failed chapter load does not start audio or simulation behind `#startup-error`.

#### 7. [P3 · Test Gaps] Remaining source-regex assertions (`tests/press-governor.test.mjs:33-39`, `tests/camera.test.mjs:48-53`, `tests/recovery.test.mjs:169`) and missing static symbol-export check in `tests/boot.test.mjs`
- **Where:** `tests/boot.test.mjs:14-20`, `tests/press-governor.test.mjs:33-39`, `tests/camera.test.mjs:48-53`, `tests/recovery.test.mjs:169`, `tests/wingman-sim.test.mjs:47-51`
- **Evidence:**
  - `tests/press-governor.test.mjs:33-39` (`boot installs press ownership and the governor`), `tests/camera.test.mjs:48-53` (`respawn uses CAM_LEAD`), and `tests/recovery.test.mjs:169` (`String(GameScene.prototype.create)`) still inspect source text with regexes rather than calling the functions under stubs.
  - `tests/wingman-sim.test.mjs:47-51` only tests phase-gate ticks on a single-bar boss (`interventionist`), missing the Wingman `W1`/`W2` bar case (Finding #2).
  - Adding a `git status --porcelain` clean-worktree check and explicit static named-export verification in `tests/boot.test.mjs:14-20` (deferred Kimi minor 5) would prevent any future dirty-worktree mismatch like the one seen in Pass 3.

---

## 5. Pass 4 Item-by-Item Verification Table (`P4-1` – `P4-18`)

| ID | Claim in `docs/FIX-LIST.md` | Status on `3f76903` | Verification & `file:line` |
|---|---|---|---|
| **P4-1** | Nightmare Stage 3 at 30 Hz step: floored Phase-3 Wingman stops soaking eggplants; add 30 Hz clear and full Nightmare S1 clear | **Verified Fixed** | `src/wingman.js:31-36` (`!(this.phase === 3 && this.hp <= 1)`), `tests/wingman-sim.test.mjs:6-17`, `tests/nightmare-clear.test.mjs:200-221`. All 3 Nightmare stages clear at 30/60/120 Hz. |
| **P4-2** | Freeze guard skips slow chapter loads, empty `filename`, and a single stray error; `started` belongs to `create`; slow-load test | **Verified Fixed** *(see Finding #3)* | `src/game-scene.js:53,82`, `src/recovery.js:74-102`, `tests/recovery.test.mjs:127-170`. (`strikes` never resets after healthy frames; see Finding #3.) |
| **P4-3** | Put `dad_catchphrase` on the scripted wait; wording unchanged | **Verified Fixed** | `src/audio.js:435` (`SCRIPTED_VOICE` includes `dad_catchphrase$`), `src/story.js:7`, `tests/voice-queue.test.mjs:133-146`. |
| **P4-4** | Dead Wingman stays dead when Phase 3 respawns; clear `wingHp` when phase advances | **Verified Fixed** *(see Finding #1)* | `src/campaign.js:140,149-153,252-255`, `src/wingman.js:78`, `tests/nightmare-clear.test.mjs:154-184`. (See Finding #1 on `isBossFinisherReady` with 1 dead Wingman.) |
| **P4-5** | `showStuck` does not stack a second click listener on `#startup-retry`; `installStageRecovery` clears timer on `game.destroy` | **Verified Fixed** | `src/startup.js:61` (`__bdbResume`), `src/recovery.js:31-36,118-129`, `tests/recovery.test.mjs:172-214`. |
| **P4-6** | One pause owner (`createStoryPlayer`); abort a live clip before starting another | **Verified Fixed** | `src/cutscene-hooks.js:18,22-26`, `src/game-scene.js:171-179`, `tests/stage-cutscene.test.mjs:62-88`, `tests/title-flow.test.mjs:90-126`. |
| **P4-7** | Reuse per-frame lists in `syncViews`, `effects`, particles, sim sweeps, and HUD boss bars; mark 66% and 33% boss gates | **Verified Fixed** *(see Finding #2)* | `src/campaign.js:21-25,132,374-391`, `src/game-scene.js:53,110-122,144,165-167`, `src/hud.js:8-52,73,86-95`, `tests/wingman-sim.test.mjs:47-54`. (See Finding #2 on Wingman `W1`/`W2` bars.) |
| **P4-8** | Stage 2 music stays silent in `create` when opening kidnap cutscene is queued | **Verified Fixed** | `src/game-scene.js:23-26,75-76` (`trackForStageStart`), `tests/stage-cutscene.test.mjs:90-94`. |
| **P4-9** | Respawn uses `CAM_LEAD` (`0.28`) instead of hardcoded `0.28` | **Verified Fixed** | `src/campaign.js:10,269` (`cp.x - VW * CAM_LEAD`), `src/config.js:4`, `tests/camera.test.mjs:48-53`. |
| **P4-10** | Mercy respawn keeps checkpoint banner text; Bob kill splats once (Papi and Dad still splat on `ko`) | **Verified Fixed** | `src/campaign.js:273-275`, `src/shot-feel.js:8-12` (`killImpact`), `src/game-scene.js:205`, `tests/nightmare-clear.test.mjs:77-78,103-104`, `tests/presentation.test.mjs:16-23`. |
| **P4-11** | Pre-unlock Dad reports `'locked'` (`DAD ARRIVES IN ZONE 3.`); recharging `'spent'` banner shows `KOs` and `s` remaining | **Verified Fixed** | `src/dad-call.js:23,38-45`, `src/campaign.js:227`, `tests/dad-call.test.mjs:25-36`. |
| **P4-12** | `Escape` and `P` do not start a run from the title; gamepad `Start` and `Enter` still begin; gameplay pause unchanged | **Verified Fixed** | `src/input.js:9-18` (`titleWantsBegin`), `tests/input-map.test.mjs:10-35`. |
| **P4-13** | Plan docs reconciled with the single packed Dad swat; no second swat added | **Verified Fixed** | `plan/BUILD-PLAN.md:23`, `plan/STATUS.md:14`, `docs/MUSE-100-IMPROVEMENTS.md:254-256`, `src/dad.js:5-17`. |
| **P4-14** | Choir buff visual: 300px dashed ring, 3 orbiting note glyphs, gold pulse on buffed allies; `choirMultiplier` stays `1.28` | **Verified Fixed** | `src/yettis.js:83-90` (`choirAura`), `src/game-scene.js:145-151`, `tests/yettis.test.mjs:8-9`. |
| **P4-15** | Guard shield chips 1–2 draw cracks on the ellipse; clang pitch rises per chip (`1250 / 1430 / 1610 Hz`); break stays 3 hits | **Verified Fixed** | `src/campaign.js:185`, `src/game-scene.js:153,195`, `src/audio.js:144-146,182` (`clangPitch`), `tests/yettis.test.mjs:4-5`. |
| **P4-16** | Same-lane non-boss Yettis under `46px` separate in `actorId` order (`<= 8px`/pair); bosses exempt; Adventure stays in `140–240s` | **Verified Fixed** *(see Finding #4)* | `src/yettis.js:92-118` (`separateEnemies`), `src/campaign.js:393`, `tests/yettis.test.mjs:27-42`. |
| **P4-17** | Boss corpses hold longer (`BOSS_CORPSE_S = 1.2s`) then fade; minion hold stays `CORPSE_S = 0.5s` | **Verified Fixed** | `src/corpses.js:2-9`, `src/game-scene.js:125` (`beginCorpse(!!m.boss)`), `tests/corpses.test.mjs:24-33`. |
| **P4-18** | After the title is ready, a missing chapter file reports chapter load failure instead of pre-title failure | **Verified Fixed** *(see Finding #6)* | `src/startup.js:13,25` (`messages.chapter`), `tests/recovery.test.mjs:77-87`. |
