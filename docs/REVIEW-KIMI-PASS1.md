# Kimi review — Pass 1 (Grok 4.7) draft PR #1

**Branch/commit:** `bdb-pass1-grok` @ `97d9861` (vs base `bdb-scroll` @ `8c53d59`)
**Date:** 2026-10-28 · **Reviewer:** Kimi (read-only; no game code touched)
**Method:** full read of the PR diff (14 commits, +1269/−61 across 30 files) plus the surrounding code it touches; every FIX-LIST claim re-verified against source; locked rules re-checked; `npm test` run (**143 pass, 0 fail**, node v22.23.4 — note `engines` asks for ≥24 but the suite is green anyway). Cutscene/voice clip durations measured from the actual assets with ffprobe.

## Score: 8/10

The pass lands what it claims, proves it with tests, and breaks nothing I can find. Every P0 is genuinely fixed with a mechanism (not a workaround), K1/K2 are correctly fixed at the right layer, the locked rules are intact, and the new tests are real: the cutscene cap test parses `mvhd` durations out of the actual mp4s, the Nightmare test drives the unmodified bot through both zone 5s, and the voice test pins the locked wording verbatim. No regressions, no aiming, no shop, no reworded lines, no deploy.

Two points off: one real functional bug in the new voice wiring (queued lines are silently dropped whenever the line they follow runs longer than the 2.5 s wait budget — measured, not theoretical: it eats `claudia_leave` after every victory and the stage-start where-bark on every stage), and a tail of small robustness/polish items (governor can still throw pre-gameplay, the Choirmaster boss can be lane-shoved by his own adds, dead FX state, per-frame `matchMedia`). None are ship-blockers; all are listed below with locations.

**Locked rules verified intact:**
- Eggplant fires straight, no aiming: `src/eggplant.js` untouched by the PR; `createShot` sets `vy: 0` (`src/eggplant.js:4`) and `stepShot` re-zeroes it every step (`src/eggplant.js:15`). The new `fire` event payload is muzzle position only and a test asserts `fire.data.vy === undefined` (`tests/feel.test.mjs:58-68`).
- Bob left third: `CAM_LEAD = 0.28` unchanged (`src/config.js:4`), `src/camera.js` untouched, respawn still uses `cp.x - VW*0.28` (`src/campaign.js:221`).
- No upgrade shop: no shop/upgrade code anywhere in `src/` or `index.html`.
- Quoted lines exact: `src/voice-lines.js` untouched; the newly wired lines match `docs/BOB-LINES.md` ("I brought the eggplant.", "Die, Yetti, die!", "Ha! Dead!", "I'm back, baby!", "Dad! Now!", "Need the ladies!", "Not now, ladies!") and `tests/voice-cues.test.mjs:11-28` pins them. Retired produce line is gone from `#victory` (`index.html:75`). Dad-likeness assets are not touched by this PR.

---

## Fix-by-fix verification

