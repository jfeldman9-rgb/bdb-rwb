# Claude review — Pass 3 draft PR #6

**PR:** [#6](https://github.com/jfeldman9-rgb/bdb-rwb/pull/6) `cursor/bdb-pass3-7221` @ `1eb6f3a` into `cursor/bdb-pass2-d377` @ `c9cf35a` (13 commits, 34 files).
**Date:** 2026-10-28 · **Reviewer:** Claude (read-only; no game code touched, no merge, no deploy).
**Method:** I read the full `src/`, `tests/` and `tools/` diff and the code around it, and checked every P3 claim in the PR body and `docs/OVERNIGHT-STATUS.md` against the pushed tree. I ran `npm test` on the PR head. I also ran `tools/bot-sim.mjs` on both the base and the head. For the head run I used a throwaway worktree with minimal stubs for the three missing exports (see R1); the stubs were not committed. Voice clip lengths come from `ffprobe` on `assets/audio/voice/*.mp3`.

## `npm test` result

**184 tests, 179 pass, 5 fail** (node v22.23.4; `engines` asks for ≥24). The PR body and `docs/OVERNIGHT-STATUS.md` claim **192/192**.

```
not ok  boot.test.mjs  "every source module imports under a DOM stub; all local dependencies exist"
        ENOENT: no such file or directory, access '/workspace/src/shot-feel.js'
not ok  tests/clip-hold.test.mjs        ERR_MODULE_NOT_FOUND src/shot-feel.js (imported from src/game-scene.js)
not ok  tests/corpses-scene.test.mjs    (same)
not ok  tests/stage-cutscene.test.mjs   (same)
not ok  tests/victory-claudia.test.mjs  (same)
```

The base branch is 168/168. With throwaway stubs for the three missing exports, the head goes to **185/185**, so about 7 claimed tests are also missing from the push. The repo has no CI (`gh pr checks 6`: "no checks reported"), which is why this went unnoticed.

## Score: 4/10

As pushed, this branch **does not boot**. `src/game-scene.js` and `src/main.js` import three things that were never committed, so `main.js` fails at module link time and the game never reaches the title screen. A draft that cannot load can't score above the middle, however good the rest is.

The rest is good. If the missing P3-12 commit lands as described, I would score this about **7.5/10**:
- **Nightmare is now finishable.** On the base, the bot never clears any Nightmare stage: it hits the 1800 s cap with 104–139 deaths. On the head, S1/S2/S3 clear in 210.6 / 262.0 / 322.7 s.
- **Most mechanisms are fixed at the right layer.** This covers the voice queue, the Papi per-target schedule, the grab punish, the phase-mercy key, the HUD bars and the chapter intro skip.
- **The new tests call the code** instead of regexing it.

Locked rules hold.

The points off, in order of weight:
1. **The P3-12 commit is missing** (R1). All of P3-12 except the touch-label cache is either missing or only half pushed, and that breaks the boot.
2. **The freeze guard shows "The game hit a snag" during a slow chapter load** (R2). It is new code that can misfire on exactly the phones it is meant to protect.
3. **Several claims don't match the pushed code** (R1, R4). These are the 192/192 count, the stage times, "FX.slowmo / FX.hitstop removed" and "snowball knockback follows travel".
4. **P3-5 can still lose the locked catchphrase** (R3). It is dropped whenever cutscenes are off, and that includes every session that Reload brings back.

---

## Locked rules: verified intact

- **Eggplant fires straight, no aiming.** `src/eggplant.js` is untouched. `vy: 0` is set at `src/eggplant.js:4` and re-zeroed at `:15`. The new full-stage Nightmare test asserts `shot.vy === 0` every frame (`tests/nightmare-clear.test.mjs`, `clearStage`).
- **`CAM_LEAD` = 0.28.** It is unchanged at `src/config.js:4`, and `src/camera.js` is untouched. Respawn still computes `cp.x-VW*0.28` (`src/campaign.js:256`). Only the `camMax` high-water mark changed (P3-11).
- **No shop.** There is no shop or upgrade code in `src/` or `index.html`.
- **Quoted lines exact.** `src/voice-lines.js`, `src/story.js`, `src/barks.js` and `index.html` are untouched. `tests/media.test.mjs` still pins the catchphrase text. P3-5 moves *when* `dad_catchphrase` is emitted, not its wording.
- **`assets/` untouched**, including `intro_v3.mp4`.
- **Choirmaster numbers unchanged.** The `src/yettis.js` change (`LANE_TOP + band*59` → `laneY(band)`, `Math.round(...)` → `laneOf(...)`) gives the same lanes: `laneY` is 572/631/690 for bands 0–2 (`src/yettis.js:27-29`). No HP, volley or add values changed.

---

## Claim-by-claim verification

| Item | Verdict | Evidence |
|---|---|---|
| **P3-1** Nightmare finishes; Wingman HP survives death; bot-sim drains `dad_callin` | **Fixed (verified by sim)** | Respawn snapshots each Wingman's HP into `checkpoint.wingHp` (`src/campaign.js:240-243`), and `startBoss` reapplies it with the phase-III floor of 1 (`:131-145`). `tools/bot-sim.mjs:15-16` drains `dad_callin` the same way the tests do. Base Nightmare: 1800 s cap on every stage, not cleared. Head: 210.6 / 262.0 / 322.7 s, cleared. S1 has no full-stage test (T2). |
| **P3-2** Scripted voice not starved; third line; `nar_ch2` after kidnap | **Fixed** | `SCRIPTED_VOICE` waits 2.5 s or more behind any sounding line (`src/audio.js:431-434`). Every queued entry is stretched when a line starts (`:496-498`). The kidnap `cutscene` event is now emitted before `nar_ch2` (`src/campaign.js:57-59`), so `startHeldClip` holds it. With the real clip lengths (`nar_ch1` 3.34 s, the where-bark 2.12 s, `bdb_open` 1.66 s; `nar_ch3` 2.86 s, `claudia_open` 3.86 s), both `bdb_open` and `claudia_open` start inside the 10 s cap. `dad_catchphrase` is not in the scripted set (R3). |
| **P3-3** Unmute doesn't skip; element and bless survive stages; bless before the first call | **Fixed** | The in-clip `pointerdown` bless is gone from `installDadKeys` (`src/dad-call-cutscene.js:101-112`). Idle-time bless is guarded by `!handle?.active` (`:82-96`). `abortDadCall` keeps the player (`:53-55`), `finish()` still clears `src`, so nothing leaks (`src/cutscene.js:218`), and `blessDadFromGesture` runs from Title `begin` (`src/main.js:38`). `bless()` returns early once `blessed` is set, so the per-tap capture listeners cost almost nothing. |
| **P3-4** Telegraph on the halo lanes | **Fixed** | The telegraph is drawn at `laneY(i)-LANE_H/2`, `LANE_H` tall (`src/game-scene.js:138`). Halos spawn at `laneY(i)` (`src/wingman.js:52`). Dust bands use `laneOf` (`src/game-scene.js:90`). |
| **P3-5** Catchphrase on the swatter impact | **Moved as claimed; still droppable** | It is emitted inside the `Dad.update` resolve right before `dadhit` (`src/campaign.js:328`), and `resolve` fires once (`src/dad.js:35`). Test: `tests/voice-cues.test.mjs:80-84`. See R3. |
| **P3-6** Chapters 2/3 skip the 61 s intro; Phaser paused behind the intro | **Fixed** | `chapterIntroKey` returns null for stage > 1 (`src/title-flow.js:6-9`). `createStoryPlayer.play` wraps every clip in `pauseForClip`, and the nested pause from `startHeldClip` becomes a no-op (`src/cutscene-hooks.js:19-25`). |
| **P3-7** Reload wired after the title; stall/error → `showStuck`; graphics retry resumes | **Wired, with one misfire** | The Reload listener is kept (`src/startup.js:41`). `fail('assets')` is allowed after ready (`:20`). `installFreezeGuard` and the `error` hook (`src/recovery.js:64-97`) and the graphics retry through `resumeGame` (`:101-105`) are all in place. Misfire during preload: R2. Copy and error-filter nits: R6, R7. |
| **P3-8** Each Papi target falls when the front runner reaches it | **Fixed** | `papiHitTime(x) = (x+180)/980`, shared with `papacito-fx.js` (`src/papacito.js:4-10`, `src/papacito-fx.js:10`). The per-enemy schedule resolves inside the frozen `papiTime` (`src/campaign.js:316-325`). The worst case is an enemy at screen x 1280, which falls at 1.49 s, well inside the 2.5 s window. |
| **P3-9** Dead Lecturer lets go harmlessly; timeout goes through `hurtBob` | **Fixed** | `grabPunish` is set only when the timer expires *and* the grabber is alive (`src/bob.js:46-49`). It is consumed right after `bob.update`, before the death check (`src/campaign.js:334-335`), so a lethal timeout respawns on the same frame. A side effect, which I count as an improvement: a timeout now counts in `stats.hits` and plays the hurt FX and bark. |
| **P3-10** W1/W2 side by side, dead Wingman shown empty | **Fixed** | `bossBars` includes dead Wingmen at ratio 0 (`src/hud.js:7-13`). `bossBarLayout` places the bars at 390 and 650 (`:15-21`), with the labels at y=60, above the bars at y=79 and the boss name at y=106. |
| **P3-11** Mercy clears that phase's lock; respawn `camMax` = checkpoint camera | **Fixed** | `grantZoneMercy(dc, "stage:phase")` deletes `phaseCalls[key]` (`src/dad-call.js:50-58`). The key format matches `useDad`'s `bossPhase` (`src/campaign.js:219-221`). Respawn sets `camMax = camX` (`:256`). Both are tested (`tests/nightmare-clear.test.mjs`). |
| **P3-12** One rotate listener; touch labels on change; perf meter kept; slowmo/hitstop removed; snowball knockback; recoil kick; distinct shapes | **Not delivered; breaks the boot** | Only the touch-label cache (`src/hud.js:62-80`) and the call sites landed. `shot-feel.js`, `bindRotatePause` and `noteRenderer` don't exist. `src/fx.js` is untouched. The snowball hit is still `hurtBob(false, p.x)` (`src/campaign.js:364`). See R1 and R4. |
| **P3-13** Regex checks → behaviour tests | **Mostly fixed** | Tests now call the code for title begin and gameplay pause (`src/input.js:9-15`), `presentStage` (`src/audio.js:425-428`), `HUD_BAND` (`src/hud.js:4`), the freeze guard and the stage recovery. The heal test name was fixed. |

---

## Findings (prioritized)

### R1 — P0 · The branch doesn't boot: three imports point at uncommitted code
- `src/game-scene.js:21` imports `RECOIL_KICK, stepRecoil, hostileShape` from `./shot-feel.js`. That file doesn't exist on this branch, on the base, or on any remote branch (`git log --all -- src/shot-feel.js` is empty).
- `src/game-scene.js:19` imports `bindRotatePause` from `./rotate-block.js`, which only exports `syncRotatePause` (`src/rotate-block.js:13`). The call is at `src/game-scene.js:71`.
- `src/main.js:13` imports `noteRenderer` from `./perf.js`, which has no such export. The call is at `src/main.js:66`.

**Impact.** An ES module with a missing file or a missing named export fails to link, so `main.js` never runs. The player sees the startup error card, or a dead loading screen, on every device. `tests/boot.test.mjs` exists to catch exactly this, and it fails.

**Cause.** Commit `84428f4` ("Turn the regex-only checks into behaviour tests") committed the P3-12 call sites in `game-scene.js`, `main.js` and `hud.js`. The P3-12 commit itself (`shot-feel.js`, the `rotate-block.js`/`perf.js`/`fx.js` edits, the knockback change, and roughly 7 tests) never made it into a commit. There is no P3-12 commit in `git log`.

**Fix.** Push the missing working-tree files from the Pass 3 agent's checkout. Then rerun `npm test` on a clean clone before claiming a count.

### R2 — P1 · The freeze guard can show the stuck card during a slow chapter load
`GameScene.init` sets `this.started = true` (`src/game-scene.js:48`) before `preload` queues the stage atlases and backdrops (`:49-58`). Phaser doesn't call `update` until `create`, so `game.beat` (`:191`) doesn't run while those files download. Meanwhile `installFreezeGuard`'s interval (`src/recovery.js:78-82`) sees `started` true, `world.paused` false and `game.isPaused` false. After `FREEZE_MS` = 8000 it trips `showStuck`: "This stage stopped running."

**When it happens.** A first chapter load or a stage 1→2→3 restart (`scene.restart` re-runs `init`/`preload`) that takes more than 8 s on a slow phone connection. Those are exactly the players this guard is for. The card then stays up on top of a game that loads fine.

**Fix.** Set `started` in `create`, or have the guard skip while `s.load.isLoading()` / `!s.sys.isActive()`. Add a test for "preload longer than `FREEZE_MS` does not trip".

### R3 — P2 · The locked catchphrase is still dropped when cutscenes are off
`dad_catchphrase` doesn't match `SCRIPTED_VOICE` (`src/audio.js:431`). So under `narrationYields` it gets wait 0 and is **dropped** whenever any non-narration line is still sounding (`src/audio.js:470-477`).

**When it happens.** With cutscenes off, `playDadCall` returns false and `finishDadCallin` runs on the same frame as `useDad` (`src/game-scene.js:182`). Impact comes 0.875 s later (`DAD_TIMING.impact`). Bob's `dad_call_0x` (1.97–3.65 s) is still sounding at that moment, so the catchphrase (4.61 s) never plays. `cutscenesEnabled` is false for `autostart`, `demo`, `skip` and `story=0` (`src/cutscene.js:31-35`). That covers **every session resumed through the Reload card** (`resumeUrl` sets `autostart=1`) as well as demo mode.

**Is it a regression?** This is not new: the base also emitted it on the same frame as the call line. But P3-5's goal was "the catchphrase plays on the impact", and the event-level test (`tests/voice-cues.test.mjs:80-84`) can't see this.

**Fix.** Add `dad_catchphrase` to `SCRIPTED_VOICE`, or pass `options.wait`. Add a voice-queue test with a sounding `dad_call_02` at impact time.

### R4 — P2 · Claims that don't match the pushed code
- **"192/192 green"**: see the `npm test` result above.
- **"At 60 Hz the stages were 166.4 / 196.8 / 210.2 s"**: `tools/bot-sim.mjs adventure 60` is deterministic and gives **166.4 / 182.4 / 214.1 s** on this head. That is still inside 140–240 s; 30 Hz gives 163.1 / 187.9 / 201.2 s. S2 and S3 differ from the claim, which again suggests the author measured a different working tree.
- **"Dead FX.slowmo / FX.hitstop removed"**: `src/fx.js:5,51,57` still sets both, and `fx.js` isn't in the diff.
- **"Snowball knockback follows travel"**: `src/campaign.js:364` is unchanged from the base. It is still `hurtBob(false, p.x)`, so a snowball that has already moved past Bob's x in the step pushes him back toward the thrower.
- **"One rotate listener" / "Perf meter is kept"**: these can't be verified, because the code is the missing part from R1. The per-frame `syncRotatePause(this)` was removed from `update` (`src/game-scene.js:192`), so until R1 lands there is no rotate pause at all.

Please correct the PR body and `docs/OVERNIGHT-STATUS.md` once R1 is pushed.

### R5 — P2 · Any same-origin uncaught error during play raises a full-screen "stopped running" card
`onError` (`src/recovery.js:83-88`) trips `showStuck` on the first uncaught error once gameplay has started, even if the loop is still running. A one-off throw in an audio callback or a DOM handler covers a perfectly playable stage, and the only way out is a reload.

Errors with an empty `filename` also trip it, because the origin filter requires `event.filename` to be truthy (`:86`). The classic cross-origin "Script error." has an empty filename.

**Fix.** On error, check again a frame or two later: only show the card if `beat` has stopped, or if the error repeats.

### R6 — P3 · The asset-failure copy is wrong after the title
`fail(..., 'assets')` is now allowed after `ready()` (`src/startup.js:20`), but the copy still says "The game stopped before the title screen…" (`src/startup.js:12`). That is wrong for a stage-2/3 file. Separately, `game-scene.js:56` rewrites `#boot` text to "Could not load chapter", but `fail()` hides `#boot` straight away (`src/startup.js:25`).

### R7 — P3 · The Reload button now has two click handlers
`startup.js` keeps its `reload` listener (`src/startup.js:41,58-59`), and `showStuck` adds a second one on every call (`src/recovery.js:31`). Both call `resumeGame` → `location.replace(sameUrl)`, so the result is the same either way. Still, it's worth guarding with `{ once: true }` or a flag before a third caller appears.

### R8 — P3 · `checkpoint.wingHp` is correct only because respawn always overwrites it
`wingmen.update` advances `checkpoint.phase` (`src/wingman.js:71`) but leaves `checkpoint.wingHp` from the previous phase in place. It never reaches a Wingman, because `respawn()` re-snapshots before `startBoss(cp.phase)` (`src/campaign.js:240-243,258`). But any future caller of `startBoss(phase)` on the boss zone would apply phase-N HP to phase N+1 Wingmen. Clear `wingHp` when the phase advances, or key it by phase.

### R9 — P3 · `grabPunish` is a one-way handoff only the campaign consumes
`Bob.update` sets `grabPunish` (`src/bob.js:48`), and only `Campaign.update` clears it (`src/campaign.js:334`). Any other driver of `Bob.update` (tests, future sims) keeps a stale reference to the grabber. A return value, or a callback passed into `update`, would be cleaner. This is low risk today.

### R10 — P3 · Small per-frame allocations remain in the HUD
`bossBars` + `bossBarLayout` allocate two filtered arrays and a mapped array every frame (`src/hud.js:7-21,55`). `setText`/`setVisible` on `w1`/`w2` are already cheap no-ops when nothing changed. This is not measurable on its own, but it belongs in the same K6 bucket that P3-12 set out to clear.

---

## Test gaps

- **T1 — Nothing catches the missing files.** Add CI, even just `node --test` on push, so a red `boot.test.mjs` blocks the claim. Running locally from a dirty tree hid R1.
- **T2 — No full-stage Nightmare S1 test.** `tests/nightmare-clear.test.mjs` adds S2 and S3. S1 clears in the bot sim (210.6 s, 4 deaths) but isn't pinned.
- **T3 — No freeze-guard test for preload or stage restart** (R2), and none for "an error while the loop keeps beating" (R5).
- **T4 — The catchphrase is tested only at the event level** (R3). There is no `say()`-level test with a line already sounding.
- **T5 — The P3-12 tests that the count implies** (shot-feel shapes and recoil, `bindRotatePause` listener count, `noteRenderer` not clobbering `window.__perf`) are absent.
- **T6 — The `wingHp` carry-over is tested for phase 2 only.** Phase III with two Wingmen, the floor of 1 and a dead Wingman stored as 0 → revived at 1 is untested (`src/campaign.js:141-142`).

## Performance

There are no regressions in the pushed code:
- The freeze guard is a 1 Hz interval.
- `bless()` returns early after the first call.
- The touch-label cache removes two DOM writes per frame (`src/hud.js:72-80`).
- Papi scheduling is O(visible enemies) once per activation.

The per-frame `matchMedia` call is gone from `update`, but its replacement is missing (R1).

## Suggested order before merge

1. Push the missing P3-12 files and tests (R1), then run `npm test` on a clean clone.
2. Fix the preload false positive in the freeze guard (R2) and soften the error trip (R5).
3. Make `dad_catchphrase` wait instead of being dropped (R3).
4. Correct the PR body and status doc (R4).
