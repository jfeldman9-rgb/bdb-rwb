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
| **P0-3** | Pending |
| **P0-4** | Pending |
| **P0-5** | Pending |
| **K1** | Pending |
| **P1-3** | Pending |
| **P1-4** | Pending |
| **P1-6** | Pending |
| **P1-7** | Pending |
| **P1-14** | Pending |
| **P1-20** | **Done** on `bdb-scroll` `8c53d59` (private-origin remotes assertion). |
| **K2** | Pending (press-ownership) |
| Other P1/P2 | Deferred this pass unless noted above. |

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
