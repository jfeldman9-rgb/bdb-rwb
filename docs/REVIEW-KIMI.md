# Kimi review — Big Dick Bob (Riley Wheel Brawl engine)

**Branch/commit:** `bdb-scroll` @ `e99c7b0` (docs: overnight review gate)
**Date:** 2026-10-28 · **Reviewer:** Kimi (read-only; no game code touched)
**Method:** full read of all 54 files in `src/` + `index.html`, dead-code/wiring sweep, sim traced by hand (spawn → zone lock → boss → respawn → victory), `npm test` run.

## Score: 6/10

Solid bones, real ship-blockers still open. The architecture is the best thing about the build: one fixed-step sim shared by Phaser and the headless bot (`campaign.js`), a correct RWB-style lead camera with monotonic `camMax`, per-wave checkpoints that survive death, a genuinely careful iOS cutscene player (stall watchdogs, muted-autoplay fallback, element reuse for sound blessing), and a hand-rolled audio engine whose lifecycle (suspend/resume/context teardown) is more robust than most shipped web games. Tests are 119/120 green.

What holds the score at 6: every P0 from the existing gate is still present and verified below; the feel layer (`fx.js`) is 77 lines of finished code wired to nothing; the quality governor — the main iPhone safety net — is not installed *and would crash if installed today*; and I found a new stage-transition bug where the kidnap cutscene plays while the stage-2 sim runs live underneath it, keyboard-steerable, Bob can be hit and die behind the video.

**Locked rules respected:** nothing here proposes aiming the eggplant (`vy=0` stays), rewording any quoted line, or changing Dad's likeness.

---

## P0 — ship blockers

### P0-a. Intro `intro_v3` is hard-killed at 30 s of a ~62 s clip — `src/cutscene-hooks.js:3`, `src/cutscene.js:55-56,200-203`
`createStoryPlayer` passes `maxMs:30000`, so `capMs=30000` and `tick()` calls `next(r,'timeout')` once 30 s of *visible* time elapses. Even without the cap, the stall guard at `src/cutscene.js:208` computes `Math.max(this.maxMs, 0)` = 30 s because `capMs !== null` disables the duration-aware branch. The comment at `src/cutscene.js:55` ("Intro/stage clips keep the old behaviour") is wrong — stale.
**Fix:** in `cutscene-hooks.js` pass `maxMs: Infinity` (non-finite ⇒ `capMs=null`, and the `Math.max` guard becomes duration-based: `v.duration*1000+5000`). Keep the stall/start watchdogs as the real guards. Then add a test asserting every clip in `STAGE_CLIPS` finishes under the effective cap.
*Confirms FIX-LIST P0-1.*

### P0-b. Enemy death animations never render — `src/game-scene.js:71,80`
`syncViews` builds the live set from `w.enemies.filter(e=>e.alive)` and destroys every view not in the set, so a view is destroyed the same frame `alive=false`. `roleAnim` maps `dead → knockdown` (`src/game-scene.js:21`) but that path is unreachable for enemies. KOs pop out of existence; the `ko` particles are the only feedback.
**Fix:** keep a corpse for ~0.5 s: sim-side, keep dead enemies in `w.enemies` with a `deadTime` countdown before filtering them out of updates (cheapest, view code already maps `dead`); or view-side, on removal play `knockdown`, fade alpha over 0.45–0.6 s, then destroy. Reuse the existing `Fighter.sync` dead-shadow path (`src/fighter.js:43`).
*Confirms FIX-LIST P0-3.*

### P0-c. The entire feel rig (`src/fx.js`) is dead code — zero importers
`grep` confirms nothing imports `fx.js`. So: no tiered hit-stop (sim hardcodes `this.hitStop=4/60` for every hit at `src/campaign.js:121`; the `HITSTOP` light/medium/heavy/finisher table at `src/config.js:10` is only referenced by the dead file), no trauma shake, no sparks/dust, no impact lights, no bloom quality tier. This also blocks P1-1/P1-2/P1-8 and the governor (P1-f below).
**Fix:** instantiate `FX` in `GameScene.create`, call `fx.update(dt)` + apply `fx.shakeOffset()` to the main camera each frame, and route `hit`/`ko`/`hurt`/`dadhit` events in `handleEvents` to `fx.impact(...)` with tiers (bonk=medium, ko=heavy, dadhit=finisher).
*Confirms FIX-LIST P0-4.*