| Item | Verdict | Evidence |
|---|---|---|
| **P0-1** intro truncated at 30 s | **Fixed, correctly** | `createStoryPlayer` passes `maxMs: STORY_MAX_MS` (90 s) (`src/cutscene-hooks.js:5`, `src/cutscene.js:25`); both the `visMs` cap and the `Math.max(maxMs, …)` stall ceiling become 90 s (`src/cutscene.js:203-210`). Measured durations: intro_v3 61.6 s, intro_v2 72.3 s, all others ≤10 s — every clip fits. `tests/cutscene-cap.test.mjs` parses real `mvhd` atoms and asserts the longest clip exceeds the old 30 s cap, so the regression test cannot silently pass on a short clip. The stale comment Kimi flagged is rewritten (`src/cutscene.js:56`). |
| **P0-2** Nightmare zone-5 wall | **Fixed, correctly** | Two mechanisms plus mercy, no aiming. (a) `MAX_RANGED_PER_LANE = 2` (`src/yettis.js:26`): spawns park on a freer lane (`src/campaign.js:96-103`) and `stepRangedLane` walks a third ranged body out of a piled lane with a deterministic two-stay ordering (`src/yettis.js:55-73`); a 300-frame no-repile test holds. (b) Third death in a zone grants mercy — Dad charge (or a shake trio before he is unlocked) (`src/campaign.js:213-216`, `src/dad-call.js:34-43`), tested for nightmare-only, exact-third-death, per-zone reset (`tests/nightmare-clear.test.mjs:63-90`). Bot clears S2 and S3 zone 5 with zero lane overflow (`tests/nightmare-clear.test.mjs:115-122`). Adventure clear band 140–240 s still enforced and green at 30/60/120 Hz (`tests/campaign-sim.test.mjs:2`). |
| **P0-3** death anims never play | **Fixed, correctly** | View-side corpses: 0.5 s knockdown hold, 0.18 s fade (`src/corpses.js`), wired into `syncViews` (`src/game-scene.js:106-115`) with a `hurt` fallback when a role lacks `knockdown`, corpse shadow fading via the existing `Fighter.sync` dead path. Bob's own view is never corpse-ified (`src/game-scene.js:108`). Pure-logic tested (`tests/corpses.test.mjs`); see gap G2. |
| **P0-4** wire `FX` | **Fixed, correctly** | `new FX(this)` in `create` (`src/game-scene.js:62`), per-frame `fx.update` + `shakeOffset` applied to the camera scroll (`src/game-scene.js:189`), `hit`/`ko`/`hurt`/`dadhit`/`fire` all routed (`src/game-scene.js:167-180`), and `destroy()` on scene shutdown releases particle managers and lights (`src/fx.js:86-93`, `src/game-scene.js:68`). New `muzzle`/`splat` (`src/fx.js:41-47`). |
| **P0-5** portrait escape | **Fixed, correctly** | Media query is now `@media (orientation:portrait) and (hover:none) and (pointer:coarse){#rotate{display:flex}}` with no `body:not(.playing)` qualifier, so the overlay covers gameplay on a portrait phone (`index.html:46`); the letterbox hint is deleted; `#rotate-start` shows on the title and hides once `.playing` (`index.html:45`). Sim side, `syncRotatePause` adds the `rotate` pause reason only when the block flips, so input is not cleared every frame (`src/rotate-block.js`, `src/game-scene.js:183`; `tests/rotate-block.test.mjs`). Desktop portrait windows are deliberately unaffected (requires coarse pointer + no hover). |
| **K1** kidnap runs live under video | **Fixed, correctly** | `handleEvents()` moved after the stage-change/restart check in `update` (`src/game-scene.js:185-188`), and the new scene drains the queued events once in `create` after `syncViews` (`src/game-scene.js:69`), so the `cutscene` pause lands on the stage-2 scene. Tested end-to-end with a mocked scene (`tests/stage-cutscene.test.mjs`). |
| **K2** skip also toggles pause | **Fixed, correctly** | `installPressOwnership(g.inp)` in `preBoot` (`src/main.js:54`); the story key handler calls `consumePress(input, action)` (`src/cutscene-hooks.js:6`), which deletes the already-recorded `buf`/`held`, blocks the physical key until release, and stops propagation. Tested at the Input level (`tests/press-governor.test.mjs:20-31`). |
| **P1-1** tiered hit-stop + latched presses | **Fixed, correctly** | `hitTier` maps chip/bonk/KO/boss-gate → light/medium/heavy/finisher (`src/campaign.js:21-27`), applied with `Math.max` so tiers never stack (`src/campaign.js:145-157`). During the freeze the scene now passes `inp.snapshot()` instead of `{}` (`src/game-scene.js:186`) and the sim latches jump/dash/fire/papi/dad (`src/campaign.js:253-268,281-282`). Covered by `tests/feel.test.mjs:44-56` including "the freeze itself does not fire". |
| **P1-2** muzzle/recoil/splat | **Fixed, correctly** | `fire` carries `{x, y, dir}` (`src/campaign.js:305-308`); the view flashes, sparks, splats, and recoils (`src/game-scene.js:167, 72-77`). Recoil is view-only — sim x is untouched, `vy` stays 0. |
| **P1-3** same-frame `say()` kills narration | **Fixed, correctly (with caveat F1)** | `setVoicePolicy(narrationYields)` installed in `create` before `handleEvents` (`src/game-scene.js:66`), and `say()` only consults the policy while a line is actually sounding/loading (`src/audio.js:454-458`), so idle-time lines are unaffected. Cory/Yetti rolls are gated to one per second (`src/campaign.js:289-294`; `tests/voice-policy.test.mjs:14-27`). Caveat: the 2.5 s queue budget drops lines behind longer narrations — see F1. |
| **P1-4** wire remaining registered lines | **Fixed, with one functional hole (F1)** | All emit paths verified: `bdb_open` + `nar_intro_01-03` armed at stage-1 load (`src/campaign.js:55-60`), `claudia_open/question/leave` (`src/campaign.js:61,123,277`), produce on bonk, laugh on KO, hurts, Dad call ×3/done ×2, Papi wait/chorus, choir, turn-back (`src/yettis.js:172`), wingman defeat once (`src/wingman.js:82-84`), `nar_victory`. Every id exists in `LINES`; wording byte-identical. Hole: `claudia_leave` is emitted but functionally dropped — F1. |
| **P1-6** duck music + hold VO during clips | **Fixed mechanism, same hole** | `startHeldClip` fades music out, stops scene audio, pauses, holds arriving voice, releases on done, and a synchronous skip releases before the next event (`src/game-scene.js:147-154`; `tests/clip-hold.test.mjs`). Music correctly restarts on the boss track after `rescue_pre_boss`. Held lines then hit the queue-expiry bug — F1. |
| **P1-7** quality governor | **Fixed for gameplay; one latent edge (F2)** | Installed at boot (`src/main.js:56`), called per gameplay update (`src/game-scene.js:191`), `runId`/`setBloom`/`setBackdropLit`/`fx` now exist so `applyLevel` cannot throw in-game; software renderer downgrades to level 4 without throwing (`tests/press-governor.test.mjs:41-63`); per-restart tier reapply works via `runSeq`. `recovery.js` still unwired — disclosed in the PR, not claimed. |
| **P1-9** lane/dash/land dust + SFX | **Fixed, correctly** | `stepDust` (`src/game-scene.js:78-90`): timed step puffs + `sfx.step` for walk/dash, lane-change dust via band tracking, `sfx.land`/dust on landing, `sfx.jump` on takeoff. |
| **P1-14** Claudia freed on victory | **Fixed, correctly** | Cage destroyed and `claudia_freed` played (`src/game-scene.js:155`); the anim exists in `assets/chars/claudia.anims.json` (test asserts it); produce line removed from `#victory`. |
| **P1-20** red boot test | **Fixed, correctly** | Origin check strips an optional `.git` and a token user, still origin-only (`tests/boot.test.mjs:36-44`). Suite is 143/143 green. |

