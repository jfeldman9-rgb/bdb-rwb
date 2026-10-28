# Argon Design & Engineering Review — *The Legend of Claudia: BDB's Awakening*

**Reviewed workspace:** `/workspace/bdb-argon`  
**Quality bar reference:** `/workspace/rwb-s8` (*Riley Wheel Brawl 2.0*, Stages 1–8)  
**Review date:** 2026-10-28  
**Methodology:** Full static review of all 52 ES modules in `src/` (~2,700 LOC), `index.html`, all character/background/audio/video manifests and binary headers (`ffprobe` / WebP / KTX / JSON), execution of the 114-test Node suite (`node --test tests/*.test.mjs`), visual inspection of all 13 captured screenshots in `docs/shots/`, and side-by-side architectural comparison against `/workspace/rwb-s8`.

---

## 1. Executive Summary & Scorecard

`/workspace/bdb-argon` has a **strong simulation and asset-compression skeleton**: a zero-build ES-module architecture, a deterministic fixed-timestep pure-JS simulation (`src/campaign.js`, `src/bob.js`, `src/yettis.js`, `src/wingman.js`) cleanly separated from Phaser 4 rendering, and an ASTC 4×4 / ETC2 KTX1 character atlas pipeline (`tools/pack-flat.py`, `src/assets.js`) that keeps Stage 1 character GPU memory at **4.81 MiB** (compared to ~185 MiB of uncompressed RGBA + normal maps in early RWB 2.0).

However, **the game currently plays and looks like an early functional vertical-slice prototype rather than a finished RWB-tier brawler**. Roughly **500 LOC of RWB 2.0's best runtime modules (`fx.js`, `quality-governor.js`, `render-resources.js`, `perf-panel.js`, `recovery.js`, `press-ownership.js`, `music.js`) were copied into `src/` and never wired up**. Nine of 13 character sheets (including **all three bosses**, four Yetti archetypes, Claudia, and the Papacito runners) are geometric circle/stick placeholders; 23 of 37 generated voice clips sit untriggered on disk; `HUD.update()` re-uploads 8 Canvas2D text textures to WebGL every single frame (480 GPU uploads/sec); portrait iPhone mode has a trap button that slices `FIRE` off-screen; cutscene `<video>` playback ignores the `MUTE` toggle; Nightmare difficulty is mathematically unclearable; and enemies vanish on the exact frame of death without ever playing knockdown animations.

### Area-by-Area Scorecard (1–10 vs `/workspace/rwb-s8`)

| # | Area | BDB Score | RWB Bar | Core Diagnosis |
|---|---|---:|---:|---|
| 1 | **Code Quality** | **6.0** | 8.5 | Clean pure-sim/view split & KTX pipeline, dragged down by ~500 LOC of dead/unwired RWB modules, regressed `MUSE-LEVEL-1` presentation code, and broken state→anim fallbacks. |
| 2 | **Bugs** | **4.0** | 8.5 | **14 verified bugs (3 P0, 7 P1, 4 P2):** mute ignored on `<video>`, portrait iPhone clips `FIRE` off-screen, enemies never play death/shoot/rush/grab animations, `window.__perf` clobbered, Claudia stays caged on Victory, gamepad `Start` broken on Title, Dad swats off-screen. |
| 3 | **Game Feel** | **4.0** | 9.0 | `src/fx.js` is dead code. Flat 4-frame hit-stop on every hit, zero combat camera shake, zero enemy knockback/shudder, instant corpse deletion, `Graphics` ovals for projectiles, 9/13 placeholder stick/circle sprites. |
| 4 | **Controls on iPhone** | **5.0** | 8.5 | Good landscape button sizes & multitouch `pointerId`, but `#rotate-start` traps players in broken portrait layout, `#pause`/`#mute` violate Apple 44pt HIG & safe-area insets, fixed-center stick deflects off-center, no touch dash/cooldown/mash cues. |
| 5 | **HUD** | **4.0** | 8.5 | 116 px opaque `#101421` top bar eats 16% of vertical view; system `Arial` + Unicode `♥/▰` glyphs; **480 WebGL text re-uploads/sec**; summed single bar hides per-Wingman 1-HP state; permanent `BOULEVARD` debug label overlaps joystick. |
| 6 | **SFX / Music** | **5.0** | 8.5 | Great raw VO assets & Suno track, but **1 track (`bdb-rise.mp3`, 5.79 MB)** loops everywhere (Title is silent, `MusicDirector` unused), **23/37 voice clips are never called**, generic RWB fireball SFX on eggplants, `<video>` ignores mute & overlaps music on Victory. |
| 7 | **Pacing** | **5.5** | 8.5 | Macro runtime (~9.2 min across 3 stages) matches target, but 45 consecutive 3-wave arena locks with **zero crates, zero pickups/shakes, zero mid-stage set-pieces**, and jarring 1-frame chapter cuts create repetition fatigue. |
| 8 | **Difficulty** | **5.0** | 8.5 | **Nightmare is broken** (`2.75×` effective shots-to-kill + double add-summons = 81–150 bot deaths); zero AI attack tokens or separation causes stacked volley walls; infinite zero-penalty respawns erase tension on Stages 1–2 while Stage 3 Phase 3 hard-resets. |
| 9 | **Boss Design** | **4.5** | 9.0 | Clever, tasteful Papacito dual-Wingman 1-HP finisher mechanic, but all 3 bosses are placeholder shapes; S1/S2 bosses are 2-move 1,200-HP sponges (`speed: 0` turret on S2); Wingman Phase 2 teleports in 1 frame; Phase 3 volleys aren't desynced and lack per-boss 1-HP UI. |
| 10 | **Cutscene Flow** | **4.5** | 8.5 | `cutscene.js` player is solid, but `cutscene-hooks.js` omits `muted`, `frame`, `seen`, `press-ownership`, and Phaser pause; MP4s are 1080p instead of 540p; 9 narrative VO clips sit unused; zero chapter-transition scenes; Claudia stays caged behind Victory. |
| 11 | **Performance & Memory** | **6.5** | 8.5 | Excellent KTX character VRAM (`4.81 MiB`), but `HUD.update()` uploads 8 Canvas textures/frame, **26.56 MiB of uncompressed RGBA backgrounds** stay resident per stage (uncounted in `docs/GPU-MEMORY.md`), 35 MP3s re-decode every stage, `Graphics` re-tessellates every frame, and `quality-governor.js` is unwired. |
| — | **Overall Average** | **4.9 / 10** | **8.6 / 10** | Strong engine foundation; needs full integration, feel/HUD/boss polish, bug fixes, and final art to meet the RWB 2.0 bar. |

---

## 2. `BUILD-PLAN.md` §5 Argon Gate & Standing Rules Audit

Before diving into the 11 areas, here is the status of the explicit project gates from `plan/BUILD-PLAN.md` §5 and `plan/STATUS.md`:

