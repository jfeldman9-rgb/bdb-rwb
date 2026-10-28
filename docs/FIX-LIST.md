# BDB Fix List — Pass 5 (from Pass 4 reviews)

**Date:** 2026-10-28
**Head reviewed:** `cursor/bdb-pass4-cfe0` @ `3f76903` (draft PR #11).
**Sources:** Kimi (`docs/REVIEW-KIMI-PASS4.md`, PR #12, branch `cursor/kimi-review-pass4-66bb`), Muse (`docs/REVIEW-MUSE-PASS4.md`, PR #13, branch `cursor/muse-pass4-review-8008`), Argon (`docs/REVIEW-ARGON-PASS4.md`, PR #14, branch `cursor/argon-review-pass4-6474`), Claude (`docs/REVIEW-CLAUDE-PASS4.md`, PR #15, branch `cursor/claude-review-pass4-ee07`).
**Locked, not on this list:** eggplant fires straight (`vy=0`, no aiming); `CAM_LEAD` stays 0.28; no upgrade shop; quoted lines and Dad's catchphrase stay exact; Choirmaster numbers stay (hp 1140 and the rest); `intro_v3.mp4`; Adventure stays 140–240 s per stage. The eighteen Pass 4 items below are done. Do not reopen them.

| ID | Fix | Found by | Notes |
|---|---|---|---|
| **P5-1** | Boot crash: `GameScene` owns the fighter `'shadow'` ellipse. FX no longer registers that key. A texture-exists guard alone is not the fix. | Muse P1; Claude B1 | `tools/browser-smoke.mjs` launches Chrome, clicks through to gameplay, and checks `started`, advancing frames, no error card, and stage 1. The intro assertion is `intro_v3.mp4`. |
| **P5-2** | Phase-3 finisher is ready when every living Wingman is at 1 HP, including a sole survivor. A phase-3 floor is not "THE BOSS IS BRAGGING". `wingHp <= 0` stays dead when `wingDead` is omitted. | Claude B2; Argon 1; Kimi T1/T2 | Eggplants still pass through a floored Wingman. Both floored and alive still refuses with NO TARGETS IN SIGHT and does not spend a charge. |
| **P5-3** | Freeze-guard strikes reset on a healthy `beat` and on a stage change. The stuck card's Reload listener is persistent, so a second card still reloads. | Claude B3/B4; Argon 3 | Two errors with no beat between them still trip. Startup's own Reload listener is left alone. |
| **P5-4** | Gate ticks only on the continuous Interventionist/Choirmaster bar. Choir buff pulse draws even when the choir also has a ring. Render reads `choirBuff` cached on the sim step. `choirAura` is one frozen object. | Argon 2; Claude B5/B8; Kimi T5 | `choirMultiplier` stays 1.28. |
| **P5-5** | `separateEnemies` skips hold and telegraph and does not clamp to the camera. Walkers still clamp to the world in `Yetti.update`. Push stays 8px per step. | Claude B7; Argon 4 | |
| **P5-6** | Hot per-frame copies: perf metadata is cached until resize/quality/search/renderer changes; `tick` does not stringify every frame; gun, shot, wingman, prompt, boom, and event-batch scans reuse buffers. | Argon 5; Claude B8 | |
| **P5-7** | Superseding a clip invokes the previous settle callback with `'abort'` before the new hold is cleared. `CutscenePlayer.abort` still does not call `done`, so `destroy()` does not fire victory. A clip that finishes inside `play()` does not re-arm the hold. | Claude B6 | |
| **P5-8** | A chapter `loaderror` sets `__bdbStartup.failed`, and `create()` returns before audio, the sim, and `started`. | Argon 6 | |
| **P5-9** | `killImpact('ko')` splats when `source` is missing. Explicit `'bob'` stays silent. `recordKo` still emits `source`. | Kimi T2 | |
| **P5-10** | A `boss` event in the same drained batch as a cutscene does not start boss music. The clip end still brings it back. | Muse / Claude stage-3 blip | |
| **P5-11** | Camera respawn, freeze-guard `started`, and press-ownership/governor checks are behavior tests. | Argon 7; Kimi T3 | |
| **P5-12** | Deleted unreferenced `src/crate-texture.js`, `src/cutscene-scene.js`, `src/music.js`, and `src/perf-panel.js`. | Argon 6 | `src/page-base.js` stays. `bootstrap.js` reaches it through `debug-flag.js` (`installDirectoryBase`). |
| **P5-13** | Nightmare snowballs clear at 58px. Adventure and Story stay at 65. This pulls Nightmare stage 3 at 60 Hz into line with 30/120 without retuning Choirmaster, pace, or Adventure. | Muse P1 pacing | Device loop is still 1/60. The 58px clear is only the nightmare projectile test. |

### Deferred
- Recharge-banner punctuation and other copy nits the four reviews mentioned outside this list.
- Choirmaster fight numbers. Still waiting on Jason.

---

# BDB Fix List — Pass 4 (from Pass 3 reviews)

**Date:** 2026-10-28  
**Head reviewed:** `cursor/bdb-pass3-7221` @ `1eb6f3a` (draft PR #6). Coding starts at `298879e`, where the missing-file boot break is already committed.  
**Sources:** Muse (`docs/REVIEW-MUSE-PASS3.md`, branch `cursor/muse-pass3-review-54c5`, 5.5/10), Argon (`docs/REVIEW-ARGON-PASS3.md`, branch `cursor/argon-review-pass3-a093`, 6.5/10), Kimi (`docs/REVIEW-KIMI-PASS3.md`, branch `cursor/kimi-review-pass3-ea29`, 4/10), Claude (`docs/REVIEW-CLAUDE-PASS3.md`, branch `cursor/claude-review-pass3-0e64`, 4/10), plus the Pass 3 deferrals in `docs/OVERNIGHT-STATUS.md`.  
**Locked, not on this list:** eggplant fires straight (`vy=0`); `CAM_LEAD` stays 0.28 (use the constant, do not change the number); no upgrade shop; Dad's catchphrase and every quoted Bob/Yetti line stay exact; do not touch `assets/cutscenes/intro_v3.mp4`. Choirmaster fight numbers stay put until Jason signs off (Claude C3).

### Already landed at `298879e` — do not reopen
The four reviews scored PR #6 at `1eb6f3a`, which did not boot: `src/shot-feel.js` was never committed, and `bindRotatePause` / `noteRenderer` were imported without exports. `b360d53` commits that module and those exports, removes the unread `FX.slowmo` / `FX.hitstop` fields, and sends snowball knockback through `p.dir`. `298879e` records the clean-clone `192/192`. Confirmed on this tree before the list below was written. Skip it.

| ID | Fix | Found by | Notes |
|---|---|---|---|
| **P4-1** | Nightmare Stage 3 stalls at a 30 Hz step: a phase-3 Wingman already at 1 HP soaks every eggplant, so the other Wingman never reaches the finisher. Stop soaking at the floor. Add a 30 Hz clear and a full Nightmare Stage 1 clear. | Muse P1 (30 Hz stall, missing S1 test); Claude T2 | Not a Choirmaster retune. The device loop still steps the sim at 1/60; this is the bot-harness dt the finishability proxy uses. |
| **P4-2** | The freeze guard shows the stuck card during a slow chapter load, and the first same-origin error covers a stage that is still running. Skip while loading. A single stray error does not trip; a repeat does. Empty `filename` does not trip. Slow-load test. | Claude R2, R5; Claude T3 | `started` belongs to `create`, not `preload`. |
| **P4-3** | Dad's catchphrase is dropped when another line is sounding (cutscenes off, including every Reload resume). Put `dad_catchphrase` on the scripted wait. Wording unchanged. | Claude R3; Claude T4 | |
| **P4-4** | A dead Wingman is revived at 1 HP when phase 3 respawns. `wingHp <= 0` stays dead. Clear `wingHp` when the phase advances so phase-N HP cannot land on phase N+1. | Argon #2; Muse P2; Claude R8, T6 | The phase-3 floor of 1 still applies to a Wingman who is alive. |
| **P4-5** | `showStuck` stacks a second click listener on `#startup-retry`. `installStageRecovery` never clears its timer on `game.destroy`. | Argon #3; Claude R7; Kimi minor 4 | The startup Reload listener already resumes. |
| **P4-6** | `startHeldClip` pauses Phaser before `createStoryPlayer.play`, so the story player's resume is a no-op and `destroy()` can leave the game paused. One owner. Abort a live clip before starting another. | Argon #4; Kimi minor 3 | |
| **P4-7** | Per-frame arrays in `syncViews`, `effects`, particles, and the HUD boss bars. Boss bars also mark the 66% and 33% gates. | Argon #5; Claude R10; Muse readability (phase ticks) | |
| **P4-8** | Stage 2 music starts in `create` and is faded out the same frame when the kidnap clip runs. | Argon #5; Kimi F8 | |
| **P4-9** | Respawn hardcodes `VW * 0.28` instead of `CAM_LEAD`. | Kimi minor 1 | The value stays 0.28. |
| **P4-10** | Mercy banner replaces the checkpoint banner in the same tick. A killing eggplant splats twice and plays a light hit then a heavy hit. | Kimi F8 | |
| **P4-11** | "Dad not unlocked yet" is reported as spent (`DAD'S OUT OF SWATS`). The spent banner does not show the 10-KO / 45 s recharge. | Claude C10 (Pass 2, still open) | |
| **P4-12** | Escape and P start a run from the title. Pad Start still begins. Enter still begins. | Claude C12 (Pass 2, still open); Muse P2 | |
| **P4-13** | Plan docs still promise a second Dad swat. The packed atlas is one swat. Reconcile the docs. | Claude C13 (Pass 2, still open) | Do not add a second swat. |
| **P4-14** | Choir buff has no visual: 300 px ring, note glyphs, gold pulse on buffed enemies. | Muse readability (MUSE-100 #24) | `choirMultiplier` unchanged. |
| **P4-15** | Guard shield chips 1–2 draw nothing. Crack the ellipse. Clang rises per chip. Break threshold stays 3. | Muse readability (MUSE-100 #26) | |
| **P4-16** | Same-lane Yettis stack into one sprite. Separate bodies under 46 px. Bosses exempt. Fixed `actorId` order. | Muse readability (MUSE-100 #29) | Keep Adventure clears inside 140–240 s. |
| **P4-17** | Boss corpses use the same 0.5 s hold as minions. Hold a boss knockdown longer, then fade. | Muse readability | Minion hold stays 0.5 s. |
| **P4-18** | After the title, a missing chapter file still says the game stopped before the title screen. | Claude R6 | |

### Deferred (not in the eighteen)
- **Choirmaster fight balance** (Claude C3). Waits for Jason. No HP, volley, or add retune.
- **Muse Adventure zone-5 spike.** No further heal cut. Band stays 140–240 s.
- **Kimi G5.** The rotate overlay's real orientation flip is still a browser check. `bindRotatePause` is unit-tested.
- **Claude R9.** `grabPunish` is a handoff only `Campaign.update` consumes. The campaign clears it the same step. Left as-is.
- **Kimi minor 5.** A static "every import name is exported" check. `tests/boot.test.mjs` already imports every module; the missing-export failure mode was the uncommitted file, now fixed.
- **Muse Story flatness / human playthrough** and the nocutscenes back-to-back narration ear-check. Bot band only this pass.

---

# BDB Fix List — Pass 3 (from Pass 2 reviews)

**Date:** 2026-10-28  
**Head reviewed:** `cursor/bdb-pass2-d377` @ `c9cf35a` (draft PR #2)  
**Sources:** Muse (`docs/REVIEW-MUSE-PASS2.md`, branch `cursor/muse-pass2-review-bb6b`, 6.5/10), Argon (`docs/REVIEW-ARGON-PASS2.md`, branch `cursor/argon-review-pass2-e8b7`, 8.2/10), Claude (`docs/REVIEW-CLAUDE-PASS2.md`, branch `cursor/claude-review-pass2-7c00`, 7/10), plus Kimi F4–F8 still open from `docs/REVIEW-KIMI-PASS1.md` (`bdb-kimi-review-pass1`).  
**Locked, not on this list:** eggplant fires straight (`vy=0`); `CAM_LEAD` 0.28; no upgrade shop; Dad's catchphrase and every quoted Bob/Yetti line stay exact; do not touch `assets/cutscenes/intro_v3.mp4`. Choirmaster fight numbers from PR #2 stay put until Jason signs off (Claude C3).

| ID | Fix | Found by | Notes |
|---|---|---|---|
| **P3-1** | Nightmare full-stage finishability (S2 Choirmaster, S3 Wingmen). Full-stage bot-clear test. `tools/bot-sim` drains `dad_callin`. | Muse P0; Argon (bot-sim never drains the call-in) | Do not retune Choirmaster HP, volleys, or adds. S3's wall is respawn giving the Wingmen their HP back. |
| **P3-2** | Voice-queue starvation: `bdb_open` dropped on S1, `claudia_open` on S3, `nar_ch2` killed by the kidnap cutscene, third queued line dropped. Tests per case. | Argon #1; Claude C5, C14 | Scripted lines wait behind whatever is sounding. Stretch every queued entry when a line starts. Emit the kidnap clip before `nar_ch2`. |
| **P3-3** | Dad clip tap-to-unmute also skips the clip. Bless iOS sound before the first call. Listeners and the video element survive stages. | Claude C1, C2; Argon #2 | Drop the in-clip `pointerdown` bless. One Dad `CutscenePlayer` kept across `abortDadCall`. |
| **P3-4** | Wingman telegraph lanes use the same lane constants as the halo (Kimi F6). | Muse P1 telegraph; Claude C9; Kimi F6 | `laneY` / `LANE_H`. Dust bands too. Not a Choirmaster balance change. |
| **P3-5** | Dad catchphrase on the swatter impact, not on spawn. | Muse P1 | Emit from the `dadhit` resolve. Wording unchanged. |
| **P3-6** | Chapter select does not replay the 61s intro. Pause Phaser behind the intro. | Muse P1; Argon #4; Claude C6 | Intro only for chapter 1. `createStoryPlayer.play` parks the loop. |
| **P3-7** | `recovery.js` reachable after the title, plus `showStuck` callers. | Argon #3; Claude C8 | Keep the startup Reload listener. Graphics retry uses `resumeGame`. Freeze guard and gameplay errors call `showStuck`. |
| **P3-8** | Papi wipe synced to the runner front, per enemy. | Muse P2; Argon #7; Claude C4 | `(screenX + 180) / 980`, shared with `papacito-fx.js`. |
| **P3-9** | Lecturer grab: killing the grabber does not hurt Bob. Timeout goes through `hurtBob`. | Argon #6 | |
| **P3-10** | Wingman HP bar overlap and W1/W2 labels. | Argon #5; Claude C11; Muse P2 bars | Side-by-side bars. A dead Wingman stays an empty labeled bar. |
| **P3-11** | F7 mercy vs "already swatted this phase", and K3 `camMax` on respawn. | Argon #9; Claude C7; Kimi F7; Kimi K3 | Mercy clears that phase's `phaseCalls`. Respawn sets `camMax` to the checkpoint camera. |
| **P3-12** | Per-frame `matchMedia` and DOM writes. Dead `FX.slowmo` / `FX.hitstop` (remove). Snowball knockback follows travel. Recoil is a kick. Distinct halo/shockwave shapes. | Argon #8; Muse (slow-mo, knockback, recoil, shapes); Kimi F4, F5; Kimi K6 | Presentation only. Bot step stays 60 Hz. |
| **P3-13** | Regex-only tests become behaviour tests. | Argon test gaps; Claude C15 | `press-governor` pause, `recovery` boot wire, `input-map` title/Enter, `wingman-sim` HUD source match. Heal-test title matches the assertion. |

### Deferred (not in the thirteen)
- **Choirmaster fight balance** (Claude C3). The volley now fires and phase 1 no longer tops up adds. Jason signs off. Do not retune in this pass.
- **Kimi F8** cosmetics: stage-2 music blip, mercy banner replacing the checkpoint banner, kill impacts splatting twice.
- **Claude C10** refusal-banner nits (pre-unlock reads as spent; no 10-KO / 45s progress).
- **Claude C12** Escape and P start the game from the title.
- **Claude C13** plan docs still promise a second Dad swat.
- **Muse readability leftovers:** choir aura, guard shield cracks, enemy separation, corpse hold for bosses.
- **Kimi G5** rotate overlay only covered in the browser smoke tool.
- **Muse** Adventure zone-5 spike: accepted, not another heal cut. Band stays 140–240s.

---

# BDB Fix List — merged review gate (bdb-scroll @ 51b6de6)

**Date:** 2026-10-28 (America/Phoenix)  
**Sources merged:** Argon (`docs/ARGON-REVIEW.md`, reviewed on `/workspace/bdb-argon` snapshot), Claude Opus 5.5 (`docs/REVIEW-CLAUDE.md`, score 6/10), Muse Wonder Full feel gate (`docs/REVIEW-MUSE.md`, score 5/10).  
**Kimi:** merged below (score 6/10, `docs/REVIEW-KIMI.md`, reviewed `e99c7b0`).  
**Commit reviewed:** `51b6de6` (Paint Yetti roles into KTX atlases).

## Pass 1 status (Grok 4.7, branch `bdb-pass1-grok`)

| ID | Status |
|---|---|
| **P0-1** | **Done.** Story player uses `STORY_MAX_MS` (90s), above every `STAGE_CLIPS` file. `tests/cutscene-cap.test.mjs` checks each clip. |
| **P0-2** | **Done.** Nightmare: third death in a zone restores Dad (or a shake trio before he arrives). At most two ranged Yettis share a lane. Bot clears S2 zone 5 (~56s, 2 deaths) and S3 zone 5 (~91s, 5 deaths). `vy` stays 0. |
| **P0-3** | **Done.** Dead enemies keep their view for 0.5s, play knockdown, then fade. `tests/corpses.test.mjs`. |
| **P0-4** | **Done.** `GameScene` owns `FX`: muzzle flash, visual recoil, eggplant splat, lane-step dust. Hit-stop uses `HITSTOP` tiers (light stays 4 frames). Presses during the freeze are latched. `setBloom`, `setBackdropLit`, and `runId` exist so a later governor install does not throw. `tests/feel.test.mjs`. |
| **P0-5** | **Done.** Portrait phones (`orientation:portrait`, `hover:none`, `pointer:coarse`) keep `#rotate` up during play, same as RWB. Gameplay pauses on `rotate` only when that block flips. The letterbox escape hint is gone. `#rotate-start` stays for the title and hides once `.playing`. |
| **K1** | **Done.** A stage change does not drain events on the dying scene. `create` handles them after `syncViews`, so the kidnap clip pauses stage 2. `tests/stage-cutscene.test.mjs`. |
| **P1-3** | **Done.** `narrationYields`: a line landing on narration waits 2.5s, anything else yields. Installed before `handleEvents`. Cory and Yetti taunts roll once a second. |
| **P1-4** | **Done.** Registered lines now have an emit path (intros, open, produce, laugh, hurts, Dad call/done, Papi wait/chorus, choir, turn-back, Claudia, wingman defeat, victory). Wording unchanged. |
| **P1-6** | **Done.** Story and victory clips duck music and hold later voice events until the clip's done callback. A synchronous skip releases the hold before the next event. |
| **P1-1** | **Done** with P0-4. Hit-stop uses the `HITSTOP` tiers. Presses during the freeze are latched. |
| **P1-2** | **Done** with P0-4. Fire carries a muzzle point. The view flashes, recoils, and splats. `vy` stays 0. |
| **P1-7** | **Done** for the governor. `installGovernor` runs from boot and a software-renderer downgrade uses the scene fx hooks. `recovery.js` is still unwired. |
| **P1-9** | **Done** with P0-4. Lane changes, dashes, lands, and jumps kick dust and the existing step/land/jump sounds. |
| **P1-14** | **Done.** Victory destroys the cage and plays `claudia_freed`. The retired produce line is gone from `#victory`. |
| **P1-20** | **Done.** Private origin only. A token user and a missing `.git` suffix still count as `jfeldman9-rgb/bdb-rwb`. |
| **K2** | **Done.** `installPressOwnership` is on the game input. A story skip consumes the pause press Input already recorded. |
| **P1-5, P1-8, P1-10–P1-13, P1-15–P1-19, P2** | Deferred. |

## Locked rules (do not put conflicting items on this list)
- Eggplant fires straight (`vy=0`); **no aiming**.
- Locked lines stay word-for-word (`docs/BOB-LINES.md`, `src/voice-lines.js`), including Dad catchphrase.
- Dad resembles Bob's real dad (Jason approved likeness) — clean-shaven / blue striped polo direction from Game Art. Do not revert to "original character only."
- No upgrade shop in v1. Bob stays left-third (`CAM_LEAD≈0.28`). Phone-first. No Fable / no extra Claude usage / no public deploys from this list alone.

## Already landed since Argon's snapshot (do not re-open as P0)
| Item | Status on 51b6de6 | Notes |
|---|---|---|
| Cutscene mute toggle | Partially fixed | `cutscene.js` uses `isMuted()` / `onMuteChange`. Kidnap/rescue still fight music+VO (Claude #6). |
| Dad call-in cutscene | Landed | `playDadCall` + D1–D3 clips wired (`dad-call-cutscene.js`). |
| Barks / new Bob+Yetti lines | Partially landed | `barks.js` wired from `campaign.js`; many registered lines still never emit (Claude #3); same-frame `say()` cancels narration (Claude #2). |
| Painted Yetti roles | Landed | hover/charger/choir/lecturer KTX atlases. |
| Nightmare model | Changed | No longer `hpScale:2.2`; now pace/damage/recovery scalars. Still uncleared by bot (Claude #8 / Muse F3). |
| Intro remixed VO | Landed then truncated | Remixed `intro_v3` is good per Jason, but cut off at 30 s cap (Claude #1 P0). |

---

## P0 — ship blockers / broken core contracts

| ID | Fix | Sources | Evidence / action |
|---|---|---|---|
| **P0-1** | **Intro `intro_v3` truncated at 30 s** | Claude #1 | `cutscene-hooks.js` `maxMs:30000` kills 61.6 s clip. Drop or raise cap; test every `STAGE_CLIPS` duration vs cap. |
| **P0-2** | **Nightmare S2/S3 Zone-5 uncleared** | Claude #8, Muse F3, Argon Area 8 (updated) | Bot: S2 140 deaths / S3 108 in 30 min, wall at z5w2. Thin ranged overlap (≤2 in-flight/lane); mercy after N deaths or per-stage Dad reset; add Nightmare bot-clear test. Do **not** add aiming. |
| **P0-3** | **Enemy death anims never play** | Claude #9, Muse F5, Argon P0-3 | `game-scene.js` destroys views the frame `alive=false`. Keep ~0.45–0.6 s corpses; play `knockdown`; fade. |
| **P0-4** | **Wire `FX` (feel rig is dead)** | Muse F1 (Critical), Argon Area 3 | `src/fx.js` never imported. Instantiate in `GameScene`, tick + `shakeOffset`, route hit/ko/hurt/dadhit. Unblocks tiered hit-stop, shake, dust, splat. |
| **P0-5** | **Portrait `#rotate-start` escape still clips FIRE / never re-prompts** | Argon P0-2 | Still present in `index.html`. Prefer RWB: block portrait gameplay; or fix letterbox + re-show overlay mid-fight. |

---

## P1 — major functional / feel / content

| ID | Fix | Sources | Notes |
|---|---|---|---|
| **P1-1** | Tier hit-stop + stop eating inputs during freeze | Muse F2, Argon Area 3 | Use `HITSTOP` light/medium/heavy/finisher; snapshot input every step. |
| **P1-2** | Eggplant recoil / muzzle flash / splat | Muse F4, Argon Area 3 | Emit muzzle pos on `fire`; view flash + short splat; keep `vy=0`. |
| **P1-3** | Voice policy: same-frame `say()` cancels narration | Claude #2 | `nar_chN` then bark in one frame. Install `setVoicePolicy` / bark `wait`. |
| **P1-4** | Trigger remaining registered lines (incl. Jason-mandated Bob lines) | Claude #3, Argon P1-5 | Wire `bdb_open`, `bdb_produce`, hurts, dad_call/done, waits, papi_chorus, wingman_defeat, nar_victory — wording unchanged. |
| **P1-5** | Dad clip: keyboard skip + iOS sound bless | Claude #4–5 | Port RWB `installRandBless`; route keys to `cutscene.press`. |
| **P1-6** | Kidnap/rescue clips duck music + hold VO until done | Claude #6, Argon P0-1 residual | `stopSceneAudio` / MusicDirector `cutscene` state. |
| **P1-7** | Install quality-governor + recovery | Claude #7, Argon Area 1/11, Muse F1 note | Wire `installGovernor` in boot; context-loss floor. |
| **P1-8** | Bob hurt feedback (knockback slide + trauma) | Muse F6 | Keep hearts model; add visible knock + shake. |
| **P1-9** | Lane-step / dash / land dust + SFX | Muse F11 | View-side; call existing `sfx.step/land/jump`. |
| **P1-10** | Dad refusal banners by `why` | Muse F9 | Map `takeCall` reasons; keep charge numbers. |
| **P1-11** | Stage Papacito kills behind runner front (or keep corpses) | Muse F12 | Cause→effect order. |
| **P1-12** | Choirmaster double-add spawn | Argon P1-9 | Timer + telegraph both summon — pick one. |
| **P1-13** | Pause Phaser behind full-screen story videos | Argon P1-10 | Battery / draw waste on iPhone. |
| **P1-14** | Claudia freed on victory + remove retired produce line from `#victory` | Argon P1-6 | Play `claudia_freed`; `index.html` still has `"Legally, it's produce."`. |
| **P1-15** | Gamepad Start on Title / Enter pause mapping | Argon P1-7 | Align with RWB input map. |
| **P1-16** | Dad standX clamp + second swat | Argon P1-8 | Off-screen swat near right wall; docs say 2 swats. |
| **P1-17** | Touch: safe-area + 44pt pause/mute; Dad/Papi ready state; mash prompt | Argon Area 4 | iPhone HIG. |
| **P1-18** | HUD: stop opaque 116 px slab; per-Wingman HP; drop permanent street label | Argon Area 5 | Claude notes Phaser 4 Text.setText is change-gated — DOM writes still matter. |
| **P1-19** | De-metronome Zones 4–5 + soften full zone heals on Adv/Nightmare | Muse F7–F8 | Stay inside 140–240 s bot band. |
| **P1-20** | Fix red test `boot.test.mjs` remote assertion | Claude #10 | Origin now exists on private GitHub. |

---

## P2 — polish / edge cases

| ID | Fix | Sources |
|---|---|---|
| **P2-1** | `disableWebAudio: true` in Phaser config | Argon P2-11 |
| **P2-2** | Music loopStart/loopEnd NaN in `streamEl` | Argon P2-12 |
| **P2-3** | Bob walk duplicate frame; jump/dash/grabbed poses | Argon P2-13, Muse F17 |
| **P2-4** | Pause: restore banner + duck music | Argon P2-14 |
| **P2-5** | Distinct boss music / punctuation | Muse F14, Argon Area 6 |
| **P2-6** | Telegraph shape variety + tell SFX | Muse F10 |
| **P2-7** | Shield chip stages / choir aura / separation | Muse F15, Argon Area 8 |
| **P2-8** | Flank spawn flourish | Muse F16 |
| **P2-9** | Banner priority / dwell | Muse F18 |
| **P2-10** | Boss presentation: roar shake/slow-mo, interpolate Wingman dive, Choirmaster drift | Muse F13, Argon Area 9 |
| **P2-11** | GPU-MEMORY.md undercounts backdrop plates | Claude §4 |
| **P2-12** | Trim / don't re-decode unused voice PCM every stage | Claude #17 |
| **P2-13** | Photo-based Dad final art (Game Art) → remake D1–D3 | Standing art track (Jason OK) |

---

## Explicitly excluded (conflicts with locks or out of scope)
- Any eggplant aiming / vertical aim / homing.
- Rewording locked Bob / Dad / Yetti / Claudia lines.
- Reverting Dad to non-likeness "original only."
- Adding v1 upgrade shop.
- Argon suggestions that assume old `hpScale:2.2` Nightmare math without re-validating current pace model — superseded by Claude #8 / Muse F3 thinning plan.
- Muse F19 fractional hearts — recorded as observation only; Nightmare thinning is the fix.

---

## Suggested next coding pass order
1. P0-1 intro cap  
2. P0-4 wire FX → P1-1 tiered hit-stop → P1-2 gun body → P0-3 death anims  
3. P0-2 Nightmare thin + test  
4. P1-3 voice policy → P1-4 wire missing lines  
5. P1-5/6 Dad clip + cutscene audio  
6. P1-7 quality governor  
7. Remaining P1 feel/UI, then P2  

---

## Kimi (bdb-scroll @ e99c7b0, reviewed 2026-10-28)

Full review: `docs/REVIEW-KIMI.md` (score **6/10**). Read-only pass over all of `src/` + `index.html`; tests run: 119/120 (the one red is P1-20, reproduced).

### Confirms existing items (with fresh evidence)
| ID | Verdict | New evidence from this pass |
|---|---|---|
| **P0-1** | Confirmed | `cutscene-hooks.js:3` (`maxMs:30000`) + `cutscene.js:56,200-208`; the `cutscene.js:55` comment claiming intro clips keep old behaviour is stale. Fix: pass `maxMs: Infinity` so the duration-aware guard engages. |
| **P0-2** | Confirmed | Math verified: guard = 48 hp × `hpScale:2.2` ≈ 106 hp vs 12×0.8 = 9.6 dmg eggplant ⇒ 12 hits each (`yettis.js:5`, `stage2/3-def.js:2`, `eggplant.js:1`); ranged overlap unbounded via `campaign.js` `this.hostile`. |
| **P0-3** | Confirmed | `game-scene.js:71,80` — view destroyed the frame `alive=false`; `roleAnim`'s `dead→knockdown` mapping (`game-scene.js:21`) is unreachable. |
| **P0-4** | Confirmed | `fx.js` has zero importers; sim hardcodes `hitStop=4/60` (`campaign.js:121`) so the `HITSTOP` tier table (`config.js:10`) is also dead. |
| **P0-5** | Confirmed | `index.html:46` — `body:not(.playing)` qualifier suppresses the rotate overlay for all of gameplay. |
| **P1-1** | Confirmed | Same hardcoded 4/60 hit-stop (`campaign.js:121`); blocked on P0-4. |
| **P1-2** | Confirmed | `emit('fire')` carries no muzzle payload (`campaign.js:205`, `game-scene.js:112`) — add `{x,y,dir}` for recoil/flash/splat. |
| **P1-3** | Confirmed | `campaign.js:42-44` emits `nar_chN` + where-bark same frame (narration dies instantly); `setVoicePolicy` (`audio.js:418`) never called. New: `barkYettiTaunt` is 12%/frame after a 7 s cooldown (`barks.js:56-60`) ⇒ taunt ~every 7 s of combat. |
| **P1-4** | Confirmed | ~25 of 49 registered lines have no emit path (`bdb_open`, `bdb_produce`, `bdb_laugh`, `claudia_*`, `dad_call/done`, `bob_hurt_*`, `papi_chorus`, `wingman_defeat`, `nar_victory`, …). |
| **P1-5** | Confirmed | `dad-call-cutscene.js:76-78` builds a separate un-blessed video element; `scene.cutscene.press` (line 75) has no caller. |
| **P1-6** | Confirmed | `game-scene.js:117` handles `cutscene` without touching music; `music.js` `MusicDirector` imported nowhere; music + `nar_kidnap` VO + video audio stack the same frame. |
| **P1-7** | Confirmed + escalated evidence | Not only unwired (`main.js:50-58`): `quality-governor.js:81-84` touches `st.fx`/`st.setBloom`/`st.setBackdropLit`/`st.runId`, none of which exist on `GameScene` — installing it today throws on first downgrade. Land P0-4 first. `recovery.js` (freeze-guard card) also fully unwired. |
| **P1-10** | Confirmed | `takeCall`'s `why` (`dad-call.js:30`) discarded at `campaign.js:150`. |
| **P1-11** | Confirmed | Kills resolve at activation (`campaign.js:141`), runners arrive ~0.5 s later (`papacito-fx.js:9`). |
| **P1-12** | Partially mitigated — downgrade candidate | `summonAdds` tops up to a fixed count (`campaign.js:100-103`), so timer+telegraph+roar summons can't overrun; now cosmetic. |
| **P1-13** | Confirmed | Only the dad call uses `game.pause()` (`dad-call-cutscene.js:71-73`); intro/victory render at full rate behind full-screen video. |
| **P1-14** | Confirmed | `"Legally, it's produce."` still at `index.html:74`. (`claudia_freed` line does not exist in `voice-lines.js` yet.) |
| **P1-15** | Confirmed | `main.js:47` takes only `start`/`fire`; `PAD_MAP` sends Start to `pause` (`input.js:7`). |
| **P1-16** | Confirmed (clamp half) | `dad.js:20` has no upper clamp — `standX = bob.x+150` lands off-screen near the right wall. Doc's "second swat" contradicts the packed single-swat atlas; treat as docs bug, not code. |
| **P1-17** | Confirmed | `#top-buttons button` ≈ 30 px tall (`index.html:33`); `.tb` cluster does meet 44 px. |
| **P1-18** | Confirmed | Slab at `hud.js:34`; permanent stage title at `parallax.js:37-39`. |
| **P1-20** | Confirmed | Reproduced: `tests/boot.test.mjs:32` "git has no remotes" fails; suite otherwise green. |
| **P2-1** | Already satisfied — close | `audio:{noAudio:true}` (`main.js:52`) disables Phaser's audio stack entirely. |
| **P2-2** | Confirmed | `audio.js:221-222` computes `NaN` loop length (no track defines loop points); masked by `el.loop=true`. |
| **P2-5** | Confirmed | All seven `MUSIC` entries stream the same `bdb-rise.mp3` (`audio.js:196`). |
| **P2-10** | Root cause found | `roleAnim` has no `roar`/`slam`/`recover` case (`game-scene.js:18-37`) — roar renders as idle/sing; silent fallback (`game-scene.js:76-77`) masks it. |
| **P2-12** | Confirmed | `game-scene.js:62-63` preload/release ~49 clips per stage; `stageLines` (`voice-lines.js:25`) includes stages' lines the current one never plays. |

### New items from Kimi (not previously listed)
| ID | Priority | Item | Where |
|---|---|---|---|
| **K1** | P1 | Stage-transition cutscenes lose their pause: `kidnap` is emitted inside `loadStage` (`campaign.js:43`), `handleEvents` runs before the restart check (`game-scene.js:129-130`), so the new scene starts unpaused and the stage-2 sim runs live under the video; arrows/WASD steer Bob into zone 1 behind it. Fix: deliver queued events to the restarted scene (drain once in `create`). | `campaign.js:43`, `game-scene.js:129-130` |
| **K2** | P2 | Escape/Enter skips a story clip AND toggles manual pause underneath (handler only `preventDefault`s; Input registered first). `press-ownership.js` solves this and is never installed. | `cutscene-hooks.js:4`, `game-scene.js:126` |
| **K3** | P2 | Respawn keeps stale `camMax`, flooring the camera past `checkpoint.x`; Bob is clamped ~200 px forward into the zone instead of walking up. Fix: `camMax = min(camMax, camX)` on respawn. | `campaign.js:170`, `camera.js:36`, `bob.js:70` |
| **K4** | P2 | Victory text always claims "Nightmare unlocked", including post-`beaten` replays. | `game-scene.js:132` |
| **K5** | P2 | `setRain` never called — stage-2 rain ambience is dead code. | `audio.js:359` |
| **K6** | P2 | Per-frame DOM writes (2× `getElementById` + `textContent`) and 5 filtered-array allocations per frame on the hot path — iPhone GC/layout pressure. | `hud.js:38`, `game-scene.js:71,93-105` |
| **K7** | P2 | `Fighter.play` `console.warn`s every frame for a missing anim (60/s log spam on iPhone Safari). | `fighter.js:16` |

**Priority movement:** P1-7 keeps its slot but is now known-blocked on P0-4 (governor references the missing `st.fx`); P1-12 downgrade candidate (see above); P2-1 close as done. All other ranks stand — no bump without bot/device evidence.