Deferred as advertised (spot-checked they are indeed untouched): P1-5 dad clip keys/bless, P1-8 knockback slide (though see note 4 below), P1-10–P1-13, P1-15–P1-19, P2 — including K3 stale `camMax`, K4 "Nightmare unlocked" on replays (`src/game-scene.js:161`), K5 `setRain`, K6 per-frame DOM writes, K7 `console.warn` spam (`src/fighter.js:16`).

---

## Findings (prioritized)

### F1 — P1 · Queued voice lines are silently dropped whenever the preceding line outlasts the 2.5 s wait budget — eats `claudia_leave` every victory and the stage-start where-bark every stage
`src/audio.js:435-439` (`playQueued` shifts and discards any entry whose `until` has passed), `src/audio.js:457` (budget = `options?.wait ?? voicePolicy(...)` = 2.5 s), `src/game-scene.js:145` (`playHeld` uses fixed `{wait: 2.5*i}`), `src/campaign.js:54,63,277`.
The policy/queue mechanism is correct, but the budget is absolute while the lines it waits behind are long. Measured from the shipped mp3s: `nar_victory` **3.94 s**, `nar_ch1/2` **3.34 s**, `nar_intro_01-03` **4.5–5.4 s**. Two concrete losses:
- **Victory:** `presentVictory` → `playHeld([nar_victory, claudia_leave])`. `claudia_leave` is queued with a 2.5 s budget; `nar_victory` plays 3.94 s; the queue entry expires and is dropped without playing or captioning. P1-4's "claudia_leave has an emit path" is true at the sim level and false in practice.
- **Every stage start:** `loadStage` emits `nar_chN` then the `barkWhere` line in the same frame (`src/campaign.js:54,63`). The bark queues behind a 3.3 s narration with a 2.5 s budget and is dropped — the "Where is Claudia???" bark never plays at stage entry. (This specific drop is the intended P1-3 trade-off writ large; the victory one is plainly unintended.)
Not a regression — pre-PR these lines were interrupted or never emitted — but it undercuts the P1-4/P1-6 "lines now play" claim for every multi-line sequence. Suggested direction (not applied): derive the wait from the current line's remaining duration (or chain on `voiceBusy`) instead of a fixed 2.5 s, and add a test that a held two-line sequence actually reaches `say()` for both lines.

### F2 — P2 · `keepLoweredQuality(true)` still throws before the gameplay scene's first `create()`
`src/quality-governor.js:60-67,80` (`applyLevel` writes `st.fx.quality` unconditionally), called from `src/graphics-lifecycle.js:50` on `restorewebgl`.
`st.fx` only exists after `GameScene.create` (`src/game-scene.js:62`). A WebGL context loss+restore on the title screen (before any gameplay) reaches `applyLevel` with `st.fx === undefined` and throws. The throw is swallowed by the lifecycle's try/catch, so nothing crashes, but the intended immediate downgrade is silently skipped — it only self-heals on the first `game.governor()` call once gameplay starts (stored floor reapplied). Low impact, but it is exactly the "installing it today throws" class Kimi flagged on the base; the fix covers gameplay, not the title. Guard `st.fx &&` in `applyLevel` (and add a pre-gameplay test) when convenient.