| Gate (`plan/BUILD-PLAN.md` §5) | Status | Evidence |
|---|---|---|
| **5.1 Freeze-frame test (9/10 frames look like key art)** | **FAIL** | 9 of 13 character atlases are geometric stand-ins (`docs/shots/boss.png`, `docs/shots/wingmen.png`); projectiles/cages/shields are flat `Graphics` ovals; `parallax.js:37` prints `BOULEVARD OF BETTER JUDGMENT` in `Arial` across the street. |
| **5.2 Combat feel (hit-stop, knockback, crates, crowd control)** | **FAIL** | Flat 4-frame hit-stop (`campaign.js:116`), zero knockback velocity (`yettis.js`), zero breakable crates (`crate-texture.js` unused), instant corpse deletion (`game-scene.js:48`). |
| **5.3 Mobile UX (iPhone landscape, 44×44 pt targets, safe area, rotate prompt)** | **FAIL** | `#rotate-start` (`index.html:66`) enters broken portrait gameplay clipping `FIRE` (`docs/shots/phone-portrait-game.png`); `#pause` & `#mute` are ~29 px tall (< 44 pt) without `env(safe-area-inset-right)` (`index.html:27-28`). |
| **5.4 Audio & voice (every major beat voiced, captions, mute persists)** | **FAIL** | 23 of 37 voice lines in `src/voice-lines.js` are never triggered; `cutscene-hooks.js:8` ignores `isMuted()`; `victory.mp4` plays over `bdb-rise.mp3`. |
| **5.5 Performance & stability (60 fps, ≤150 MB GPU, cold load ≤25 MB, zero leaks)** | **PARTIAL** | Character + BG GPU (~31.4 MiB) and cold load (~12 MB) are well under caps, **but** `HUD.update()` leaks 480 GPU text uploads/sec, `window.__perf` is clobbered (`main.js:59`), `bindPerfLifecycle` double-binds, and `quality-governor.js` is unwired. |
| **5.6 Tastefulness & Standing Rules** | **PARTIAL** | Standing rules respected (no Seedance/Manus, no paid APIs, no git push; Papacito sim/VO is clothed slapstick and Bob is never touched). **However:** `index.html:75` still ships the retired `"Legally, it's produce."` line (replaced in `docs/BOB-LINES.md` with `"Die, Yetti, die!"`), and `papi_runners` / `dad` call-in still need final art/choreography review. |

---

## 3. Deep-Dive Review by Area (1–11)

---

### Area 1: Code Quality — **6.0 / 10** *(RWB Bar: 8.5 / 10)*

#### What Works Well
1. **Clean Pure-Simulation vs. Phaser View Split:** Unlike RWB's monolithic `src/stage1.js` (766 LOC mixing Phaser sprites, lights, tweens, and combat rules), BDB cleanly isolates gameplay math in pure ES modules (`src/campaign.js`, `src/bob.js`, `src/eggplant.js`, `src/yettis.js`, `src/wingman.js`, `src/dad-call.js`, `src/dad.js`, `src/papacito.js`, `src/camera.js`) with zero Phaser imports. `GameScene.update()` (`src/game-scene.js:86-90`) drives `this.world.step(STEP, ...)` over a deterministic `1/60` s fixed-step accumulator, making 30/60/120 Hz behavior identical (`tests/stage1-sim.test.mjs`).
2. **Zero-Build Native ESM + Compressed Texture Pipeline:** `index.html` + `src/bootstrap.js` + `src/assets.js` preserve RWB's zero-bundler deploy simplicity while upgrading character textures from WebP RGBA to hardware ASTC 4×4 / ETC2 KTX1 (`tools/pack-flat.py`).
3. **Fast Headless Test Suite:** 113 of 114 tests run in ~1.8 s in Node (`tests/*.test.mjs`).

