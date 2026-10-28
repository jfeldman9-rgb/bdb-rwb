# Argon Review — Pass 5 (Draft PR #16: `cursor/bdb-pass5-7e78`)

- **PR reviewed:** [`jfeldman9-rgb/bdb-rwb#16`](https://github.com/jfeldman9-rgb/bdb-rwb/pull/16) (`cursor/bdb-pass5-7e78` @ `a8a103c` into `cursor/bdb-pass4-cfe0` @ `3f76903`)
- **Diff scope:** 2 commits (`e3d46d8..a8a103c`), 28 files changed (`+716 / -380` lines)
- **Compared against:** `docs/FIX-LIST.md` (`P5-1` through `P5-13`) and the four Pass 4 reviews: Kimi ([`#12`](https://github.com/jfeldman9-rgb/bdb-rwb/pull/12), `docs/REVIEW-KIMI-PASS4.md`), Muse ([`#13`](https://github.com/jfeldman9-rgb/bdb-rwb/pull/13), `docs/REVIEW-MUSE-PASS4.md`), Argon ([`#14`](https://github.com/jfeldman9-rgb/bdb-rwb/pull/14), `docs/REVIEW-ARGON-PASS4.md`), and Claude ([`#15`](https://github.com/jfeldman9-rgb/bdb-rwb/pull/15), `docs/REVIEW-CLAUDE-PASS4.md`)
- **Reviewer:** Gemini 4 Argon (read-only code & test review; zero game code modified)

---

## 1. Executive Score: **9.4 / 10**

Pass 5 resolves all 13 items (`P5-1` through `P5-13`) in `docs/FIX-LIST.md` and closes the critical browser boot crash (`B1` / `Muse P1`) that static import checks missed in Pass 4:
- **Live Chrome smoke gate (`P5-1`):** `GameScene` is now the single owner of the `'shadow'` texture (`src/game-scene.js:79`), while `FX.makeTextures` no longer calls `createCanvas('shadow', ...)` (`src/fx.js:31`). `tools/browser-smoke.mjs` launches its own static HTTP server and headless Chrome, verifies the title screen, clicks through into live Stage 1 gameplay (`started === true`, advancing `elapsed`, hidden `#startup-error`), runs the full 3-stage demo campaign to victory (`164.9 / 187.1 / 225.3s`, `5` deaths), exercises multitouch stick + fire, pause, portrait rotate block, WebGL context loss/restore, and `intro_v3.mp4` playback/skip with **zero runtime or HTTP errors**.
- **Phase-3 Wingman finisher & Dad call-in fixes (`P5-2`):** `isBossFinisherReady` now turns true whenever `phase === 3`, at least one Wingman is alive (`live >= 1`), and every living Wingman has `hp <= 1` (`src/wingman.js:10-23`, mirrored in `tests/fixtures/packet-rules.js:11-24`). `isBossBragging` (`src/wingman.js:26-30`) distinguishes `split`/`roar` from a floored Phase-3 Wingman so `Campaign.useDad` (`src/campaign.js:244`) swats the surviving partner when one Wingman is at `1 HP` and refuses with `NO TARGETS IN SIGHT.` (without spending a charge) when both are floored. `Campaign.startBoss` (`src/campaign.js:163`) checks `wingDead?.[i] || wingHp[i] <= 0`.
- **Recovery, HUD, separation, cutscenes, and hot-path hygiene (`P5-3`–`P5-12`):** Freeze-guard strikes reset on a healthy `beat` and on stage change (`src/recovery.js:84-91`); `showStuck` registers a persistent click listener that refreshes `retry.__bdbStuckGame` (`src/recovery.js:35-40`); `BOSS_GATES` ticks draw only on single-bar non-Wingman bosses (`src/hud.js:20,31,103-107`); `separateEnemies` skips `hold` and `telegraph` and drops the camera-view clamp (`src/yettis.js:103-125`); `deviceMetadata` is cached via `WeakMap` and `perf.tick` avoids per-frame `JSON.stringify` (`src/perf.js:40-84,118-125`); `fireGun`, `stepShot`, `Wingmen.update`, `stagePrompt`, `FX.update`, and `handleEvents` eliminate per-frame array allocations; superseding a cutscene invokes `prevDone?.('abort')` before re-arming voice hold (`src/cutscene-hooks.js:18-25`, `src/game-scene.js:183-195`); `create()` aborts early on `globalThis.__bdbStartup?.failed` (`src/game-scene.js:71`); and the 4 dead modules (`crate-texture.js`, `cutscene-scene.js`, `music.js`, `perf-panel.js`) are deleted, leaving **54 / 54** `src/*.js` modules reachable from `src/bootstrap.js`.
- **Nightmare 60 Hz pace parity (`P5-13`):** `snowClearZ('nightmare', dt)` (`src/campaign.js:27-31,394`) uses `50px` on a `60 Hz` step and `58px` at `30/120 Hz` (with Story and Adventure unchanged at `65px`), bringing Nightmare Stage 3 at `60 Hz` (`326.1s`, `10` deaths) directly into alignment with `30 Hz` (`326.6s`, `10` deaths) and `120 Hz` (`328.4s`, `11` deaths).

The `0.6` deduction reflects a locked-line caption punctuation discrepancy on `yetti_colombian_room_01/02` (and `yetti_purple_car_01/02`) in `src/voice-lines.js:21-22` noted in the review prompt and `docs/MUSE-100-IMPROVEMENTS.md:339,347-349`, plus three minor non-blocking code/test items detailed in §5.

---

## 2. Fresh Clone, `npm ci`, `npm test`, and Browser Smoke Verification

All checks were executed from a fresh clone of `https://github.com/jfeldman9-rgb/bdb-rwb.git` (`--branch cursor/bdb-pass5-7e78`, HEAD `a8a103c`):

1. **`npm ci`:** Clean (`added 0 packages, audited 1 package`, `0 vulnerabilities`; `EBADENGINE` warning on Node `v22.23.4` vs `"node": ">=24"`).
2. **`npm test`:** **`219 / 219` tests pass** (`219` pass, `0` fail, `0` skipped, `duration_ms: 1040.3` — up from `210` in Pass 4).
3. **Module reachability from `src/bootstrap.js`:** **`54 / 54` `src/*.js` files** are reachable from `src/bootstrap.js` across `103` import/re-export edges (`0` unreachable dead files remain in `src/`).
4. **Live Chrome browser smoke (`node tools/browser-smoke.mjs`):** **PASSED** (`0` runtime exceptions, `0` HTTP `>= 400` responses):
   - **Title boot:** `Phaser.VERSION === "4.2.1"`, `<canvas>` mounted, `#title` visible.
   - **Live Stage 1 gameplay (`?demo=1&nocutscenes=1`):** `started === true`, `stage === 1`, `#startup-error` hidden, `world.elapsed` advances across live frames before fast-forward loop.
   - **Full demo campaign clear:** `victory === true`, `elapsed: 584.87s`, `stageTimes: [164.9, 187.1, 225.3]`, `deaths: 5`, `kos: 191`, `shots: 1567`, `papi: 14`, `dad: 3`, `phases: ["1:2","1:3","2:2","2:3","3:2","3:3"]`.
   - **Touch, pause, rotate, WebGL recovery, and `intro_v3.mp4` skip:** Simultaneous stick + `tbFire` touch (`story` default), touch release, `#pause` freeze/unfreeze, portrait `#rotate` flex display (`390×844`), `WEBGL_lose_context` pause + `#graphics-notice` restore, and `?cutscenes=1` Start → `intro_v3.mp4` inline video → `Space` key skip into live Stage 1 (`started === true`, `cardHidden === true`) all pass.

---

## 3. Headless Bot Simulation (`tools/bot-sim.mjs` at 30 / 60 / 120 Hz)

Re-run from the fresh clone across all 3 difficulties and all 3 tick rates (`36 / 36` stage & campaign runs clear; every figure matches the PR #16 table to the tenth of a second):

| Difficulty | Tick Rate | Stage 1 (s / deaths) | Stage 2 (s / deaths) | Stage 3 (s / deaths) | Full Campaign (`stageTimes` / total / deaths) | Band / Gate |
|---|---|---|---|---|---|---|
| **Story** | `30 Hz` | `128.2s` / `0` | `137.6s` / `0` | `151.8s` / `0` | `128.2 / 135.3 / 147.4s` (`418.4s` / `0d`) | **PASS** |
| **Story** | `60 Hz` | `128.6s` / `0` | `141.1s` / `0` | `155.6s` / `0` | `128.6 / 138.9 / 151.6s` (`426.7s` / `0d`) | **PASS** |
| **Story** | `120 Hz` | `126.0s` / `0` | `138.9s` / `0` | `152.1s` / `0` | `126.0 / 133.7 / 148.3s` (`415.5s` / `0d`) | **PASS** |
| **Adventure** | `30 Hz` | `182.7s` / `2` | `194.1s` / `3` | `197.0s` / `2` | `182.7 / 185.5 / 206.3s` (`582.1s` / `6d`) | **PASS** (`140–240s`) |
| **Adventure** | `60 Hz` | `164.9s` / `0` | `188.9s` / `2` | `225.4s` / `5` | `164.9 / 187.1 / 225.3s` (`584.9s` / `5d`) | **PASS** (`140–240s`) |
| **Adventure** | `120 Hz` | `161.3s` / `0` | `193.3s` / `3` | `213.1s` / `3` | `161.3 / 197.7 / 207.0s` (`573.5s` / `5d`) | **PASS** (`140–240s`) |
| **Nightmare** | `30 Hz` | `247.5s` / `6` | `260.4s` / `6` | `326.6s` / `10` | `247.5 / 277.5 / 337.0s` (`869.6s` / `23d`) | **PASS** |
| **Nightmare** | `60 Hz` | `235.5s` / `6` | `263.6s` / `6` | `326.1s` / `10` | `235.5 / 290.3 / 326.5s` (`859.9s` / `23d`) | **PASS** |
| **Nightmare** | `120 Hz` | `235.5s` / `7` | `265.6s` / `6` | `328.4s` / `11` | `235.5 / 300.6 / 327.7s` (`871.3s` / `27d`) | **PASS** |

---

## 4. Verification of Pass 5 Fix List (`P5-1` – `P5-13`) & Locked Rules

### Pass 5 Item-by-Item Verification

| ID | Requirement in `docs/FIX-LIST.md` | Pass 4 Source | Verdict | Evidence (`file:line`) |
|---|---|---|---|---|
| **P5-1** | `GameScene` owns `'shadow'`; `FX` no longer registers `'shadow'`; `tools/browser-smoke.mjs` launches Chrome, checks `started`, advancing frames, no error card, stage 1, and `intro_v3.mp4` | Muse P1; Claude B1 | **Verified** | `src/game-scene.js:79`, `src/fx.js:31`, `tools/browser-smoke.mjs:47-184`, `package.json:1` (`"smoke"` script). Verified live in headless Chrome. |
| **P5-2** | Phase-3 finisher ready when every living Wingman is at `1 HP` (incl. sole survivor); floor is not `"THE BOSS IS BRAGGING"`; `wingHp <= 0` stays dead when `wingDead` omitted | Claude B2; Argon 1; Kimi M1, T1/T2 | **Verified** | `src/wingman.js:10-30`, `src/campaign.js:163,244`, `tests/fixtures/packet-rules.js:11-24`, `tests/papacito.test.mjs:4`, `tests/nightmare-clear.test.mjs:1070-1103`. |
| **P5-3** | Freeze-guard strikes reset on healthy `beat` and stage change; stuck card's Reload listener is persistent and refreshes game handle | Claude B3/B4; Argon 3; Kimi M2 | **Verified** | `src/recovery.js:35-40,80-91,102-110`, `tests/recovery.test.mjs:1201-1261`. |
| **P5-4** | Gate ticks only on continuous Interventionist/Choirmaster bar; choir buff pulse draws even when choir has ring; render reads cached `choirBuff`; `choirAura` returns frozen object | Argon 2; Claude B5/B8; Kimi L2/L4/T5 | **Verified** | `src/hud.js:20,31,103-107`, `src/yettis.js:83-97,162`, `src/wingman.js:58`, `src/game-scene.js:155-164`, `tests/wingman-sim.test.mjs:1367-1396`, `tests/stage-cutscene.test.mjs:1332-1360`. |
| **P5-5** | `separateEnemies` skips `hold` and `telegraph` and does not clamp to camera; walkers still clamp in `Yetti.update`; push stays `8px` | Claude B7; Argon 4; Kimi L5 | **Verified** | `src/yettis.js:100-125,237`, `tests/yettis.test.mjs:1402-1421`. (See Minor Finding #2 regarding a residual second argument in `campaign.js:406`.) |
| **P5-6** | Cache `deviceMetadata` until resize/quality/search/renderer changes; `perf.tick` avoids per-frame `JSON.stringify`; gun, shot, wingman, prompt, boom, and event-batch scans reuse buffers | Argon 5; Claude B8; Kimi L2 | **Verified** | `src/perf.js:40-84,109-137`, `src/eggplant.js:10-35`, `src/wingman.js:84-125`, `src/hud.js:60-73`, `src/fx.js:70-75`, `src/game-scene.js:206-212,238-240`. |
| **P5-7** | Superseding a clip invokes previous settle callback with `'abort'` before new hold is cleared; `CutscenePlayer.abort` still silent on `destroy()`; sync finish inside `play()` does not re-arm hold | Claude B6 | **Verified** | `src/cutscene-hooks.js:14-35`, `src/game-scene.js:183-195`, `tests/stage-cutscene.test.mjs:1296-1330`. |
| **P5-8** | Chapter `loaderror` sets `__bdbStartup.failed`, and `create()` returns before audio, sim, and `started` | Argon 6 | **Verified** | `src/game-scene.js:67,70-75`, `tests/recovery.test.mjs:1200-1226`. |
| **P5-9** | `killImpact('ko')` splats when `source` is missing; explicit `'bob'` stays silent; `recordKo` emits `source` | Kimi L1/T2 | **Verified** | `src/shot-feel.js:10`, `src/campaign.js:193`, `tests/presentation.test.mjs:18-19`, `tests/nightmare-clear.test.mjs:1105-1116`. |
| **P5-10** | `boss` event in same drained batch as a cutscene does not start boss music; clip end still brings it back | Kimi L3; Muse / Claude stage-3 blip | **Verified** | `src/game-scene.js:29-32,190,211,218`, `tests/stage-cutscene.test.mjs:1274-1294`. |
| **P5-11** | Camera respawn, freeze-guard `started`, and press-ownership/governor checks are behavior tests | Argon 7; Kimi T3 | **Verified** | `tests/camera.test.mjs:998-1006`, `tests/recovery.test.mjs:1200-1226`, `tests/press-governor.test.mjs:1163-1187`. Zero `readFile` regex-on-source tests remain in `tests/`. |
| **P5-12** | Deleted unreferenced `src/crate-texture.js`, `src/cutscene-scene.js`, `src/music.js`, and `src/perf-panel.js`; `src/page-base.js` stays | Argon 6; Kimi; Claude | **Verified** | Deleted in `e3d46d8`; `src/page-base.js` reached via `src/bootstrap.js:2` → `src/debug-flag.js:2`. |
| **P5-13** | Nightmare snowballs clear at `58px`, and at `50px` on a `60 Hz` step; Adventure and Story stay at `65px`; Choirmaster, pace, and eggplant untouched | Muse P2 pacing | **Verified** | `src/campaign.js:27-31,394`, `tests/nightmare-clear.test.mjs:1060-1067`. Nightmare S3 at `60 Hz` is `326.1s / 10d` vs `326.6s / 10d` (`30 Hz`) and `328.4s / 11d` (`120 Hz`). |

### Locked Rules Audit

| Locked Rule | Status | Evidence (`file:line`) |
|---|---|---|
| **Eggplant fires straight (`vy = 0`), no aiming** | **PASS** | `src/eggplant.js:4` (`vy: 0` in `createShot`) and `src/eggplant.js:24` (`shot.vy = 0` in `stepShot`). Asserted on every step in `tests/nightmare-clear.test.mjs:27-31`. |
| **`CAM_LEAD = 0.28`** | **PASS** | `src/config.js:4` (`export const CAM_LEAD = 0.28`), re-exported in `src/camera.js:4`, used in `Campaign.respawn` (`src/campaign.js:282`). |
| **No upgrade shop** | **PASS** | Zero shop, currency, or upgrade mechanics in `src/` or `index.html`; `src/save.js` strips legacy shop keys. |
| **Choirmaster numbers untouched** | **PASS** | `src/yettis.js:11` (`hp: 1140, speed: 0`), `src/yettis.js:21,23` (`BOSS_ADDS.choirmaster`, `BOSS_COOL.choirmaster`), `src/yettis.js:88` (`choirMultiplier` returns `1.28`). |
| **`assets/cutscenes/intro_v3.mp4` untouched** | **PASS** | `git diff` touches zero files under `assets/`; `STAGE_CLIPS.intro` is `['intro_v3']` (`src/cutscene.js:15`) and verified in `tools/browser-smoke.mjs:161`. |
| **Quoted lines & Yetti `"Colombian's room!"` verification** | **DRIFT PRESENT** *(see Finding #1)* | Bob's lines (`src/voice-lines.js:6-19`) and Dad's catchphrase (`src/story.js:7`) match `docs/BOB-LINES.md` word-for-word. **However**, as flagged in the review prompt, `src/voice-lines.js:21` reads `"Stay away from the Colombian's room!"` instead of `"Stay away from the Colombians room."` (and line 22 reads `"Bob, why is your car purple?"` with a comma). |

---

## 5. Prioritized Findings (with `file:line`)

### P2 — Locked-Line Caption Discrepancy

#### 1. [P2 · Locked Copy / Captions] On-screen Yetti bark captions in `src/voice-lines.js:21-22` read `"Stay away from the Colombian's room!"` (and `"Bob, why is your car purple?"`) instead of the locked `"Stay away from the Colombians room."` (and `"Bob why is your car purple?"`)
- **Where:** `src/voice-lines.js:21-22`, `assets/audio/voice-manifest.json:615,628,667,680`, `docs/MUSE-100-IMPROVEMENTS.md:339,347-349`
- **Evidence:**
  - In `src/voice-lines.js:21-22`, the registered caption strings passed to `HUD.say(who, line)` are:
    ```js
    yetti_colombian_room_01:['Yetti',"Stay away from the Colombian's room!"],yetti_colombian_room_02:['Yetti',"Stay away from the Colombian's room!"],
    yetti_purple_car_01:['Yetti','Bob, why is your car purple?'],yetti_purple_car_02:['Yetti','Bob, why is your car purple?'],
    ```
  - This confirms the exact discrepancy noted in the review prompt (*`the on-screen Yetti line may read "Colombian's room!" instead of the locked "Stay away from the Colombians room."`*) and previously documented in `docs/MUSE-100-IMPROVEMENTS.md:339,347-349` (Item #63: locked verbatim texts are `Stay away from the Colombians room.` and `Bob why is your car purple?`).
  - Note that `tests/voice-cues.test.mjs:11-29` pins 17 lines in `LINES` but does not assert `LINES.yetti_colombian_room_01[1]`, `LINES.yetti_colombian_room_02[1]`, `LINES.yetti_purple_car_01[1]`, or `LINES.yetti_purple_car_02[1]`.
- **Fix:** Update `src/voice-lines.js:21-22` to the exact locked strings (`'Stay away from the Colombians room.'` and `'Bob why is your car purple?'`) and pin them in `tests/voice-cues.test.mjs:11-29`.

---

### P3 — Minor Code & Test Hygiene

#### 2. [P3 · Hygiene] Call sites in `src/campaign.js:406` and `tests/yettis.test.mjs:45,50,54` still pass a dead second `bounds` argument to `separateEnemies(enemies)`
- **Where:** `src/yettis.js:103`, `src/campaign.js:406`, `tests/yettis.test.mjs:45,50,54`
- **Evidence:**
  - `P5-5` removed the `bounds` parameter from `export function separateEnemies(enemies)` (`src/yettis.js:103`), but `src/campaign.js:406` still calls `separateEnemies(this.enemies, this.bounds);` and `tests/yettis.test.mjs:45,50,54` still passes `{l:0,r:4000}` / `{l:2000,r:3280}`.
- **Fix:** Drop the unused second argument at `src/campaign.js:406` and `tests/yettis.test.mjs:45,50,54`.

#### 3. [P3 · Cutscene Lifecycle] `startHeldClip` overwrites `this.voiceHold` before calling `playHeld(held)` when a live clip is superseded
- **Where:** `src/game-scene.js:183-195,222`, `src/cutscene-hooks.js:18-25`
- **Evidence:**
  - In `P5-7`, when `startHeldClip` is called while an earlier clip is still active, `story.play` synchronously invokes `prevDone('abort')` (`src/cutscene-hooks.js:24`).
  - In `src/game-scene.js:189`, the first clip's callback runs `const held = this.voiceHold || []; this.voiceHold = []; ... done?.(held);`. In production (`src/game-scene.js:222`), `done` is `held => this.playHeld(held)`, which immediately calls `say(...)` (`src/game-scene.js:181`) while `this.holdingVoice` is `false`, starting VO playback right before line 194 (`stopSceneAudio()`) kills scene audio for the newly started clip.
  - Normal gameplay never overlaps two story clips in the same frame, so this is only reachable under synthetic overlap.
- **Fix:** When `startHeldClip` supersedes an active clip, carry any remaining `held` voice IDs forward into the new clip's `this.voiceHold` queue rather than playing and immediately cutting them off with `stopSceneAudio()`.

#### 4. [P3 · Minor Allocation] `Campaign.flushVoice` (`src/campaign.js:293-294`) still runs two `.filter()` passes when `voiceAt` is non-empty
- **Where:** `src/campaign.js:291-296`
- **Evidence:**
  - While `voiceAt` has scheduled entries (the first `18s` of Stage 1, `2s` of Stage 3, or `1.4s` after Papacito), `flushVoice()` runs `this.voiceAt.filter(v => v.at <= this.elapsed)` and `this.voiceAt = this.voiceAt.filter(v => v.at > this.elapsed)` every `60 Hz` step (~`1,080` short-lived array pairs in Stage 1's opening `18s`).
- **Fix:** Check `if (!this.voiceAt?.some(v => v.at <= this.elapsed)) return;` before filtering, or sweep `this.voiceAt` in place with `keep()`.
