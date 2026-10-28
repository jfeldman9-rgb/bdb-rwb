# BDB code review — Claude (read-only)

- **Branch / commit:** `bdb-scroll` @ `51b6de6`
- **Reviewer:** Claude Opus 5.5 (`claude-opus-5-5`), 2026-10-28
- **Compared against:** Riley Wheel Brawl, `/workspace/rwb-s8`
- **Scope:** read-only. The only file written is this doc. Nothing committed.

**How this was checked:** I read every gameplay, scene, audio and cutscene module. I ran `node --test tests/` (119/120 pass) and the headless bot (`tools/bot-sim.mjs`) on Story, Adventure and Nightmare. I also wrote two throwaway scripts in `/tmp` to reproduce findings: a Nightmare death-location probe and a CutscenePlayer timing harness. Findings marked **[verified]** were reproduced or traced end-to-end. Findings marked **[plausible]** come from reading code, mostly iOS behaviour I can't run here.

---

## 1. Executive score: **6 / 10** (against the RWB bar)

BDB's core is clean and well-tested in its pure modules:

- The deterministic `Campaign` sim is shared by Phaser and the bot.
- Eggplant shots fire straight.
- Bob is kept in the left third of the screen.
- Respawn keeps progress.
- Chapter pacing is capped.
- The packaging for iPhone is careful: ASTC/ETC2 KTX atlases, character residency per stage, and a reusable `<video>` element.

Adventure and Story both clear in the RWB time range.

It falls short of RWB in four ways:

1. **The opening is broken.** The intro video added in the last few commits is cut off at 30 s of its 61.6 s.
2. **The voice layer mostly doesn't work as written.** Same-frame lines interrupt each other, so the chapter narration is never heard. About 22 recorded lines are never triggered, including Jason's two required Bob lines.
3. **Several RWB safety systems were copied but never connected:** the quality governor, freeze-guard recovery, press ownership, and the Dad-clip sound unlock and keyboard skip.
4. **Nightmare is not validated.** The bot cannot clear Nightmare Stage 2 or 3; it dies 140 and 108 times in 30 minutes. No test covers Nightmare.

RWB has about 22k lines of source and 262 test files. BDB has about 3.7k lines and 20 test files with 120 tests. That size is fine for scope, but BDB has no tests for the scene, HUD, audio-policy or cutscene wiring, which is exactly where the bugs below are.

---

## 2. Bugs (summary; details and fixes in §6)