#### Critical Architectural Deficiencies vs. `/workspace/rwb-s8`
1. **~500 LOC of Dead, Unwired RWB Infrastructure Sitting in `src/`:** Seven modules ported from `/workspace/rwb-s8/src/` exist in `/workspace/bdb-argon/src/` and are **never imported by any runtime module**:
   - `src/fx.js` (77 LOC — trauma camera shake, directional spark/dust/ember emitters, hit-stop/slow-mo controller): **0 imports**.
   - `src/quality-governor.js` (113 LOC — frame-time governor stepping `RS` down under sustained >21 ms load) & `src/render-resources.js` (18 LOC): **0 imports**. Worse, `src/graphics-lifecycle.js:41,50` calls `game?.keepLoweredQuality?.(...)` expecting `installQualityGovernor` to have decorated `game`, and `src/quality-governor.js:78-86` still hardcodes RWB's `Stage1` properties (`st.fx.quality`, `st.setBloom(false)`, `st.snowFront`, `st.setBackdropLit(false)`), which would throw or no-op on BDB's `GameScene`!
   - `src/perf-panel.js` (148 LOC — on-device telemetry modal & clipboard export): **0 imports**, and `index.html` lacks `#perf-open`, `#perf-overlay`, and `#perf-dialog` (compare `/workspace/rwb-s8/index.html:82-92`).
   - `src/recovery.js` (53 LOC — `resumeGame`, `showStuck`, `installResumeCleanup`): **0 imports**; `src/main.js:54` mounts `mountGraphicsNotice` without `onReload: () => resumeGame(window)`, so tapping Reload after WebGL context loss wipes progress back to `/` instead of resuming the current chapter (`rwb-s8/src/main.js:35,43`).
   - `src/press-ownership.js` (85 LOC — single-consumer press token ownership across pause/cutscene/gameplay): **0 imports** (wired in `rwb-s8/src/stage1.js:24,151,267` and `rwb-s8/src/cutscene-hooks.js:3`).
   - `src/music.js` (`MusicDirector` class, lines 18–57): `GameScene` only imports `STAGE_MUSIC` (`src/game-scene.js:11`) and never instantiates `MusicDirector`.
   - `src/crate-texture.js` (8 LOC) & `src/cutscene-scene.js` (1 LOC stub `export {};` vs RWB's 108 LOC scene-pause/skip/audio lifecycle controller): dead stubs.
2. **Lost / Regressed Presentation Work (`docs/MUSE-LEVEL-1.md` vs `src/game-scene.js`):** `docs/MUSE-LEVEL-1.md:83-96` documents Stage 1 polish where `Interventionist` rendered at `0.59` scale, shifted to warm `0xffd6cc` tint in Phase II, and `game-scene.js` mapped per-role enemy animations cleanly. None of that code exists in `src/game-scene.js:49-54` today — indicating an unmerged branch or overwrite during the Step 2/length-difficulty pass, with no regression test guarding view-state→animation mapping.
3. **Brittle String-Fallback Chain in `GameScene.syncViews()` (`src/game-scene.js:51-53`):**
   ```js
   let anim=m===w.bob?(m.hurtT>0?'hurt':m.fireAnimT>0?'attack':m.state==='dash'?'walk':m.state):...
   if(!this.anims.exists(`${key}_${anim}`))anim=anim==='attack'?'shoot':anim==='knockdown'?'sing':m.state==='walk'?'walk':'idle';
   ```
   Unlike RWB (`Fighter.play()` + explicit state→clip contracts tested per actor), this ad-hoc ternary chain silently masks missing animation names by falling back to `idle` or `walk`.
4. **Worktree-Fragile Test (`tests/boot.test.mjs:32`):** Runs `execSync('git remote -v')` without handling git worktrees whose parent `.git` directory resides outside container/sandbox mounts (the sole failing test in `node --test`, 113/114 pass).

---

### Area 2: Bugs — **4.0 / 10** *(RWB Bar: 8.5 / 10)*

All 14 bugs below were verified directly in source code and/or rendered screenshots:

#### P0 — Player-Facing Blockers & Broken Core Contracts
1. **[P0] Cutscene `<video>` Ignores Mute Toggle & Clashes With Gameplay Music (`src/cutscene-hooks.js:8`, `src/cutscene.js:56`, `src/game-scene.js:106`):**
   - `createStoryPlayer` calls `player.play(name, { onDone })` without passing `muted: isMuted()` (compare `rwb-s8/src/cutscene-hooks.js:24`). Both `opening.mp4` (mean `-28.7 dB`, max `-9.3 dB` stereo AAC) and `victory.mp4` (mean `-28.3 dB`, max `-11.8 dB` stereo AAC) play **unmuted** even when the user explicitly toggled `#mute` to `MUTE: ON`!
   - On Stage 3 clear (`src/game-scene.js:106`), `stopSceneAudio()` is never called before `story.play('victory', ...)`, so `bdb-rise.mp3` keeps playing at `0.65` gain simultaneously underneath `victory.mp4`'s audio track.
2. **[P0] Portrait iPhone `#rotate-start` Escape Hatch Slices `FIRE` Button Off-Screen & Never Re-Prompts on Mid-Game Rotation (`index.html:38-46,66`, `docs/shots/phone-portrait-game.png`):**
   - Tapping `#rotate-start` ("Or tap to begin letterboxed, then rotate when you can") adds `.playing` to `document.body`. Because CSS scopes the rotate overlay to `body:not(.playing) #rotate { display: flex; }` (`index.html:41`), `#rotate` disappears permanently once gameplay starts — even if the user holds or rotates the phone vertically!
   - In portrait (`390×844`, letterboxed to `390×219`), `.buttons` has `width: 29%` (`113 px`), while its 3-column CSS grid requires `3 × 44px min-width + 2 × 8px gap = 148 px`. The right column overflows `35 px` off the right edge of the screen, slicing the `FIRE` button in half (`docs/shots/phone-portrait-game.png`).
3. **[P0] Enemy Attack/Telegraph/Down Animations Are Broken and Enemies Never Play Death Animations (`src/game-scene.js:48-56`):**
   - Line 48 filters `live = new Set([w.bob, ...w.enemies.filter(e => e.alive), ...])` and lines 55–56 immediately `destroy()` any `Fighter` not in `live`. The exact frame an enemy's HP reaches `0`, its sprite is deleted — **zero `knockdown` or `down` death animations ever render anywhere in the game**.
   - Line 51 maps `m.state === 'telegraph' || m.state === 'rush' ? 'attack' : m.state === 'down' ? 'knockdown' : ...`. On `yetti_hover`, `attack` fails and falls back to `shoot` only if `m.state` was `'telegraph'`/`'rush'` — wait: `yetti_hover` has **no `'telegraph'` state** (`yettis.js:45` stays in `'walk'` and emits a snowball when `cool <= 0`!), so **`yetti_hover_shoot` never plays!** On `yetti_charger`, `attack` and `shoot` both fail (`yetti_charger.anims.json` defines `telegraph`, `rush`, `hurt`, `down`), so charging Chargers play **`idle` while rushing at 460 px/s!** On `yetti_lecturer`, `grab` and `hold` are not mapped and exist in `yetti_lecturer.anims.json`, wait — `m.state` is `'hold'` (which exists), `'recover'` (falls back to `'idle'`), and when Dad knocks down a Charger or Lecturer (`state = 'down'`), line 51 rewrites `'down'` → `'knockdown'` (which does **not** exist in `yetti_charger.anims.json` or `yetti_lecturer.anims.json`, whose clips are named `*_down`!), falling back to `'idle'`!

#### P1 — Major Functional, UX & Content Bugs
4. **[P1] `perf.js` Double-Mounts Window Listeners and `main.js` Overwrites `window.__perf` (`src/perf.js:189`, `src/main.js:53,59`):**
   - `perf.js:189` executes `window.__perf = perf; bindPerfLifecycle(perf, window);` on module import.
   - `main.js:53` calls `bindPerfLifecycle(perf)` a **second time** (registering duplicate `visibilitychange`, `pagehide`, `pageshow`, `blur`, `focus` handlers), and `main.js:59` executes `window.__perf = { renderer: ..., software: ... }`, **clobbering the `PerfMeter` instance** so `window.__perf.report()` is gone! (Compare `rwb-s8/src/main.js:34`, which assigns `window.__gpu` rather than clobbering `window.__perf`).
5. **[P1] 23 of 37 Voice Clips in `LINES` (+ 3 Extra Files on Disk) Are Never Played (`src/voice-lines.js`, `src/campaign.js`):**
   - `GameScene.create()` (`src/game-scene.js:18`) downloads and WebAudio-decodes 35 MP3s per stage, yet `campaign.js` only emits **12 line IDs** (`nar_ch1..3`, `wingman_council`, `interventionist_intro`, `choirmaster_intro`, `lecturer_intervention`, `bdb_laugh`, `dad_catchphrase`, `bob_respawn_01`, `wingman_phase2`, `wingman_phase3`).
   - Completely dead in gameplay: `bdb_open`, `bdb_produce`, `bob_hurt_01..03`, `bob_papi_01`, `bob_dadwait_01`, `bob_papiwait_01`, `dad_call_01..03`, `dad_done_01..02`, `papi_chorus`, `yetti_turnback`, `choir_serious`, `wingman_defeat`, `nar_intro_01..03`, `nar_kidnap`, `nar_victory`, `claudia_open`, `claudia_question`, `claudia_leave`. In addition, `assets/audio/voice/papi_chorus_01..03.mp3` exist on disk and aren't even registered in `src/voice-lines.js`!
6. **[P1] Claudia Stays Caged Behind Bars on Victory & Retired Line Remains in `index.html` (`src/game-scene.js:35-36,106`, `index.html:75`, `docs/shots/victory.png`):**
   - `claudia.anims.json` defines `claudia_freed`, and `BUILD-PLAN.md` §3.2 specifies freeing Claudia when the Wingmen fall. Instead, `game-scene.js:35-36` draws permanent grey `Graphics` bars over `claudia_caged` and never clears them or plays `claudia_freed` (`docs/shots/victory.png`).
   - `index.html:75` still displays `"Legally, it's produce."` inside `#victory`, contradicting `docs/BOB-LINES.md:7,17` (`"Legally, it's produce." -> REMOVED`, replaced by `"Die, Yetti, die!"`).
7. **[P1] Gamepad `Start` Button Cannot Start the Game on Title; Keyboard `Enter` Cannot Pause (`src/input.js:5,7`, `src/main.js:47,56`):**
   - `PAD_MAP` (`src/input.js:7`) maps button `9` (Start/Menu) to `'pause'`. `Title.update()` (`src/main.js:47`) only checks `inp.take('start') || inp.take('fire')`. Pressing Start on a connected controller on the Title screen does nothing. Conversely, keyboard `Enter` maps to `'start'` (`src/input.js:5`), so pressing `Enter` during gameplay never pauses or unpauses (`main.js:56` only checks `'pause'`). Compare `rwb-s8/src/input.js:12` + `rwb-s8/src/stage1.js:281`, where `9: 'start'` both starts Title and toggles pause in-fight.
8. **[P1] Dad Call-In Targets Off-Screen Coordinates Near Right Wall & Swats Once Instead of Twice (`src/campaign.js:144`, `src/dad.js:9-10`):**
   - `standX = this.bob.x + 150` is not clamped to `this.cam.x + VW - 120`. When Bob calls Dad near the right edge of a locked zone (`bob.x ≈ camX + 1220`), Dad runs to `camX + 1370` (90 px past the right edge of the screen), performs his swat completely off-camera, and exits! Also `dad.js` performs 1 swat (`enter` 0.5s → `swat` 0.5s → `exit` 0.5s) instead of the documented 2 swats (`README.md`, `plan/BUILD-PLAN.md` §2.2).
9. **[P1] Choirmaster Double-Spawns Adds (`src/yettis.js:72,95`):**
   - Choirmaster spawns up to 2 adds every 9 seconds via `addTimer` (line 72) **and** spawns another add every time `telegraph` starts (`if (this.type === 'choirmaster' && this.onSummon) this.onSummon(...)` at line 95), burying the player in unbounded adds on Hard/Nightmare.
10. **[P1] Phaser Scenes Tick & Render at 60 FPS Behind Full-Screen Cutscene Videos (`src/cutscene-hooks.js:8`, `src/main.js:47`, `src/game-scene.js:106`):**
    - Neither `Title` nor `GameScene` pauses while `opening.mp4` or `victory.mp4` plays, wasting WebGL draw calls and battery while iOS Safari decodes 1080p H.264 video on top.

#### P2 — Polish & Edge-Case Bugs
11. **[P2] Missing `disableWebAudio: true` in Phaser Config (`src/main.js:52`):** Only `noAudio: true` is set; RWB (`src/main.js:28`) sets `{ disableWebAudio: true, noAudio: true }` so Phaser never opens a second `AudioContext` on iOS Safari.
12. **[P2] `NaN` Loop Arithmetic in `streamEl()` (`src/audio.js:196,221-222`):** `MUSIC['bdb-rise']` has no `loopStart`/`loopEnd`, so `const L = T.M.loopEnd - T.M.loopStart` computes `NaN` inside `el.ontimeupdate` on every media timeupdate event.
13. **[P2] Duplicate Frame in `bob_walk` + Missing Jump/Dash Visual States (`assets/chars/bob.anims.json:5`, `src/game-scene.js:51`):** `bob_walk` has `["bob_walk_01","bob_walk_02","bob_walk_03","bob_walk_03","bob_walk_05","bob_walk_06"]` (hitching on frame 3), and Bob plays `walk` while dashing and `idle`/`walk` in mid-air while jumping.
14. **[P2] Pause Overwrites Active Wave/Boss Banner & Leaves Music at Full Volume (`src/game-scene.js:40-45`):** `setPauseReason('manual', true)` overwrites `this.banner` with `'PAUSED'` (destroying any active announcement) and does not duck/pause music or dim the playfield.

---

### Area 3: Game Feel — **4.0 / 10** *(RWB Bar: 9.0 / 10)*

Game feel ("juice") is the single widest experiential gap between `/workspace/bdb-argon` and `/workspace/rwb-s8`.

| Combat Feel Dimension | `/workspace/rwb-s8` Quality Bar | `/workspace/bdb-argon` Current State |
|---|---|---|
| **Hit-stop scaling** | `4 / 6 / 9 / 14` frames (`light / medium / heavy / finisher`) + `0.25s` hit-stop & `1.2s` `0.3×` slow-mo on boss KO (`fx.js:35`, `stage1.js:407`). | Flat **4 frames (`0.067s`)** on every hit (`eggplant.js:23`, `campaign.js:116`). Zero slow-mo on wave clear or boss defeat. |
| **Victim reaction & knockback** | `shudder = 0.12` (±4 px horizontal vibration during hit-stop), white tint flash (`0xffffff`) or red armor flash (`0xff6666`), `vx` knockback slide, parabolic launch (`vz = 520`), ground thud + dust puff (`enemies.js:34-36,88`). | **Zero knockback (`vx`), zero launch (`vz`), zero shudder.** Enemies slide uninterrupted or stand still with a `0xffaaaa` tint, then vanish instantaneously at `0 HP` (`game-scene.js:48,54`). |
| **Camera trauma & shake** | Squared-trauma smoothed sinusoidal shake (`fx.js:44-50`) scaled per hit weight + camera look-ahead (`+facing * 50`, `stage1.js:751`). | **Zero camera shake** on shooting, bonking, guard blocks, boss slams, or charger rushes! Only Dad triggers a tiny `cam.shake(160, 0.008)` (`game-scene.js:97`). Camera `followX` (`camera.js:13`) snaps linearly with zero smooth damping or facing look-ahead. |
| **Projectiles & VFX** | Additive glowing multi-sprite fireballs (`core` + `glow` + moving `PointLight` + `ember` particle emitter, `stage1.js:455-460`) and `boom()` bursts. | Procedural `Graphics.fillEllipse` purple/blue ovals (`26×14` px, `game-scene.js:70`) and 5 tiny flat circles (`game-scene.js:64-67`). `src/fx.js` is completely unused! |
| **Lighting & atmosphere** | Normal-mapped fighters under moonlight + flickering fire point lights + Hero rim light + foreground/background snow particles + vignette (`stage1.js:157,187,201,241`). | Completely unlit flat sprites (`setLighting(false)`), zero ambient weather/dust/cloud particles, zero vignette, stark cut between HUD slab and background. |
| **Character art & animation** | 150+ painted frames on Riley; 40–70 frames per enemy; distinct anticipation, active, and recovery poses (`PLAN.md` §10). | `bob`, `dad`, `yetti_walker`, `yetti_guard` look cohesive and well-painted (`31`, `15`, `29`, `29` frames), **but 9 of 13 cast keys are stick/circle geometry stand-ins**, shattering visual immersion (`docs/shots/boss.png`, `docs/shots/wingmen.png`). |
| **Player melee & dash** | 3-hit combo chain, back-attack, run-kick, air-kick, walk-in grab + knee×2 + shoulder throw (`riley.js:8-16,162-184`). | Bob has auto-fire eggplant + single 1-frame close-range bonk (`Math.abs(e.x - bob.x) < 62`, `campaign.js:110` — which triggers automatically whenever firing near an enemy, sharing the exact same `attack` animation as shooting!) + ground dash. No air shot differentiation, no charge/spread shot, no throw. |

---

### Area 4: Controls on iPhone — **5.0 / 10** *(RWB Bar: 8.5 / 10)*

#### What Works Well
- Touch cluster activates cleanly via `(hover:none) and (pointer:coarse)` or `?touch=1` (`index.html:35-36`, `src/config.js:14`).
- In **844×390 landscape**, the 5 action buttons pass Apple's 44×44 pt target rule (`tbJump/Dash/Dad/Papi` = `61.7×51.4 px`, `tbFire` = `61.7×77.1 px`, verified in `docs/shots/browser-report.json`), and `pointerId` tracking (`src/input.js:43-59`) supports simultaneous left-thumb movement + right-thumb jump/fire without stuck buttons on `pointercancel`.
- Hold-to-autofire (`inp.held('fire')`, `src/bob.js:45`) is ergonomic for a run-and-gun brawler on glass.

#### Critical iPhone Control Failures
1. **Broken Portrait Escape Hatch (`index.html:41,66` + `docs/shots/phone-portrait-game.png`):** As detailed in Bug P0-2, `#rotate-start` lets iPhone users start in portrait, hides `#rotate` via `body:not(.playing) #rotate`, and clips `FIRE` off-screen (`right: 403 px` on a `390 px` screen!). Rotating to portrait mid-fight also fails to pause gameplay or display `#rotate`. Compare RWB (`rwb-s8/index.html:52-55`), which **never** offers a broken portrait gameplay mode — `#rotate` unconditionally covers portrait viewports (`@media (orientation:portrait) and (hover:none) and (pointer:coarse){#rotate{display:flex}}`).
2. **`#pause` and `#mute` Violate 44×44 pt HIG and Safe-Area Insets (`index.html:27-28`):**
   - `#top-buttons` sits at `right: 2%; top: 17%` with `padding: 7px 10px; font-size: 12px` (~`64×29 px`), well below Apple's `44×44 pt` minimum tap size, with no `env(safe-area-inset-right)` padding (placing them under the iPhone 15/16 Dynamic Island / sensor housing when held landscape-right!). Compare `rwb-s8/index.html:36-38`, which enforces `min-width: 44px; min-height: 44px` inside `@media (pointer:coarse)` and offsets by `env(safe-area-inset-right)`.
3. **Fixed-Center Stick Causes Immediate Unintended Walk (`src/input.js:47-50`):**
   - `stickMove` computes `dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2)` from the static DOM element center. Landing a thumb 15 px left of center immediately walks Bob backward. Floating the stick origin to the `pointerdown` coordinate (clamped within the left-thumb zone) is standard mobile action-game practice (`PLAN.md` §9).
4. **Dead / Uncommunicated Touch Affordances:**
   - **No double-tap dash on stick:** Keyboard players can double-tap Left/Right (`bob.js:43`), whereas touch stick movement never emits directional presses — touch players can *only* dash via `tbDash`, which shows no cooldown/2-stock pip state.
   - **No visual disabled/ready state on `DAD` / `PAPI` touch buttons:** `tbDad` (gold) and `tbPapi` (pink) look active 100% of the time (`docs/shots/muse-l1-touch-stage1.png`), even when `dadReady === false` or outside the final 10 seconds of the game when `papiState !== 'ready'`! Tapping `PAPI` in Chapters 1–2 appears completely broken to a touch player because the button looks bright pink and enabled yet does nothing (`bob_papiwait_01` isn't wired either!).
   - **No touch mash prompt when grabbed by Lecturer:** When `bob.grabbedBy` is active (`campaign.js:88-90`), there is no pulsing visual ring on `JUMP`/`FIRE`/stick to teach touch players to mash free.

---

### Area 5: HUD — **4.0 / 10** *(RWB Bar: 8.5 / 10)*

Side-by-side inspection of `docs/shots/muse-l1-stage1.png`, `docs/shots/boss.png`, and `docs/shots/wingmen.png` against `/workspace/rwb-s8/src/hud.js` highlights five severe HUD issues:

1. **116 px Opaque Top Slab Shrinks the World (`src/hud.js:6`):** `scene.add.rectangle(640, 58, VW, 116, 0x101421, 0.94)` blocks the top 16.1% of the 1280×720 canvas with a flat dark navy bar (`y = 0..116`). RWB renders full-bleed 720p environments with compact floating translucent bars, circular portraits, and subtle gradients (`rwb-s8/src/hud.js:76-125`).
2. **System `Arial` + Unicode Block Characters (`src/hud.js:3,23-29`):** Health, dash, Dad, Papacito, and boss HP are rendered as raw `Arial` strings of `♥`, `♡`, `▰`, and `▱` (`"HP ♥♥♥♥♥♥♥♥♡♡  100/120"`, `"INTERVENTIONIST  ▰▰▰▰▰▰▰▰▰▰▱▱▱▱"`). There are **zero painted UI frames, zero character/boss portraits, zero smooth damage-trail lerps, and zero display fonts** (unlike RWB's custom font + `drawRing` circular portrait badges + lerped `rHp` damage bars).
3. **Severe Performance Anti-Pattern — 8 Unconditional `Text.setText()` Calls Per Frame (`src/hud.js:23-38`):** Every Phaser `Text.setText()` call clears an offscreen HTML5 `<canvas>`, runs browser font layout + `fillText`/`strokeText`, and calls `gl.texImage2D` to upload a new texture to GPU memory. Doing this on 8 text nodes at 60 fps = **480 Canvas2D draws + 480 WebGL texture uploads per second**, even when nothing changed! RWB (`rwb-s8/src/hud.js:318-355`) caches previous strings/states (`loialState`, `sl.shown`, `phShown`) specifically to prevent per-frame `texImage2D` stalls on iOS.
4. **Missing Combat & Boss Readability Signals:**
   - **Dual Wingmen HP ambiguity (`src/hud.js:36`, `src/campaign.js:179`):** `campaign.hudState()` sums all alive bosses (`hp = bosses.reduce(...)`), displaying one combined bar (`WINGMEN  ▰▰...`). In Phase 3, where **each** Wingman must be individually reduced to `1 HP` (`exhausted`) to unlock Papacito, a single summed bar makes it impossible to tell whether Wingman A is at `1 HP` and Wingman B is at `90 HP`, or both are at `45 HP`!
   - **No regular/elite enemy HP or name bar** (`rwb-s8/src/hud.js:116-123` shows last-hit target name + HP bar for 3 seconds).
   - **Ignored `plate` parameter & static `GO` text (`src/hud.js:40`):** `flashGo(plate)` ignores `plate` completely and displays small static text `'KEEP GOING  →'` at `y = 660` with no pulsing arrow tween (compare `rwb-s8/src/hud.js:126,227`).
5. **Misplaced Permanent Street Label (`src/parallax.js:36-38`):** `scene.add.text(32, LANE_TOP - 30, meta.label, ...).setScrollFactor(0)` pins `'BOULEVARD OF BETTER JUDGMENT'` permanently at `(32, 490)` — colliding directly with Bob's sprite and the touch joystick (`docs/shots/muse-l1-touch-stage1.png`). Chapter titles belong in a transient 2.5s stage-entry banner, never welded onto the combat lane.

---

### Area 6: SFX / Music — **5.0 / 10** *(RWB Bar: 8.5 / 10)*

#### What Works Well
- `src/audio.js` carries over RWB's proven WebAudio architecture: iOS gesture unlock (`unlock()`), procedural + CC0 sample-layered SFX (`sfx.*`), active ducking (`duckGain` drops music to `0.28` during `say()`), and single-voice overlap prevention (`currentVoice`).
- The Suno track `assets/audio/bdb-rise.mp3` fits the comedic action tone well, and the 37 generated voice clips (`assets/audio/voice/*.mp3`, 904 KB total; ElevenLabs cast + Jason's cloned narrator via IndexTTS2) have strong comedic delivery and clean audio levels.

#### Critical Audio Deficiencies vs. `/workspace/rwb-s8`
1. **Single 5.79 MB MP3 (`bdb-rise.mp3`) Plays Unchanged Across Every Mode (`src/music.js`, `src/audio.js:196`):**
   - `bdb-rise.mp3` is a **4m 22.6s (`262.6s`), 48 kHz stereo 176 kbps MP3 (`5,789,400 bytes`)** — nearly **5× RWB's 1.2 MB per-track budget** (`rwb-s8/tools/audit-stage1.mjs:185`).
   - All 3 chapters and all 3 bosses map to `'bdb-rise'` (`STAGE_MUSIC` in `src/music.js:4-8`). There is **no Title music**, **no distinct boss music/layer**, **no wave-clear or victory stinger**, and `MusicDirector` (`src/music.js:18-57`) is completely unwired.
   - `streamEl()` (`src/audio.js:221`) computes `NaN` loop bounds because `loopStart`/`loopEnd` are undefined, falling back to `<audio loop>` which produces an audible MP3 frame-padding gap on iOS Safari.
2. **62% of Shipped Voice Files Are Silent Dead Weight (`src/voice-lines.js` vs `src/campaign.js`):**
   - Only 12 of 37 registered voice IDs ever fire. Bob never reacts when taking heavy hits (`bob_hurt_01..03`), never calls out `"Papacito!"` (`bob_papi_01`, because `campaign.js:132` plays `bdb_laugh` instead!), never says his cooldown barks when pressing `DAD`/`PAPI` early (`bob_dadwait_01`, `bob_papiwait_01` — compare `rwb-s8/src/stage1.js:529` `riley_call_spent_01`!), Dad never rotates `dad_call_01..03` or exits with `dad_done_01..02`, Papacito runners never shout `papi_chorus` / `papi_chorus_01..03`, enemies never bark `yetti_turnback` / `choir_serious`, Wingmen never cry `wingman_defeat`, and Claudia/Narrator intro & victory clips never play!
3. **Weapon & Boss SFX Lack BDB Identity (`src/game-scene.js:91-101`):**
   - Firing the Eggplant Launcher calls `sfx.fire()` (RWB's airy fireball whoosh) instead of a punchy comic pneumatic *thwump/pop*; eggplant impacts call `sfx.hit(false)` instead of a juicy squash/splat transient; Papacito's 3-runner sweep triggers `sfx.crowd()` once with zero per-slap comic *whack* stingers as the Wingmen get scooped up.
4. **Mute Bypass on Cutscenes & Unpaused Music on Manual Pause / Victory:** Covered in Bugs P0-1 & P2-14.

---

### Area 7: Pacing — **5.5 / 10** *(RWB Bar: 8.5 / 10)*

#### What Works Well
- The length rebuild (`docs/LENGTH-DIFFICULTY.md`) expanded `WORLD_W` to `7760 px` with 5 combat zones + 1 boss arena per stage (~53–57 enemies/stage). Normal bot clear times (**155s + 215s + 183s = 553s / 9.2 min**) land squarely inside the 8–12 minute 3-chapter target.
- Enemy roster introduction follows good brawler grammar: Stage 1 introduces Walkers + Hovers + Guards; Stage 2 introduces Choir band-denial; Stage 3 combines Chargers + Lecturers before the Dual Wingmen finale.

#### Pacing Problems vs. `/workspace/rwb-s8`
1. **45 Identical Lock-and-Clear Waves With Zero Mid-Stage Variety:**
   - Every single stage has the exact same rhythm: walk ~1,100 px → lock camera → clear Wave 1 → clear Wave 2 → clear Wave 3 → heal +25 HP → repeat **5 times in a row** → boss (`src/stages.js:6-44`). Across 3 chapters, that is **45 consecutive wave locks** with zero structural variation!
   - Compare `/workspace/rwb-s8`: Stage 1 breaks up arena waves with **breakable barrels/crates** dropping health and powerups (`stage1.js:191,543-557`), a mid-stage **Twix drop event** (`stage1.js:570`), **Twinkle Toes sightings/ribbons**, and dynamic **ter'angreal power pickups** (`lightning`, `fireshield`, `airwhip`, `angreal`) that temporarily transform Riley's ranged kit! Later RWB stages add tower/bridge hazards, fog mechanics, and ally skirmishes (`stage8-def.js`).
2. **Missing Breakables & Mid-Fight Pickups (`plan/BUILD-PLAN.md` §2.3, §5.2):**
   - `BUILD-PLAN.md` §2.3 explicitly called for protein-shake heals and breakable crates/props. None were implemented (`src/crate-texture.js` sits unused). Healing **only** between zones (`+25 HP`, `campaign.js:58`) means a rough Wave 1 forces conservative corner-camping through Waves 2 and 3, while bosses offer zero mid-phase heal drop (`bossDrop` in RWB).
3. **Zero Chapter Transition Breathing Room (`src/game-scene.js:105`):**
   - The instant Interventionist or Choirmaster hits `0 HP`, `campaign.step()` sets `this.cleared = true` on that exact frame (`campaign.js:50`), and `GameScene.update()` calls `this.scene.restart({ stage: this.stageNo + 1 })` **immediately on the same tick**! There is no boss KO slow-mo, no boss collapse animation, no `"CHAPTER 1 CLEAR"` banner, no 2-second breather, and no story bridge into Chapter 2 or 3.

---

### Area 8: Difficulty — **5.0 / 10** *(RWB Bar: 8.5 / 10)*

#### Quantitative Audit (`src/difficulty.js`, `docs/LENGTH-DIFFICULTY.md`)
- `DIFFICULTY` scales `hpScale`, `aggression`, `damage` (Bob's outgoing multiplier), and `recovery`:
  - **Easy:** `hpScale: 0.75`, `damage: 1.25` → **0.60×** Normal shots-to-kill (bot clears in ~7.5 min, 2 deaths).
  - **Normal:** `hpScale: 1.0`, `damage: 1.0` → **1.00×** baseline (bot clears in ~9.2 min, 23 deaths).
  - **Hard:** `hpScale: 1.55`, `damage: 0.9` → **1.72×** Normal shots-to-kill (bot clears in ~13.9 min, 96 deaths).
  - **Nightmare:** `hpScale: 2.2`, `damage: 0.8` → **2.75×** Normal shots-to-kill (**BOT FAILS Stage 2 & Stage 3 with 81–150 deaths!**).

#### Three Structural Difficulty Flaws
1. **Nightmare Scales Sponge Math Instead of Tactical Speed (`src/difficulty.js:8`):**
   - On Nightmare, Bob's eggplant deals `12 × 0.8 = 9.6` damage (`5 × 9.6 = 48 DPS` theoretical max if 100% of shots connect). A single Guard/Charger/Lecturer has `48 × 2.2 = 105.6 HP` (11 hits = **2.2s** of undivided fire; **4.4s** on a blocking Guard!). Choirmaster has `520 × 2.2 = 1,144 HP` (120 eggplants!) **while double-summoning 70–106 HP adds** every few seconds (`yettis.js:72,95`). As `docs/LENGTH-DIFFICULTY.md:66` candidly noted, Nightmare DPS race math is inverted — adds spawn faster than Bob can mathematically kill them.
   - RWB's rule (`PLAN.md` §5.3) is the right fix: *"Difficulty scales tokens, reaction times and armor, not just HP."* Cap Nightmare `hpScale` at `~1.5–1.65`, keep Bob's outgoing `damage >= 0.95`, scale incoming enemy damage (`enemyDamage: 1.35`), and scale `maxTokens` (`2 → 3 → 4`).
2. **Zero AI Attack Tokens & Zero Enemy Separation (`src/yettis.js` vs `rwb-s8/src/stage1.js:339-344`):**
   - In RWB, `attackTokens()` limits simultaneous committed attackers to `maxTokens = 2` (and blocks all other grabs/attacks while Riley is held via `grabBusy()`), while `separation(e)` pushes overlapping enemies apart (`dx < 90 && dy < 30`).
   - In BDB, `Yetti.update()` (`src/yettis.js:36-53`) runs every enemy completely independently with **zero separation force and zero token cap**:
     - Four Walkers/Guards/Chargers collapse onto the exact same `(x, y)` coordinate, overlapping into one unreadable blob and swinging simultaneously.
     - Multiple Lecturers can chain-grab Bob or attack him **while he is already grabbed** (`campaign.js:118-130` deals snowball, halo, slam, and melee damage to Bob even while `bob.grabbedBy` holds him helpless — compare `rwb-s8/src/riley.js:231`, where `if (this.grabbedBy && from !== this.grabbedBy) return false` protects a held player from unavoidable dogpiles!).
3. **Infinite Zero-Consequence Respawns Undermine Stakes (`src/campaign.js:148-160`):**
   - Dying in BDB has **zero lives limit and zero Game Over screen**: Bob respawns 1.1 seconds later at full `120 HP` with `2.4s` invulnerability, and **Stage 1 & 2 bosses keep all accumulated chip damage** (`campaign.js:158` only resets wave adds, leaving `Interventionist` and `Choirmaster` at their lowered HP!). A player can literally hold Fire with eyes closed, die 40 times, and still beat Stages 1 and 2 — whereas Stage 3 Phase 3 abruptly resets both Wingmen to 200 HP on death (`campaign.js:154-156`). RWB's `3 lives → Game Over → Continue` model (`stage1.js:413-421`, with nearby enemy pushback on getup) gives every health bar real tension without punishing casual players (since Continue restarts in-place).

---

### Area 9: Boss Design — **4.5 / 10** *(RWB Bar: 9.0 / 10)*

#### Comparison Against `/workspace/rwb-s8` Bosses
RWB's Stage 1 Chieftain (`rwb-s8/src/enemies.js:124-182`) and Stage 8 Lanfear (`stage8-def.js`) demonstrate high-craft brawler boss design: 3 escalating phases, distinct animated tells, environmental interaction (Chieftain's horn charge crashes into the arena wall, triggering debris/shake and a `2.0s` self-stun with `1.25×` bonus vulnerability!), arena-altering hazards (hurled burning carts that ignite persistent fire light patches), wakeup super-armor (`armorT = 0.9` so bosses can't be infinite-looped), and dramatic slow-mo KOs.

#### BDB Boss Critique
1. **Visuals — All 3 Bosses Are Geometric Placeholders (`docs/shots/boss.png`, `docs/shots/wingmen.png`):**
   - `interventionist`, `choirmaster`, and `wingman` are flat colored circles with stick arms/halos (`assets/chars/_pack_report.json` flags `"placeholder": true` on all three). Fighting a pastel circle at the climax of each chapter kills payoff.
2. **Chapter 1 Boss — The Interventionist (`src/yettis.js:55-82`):**
   - **Sponge HP:** `1,200 HP` (`100` eggplants on Normal!) with only two attacks (`slam` radius `170` and horizontal `rush` at `420 px/s`).
   - **Missing punish loop:** When `rush` hits the arena boundary (`yettis.js:24` clamps `x` silently to `bounds.l..r`), he just glides along the wall until `rush` expires (`0.55s`) and enters a tiny `0.45s` recover. Adding an RWB-style **wall-crash self-stun** (`1.4s` daze + screen shake + `1.25×` damage window when baited into the wall) immediately turns a repetitive sponge into a skillful bullfight!
3. **Chapter 2 Boss — The Choirmaster (`src/yettis.js:56-100`):**
   - **Zero movement (`speed: 0`):** Stands glued to `x = z.l + 880, y = 570` (`campaign.js:65`) for the entire fight. Bob just stands in the safe lane holding Fire for ~50 seconds.
   - **Double add-spawn bug (`yettis.js:72,95`):** Spawns adds both on `addTimer` AND on every `telegraph`, turning Phase 2/3 into messy add soup.
   - **Needs 3 distinct musical phases:** e.g., Phase 1 single safe-lane hymn + glide repositioning across corners; Phase 2 sequential 3-chord sweeping wave (`top → mid → bot` rhythm dodge); Phase 3 shielded choir-conductor crescendo where breaking his podium/shield opens a vulnerability stun.
4. **Chapter 3 Finale — The Dual Wingmen & Papacito (`src/wingman.js`, `src/papacito.js`):**
   - **What's great:** The 3-phase arc (Phase 1 lane volleys → Phase 2 tracking dive-swoop → Phase 3 split into Dual Wingmen that clamp at `1 HP` `exhausted` so only **Papacito** can finish them) is inventive, funny, and faithfully implements the core joke.
   - **Four concrete boss bugs/design flaws to fix:**
     1. **1-frame teleport in Phase 2 (`wingman.js:52`):** At the end of `telegraph`, `this.x = this.attackX; this.y = this.attackY; this.z = 0` snaps the Wingman instantaneously across the arena instead of interpolating a fast swoop arc from `(x, y, z=110)` to `(attackX, attackY, z=0)`!
     2. **Synchronized Phase 3 volleys (`wingman.js:35,44`, `campaign.js:68`):** Both split Wingmen initialize `this.volley = 0` and identical `timer` cadences, firing identical `safeBand = volley % 3` volleys in lockstep instead of staggered/complementary patterns (`volley = 0` on Left, `volley = 1` + `+0.65s` timer offset on Right, capped so at least 1 lane is always safe!).
     3. **Unreadable `1 HP` clamp (`hud.js:36`, `game-scene.js:54`):** Because both Wingmen share one summed boss HP bar and `exhausted` only tints `0x99ccff` (no knelt/dizzy grounded pose (`z = 0`), no `"1 HP — CALL PAPACITO!"` badge over the exhausted Wingman), players cannot tell when one Wingman is already exhausted and waste shots into an invulnerable `1 HP` target.
     4. **Tastefulness check (`BUILD-PLAN.md` §5.6):** Simulation and audio follow all standing rules (3 clothed adult joggers sweep the exhausted Wingmen horizontally off-screen in `1.8s`; Bob is untouched; no sexualized mechanics). Only `index.html:75`'s leftover `"Legally, it's produce."` copy violates `docs/BOB-LINES.md` and must be updated.

---

### Area 10: Cutscene Flow — **4.5 / 10** *(RWB Bar: 8.5 / 10)*

#### Media Inspection (`ffprobe` Verified)
- `assets/cutscenes/opening.mp4`: H.264 High (`avc1`), **`1920×1080` @ 30 fps**, `8.60s`, `2.40 MB` (`2.24 Mbps`), stereo 48 kHz AAC (`183 kbps`). Poster `opening.jpg` (`157 KB`).
- `assets/cutscenes/victory.mp4`: H.264 High (`avc1`), **`1920×1080` @ 30 fps**, `10.00s`, `2.68 MB` (`2.14 Mbps`), stereo 48 kHz AAC (`182 kbps`). Poster `victory.jpg` (`175 KB`).

#### Cutscene Lifecycle & Storytelling Gaps vs. `/workspace/rwb-s8`
1. **Stripped-Down `src/cutscene-hooks.js` (11 LOC vs RWB's 33 LOC + 108 LOC `cutscene-scene.js`):**
   - **No `muted: isMuted()`:** Plays full-volume video audio even when muted (Bug P0-1).
   - **No `frame: () => game.canvas?.getBoundingClientRect?.()`:** Video overlay covers `100vw × 100vh` instead of framing cleanly over the 16:9 game canvas (`src/cutscene.js:44-52` already supports `frame`, `cutscene-hooks.js` just never passes it!).
   - **No Phaser pause (`setPauseReason('cutscene', true)` / `game.pause()`):** `Title` and `GameScene` continue updating and rendering WebGL behind the `<video>` element.
   - **No `createSeen(sessionStorage)` or `press-ownership`:** Unlike RWB, skipping a cutscene with `Enter`/`Space` isn't guarded by `consumePress`, and listener teardown isn't bound to `game.events.once('destroy')`.
2. **Resolution Exceeds Mobile Spec (`1920×1080` vs `960×540`):** `plan/BUILD-PLAN.md` §2.5 and §5.1 specify `960×540` H.264 MP4 for mobile hardware decode headroom. Downscaling to `960×540` (~1.1 Mbps) halves file size (~1.1 MB each) and cuts iOS video compositor bandwidth by **75%** with zero perceptible sharpness loss on a 844×390 iPhone screen.
3. **Disconnected Narrative Arc & Unused Cast VO:**
   - Nine recorded narrative voice files (`nar_intro_01..03`, `nar_kidnap`, `bdb_open`, `claudia_open`, `claudia_question`, `claudia_leave`, `nar_victory`) sit completely unused in `assets/audio/voice/`.
   - **Zero Chapter 1→2 and Chapter 2→3 transitions:** RWB bridges stages with lightweight in-engine story panels + voiced captions (`STORY_SCRIPT` / `Cutscene` in `rwb-s8/src/twix.js` & `stage1.js:324-337`) guarded by a wall-clock `cutsceneWatchdog` (`rwb-s8/src/guard.js:19-29`). Adding 2–3 beat in-engine chapter bridges lets BDB use its already-recorded narrator/Bob/Claudia lines!
   - **Missing Victory In-Engine Payoff:** Defeating the Wingmen cuts straight from caged Claudia to `victory.mp4` on the exact frame Papacito exits, without opening Claudia's cage, playing `claudia_freed`, or voicing `claudia_open` → `claudia_question` → `claudia_leave` + `nar_victory`!

---

### Area 11: Performance and Memory — **6.5 / 10** *(RWB Bar: 8.5 / 10)*

#### Complete GPU & Audio Memory Accounting (Correcting `docs/GPU-MEMORY.md`)
`docs/GPU-MEMORY.md` accurately measured **character atlas** VRAM (`4.81 MiB` Stage 1, `3.67 MiB` Stage 2, `3.82 MiB` Stage 3 via ASTC 4×4 KTX), which is a huge architectural win over RWB's uncompressed WebP character atlases. **However, `docs/GPU-MEMORY.md` omitted background textures and decoded WebAudio PCM buffers:**

| Memory Category (Stage 1 Active) | Asset Breakdown | Actual Resident Memory | Notes / Issue |
|---|---|---|---|
| **Character Atlases (KTX ASTC 4×4)** | `bob` (0.85) + `dad` (0.45) + `yetti_walker` (1.33) + `yetti_guard` (1.28) + `yetti_hover` (0.15) + `interventionist` (0.15) + `claudia` (0.06) | **4.27 MiB GPU** *(+0.54 MiB if all S1–3 placeholders counted)* | Excellent! `releaseStage` frees previous stage's boss/enemies. |
| **Background Plates (WebP → RGBA8888)** | `s1-far` (`1600×720` = **4.39 MiB**) + `s1-mid0..5` (`6 × 1280×720` = **21.09 MiB**) + `s1-floor` (`1280×220` = **1.07 MiB**) | **26.56 MiB GPU** | **Uncounted in `GPU-MEMORY.md`!** All 6 mid plates stay resident simultaneously (`parallax.js:24`), whereas RWB `zone-stream.js` keeps only `far + floor + 2 mids` (**12.5 MiB**, saving **14.1 MiB**!). Also 3 unused `1280×720` WebPs (`chapter2-clouds`, `chapter3-castle`, `astra-keep`) sit in `assets/bg/`. |
| **HUD Text Textures (RGBA8888)** | 8 dynamic `Phaser.GameObjects.Text` canvases + banner + street label | **~1.8 MiB GPU** (**480 `texImage2D` uploads/sec!**) | **Severe CPU + GPU upload bottleneck** (`src/hud.js:23-38` calls `setText()` unconditionally every frame). |
| **WebAudio Decoded Voice Buffers** | `preloadClips(stageLines(stageNo))` decodes **35 MP3s** into 48 kHz Float32 PCM (`~75s` total audio × 48,000 × 4 B) | **~13.7 MiB RAM** | Decoded all at once on `GameScene.create()` (`game-scene.js:18`), **then evicted on `shutdown` and re-fetched/re-decoded from scratch on Stage 2 and Stage 3!** |
| **Render Targets (`RS0` on iPhone)** | `1280×720 × 1.5 = 1920×1080` WebGL2 drawingbuffer (color + depth/stencil, no Bloom FBO) | **~15.8 MiB GPU** | Good baseline (`RS0 <= 1.5`, no full-screen filter FBOs), **but** `quality-governor.js` is unwired so `RS` never steps down to `1.0` if FPS dips! |
| **Total Peak Resident (Stage 1)** | GPU Textures + Drawingbuffer + PCM Audio | **~48.4 MiB GPU + ~14 MiB PCM** | Comfortably below the 150 MB GPU cap today, **even after** the 9 placeholder character atlases grow by ~6–8 MiB of ASTC textures — provided BG streaming and HUD text caching are fixed! |

#### Top 5 Runtime Performance & Stability Risks on iPhone Safari
1. **480 WebGL Texture Uploads/Sec in `HUD.update()` (`src/hud.js:23-38`):** Re-rasterizing 8 `Arial` strings on CPU Canvas2D and uploading via `texImage2D` every 16.6 ms causes periodic 4–9 ms main-thread/GPU driver stalls on iOS WebKit and triggers GC churn. Caching last-rendered values eliminates >99% of these uploads immediately.
2. **Per-Frame `Phaser.GameObjects.Graphics` Re-Tessellation & Array Allocations (`src/game-scene.js:48,64-85`):**
   - `this.g.clear()` + dozens of `fillEllipse` / `strokeEllipse` / `fillRoundedRect` / `lineBetween` calls re-triangulate polygon ear-clipping geometry on the CPU every frame. Replacing shadows, projectiles, halos, and particles with pooled atlas/canvas textures + `src/fx.js` `ParticleEmitter` batches everything into fast sprite quads.
   - `syncViews()` and `drawFx()` allocate `new Set(...)`, `w.enemies.filter(...)`, and `this.particles = this.particles.filter(...)` every frame (180+ short-lived allocations/sec).
3. **35-Clip Concurrent `decodeAudioData` Spike & Cross-Stage Eviction Churn (`src/game-scene.js:18,22`, `src/voice-lines.js:46`):**
   - `stageLines(stageNo)` returns 35 clips on every stage (34 shared + 1 `nar_chN`). Firing 35 `fetch` + `ctx.decodeAudioData` promises on `GameScene.create()` spikes CPU/IPC right as Zone 1 begins, and calling `releaseClips(stageLines(this.stageNo))` on shutdown throws away all 34 shared buffers (`bob_*`, `dad_*`, `papi_*`, etc.) right before Stage 2 immediately re-downloads and re-decodes them! Only stage-exclusive clips (`nar_ch1`, `interventionist_intro`, etc.) should be released on stage transition.
4. **Unwired `quality-governor.js`, `guard.js`, and `recovery.js`:**
   - Without `installQualityGovernor` (`src/quality-governor.js`), an iPhone 12/13 in Low Power Mode or thermal throttle stays locked at `RS = 1.5` instead of stepping down to `1.25` / `1.0`.
   - Without RWB's `installFrameGuard` (`rwb-s8/src/guard.js`) and `installLoadTimeout`, a single uncaught exception in a Phaser scene step halts the `requestAnimationFrame` loop permanently on a frozen frame instead of catching/recovering (`showStuck`).
5. **Broken On-Device Perf Telemetry (`src/main.js:53,59`, `src/perf-panel.js`):**
   - Clobbering `window.__perf` and leaving `perf-panel.js` + `#perf-open` unwired means Jason cannot tap a `?perf=1` HUD pill on his iPhone to view/copy `p95`, long frames, and renderer info without tethering a Mac with Safari Web Inspector.

---

## 4. Prioritized Summary of What Must Happen Next

To bring `/workspace/bdb-argon` from **4.9 / 10** to **≥ 9.0 / 10 (RWB 2.0 parity or better)**, execution should proceed in six disciplined phases detailed in [`docs/ARGON-PLAN.md`](ARGON-PLAN.md):

1. **Phase 0 (P0 Blockers & Lifecycle Bugs):** Fix cutscene mute bypass & Victory audio clash; remove `#rotate-start` portrait trap & enforce 44pt safe-area `#top-buttons`; fix enemy animation mapping & add real knockdown/death animations; fix `window.__perf` clobber & duplicate lifecycle listeners; fix gamepad `Start` / keyboard `Enter` parity; free Claudia from her cage on Victory and retire `"Legally, it's produce."`.
2. **Phase 1 (Performance, Memory & Crash Resilience):** Eliminate per-frame `HUD.update()` text uploads; replace per-frame `Graphics` projectiles/particles with pooled textures + wired `src/fx.js`; stream stage mid-plates per zone (`zone-stream.js`, saving 14.1 MiB GPU RGBA); stop evicting shared voice `AudioBuffer`s between chapters; adapt and wire `quality-governor.js`, `perf-panel.js`, `recovery.js`, and `guard.js`.
3. **Phase 2 (Game Feel, Controls & HUD Overhaul):** Wire `FX` trauma shake, weight-tiered hit-stop (`4/7/10/14f`) + boss KO slow-mo, enemy knockback/shudder/corpse fade, distinct Bob shoot vs. bonk/jump/dash animations, floating touch joystick + stateful `DAD`/`PAPI`/`DASH` buttons + grab-mash prompt, and replace the 116 px `Arial` slab with a full-bleed RWB-grade portrait & lerped-bar HUD (including **dual Wingman bars**).
4. **Phase 3 (AI Tokens, Difficulty, Pacing & Boss Redesign):** Add RWB `attackTokens()` + `separation()` + grab invulnerability; rebalance Nightmare (`hpScale: 1.6`, token/speed scaling) and add 3-life Continue loop; break up the 15-wave repetition with breakable supplement crates, protein-shake drops, and mid-stage Claudia sightings; upgrade Interventionist (wall-crash stun), Choirmaster (3-phase moving conductor, fix double-summon), and Dual Wingmen (interpolated swoop arc, desynced pincer volleys, clear `1 HP EXHAUSTED` state, 2-swat clamped Dad call-in).
5. **Phase 4 (Audio, Voice & Cutscene Polish):** Wire `MusicDirector` (Title theme, stage vs. boss intensity/tracks, victory stinger, gapless WebAudio loop); wire all 26 unused voice clips across gameplay & in-engine chapter bridges; transcode `opening.mp4` & `victory.mp4` to `960×540` with clean mixed VO/captions and full `cutscene-scene.js` pause/mute/frame lifecycle.
6. **Phase 5 (Final Art Replacement & Physical iPhone Gate):** Paint, clean, register, and ASTC-pack the 9 remaining character/boss/prop sheets (enforcing adult clothed tastefulness on `papi_runners`), pass the 9/10 freeze-frame test, pass all 4 difficulty bot runs (including Nightmare!), and sign off on physical iPhone Safari (`p95 <= 20 ms`, zero reloads).