### P0-d. Nightmare math still walls at zone 5 — `src/yettis.js:5`, `src/stage2-def.js:2`, `src/stage3-def.js:2`, `src/eggplant.js:1`, `src/campaign.js:36-37`
Verified numbers: every stage uses `hpScale: 2.2`, so a guard has `48×2.2 ≈ 106` hp. Nightmare damage scalar 0.8 ⇒ `12×0.8 = 9.6` per eggplant ⇒ **12 hits per guard** (bonk or shot), while pace compounds `1.22 × stage pace` up to the 1.25 cap and zone-5 waves stack guard+choir+lecturer+charger. Ranged overlap is unbounded: every guard/hover/choir lobs independently, so halo/snowball density scales with wave size.
**Fix:** keep `vy=0` (locked); thin ranged overlap (cap in-flight hostile projectiles per lane, e.g. 2 — `campaign.js` already owns `this.hostile`), add mercy (per-stage Dad charge reset after N deaths), and add a Nightmare bot-clear test to `tests/` so the 140-death wall is measurable in CI.
*Confirms FIX-LIST P0-2.*

### P0-e. Portrait escape still strands phone players — `index.html:46`
`@media (orientation:portrait) and (pointer:coarse){body:not(.playing) #rotate{display:grid}}` — the rotate overlay is suppressed forever once `body.playing` is set (`src/game-scene.js:61`). A player who starts letterboxed and never rotates gets a ~40%-height canvas with the FIRE cluster at the edge and is never re-prompted; rotating mid-fight does nothing either.
**Fix:** RWB policy: block portrait gameplay — drop the `body:not(.playing)` qualifier so the overlay reappears over gameplay in portrait (it already pauses nothing, so pair it with `setPauseReason('rotate', ...)`), or at minimum re-show it between zones.
*Confirms FIX-LIST P0-5.*

---

## P1 — major functional / logic

### P1-a. NEW: stage-transition cutscenes lose their pause — sim runs live under the kidnap video — `src/campaign.js:43`, `src/game-scene.js:129-130,43`
`loadStage(2)` emits `cutscene:'kidnap'` from inside `w.update()`. Back in `GameScene.update`, `handleEvents()` (line 129) runs *before* the stage-change check (line 130): it sets `setPauseReason('cutscene',true)` on the **old** scene and starts the video — then `scene.restart()` fires and the new scene's `init` builds a fresh empty `pauseReasons` set. Result: the full-screen kidnap clip plays while stage 2 runs unpaused beneath it. Movement keys aren't skip actions (`SKIP_ACTIONS`, `src/cutscene.js:22`), so arrows/WASD invisibly steer Bob into the zone-1 trigger (`at:260`, only 80 px from spawn) — Yettis spawn, approach, and can kill Bob behind the video. Touch is covered by the overlay; keyboard and gamepad axes are not.
**Fix:** deliver transition-time events to the *new* scene: on `w.stageNo !== this.stageNo`, don't drain `world.events` in the dying scene — leave them queued and have `GameScene.create` call `handleEvents()` once after `syncViews()`. Alternative minimal fix: move `handleEvents()` after the transition check and re-emit pending events post-restart.

### P1-b. Quality governor + recovery are unwired — and wiring them today crashes — `src/main.js:50-58`, `src/quality-governor.js:81-84`, `src/recovery.js`
`bootGame` never calls `installGovernor` (nor `installResumeCleanup`/`showStuck` from `recovery.js` — the freeze-guard Reload card can never appear). Worse, `applyLevel` touches `st.fx.quality`, `st.setBloom`, `st.snowFront`, `st.setBackdropLit`, `st.kit`, `st.runId` — **none of which exist on `GameScene`** — so the first downgrade throws mid-frame. The context-loss floor (`game.keepLoweredQuality`, called from `graphics-lifecycle.js:41,50`) is silently a no-op.
**Fix:** land `FX` first (P0-c), add `setBloom`/`setBackdropLit`/`runId` to `GameScene` (stubs are fine), then `installGovernor(game,{q,rs0:RS0,vw:VW,vh:VH,meter:perf,floor:readQualityFloor()})` in `bootGame` and call `game.governor()` once per gameplay update. This is the main iPhone thermal/long-session safety net — without it a hot iPhone has no downgrade path, only context loss.
*Confirms FIX-LIST P1-7, with new blocking evidence.*