| Area | Finding |
|---|---|
| Cutscene | Default intro `intro_v3` (61.6 s) is cut off at 30 s on every device (#1) |
| Voice not firing | `nar_ch1/2/3`, `nar_kidnap` and most barks are cancelled in the same frame by the next `say()` (#2). 22 registered lines with mp3s on disk are never triggered, including "I brought the eggplant." and "Die, Yetti, die!" (#3) |
| Mute / cutscene | Kidnap and rescue clips play over game music that has just restarted, plus Bob/Wingman VO (#6). The Dad clip player is never sound-unlocked, so it is likely muted on iPhone (#5) |
| Controls | Keyboard can't skip the Dad call-in clip: `scene.cutscene.press` is never called (#4) |
| Death anims | Killed Yettis disappear the same frame. The `dead→knockdown` mapping can never run (#9) |
| Anim mapping | Mapping works only through a fallback chain. Choirmaster's attack tell shows `sing` instead of `ring`. `wingman_dive` is never used. Bob has no grabbed or jump pose (#15) |
| HUD | `flashGo` is overwritten on the next frame (#11). The Dad meter shows a fake countdown after the 3-call cap (#13) |
| Tests | Suite is red: `boot.test.mjs:32` "git has no remotes" fails because `origin` now exists (#10) |

---

## 3. Softlocks and difficulty walls

- **No hard softlocks found.**
  - Unlimited respawns with checkpoint resume (`campaign.js:162-174`).
  - Gold shields break after 3 hits (`yettis.js:43-47`).
  - The phase-III Wingmen finisher has an 8 s shake-trio safety net (`wingman.js:75-78`).
  - Straggler spawns are pulled forward when the arena is empty (`campaign.js:82`).
  - Every halo, shockwave and snowball can be jumped over (z check `<65`; Bob's jump peaks at about 112).
- **Nightmare is a difficulty wall [verified with the bot, see #8].** Results from `node tools/bot-sim.mjs nightmare 60`:

  | Run | Cleared | Hurts | Deaths |
  |---|---|---|---|
  | Stage 1 | yes, 227.8 s | 24 | 6 |
  | Stage 2 | no (30 min cap) | 423 | 140 |
  | Stage 3 | no (30 min cap) | 330 | 108 |
  | Full campaign | no, stuck in Stage 2 | 391 | 127 |

  With the probe script, the deaths cluster on **zone 5 wave 2**: 62 of 65 deaths in Stage 2 and 46 of 50 in Stage 3. The bot is simple, but the respawn replays the exact same fight with no extra help: Dad is capped at 3 calls per campaign and Papi only comes from guard drops. A human on a phone hits the same wall. Story (452.8 s campaign) and Adventure clear fine.

---

## 4. Performance and iPhone risks

- **HUD texture re-uploads are not an issue [verified].** Phaser 4.2.1 `Text.setText` checks for changes (`t!==this._text`), so the per-frame `setText` calls in `hud.js:27-34` only redraw when the string actually changes (about once per second for the Dad timer). The real per-frame cost is the two DOM `textContent` writes (#12).
- **The quality governor is not connected [verified, #7].** `quality-governor.js` and `render-resources.js` are never imported. `graphics-lifecycle.js:41,50` calls `game.keepLoweredQuality?.()`, which doesn't exist, so nothing happens. After a lost WebGL context on iPhone, the game comes back at the same render scale (up to 1.5) and nothing is saved for a jetsam reload.
- **GPU memory:**
  - Characters: about 7.9 MiB on ASTC for the Stage 1 kit, as `docs/GPU-MEMORY.md` says.
  - The doc leaves out backdrop plates. Each stage has 8 webp plates (1600×720 far, six 1280×720 mids, a floor), about **26.6 MiB RGBA uncompressed**. The title image (1280×720) is freed at gameplay preload.
  - Real Stage 1 total on the ASTC path is about 35 MiB, still under the 60 MiB budget, but the doc understates it by 3–4×. On the IMG fallback path it is about 58 MiB, right at the limit (#19).
- **Decoded voice memory [verified sizes, #17].** All voice mp3s total 130.6 s, about **24 MiB of decoded float32 PCM** at 48 kHz mono. `preloadClips(stageLines(n))` decodes almost all of them every stage, including about 22 lines that never play. Every stage change releases and then decodes the same clips again.
- **Music elements [verified, #16].** Seven music ids point at the same `bdb-rise.mp3`. Each id gets its own `new Audio()` and `MediaElementSource`, so one session can create up to 7 streaming elements. "Boss music" just restarts the same song from 0.

---

## 5. Code quality

**Dead or unconnected modules** (no importer in `src/` or `index.html`):

| Module | What it is |
|---|---|
| `quality-governor.js` | Adaptive quality ladder; header falsely says "main.js imports it" |
| `render-resources.js` | Only used by the governor |
| `recovery.js` | Freeze-guard resume URL; header says "main.js imports it" |
| `press-ownership.js` | RWB press-release ownership |
| `music.js` | Music state machine (title / boss / cutscene / victory) |
| `fx.js` | Hit-stop, trauma shake, sparks, bloom |
| `perf-panel.js` | Capture UI; `debug-flag.js:14` documents `?perf` but nothing mounts it |
| `cutscene-scene.js` | One-line stub |
| `crate-texture.js` | RWB leftover |

**Fragile animation fallbacks:**

- `game-scene.js:77` is a one-line fallback chain shared by every character, Bob included. Interventionist, Choirmaster and Wingman animations resolve only because the chain happens to land on a valid key.
- `roleAnim` has unreachable branches: `dead`, because dead models are filtered out first, and the generic `attack`/`idle`, which the boss atlases don't have.

**Dead code:**

- The procedural paddle and `dadLabel` (`game-scene.js:57,90-92`) can never show, because `dad_swat` exists.
- About 20 RWB sfx recipes are never used (`blade`, `bowDraw`, `torchIgnite`, `tileRattle`…, `audio.js:150-193`).
- The "Stage 8 only" voice policy (`audio.js:6,418`) is never used, even though it is exactly what #2 needs.

**Stale comments:**

- `cutscene.js:54` says intro clips "keep the old behaviour", but they don't (#1).
- `quality-governor.js:4` and `recovery.js:2` both claim main.js imports them.

**Test gaps:** none of the following is tested:

- `game-scene.js`: anim mapping, event handling, cutscene and pause routing
- `hud.js` rendering
- the `say()` interrupt policy
- story-clip duration against the cap
- Dad-clip keyboard skip and sound unlock
- Nightmare clears
- that every `LINES` id is triggered somewhere

---

## 6. Findings, ranked

### P0

**1. The default intro (`intro_v3`, 61.6 s) is cut off at 30 s on every device [verified].**
- **Evidence:**
  - `src/cutscene-hooks.js:4` builds the story player with `new CutscenePlayer(root,{maxMs:30000})`.
  - `src/cutscene.js:55` turns any finite `maxMs` into a hard wall-clock cap (`capMs`).
  - `src/cutscene.js:200-202` calls `next(r,'timeout')` once visible time passes `capMs`.
  - Harness result: `capMs 30000 finished at ms [30250,'end'] intro_v3:timeout`.
  - Clip lengths (ffprobe): `intro_v3` 61.57 s, `intro_v2` 72.28 s.
- **Effect:** the remixed VO, ducked music and burned-in subtitles from commits `dc30b7a`/`a873034` stop halfway and gameplay starts.
- **Fix:**
  - Drop `maxMs` from `createStoryPlayer`, which restores the duration+5 s stall logic (`cutscene.js:208`).
  - Or set it to at least `intro_v3` length + 10 s (e.g. 90000).
  - Add a test that every `STAGE_CLIPS` mp4 duration is under the story player's cap.

### P1

**2. Voice lines emitted in the same frame cancel each other, so chapter narration is never heard [verified by trace].**
- **Evidence:**
  - `campaign.js:43,45`: `loadStage` emits `nar_chN` and then, in the same frame, `barkWhere` fires `bob_where_claudia_01`, because `whereAt` starts at -1e9.
  - `campaign.js:44` adds `nar_kidnap` in Stage 2.
  - `audio.js:448-466`: with no policy, every `say()` bumps `voiceRequest`. The earlier clip's load resolves with `request!==voiceRequest` and is dropped, and its caption is overwritten.
  - About 0.3 s later Bob crosses `zones[0].at=260` from x=180. `spawnWave` (`campaign.js:67-68`) fires `barkYettiWave`, which cuts "Where is Claudia???" off.
  - Each later wave start pairs where + Yetti barks the same way.
- **Fix:**
  - Install `setVoicePolicy` (already in `audio.js:418`). Narrator, Dad and boss lines interrupt. Barks get `wait: 1.5` or are skipped while busy.
  - Or call `say(id, cb, false)` for barks (`game-scene.js:111`) and give `voice` events a priority field.
  - Test: run `Campaign` for 1 s and assert the first non-skipped voice id is `nar_ch1`.

**3. 22 recorded, registered lines are never triggered, including Jason's two required Bob lines [verified by grep].**
- **Evidence:**
  - `voice-lines.js:6-16` and `PRESENT` list mp3s that exist on disk.
  - None of these ids appears outside `voice-lines.js`: `bdb_open` ("I brought the eggplant."), `bdb_produce` ("Die, Yetti, die!"), `bdb_laugh`, `claudia_*`, `yetti_turnback`, `choir_serious`, `dad_call_01-03`, `dad_done_01-02`, `papi_chorus`, `bob_papi_01`, `bob_hurt_01-03`, `bob_dadwait_01`, `bob_papiwait_01`, `wingman_defeat`, `nar_victory`.
  - `docs/BOB-LINES.md:19` marks the first two as "Jason-mandated verbatim".
- **Fix** (wording unchanged; only triggers are added):
  - `bdb_open` on the Stage 1 first `go`/zone entry
  - `bdb_produce` on a rate-limited KO streak
  - `bdb_laugh` on a boss KO
  - `bob_hurt_0x` from the `hurt` event
  - `bob_papiwait_01` / `bob_dadwait_01` next to the refusal banners at `campaign.js:138,150`
  - `dad_done_0x` when `dad.gone`
  - `papi_chorus` with `papi`
  - `wingman_defeat` / `nar_victory` on finishStage(3)
  - Add a test that every `PRESENT` id is referenced by an emitter or in a documented allow-list.

**4. Keyboard can't skip the Dad call-in clip [verified].**
- **Evidence:**
  - `dad-call-cutscene.js:74` defines `scene.cutscene.press`, but nothing in `src/` calls it (grep).
  - The story player's keydown handler (`cutscene-hooks.js:5`) only skips its own `handle`.
  - `playDadCall` pauses the Phaser game loop (`:73`), so `GameScene.update` doesn't run.
  - RWB routes this in `stage1.js:279` (`this.cutscene.press(a)`).
- **Effect:** desktop players can only click or use a gamepad. Pressing Space/J does nothing for up to 4–6 s.
- **Fix:** in `playDadCall`, add a `keydown` listener on `root` that maps `KEYS[e.code]` through `SKIP_ACTIONS` to `handle.skip(...)`, and remove it in `finish`/`abortDadCall`. Add a unit test with a fake root.

**5. The Dad clip player is never sound-unlocked, so it is likely muted on iPhone [plausible].**
- **Evidence:**
  - `dad-call-cutscene.js:76-77` creates a second `CutscenePlayer` (a second `<video>`) during the call. The call starts from a Phaser step, not inside the user's gesture handler.
  - Only the story player is unlocked (`main.js:34` → `story.bless()`).
  - `cutscene.js:180-182` then falls back to muted with "TAP FOR SOUND".
  - The RWB port dropped `installRandBless` (`rwb-s8/src/rand-call-cutscene.js:79-95`), which unlocks the player on capture-phase `pointerdown`/`touchend`.
- **Fix:** port `installRandBless`. Call it in `GameScene.create` and remove it on shutdown. Or reuse the story player's already-unlocked element for Dad clips.

**6. Story clips during gameplay play over restarted music and game VO [verified by trace].**
- **Evidence (kidnap):**
  - `campaign.js:43-45` emits `voice nar_ch2`, `cutscene kidnap`, `voice nar_kidnap` and `voice bob_where…` in one batch.
  - `game-scene.js:111,117` handles them in order, so Bob's bark plays over the video.
  - The scene restart then runs `create`, and `playTrack('stage2')` (`game-scene.js:62`) starts a new music element from 0 under the clip.
- **Evidence (rescue):** `rescue_pre_boss` behaves the same: `campaign.js:94-96` emits `boss` (which restarts music) and `wingman_council` alongside it.
- **Missing piece:** RWB's original hooks called `silence(music)` and paused the loop. That code was dropped in `a7607da`.
- **Fix:**
  - On `cutscene`, call `stopSceneAudio()` and `playTrack(null,{fade:.3})`.
  - Queue the `voice`/`boss` events that arrive in the same batch until the story `done` callback, then resume `stage${n}`/`boss${n}`.
  - Or wire the unused `music.js` director, which already models a `cutscene` state.

**7. Quality governor and context-loss floor are not connected; freeze-guard recovery is unused [verified].**
- **Evidence:**
  - `quality-governor.js:60` defines `game.keepLoweredQuality`, but the module is never imported.
  - `graphics-lifecycle.js:41,50` calls it with `?.()`, so it silently does nothing.
  - `recovery.js` is also unused.
  - `main.js:50-54` boots at `RS0` (1.5 on touch) with no frame-time ladder.
- **Effect:** iPhones that drop frames or lose context never step down. After a jetsam reload the game boots at full size again.
- **Fix:** install the governor in `bootGame`, the same way RWB's `main.js` does. Use `readQualityFloor()` when choosing `resolution`. Add a boot test asserting `typeof game.keepLoweredQuality === 'function'`.

**8. Nightmare Stages 2–3 cannot be cleared by the bot, and Nightmare has no test [verified].**
- **Evidence:** see §3. 140 and 108 deaths, stuck at `z4w1`. Only `save.test.mjs` mentions Nightmare.
- **Contributing factors:**
  - Dad is capped at 3 calls for the whole campaign (`dad-call.js:2`, `maxCalls:3`, with `dadCall` persisting across `loadStage`).
  - Nightmare runs at pace 1.25 with recovery 0.85.
  - Respawn gives no extra help on repeated deaths.
- **Fix:**
  - Add a mercy rule: after N deaths on the same `zone:wave`, drop a shake trio and/or restore one Dad charge, as RWB's softlock trio does.
  - Or reset `dadCall.calls` per stage.
  - Add a `nightmare` case to `length-difficulty.test.mjs` asserting the bot clears every stage within, e.g., 600 s.

**9. Enemy death animations never play; killed Yettis disappear the same frame [verified].**
- **Evidence:**
  - `game-scene.js:71` only builds views for `w.enemies.filter(e=>e.alive)`.
  - `game-scene.js:80` destroys views whose model isn't live.
  - So `roleAnim`'s `dead→knockdown` (`:21`) never runs, even though every role atlas has `*_knockdown` (5–7 frames).
  - `Fighter.sync`'s "fading corpse" shadow code (`fighter.js:39-41`) is never reached.
  - The same applies to Papi, Dad and `finishStage` kills.
- **Fix:** keep dead models in a short-lived `corpses` list (about 0.6 s), play `knockdown`, then fade alpha. Drop them when the timer ends. This matches RWB's corpse fade.

### P2

**10. The test suite is red [verified].**
- **Evidence:** `tests/boot.test.mjs:32` asserts that `git remote -v` is empty, but the checkout now has `origin → github.com/jfeldman9-rgb/bdb-rwb`.
- **Fix:** delete or relax that assertion. Repo hygiene isn't a unit-test concern.

**11. `HUD.flashGo` does nothing visible.**
- **Evidence:** `hud.js:40-43` sets the prompt, but `hud.update` (`:33`) overwrites it on the next frame. `_goPlate` is never read.
- **Fix:** store `goUntil = now + 1500` and have `stagePrompt` prefer it. Or delete the method.

**12. Two DOM writes per frame.**
- **Evidence:** `hud.js:38` assigns `textContent` and toggles a class on `#tbPapi`/`#tbDad` every frame.
- **Effect:** forces style recalculation 60 times a second on iPhone.
- **Fix:** cache the last values and write only when they change.

**13. The Dad meter misleads once the calls are used up.**
- **Evidence:** after `calls>=3`, `noteBobKo` stops counting, but `hud.js:29` keeps showing `0/10 · Ns`, counting down to `0s`, forever.
- **Fix:** show `DAD SPENT` when `dadCall.calls>=DAD.maxCalls`. The `tbDad` button already greys out.

**14. Mash count is hardcoded.**
- **Evidence:** `hud.js:7` (`/6`, `Math.min(6,…)`) and `hud.js:37` (`grabMash/6`) ignore the exported `MASH_NEED` and the unused `mashRing()` helper (`:5`).
- **Fix:** use `MASH_NEED` and `mashRing()`.

**15. Animation mapping is fragile.**
- **Evidence:** `game-scene.js:75-77`:
  - Choirmaster telegraph falls back to `sing`, so its volley has no pose tell.
  - Interventionist `wait`/`recover` play `walk` while standing still.
  - `wingman_dive` is never used: phase II teleports straight to the slam.
  - Bob has no `grabbed` or airborne pose; grabbed maps to `idle`.
- **Fix:** give each boss its own mapping, like `roleAnim`. Add an atlas-spec test that every mapped `(type,state)` resolves to an existing key without the fallback.

**16. Seven music ids, one file, separate elements.**
- **Evidence:**
  - `audio.js:196`: all `MUSIC` ids point at `bdb-rise.mp3`.
  - `streamEl` (`:217-224`) creates a new `Audio` and `MediaElementSource` per id.
  - `loopEnd`/`loopStart` are undefined, so `L` is NaN and the `ontimeupdate` loop logic is dead.
- **Fix:** map all ids to one shared track id until real boss music exists, or reuse the element. Remove the dead loop handler.

**17. Voice preload is too wide.**
- **Evidence:** `game-scene.js:62` together with `voice-lines.js:25` decodes about 47 clips (about 24 MiB PCM) per stage, including lines that never play. Shutdown releases them (`:63`) and the next stage decodes them all again.
- **Fix:** preload only the ids that stage can emit. Keep shared barks resident across restarts.

**18. Dead code and stale comments.**
- **Evidence:**
  - `dadLabel` and the paddle branch (`game-scene.js:57,90-92`)
  - Unused RWB sfx (`audio.js:150-193`)
  - The unconnected modules in §5
  - Stale headers: `quality-governor.js:4`, `recovery.js:2`, `cutscene.js:54`
- **Fix:** delete them, or connect them (governor, recovery) and fix the headers.

**19. `docs/GPU-MEMORY.md` leaves out backdrop plates.**
- **Evidence:** about 26.6 MiB RGBA per stage of webp plates on top of the characters.
- **Fix:** add a row for the plates. Consider ASTC/ETC2 KTX for the six mid plates (`tools/compress-ktx.py` already exists), which cuts about 21 MiB to about 5 MiB.

**20. Refusal banners repeat the old copy and the new lines stay silent.**
- **Evidence:** `campaign.js:150` "DAD'S ON HIS COFFEE BREAK." and `campaign.js:138` "NEED MORE PROTEIN." are the pre-rewrite `bob_dadwait_01`/`bob_papiwait_01` texts (`BOB-LINES.md:16-17`). The new voiced lines are never emitted.
- **Fix:** emit `voice bob_dadwait_01`/`bob_papiwait_01` (rate-limited) when a call is refused. Leave banner wording to Jason.

**21. Coming back to the tab resumes combat immediately.**
- **Evidence:** `main.js:58` clears the `background` pause reason as soon as the tab is visible again. Unlocking the phone drops the player straight into a live fight.
- **Fix:** on hide, also set the `manual` pause so the player must tap to resume (RWB behaviour).

---

## 7. What already looks good

- **Deterministic sim, one code path.** `Campaign.update` runs on a fixed 1/60 step, shared by Phaser (`game-scene.js:127`) and the bot. The bot reaches RWB's clear times at 30, 60 and 120 Hz.
- **Locked rules are kept and tested:**
  - `vy=0` is enforced on every step (`eggplant.js:3,13`).
  - `CAM_LEAD=0.28` has a test (`camera.test.mjs`).
  - The Dad catchphrase is in one place (`story.js:7` → `voice-lines.js:13`).
  - No upgrade shop.
  - Story mode is the default on touch.
- **Softlock safety nets:**
  - Shields break after 3 hits.
  - The Wingmen finisher has a trio fallback.
  - Empty arenas pull stragglers in.
  - Respawn keeps the wave reached and the boss damage dealt. This fixed the earlier 150-death replay loop.
- **iPhone asset discipline:**
  - KTX ASTC/ETC2 atlases with webp fallback (`assets.js:5-8`).
  - Per-stage character and texture residency (`game-scene.js:44-49`).
  - One reused `<video>` whose src is cleared after each clip.
  - Audio suspends and resumes on hide and handles `interrupted`.
  - WebGL context-loss pause and notice.
- **Cutscene player robustness:** start/stall/visibility-aware watchdogs, a muted-autoplay fallback with a tap-to-unmute, per-clip skip guards, and a shuffle bag for D1–D3 that doesn't repeat back-to-back.
- **Clean Dad call-in timing.** The swat frame comes from the sim clock (`dad.js`), so the hit lands exactly on `resolve()`. Damage rules (`dad-call.js`) are pure and tested, with boss floors per phase.
- **The HUD avoids texture churn.** Phaser 4 `setText` only redraws on change.

CLAUDE_REVIEW score=6/10 p0=1 p1=8 p2=12