### F3 — P2 · The Choirmaster boss can be lane-shoved by his own adds
`src/yettis.js:25` (`RANGED_TYPES` includes `choirmaster`), `src/yettis.js:189` (boss runs `stepRangedLane`), `src/yettis.js:68` (`Math.max(speed, 160)` moves even a speed-0 body at 160 px/s).
When two ranged adds (phase-3 summons include guard+hover) share the boss's lane, the stationary Choirmaster — sorted rightmost — is the one elected to slide to another lane. Bounded (lane-clamped, ~0.37 s per lane) and arguably fine visually, but it is a boss-presentation change that was never called out, is untested, and interacts with phase-3 add top-ups continuously. If unintentional, exclude `e.boss` in `stepRangedLane`'s mover (keep him only as a counted body). Watch item for the next device pass.

### F4 — P2 · Dead FX state: `fx.hitstop` and `fx.slowmo` are written, never read
`src/fx.js:51,57` — nothing outside `src/fx.js` references them (`grep` confirms). Hit-stop correctly lives in the sim (`campaign.js`) per the `muzzle` comment, so this is harmless, but it invites a future reader to think slow-mo/freeze are view-driven. Either wire or delete.

### F5 — P3 · Per-frame `matchMedia` allocation in the update loop
`src/game-scene.js:183` → `src/rotate-block.js:6`: a new `MediaQueryList` is constructed every frame, forever. Small but permanent GC churn on the target device (iPhone). Cache one MQL (and its `change` event) per scene.

### F6 — P3 · Lane constants now live in three places
`src/game-scene.js:85` hardcodes `(b.y-572)/59`; `src/yettis.js:27` defines `LANE_H = 59`; `src/config.js:5` owns `LANE_TOP/LANE_BOT`. All consistent today; drift breaks dust bands and lane math silently. Import, don't restate.

### F7 — P3 · Mercy charge can be unusable in the boss phase it was granted for
`src/dad-call.js:36-42` restores a charge but does not touch `phaseCalls`; `src/dad-call.js:24` refuses a second call in the same boss phase (`why: 'phase'`). Nightmare boss-arena death #3 after already using Dad that phase → banner says "MERCY. DAD'S BACK ON THE LINE." (`src/campaign.js:225`) but the call refuses with "DAD'S ON HIS COFFEE BREAK." Edge-casey (requires a spent phase call plus three deaths), but the banner then lies. Either reset the phase entry or pick the 'breath' fallback in that state.

### F8 — P3 · Cosmetic nits
- Stage-2 music starts in `create` (`src/game-scene.js:66`) and is faded out a tick later when the queued kidnap event runs `startHeldClip` (`src/game-scene.js:148`) — a sub-second music blip at every stage-2 entry.
- Mercy banner overwrites the checkpoint banner in the same tick (`src/campaign.js:224-226`).
- Kill impacts fire `fx.splat` twice (once for `hit`, once for `ko`) and `sfx.hit` plays light for the `hit` then heavy for the `ko` (`src/game-scene.js:180`) — pre-existing stacking, now louder with FX wired.
- Note: `hurt` now drives `fx.impact('medium')` (`src/game-scene.js:169`) — a small, unadvertised slice of the deferred P1-8 (trauma without the knockback slide). Feels fine; flagging only because it overlaps a deferred item.

## Test gaps
- **G1 (would have caught F1):** nothing exercises the real `say()` queue with two sequenced lines and asserts both play — clip-hold tests mock `story.play` and stop at the hold/release boundary; voice-policy tests assert `narrationYields`' return values, not queue survival.
- **G2:** corpse timing is only tested as pure `stepCorpse` logic; the `syncViews` integration (view survives 0.5 s, plays knockdown once, fades, destroys) has no test — the most Phaser-coupled new code has the least coverage.
- **G3:** mercy `'breath'` branch (Dad not yet unlocked, e.g. stage 1 nightmare zones 1-2) is untested; only the `'dad'` branch is.
- **G4:** Choirmaster lane-slide (F3) untested; the no-repile test uses minions only.
- **G5:** rotate block is string-matched in `index.html` and unit-tested as `syncRotatePause`, but the CSS-driven overlay + pause on a real orientation flip is only covered by `tools/browser-smoke.mjs`, outside `npm test`.
- **G6:** governor pre-gameplay path (F2) untested — the software-downgrade test seeds `st.fx` from the start.

## Not verified here
Browser/device behavior (iOS Safari gesture/bless flow, actual portrait hardware, real gamepad), and the visual quality of the new FX (muzzle/recoil/splat/dust) — both need a device pass; the sim-side contracts behind them are tested and green. `tools/browser-smoke.mjs` was updated for the new media query but was not run here (needs a browser).

## Bottom line
Take the merge after F1 is understood (it's a one-line-budget design choice with a visible content loss) — everything else can ride follow-ups. The pass is honest: its deferral list matches the code, its test claims are reproducible, and the locked rules held under direct attack (aiming, shop, line rewording, portrait escape). 143/143 green.
