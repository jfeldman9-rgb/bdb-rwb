# Argon Review — Pass 2 (Draft PR #2: `cursor/bdb-pass2-d377`)

- **PR reviewed:** [`jfeldman9-rgb/bdb-rwb#2`](https://github.com/jfeldman9-rgb/bdb-rwb/pull/2) (`cursor/bdb-pass2-d377` @ `c9cf35a` into `bdb-pass1-grok` @ `97d9861`)
- **Diff scope:** 16 commits, 32 files changed (`+616 / -51` lines)
- **Reviewer:** Gemini 4 Argon (read-only code & test review; zero game code modified)
- **Test run (`npm test`):** **168 / 168 passing** (`0` fail, `875.9 ms`, including 30/60/120 Hz full Adventure bot campaign clears in `140–240 s`/stage and Nightmare Zone-5 bot clears)

---

## 1. Executive Score: **8.2 / 10**

Pass 2 (combined with Pass 1 on `bdb-pass1-grok`) brings the codebase from the early **4.9 / 10** prototype state to **8.2 / 10**. All five original P0s stay closed, the deterministic simulation and RWB clear-time bands hold across 30/60/120 Hz, and most of the deferred P1 items (`P1-8` Bob hurt knockback, `P1-10` per-reason Dad refusal banners, `P1-11` delayed Papacito wipe, `P1-12` Choirmaster single summon + `volley++` filter bug fix, `P1-15` gamepad Start / keyboard Enter parity, `P1-16` Dad `standX` screen clamp, `P1-17` 44pt safe-area top buttons, `P1-18` translucent HUD band + per-Wingman HP bars + removed street label, `P1-19` Zone-4 deterministic spawn jitter + Nightmare zone-heal softening, `F2` pre-gameplay governor floor, and `F3` pinned boss lane) are cleanly implemented and backed by fast headless tests.

What keeps the score at **8.2 / 10** instead of **9+ / 10** are four verified functional gaps where Pass 2's wiring works in isolated unit tests (or regex source checks) but falls short in the live runtime lifecycle:

1. **Voice queue starvation (`F1` side-effect, `src/audio.js:423,463-485`, `src/campaign.js:57-66`):** Stretching the queue deadline behind `nar_ch1` (`3.34s`) lets `bob_where_claudia_01` (`2.12s`) play from `t = 3.35s` to `5.47s`. When Jason's mandated `bdb_open` (`"I brought the eggplant."`) fires at `t = 4.0s`, `narrationYields('bdb_open', 'bob_where_claudia_01')` returns `0` (because the active clip is not `nar_*`), **silently dropping `"I brought the eggplant."` on every Stage 1 start**. On Stage 3, `claudia_open` queues at `t = 2.0s` behind `nar_ch3` (`until = 4.50s`), waits behind `bob_where_claudia_01` (`2.87s–4.99s`), and **expires at `t = 4.99s` without ever playing**. On Stage 2, `nar_ch2` is emitted immediately before `cutscene: 'kidnap'` in the same frame and is **aborted by `startHeldClip`'s `stopSceneAudio()`**.
2. **Dad clip iOS sound bless is unreachable before the first call (`P1-5`, `src/dad-call-cutscene.js:54,64-77,100-108`):** `installDadKeys` is only installed *inside* `playDadCall` (after the user gesture has ended and a frame tick has elapsed) and is torn down in `finish()` / `abortDadCall()`. Because `player` is `null` during idle gameplay (and reset to `null` on stage `shutdown`), no idle gesture ever calls `player.bless()`, so the first Dad clip on iOS Safari still starts on an unblessed `<video>` element.
3. **Stage-aware reload (`recovery.js`) is unreachable during gameplay (`src/startup.js:37-41,57`, `src/main.js:31,59`, `src/recovery.js:14,24`):** `Title.create()` calls `window.__bdbStartup?.ready()`, which permanently sets `finished = true` and **removes the `reload` click listener from `#startup-retry`** before `GameScene` ever starts. Meanwhile `showStuck` has zero callers in `src/`, and `installGraphicsNotice()` (`#graphics-retry`) still defaults to `location.reload()` instead of `resumeGame`.
4. **61.6s opening video (`intro_v3`) does not park Phaser (`P1-13`, `src/main.js:40`, `src/cutscene-hooks.js:16-19`):** `pauseForClip(this.game)` was added to `GameScene.startHeldClip`, but `Title.begin()` calls `this.game.story.play(...)` directly, leaving Phaser ticking and rendering WebGL at 60 fps behind the 61.6-second opening cutscene.

---

## 2. Locked Rules Audit

All four locked project constraints were re-verified against the full branch state:

| Locked Rule | Verdict | Evidence |
|---|---|---|
| **Eggplant fires straight (`vy = 0`), no aiming** | **PASS** | `src/eggplant.js:4` initializes `vy: 0`; `src/eggplant.js:15` enforces `shot.vy = 0` every step; `src/campaign.js:335` emits muzzle `{ x, y, dir }` only; `tests/feel.test.mjs:58-73` and `tests/nightmare-clear.test.mjs:27-31` pin `shot.vy === 0`. |
| **`CAM_LEAD` is `0.28` (Bob in left third)** | **PASS** | `src/config.js:4` (`export const CAM_LEAD = 0.28`), re-exported by `src/camera.js:4` (`FOLLOW_SCREEN_X = VW * CAM_LEAD`), used on respawn at `src/campaign.js:239`, pinned by `tests/camera.test.mjs`. |
| **No upgrade shop** | **PASS** | Zero shop, currency, or upgrade modules/DOM nodes anywhere in `src/` or `index.html`. |
| **Quoted lines exact** | **PASS** | `src/voice-lines.js:5-22` and `src/story.js:7` match `docs/BOB-LINES.md` word-for-word (`"I brought the eggplant."`, `"Die, Yetti, die!"`, `"Ha! Dead!"`, `"Not now, ladies!"`, `"I'm back, baby!"`, `"Dad! Now!"`, `"Need the ladies!"`, and Dad's swatter catchphrase). Retired produce line removed from `index.html:75`. Pinned by `tests/voice-cues.test.mjs:11-29`. |

---

## 3. Prioritized Findings (with `file:line`)

### P1 — High-Priority Functional & Lifecycle Bugs

#### 1. [P1 · Correctness] `F1` voice-queue fix causes `bob_where_claudia_01` to starve `bdb_open` ("I brought the eggplant.") on Stage 1 and `claudia_open` on Stage 3; `nar_ch2` is killed by `kidnap`
- **Where:** `src/audio.js:423`, `src/audio.js:462-485`, `src/campaign.js:57-66`, `src/game-scene.js:148-149,170-179`
- **Root cause (verified with a Node timing harness against real MP3 durations):**
  1. **Stage 1 (`bdb_open` dropped):** At `t = 0.00s`, `Campaign.loadStage(1)` (`src/campaign.js:57,66`) emits `nar_ch1` (`3.336s`) and `bob_where_claudia_01` (`2.116s`) in the same frame, and arms `bdb_open` for `t = 4.00s` (`src/campaign.js:59`). With Pass 2's `F1` fix (`src/audio.js:465,484`), `bob_where_claudia_01` survives `nar_ch1` and plays from `t = 3.34s` to `t = 5.46s`. When `bdb_open` fires at `t = 4.00s`, `voiceId` is `'bob_where_claudia_01'`. Because `narrationYields(id, cur)` (`src/audio.js:423`) is `return /^nar_/.test(cur || '') ? 2.5 : 0`, it returns `0` whenever a non-`nar_*` clip is sounding — so `say('bdb_open')` drops Jason's mandated opening line (`"I brought the eggplant."`) without playing or captioning it.
  2. **Stage 3 (`claudia_open` dropped):** At `t = 0.00s`, `nar_ch3` (`2.856s`) starts and `bob_where_claudia_01` (`2.116s`) queues at `voiceQueue[0]` (`behind: 'nar_ch3'`). At `t = 2.00s`, `claudia_open` (`3.864s`) queues behind `nar_ch3` with `until = 2.0 + 2.5 = 4.50s` (`behind: 'nar_ch3'`). At `t = 2.86s`, `nar_ch3` ends and `bob_where_claudia_01` plays until `t = 4.98s`. Because `src/audio.js:484` only stretches queue entries whose `q.behind === id` (`'bob_where_claudia_01'`), `claudia_open`'s `until` stays at `4.50s` and expires before `bob_where_claudia_01` finishes at `4.98s`.
  3. **Stage 2 (`nar_ch2` killed by `kidnap`):** `Campaign.loadStage(2)` (`src/campaign.js:57,65`) emits `{ type: 'voice', data: 'nar_ch2' }` followed by `{ type: 'cutscene', data: 'kidnap' }`. In `GameScene.handleEvents()` (`src/game-scene.js:170,179`), `say('nar_ch2')` runs first (when `this.holdingVoice` is still `false`), and on the very next loop iteration `startHeldClip('kidnap')` calls `stopSceneAudio()` (`src/game-scene.js:149`), aborting `nar_ch2`'s load/playback before it ever sounds.
- **Fix:**
  - In `src/audio.js:423`, let story/scripted lines (`bdb_open`, `claudia_open`, `claudia_question`, `claudia_leave`, `nar_*`, `wingman_*`, `*_intro`) queue behind any currently playing line (`return /^nar_|^(bdb_open|claudia_|wingman_|interventionist_|choirmaster_)/.test(id) || /^nar_/.test(cur || '') ? 2.5 : 0`), and in `src/audio.js:484`, stretch all remaining `voiceQueue` entries against the newly started clip's `voiceEndsAt` (`for (const q of voiceQueue) q.until = Math.min(Math.max(q.until, voiceEndsAt + VOICE_QUEUE_GRACE), q.queuedAt + VOICE_QUEUE_MAX)`).
  - In `src/campaign.js:57,65`, emit `cutscene: 'kidnap'` *before* `nar_ch2` (or push `nar_ch2` into `voiceHold` inside `startHeldClip`) so `nar_ch2` plays after the kidnap cutscene instead of being killed by `stopSceneAudio()`.

#### 2. [P1 · Correctness / Mobile] `P1-5` iOS sound bless for Dad clips never runs during idle gameplay and resets `player` on stage shutdown
- **Where:** `src/dad-call-cutscene.js:54,64-77,100-108`
- **Root cause:**
  - `installDadKeys(root, input)` is only called inside `playDadCall` (`src/dad-call-cutscene.js:107`) — which runs from `GameScene.handleEvents()` inside a `requestAnimationFrame` tick *after* the user's key/touch gesture has already finished — and `offKeys?.()` removes those listeners as soon as the clip ends (`src/dad-call-cutscene.js:90`) or aborts (`src/dad-call-cutscene.js:51`).
  - Furthermore, `player` (`new CutscenePlayer(...)`) is lazily instantiated inside `playDadCall` (`src/dad-call-cutscene.js:100-102`) right before `player.play([id])`, and `abortDadCall` resets `player = null` on every stage `shutdown` (`src/dad-call-cutscene.js:54`, `src/game-scene.js:68`).
  - Consequently, `if (!handle?.active) { player?.bless?.(); return; }` (`src/dad-call-cutscene.js:66`) is unreachable in normal play, and the first Dad call-in on iOS Safari always invokes `v.play()` outside a user gesture on a fresh, unblessed `<video>` element (falling back to muted `"TAP FOR SOUND"`).
- **Fix:** Instantiate the shared Dad `CutscenePlayer` eagerly (or inside `installDadKeys`), call `installDadKeys(window, this.game.inp)` once in `GameScene.create()` (cleaning up on `shutdown`), and keep `player` alive across `abortDadCall` (clear `handle` and pause `player.video`, but do not set `player = null` so the blessed `<video>` element persists across calls and chapters).

#### 3. [P1 · Architecture / Correctness] `recovery.js` stage-aware reload (`resumeGame`) is unreachable once `Title.create()` completes, and `showStuck` has zero callers
- **Where:** `src/startup.js:37-42,57-58`, `src/main.js:31,58-59`, `src/recovery.js:14-33`, `src/graphics-notice.js:2`
- **Root cause:**
  - `Title.create()` calls `window.__bdbStartup?.ready()` (`src/main.js:31`) before `GameScene` ever starts (`even with ?autostart=1`).
  - `startup.ready()` (`src/startup.js:37-41`) sets `finished = true` (making `window.__bdbStartup?.fail(...)` in `GameScene.preload` at `src/game-scene.js:54` a no-op) and executes `retry?.removeEventListener('click', reload)` (detaching `resumeGame` from `#startup-retry`).
  - `showStuck(root, error, game)` (`src/recovery.js:24`) is never imported anywhere in `src/` (only in `tests/recovery.test.mjs`).
  - `installGraphicsNotice()` (`src/main.js:59`, `src/graphics-notice.js:2`) uses its default `again = () => root.location?.reload()` instead of `() => resumeGame(window, game)`.
  - As a result, `resumeGame`'s `'resume'` branch (`if (s?.started && s.stageNo >= 1 ...)`, `src/recovery.js:16`) can never be reached in the live browser.
- **Fix:**
  - Pass `() => resumeGame(window, game)` as the second argument to `installGraphicsNotice(window, () => resumeGame(window, game))` in `src/main.js:59`.
  - In `src/startup.js:40`, keep the `reload` click listener on `#startup-retry` (or allow `guard.fail(err, 'assets')` to reopen `#startup-error` on chapter-transition asset load failures in `src/game-scene.js:54`), and wire `showStuck` to uncaught runtime errors during gameplay.

#### 4. [P1 · Mobile Performance] `P1-13` parks Phaser behind in-stage clips, but leaves Phaser rendering at 60 fps behind the 61.6s `intro_v3` opening video
- **Where:** `src/main.js:40`, `src/cutscene-hooks.js:8-21`, `src/game-scene.js:148-157`
- **Root cause:** `pauseForClip(this.game)` was wired into `GameScene.startHeldClip` (`src/game-scene.js:151`), but `Title.begin()` (`src/main.js:40`) calls `this.game.story.play('intro', ...)` directly. During the 61.6-second `intro_v3.mp4` opening (or 72.3s `intro_v2.mp4`), `Title` continues running its `update()` loop and drawing its 1280×720 background + animated `bob_idle` sprite in WebGL behind the full-screen `<video>`.
- **Fix:** Move `const unpause = pauseForClip(game)` into `createStoryPlayer(...).play` in `src/cutscene-hooks.js:17-19` (passing `game` or `() => game` into `createStoryPlayer`), so *every* full-screen story clip (`intro`, `intro_v2`, `kidnap`, `rescue_pre_boss`, `victory`) automatically pauses and resumes the Phaser loop in one place.

---

### P2 — Medium-Priority Visual, Feel & Mobile Performance Issues

#### 5. [P2 · HUD Visual Overlap] Dual Wingman HP bar #2 overlaps `this.boss` text and omits the `W1`/`W2` labels (`P1-18`)
- **Where:** `src/hud.js:6-12,30,43`
- **Evidence:**
  - `this.boss` (`"THE WINGMEN · PHASE 3"`, `fontSize: 14`, `.setOrigin(0.5)`) sits at `y = 106` (`src/hud.js:30`), spanning `y ≈ 98..114`.
  - In Stage 3 Phase 3, `bossBars(w)` returns two entries (`i = 0` at `y = 79..92` and `i = 1` at `y = 95..108`, `src/hud.js:43`). The second Wingman bar (`y = 95..108`, `x = 390..890`) draws directly behind the centered `this.boss` label at `(640, 106)`.
  - Additionally, `bossBars(w)` computes `label: 'W1'` / `'W2'` (`src/hud.js:9`), but `HUD.update()` never renders `b.label`.
- **Fix:** Move `this.boss` to `y = 68` (above the first bar at `y = 79`), or place side-by-side 240 px bars at `y = 79` (`x = 390` and `x = 650`), so both bars stay above `this.boss` at `y = 104` and stay inside the `116 px` top band.

#### 6. [P2 · Correctness / Feel] Lecturer grab release on grabber death or timeout damages Bob without `dir`, `sfx.hurt`, or `FX` impact (`P1-8`)
- **Where:** `src/bob.js:45-47`, `src/campaign.js:147-150`
- **Evidence:**
  - In `Bob.update` (`src/bob.js:45-47`):
    ```js
    if (this.state === 'grabbed' && (!this.grabbedBy?.alive || this.stateTime <= 0)) {
      this.grabbedBy = null; this.setState('idle'); this.takeHit();
    }
    ```
  - First, if an in-flight eggplant kills the grabbing Lecturer (`!this.grabbedBy.alive`), Bob still calls `this.takeHit()` and loses 1 heart as punishment for killing his grabber.
  - Second, when a grab genuinely times out (`this.stateTime <= 0`), calling `this.takeHit()` directly inside `Bob.update` bypasses `world.hurtBob(false, grabber.x)` (`src/campaign.js:147`), so `dir` defaults to `0` (zero `P1-8` knockback slide), `world.stats.hits` is not incremented, and no `'hurt'` event (`sfx.hurt()`, `fx.impact('medium')`, or `bob_hurt_01..03`) is emitted.
- **Fix:** Only damage Bob when `this.stateTime <= 0` while `this.grabbedBy?.alive` is true (if `!this.grabbedBy?.alive`, release Bob cleanly without `takeHit()`), and route timeout damage through `world.hurtBob(false, grabber.x)` or emit the hurt feedback consistently.

#### 7. [P2 · Feel / Presentation] `P1-11` Papacito delayed wipe kills all screen enemies at a flat `0.45s` instead of as the runner front crosses them
- **Where:** `src/campaign.js:17,199,299-305`, `src/papacito.js:50-56`, `src/papacito-fx.js:6-9`
- **Evidence:** `PapacitoFX` spawns 10 runners starting at screen `x = -180` moving right at `980 px/s` (`src/papacito-fx.js:6,9`). At `PAPI_WIPE_DELAY = 0.45s`, the lead runner is only at screen `x = +261 px` (left quarter of the `1280 px` viewport), yet `this.papiPending` kills all targets across the entire `1280 px` width simultaneously — so enemies at `screenX = 900..1200` collapse ~0.7–1.0s before the runners reach them.
- **Fix:** Optional polish: either increase `PAPI_WIPE_DELAY` to `~0.65s` (mid-screen) or resolve each enemy in `papiPending.killed` as `e.x - this.camX <= -180 + (2.5 - this.papiTime) * 980`.

#### 8. [P2 · Mobile Performance] Per-frame `matchMedia`, DOM `getElementById`/`textContent` writes, and array allocations on the 60 Hz hot path
- **Where:** `src/rotate-block.js:5,15` (called from `src/game-scene.js:187`), `src/hud.js:45`, `src/game-scene.js:97,107,130,144`, `src/fx.js:51,57,71`
- **Evidence:**
  - `syncRotatePause` calls ` globalThis.matchMedia(PORTRAIT_BLOCK)` every frame (`60/s`), allocating a new `MediaQueryList` object each tick (`Kimi F5`).
  - `HUD.update` calls `document.getElementById('tbPapi')` and `document.getElementById('tbDad')` and writes `.textContent` and `.classList.toggle` unconditionally every frame (`src/hud.js:45`, `Kimi K6`).
  - `FX` still writes unused `this.hitstop` and `this.slowmo` fields (`src/fx.js:51,57`, `Kimi F4`).
  - `main.js:55,64` still binds `bindPerfLifecycle(perf)` a second time (after `src/perf.js:189` already bound it on import) and overwrites `window.__perf = { renderer, software }` on `ready` (clobbering the `PerfMeter` reference that `src/perf.js:189` set on `window.__perf`, though `window.__bdbPerf` is preserved).

#### 9. [P2 · Edge Case] Nightmare boss-arena mercy (`F7`) and respawn `camMax` (`K3`)
- **Where:** `src/dad-call.js:50-57`, `src/campaign.js:232-244`
- **Evidence:**
  - `grantZoneMercy` (`src/dad-call.js:50-57`) restores `dadCall.charges = 1` on the 3rd Nightmare death in a zone, but does not clear `dadCall.phaseCalls[`${stageNo}:${phase}`]`. If the player already used Dad in that boss phase and dies 3 times in the same phase, the banner announces `"MERCY. DAD'S BACK ON THE LINE."` (`src/campaign.js:243`), but pressing Dad refuses with `"DAD ALREADY SWATTED THIS PHASE."` (`src/dad-call.js:37`).
  - On respawn (`src/campaign.js:239`), `this.camMax = Math.max(this.camMax || 0, this.camX)` preserves the pre-death high-water `camMax`, clamping Bob forward on the next camera step (`Kimi K3`).

---

## 4. Test Gaps Analysis

Pass 2 grew the suite from 143 to **168 passing tests** across 35 test files. However, four specific test patterns allowed Findings #1–#4 to slip through green:

1. **Regex source-matching instead of behavioral execution (`tests/press-governor.test.mjs:65-68`, `tests/recovery.test.mjs:53-59`, `tests/input-map.test.mjs:10-11`):**
   - `tests/press-governor.test.mjs:65-68` only asserts `assert.match(scene, /pauseForClip\(this\.game\)/)` on `src/game-scene.js`, missing that `Title.begin()` in `src/main.js:40` plays the 61.6s `intro_v3` clip without `pauseForClip`.
   - `tests/recovery.test.mjs:53-59` only regex-matches ` resumeGame(root, root.__game)` in `src/startup.js`, missing that `startup.ready()` in `Title.create()` detaches the `reload` click handler before `GameScene` ever starts.
2. **Incomplete assertion in `tests/dad-cutscene.test.mjs:80-90`:**
   - The test `'idle gestures bless the reused element; abort drops the key wiring'` calls `playDadCall`, calls `abortDadCall`, emits a `keydown`, and ends with `assert.ok(typeof installDadKeys === 'function')` — it never checks `player.blessed === true` and never tests whether an idle gesture *before* the first `playDadCall` blesses the Dad `<video>` element.
3. **Two-line isolated queue test vs. full Stage 1 / Stage 2 / Stage 3 opening event stream (`tests/voice-queue.test.mjs:48-71`, `tests/clip-hold.test.mjs:35-49`):**
   - `tests/voice-queue.test.mjs` tests a 2-line sequence (`nar_victory` → `claudia_leave`), which passes, but no test runs the actual Stage 1 (`nar_ch1` + `bob_where_claudia_01` + `bdb_open` at `t = 4s`) or Stage 3 (`nar_ch3` + `bob_where_claudia_01` + `claudia_open` at `t = 2s`) event streams through `audio.say()` with real clip durations.
   - `tests/clip-hold.test.mjs:35-49` asserts `scene.captions.length === 1` for `nar_ch2` before `kidnap`, without checking that `stopSceneAudio()` in `startHeldClip` immediately aborts `nar_ch2`'s audio playback.
4. **Test title vs. assertion mismatch in `tests/length-difficulty.test.mjs:93-102`:**
   - The test is named `'late zones stagger spawns; zone clears heal half on Adventure, full on Story'`, while the body asserts full heal on Adventure and half-gap heal on Nightmare (`nm.bob.hp === 2`). Updating the test name to `'late zones stagger spawns; zone clears heal half on Nightmare, full on Story/Adventure'` will keep test diagnostics accurate.

---

## 5. Verification Summary (`Pass 2` Commit-by-Commit Status)

| Item | Commit | Verdict | Notes |
|---|---|---|---|
| **P1-5** Dad clip keys + iOS bless | `de6d845` | **Partial** | Keyboard skip + `consumePress` works during active Dad clip; idle iOS `bless()` before first call is unreachable (Finding #2). |
| **P1-8** Bob hurt knockback slide | `fddaea7` | **Fixed** | `knockV` (`200` normal / `340` charger) slides away from hit source `srcX` and decays smoothly; hearts model untouched (minor grab-timeout edge in Finding #6). |
| **P1-10** Dad refusal banners | `c6a8042` | **Fixed** | `refusalBanner(st, why)` maps all 9 refusal states distinctly and preserves `0/1 · CALL 3/3` on `spent`. |
| **P1-11** Papacito wipe delay | `fbdb2e3` | **Fixed** | `PAPI_WIPE_DELAY = 0.45` staggers crowd on activation and lands KOs/score 0.45s later while sim stays frozen. |
| **P1-12** Choirmaster single summon + volley fix | `300ecfa` | **Fixed** | Removed duplicate per-telegraph summon and fixed `this.volley++ % 3` inside `.filter()` so Choirmaster fires its 2-band halo volley. |
| **P1-13** Pause Phaser behind story videos | `fdd34b8` | **Partial** | `GameScene.startHeldClip` and `playDadCall` use `pauseForClip(this.game)`; `Title.begin()` intro clip still runs Phaser unpaused (Finding #4). |
| **P1-15** Pad Start on Title, Enter pauses | `fcbc114` | **Fixed** | `Title.update` accepts `pause` (Gamepad Start); `GameScene.update` toggles manual pause on `pause` or `start` (`Enter`). |
| **P1-16** Clamp Dad stand mark | `6f6c4b0` | **Fixed** | `standX` clamped to `[camX + 120, camX + VW - 200]` (`src/dad.js:22`). |
| **P1-17** 44pt pause/mute + safe-area | `ba6994c` | **Fixed** | `#top-buttons` uses `min-width:44px; min-height:44px` and `max(2%, env(safe-area-inset-right))` / `max(17%, env(safe-area-inset-top))` (`index.html:31-33`). |
| **P1-18** Translucent HUD, Wingman bars, no street label | `998ced8` | **Fixed (minor overlap)** | Top slab alpha `.55`, `bossBars(w)` returns per-Wingman bars, street label removed from `parallax.js` (bar #2 overlaps `this.boss` text at `y = 106` — Finding #5). |
| **P1-19** Zone-4 stagger + Nightmare heal soften | `d802001` | **Fixed** | Deterministic Zone-4 delay jitter + Nightmare half-missing-HP zone heal; 30/60/120 Hz Adventure bot clears stay inside `140–240 s`. |
| **Wire `recovery.js`** | `44bc1ab` | **Partial** | `installResumeCleanup(game, q)` works on boot; `resumeGame` on `#startup-retry` is detached by `startup.ready()` in `Title.create()` (Finding #3). |
| **Kimi F1** Voice queue duration budget | `eeb5aa5` | **Partial** | Fixes 2-line `nar_victory` → `claudia_leave`, but starves `bdb_open` on Stage 1 and `claudia_open` on Stage 3 (Finding #1). |
| **Kimi F2** Pre-gameplay governor floor | `2fc44dd` | **Fixed** | `if (st.fx)` guard in `applyLevel` + re-apply on first `st.runId` sighting (`src/quality-governor.js:80,85,98`). |
| **Kimi F3** Pinned bosses hold lane | `1823d6c` | **Fixed** | `if (self.boss) return;` in `stepRangedLane` while non-boss ranged adds spread around pinned bosses (`src/yettis.js:53-61`). |
| **Gaps G1–G4, G6** | `2bfeda0` | **Fixed** | Added `tests/corpses-scene.test.mjs`, `tests/voice-queue.test.mjs`, `tests/recovery.test.mjs`, `tests/dad-cutscene.test.mjs`, and pre-Dad Nightmare mercy test. |