### P1-c. Voice stack: same-frame `say()` cancels and the policy hook is never installed — `src/campaign.js:42-44,66-67`, `src/audio.js:418`
`loadStage` emits `nar_ch${stage}` and (because `barks.whereAt` starts at `-1e9`) immediately emits a `bob_where_claudia_*` bark in the same frame; `handleEvents` drains both, and the second `say()` interrupts the first — chapter narration dies milliseconds in. `spawnWave` does the same with where/wave barks. `setVoicePolicy` + the queue machinery (`src/audio.js:418-447`) exist and are never called. Bark cadence makes it worse: `barkYettiTaunt` rolls 12% **per frame** after a 7 s cooldown (`src/barks.js:56-60`) ⇒ ~99% chance to fire within a second of every cooldown, i.e. a taunt every ~7 s of combat, each one interrupting whatever is playing.
**Fix:** install a policy in `GameScene.create` — `setVoicePolicy((id,cur)=>/^nar_/.test(cur)?2.5:0)` (queued behind narration, dropped otherwise) — and make bark chances per-second (`rng() < chance*dt*60`-style normalization) or raise cooldowns. Do not reword any line (locked).
*Confirms FIX-LIST P1-3; the 7-second taunt loop is new evidence.*

### P1-d. ~25 of 49 registered lines are never emitted — `src/campaign.js`, `src/voice-lines.js:5-24`
Emissions traced across `campaign.js`/`game-scene.js`: `bdb_open`, `bdb_produce`, `bdb_laugh`, all `claudia_*`, `yetti_turnback`, `choir_serious`, `dad_call_01-03`, `dad_done_01-02`, `papi_chorus`, `bob_papi_01`, all `bob_hurt_*`, `bob_dadwait_01`, `bob_papiwait_01`, `wingman_defeat`, `nar_victory`, `nar_intro_01-03` have no `emit('voice', …)` path (some live inside video audio, but the Jason-mandated Bob barks and hurt lines have no trigger at all).
**Fix:** wire triggers — hurts on `takeHit`, `bdb_produce`/`bdb_laugh` on bonk/KO, `papi_chorus` with the papi event, `wingman_defeat`/`nar_victory` in `finishStage`/victory — wording byte-identical to `voice-lines.js`.
*Confirms FIX-LIST P1-4.*

### P1-e. Dad clip: no keyboard skip and no iOS sound bless — `src/dad-call-cutscene.js:75-78`
The dad player is a *separate* `CutscenePlayer` with its own `<video>` element; `bless()` is only ever called on the story player (`src/main.js:33`), so the first D-clip on iPhone falls into the muted/`TAP FOR SOUND` path. And while `scene.cutscene.press(a)` is defined (line 75), no input path calls it — keyboard users cannot skip D1–D3 (tap and gamepad work, via overlay and the tick pad poll).
**Fix:** bless the dad element from the same start-gesture (`Title.begin`), and in `GameScene.update` route `inp` press events to `this.cutscene?.press(a)` before the pause toggle.
*Confirms FIX-LIST P1-5.*

### P1-f. Story clips never duck music; in-scene VO fights the video — `src/game-scene.js:117`, `src/music.js` (unused)
The `cutscene` event handler only sets a pause reason. `MusicDirector` (which has a `cutscene` state with fades) is imported nowhere, and nothing calls `playTrack(null)` or ducks when a clip starts — so stage music + `nar_kidnap` VO + the video's own audio stack up (all three fire the same frame at the stage-2 transition, `src/campaign.js:43`). Only the dad call pauses the game (`src/dad-call-cutscene.js:71-73`); intro/victory leave Phaser rendering at full frame rate behind a full-screen video (battery/heat on iPhone).
**Fix:** on `cutscene` start: `playTrack(null,{fade:1})` (or wire `MusicDirector`), suppress `say()` while a clip is active, and `game.pause()` behind full-screen clips the way the dad call already does. Restore on done.
*Confirms FIX-LIST P1-6 and P1-13.*

### P1-g. Dad can swat off-screen — `src/dad.js:20`, `src/campaign.js:158`
`standX` is only clamped *below* (`Math.max(standX, camX+120)`); with Bob near the right wall, `bob.x+150` lands past `camX+1280` and the entire jog-in/swat happens off-screen while the wipe still resolves.
**Fix:** `this.standX = clamp(standX, camX+120, camX+1180)` (and keep the single swat per the packed atlas; the "second swat" doc note should die).
*Confirms the clamp half of FIX-LIST P1-16.*

### P1-h. Small stuff confirmed with fresh line refs
- **Pad Start does nothing on the title** — `src/main.js:47` takes only `start`/`fire`; `PAD_MAP` sends button 9 to `pause` (`src/input.js:7`). *Confirms P1-15.*
- **Pause/mute touch targets ~30 px** — `#top-buttons button{padding:7px 10px;font-size:12px}` (`index.html:33`), under the 44 pt floor the `.tb` class does meet. *Confirms P1-17.*
- **Opaque 116 px HUD slab + permanent stage title** — `src/hud.js:34` and the scrollFactor-0 `def.title` text at `src/parallax.js:37-39`. *Confirms P1-18.*
- **Fire event carries no muzzle payload** — `this.emit('fire')` at `src/campaign.js:205`, consumed bare at `src/game-scene.js:112`; recoil/flash/splat (P1-2) need `{x,y,dir}` from `fireGun`. *Confirms P1-2's missing hook.*
- **Bob hurt feedback is blink-only** — invulnerability alpha flicker at `src/game-scene.js:78` + `sfx.hurt`; no knockback slide or trauma (blocked on P0-c). *Confirms P1-8.*
- **Papacito kills land before the runners arrive** — `papacitoEffect` zeroes hp at activation (`src/campaign.js:141`) while `PapacitoFX` runners need ~0.5 s to cross (`src/papacito-fx.js:9`); with P0-b the victims also vanish instantly. *Confirms P1-11.*
- **Dad refusal reasons are computed then discarded** — `takeCall` returns `why` (`src/dad-call.js:30`) but every refusal banners "DAD'S ON HIS COFFEE BREAK." (`src/campaign.js:150`). *Confirms P1-10.*

---

## P2 — polish / edge cases

1. **NEW: Escape/Enter skips the cutscene *and* pauses the game underneath** — `src/cutscene-hooks.js:4` vs `src/game-scene.js:126`. The story key handler calls `preventDefault` but not `stopImmediatePropagation`, and `Input`'s bubble listener was registered first (`src/input.js:16`), so the same Escape press is also buffered as `pause` and toggles manual pause mid/post-clip. `src/press-ownership.js` exists to solve exactly this and is never installed. **Fix:** `installPressOwnership(game.inp)` in `bootGame`, or ignore the pause toggle while `pauseReasons.has('cutscene')`.
2. **NEW: respawn camera pop skips the intended walk-up** — `src/campaign.js:170` keeps the stale, larger `camMax` (`Math.max(...)`), so `stepCamera` floors `camX` at the old high-water mark (`src/camera.js:36`) and Bob is clamped ~200 px forward into the zone on his next update (`src/bob.js:70`) instead of respawning at `checkpoint.x`. Harmless but visible, and it silently shortens the post-death walk. **Fix:** on respawn `this.camMax = Math.min(this.camMax ?? Infinity, this.camX)` — death should reset the scroll high-water mark to the checkpoint camera.
3. **NEW: victory screen always claims "Nightmare unlocked"** — `src/game-scene.js:132` prints it unconditionally, including replays after `beaten` is already true. **Fix:** capture `wasBeaten = this.save.beaten` in `finishStage` before `clearStage` (`src/campaign.js:177`) and expose `world.justUnlockedNightmare`; render the suffix only then.
4. **NEW: boss roar/slam render as idle/sing; the fallback masks missing anims** — `roleAnim` has no `roar`/`slam`/`recover` case (`src/game-scene.js:18-37`), so the 1.1 s phase-change roar (the boss's big telegraph beat) plays the idle anim; if a primary anim *is* missing, the fallback (`src/game-scene.js:76-77`) silently substitutes `sing`/`ring`, hiding asset regressions. **Fix:** add explicit `roar`/`slam`/`recover` mappings per type, and make the fallback `console.warn` once per key. Root cause behind the roar half of FIX-LIST P2-10.
5. **NEW: `setRain` is dead — stage 2 has no ambience** — `src/audio.js:359` builds a two-bed rain loop, never called. **Fix:** `setRain(true)` on stage-2 create, `setRain(false)` on other stages and shutdown; or delete the code.
6. **NEW: per-frame DOM writes + array churn on the hot path (iPhone GC/layout pressure)** — `hud.update` does 2× `getElementById` + 2× `textContent` writes every frame (`src/hud.js:38`) even when values are unchanged; `syncViews`/`effects` allocate 5 filtered arrays per frame (`src/game-scene.js:71,93-105`). **Fix:** cache the two elements at HUD construction, gate writes on change, and keep scratch arrays on `this` to reuse.
7. **NEW: `Fighter.play` warns every frame on a missing anim** — `src/fighter.js:16`: the `exists` check runs before the `cur===key` early-out, so one missing atlas anim = 60 `console.warn`/s forever — measurable cost on iPhone Safari. **Fix:** warn-once set keyed by anim name.
8. **All seven music entries stream the same file** — `src/audio.js:196`: `title/stage1/boss1/.../boss3` all point at `bdb-rise.mp3`; boss fights have no musical punctuation. *Confirms P2-5 with the mechanism.*
9. **`streamEl` loop-region math is NaN for every current track** — `src/audio.js:221-222`: `loopEnd-loopStart` is `NaN` (no entry defines them), so the seamless-loop seek never fires; `el.loop=true` covers it, but the handler runs NaN comparisons on every `timeupdate`. *Confirms P2-2; harmless until a track defines loop points.*
10. **Voice PCM is re-decoded every stage for lines the stage never plays** — `preloadClips(stageLines(n))` preloads ~49 clips and `releaseClips` drops them all on shutdown (`src/game-scene.js:62-63`); `stageLines` (`src/voice-lines.js:25`) includes Claudia/Dad/narrator lines irrelevant to early stages. *Confirms P2-12.*
11. **Known red test reproduced** — `npm test`: 119/120 pass; the failure is `tests/boot.test.mjs:32` "git has no remotes" asserting `git remote -v` is empty while `origin` exists. *Confirms P1-20.*
12. **Suggested list hygiene:** close **P2-1** (`audio:{noAudio:true}` at `src/main.js:52` already disables Phaser's audio stack entirely — stronger than `disableWebAudio`), and consider downgrading **P1-12**: `summonAdds` tops up to a fixed count (`src/campaign.js:100-103`), so the Choirmaster's timer + telegraph + roar summon paths can't overrun the arena — the double-add is currently cosmetic.

---

## Verified healthy (no action)
- Fixed-timestep loop with 0.1 s clamp degrades to slow-motion instead of a death spiral (`src/game-scene.js:124-128`) — right choice for iPhone hitches.
- Checkpoint/wave/boss-phase respawn logic round-trips correctly, including mini-boss `bossHp` carryover (`src/campaign.js:162-174`); the wingman softlock guard re-drops shake trios when the finisher is ready and Bob is dry (`src/wingman.js:75-79`).
- Audio lifecycle: suspend/resume on hide, media-element pause, epoch-guarded async decodes, and full teardown in `disposeAudio` are correct and leak-free by inspection.
- Cutscene player: stall/timeout watchdogs, muted-autoplay fallback with re-bless on tap, per-clip skip guards, and video-element teardown are all sound (the 30 s cap above is a config bug, not a player bug).
- Locked lines in `src/voice-lines.js` match `docs/BOB-LINES.md` verbatim; `GUN` keeps `vy=0`; eggplant bonk-vs-shot logic and guard shield shatter (3 hits) work as documented.
