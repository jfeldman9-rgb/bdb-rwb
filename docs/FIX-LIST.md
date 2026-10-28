# BDB Fix List — merged review gate (bdb-scroll @ 51b6de6)

**Date:** 2026-10-28 (America/Phoenix)  
**Sources merged:** Argon (`docs/ARGON-REVIEW.md`, reviewed on `/workspace/bdb-argon` snapshot), Claude Opus 5.5 (`docs/REVIEW-CLAUDE.md`, score 6/10), Muse Wonder Full feel gate (`docs/REVIEW-MUSE.md`, score 5/10).  
**Kimi:** section reserved below — not run this pass.  
**Commit reviewed:** `51b6de6` (Paint Yetti roles into KTX atlases).

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

## Kimi (later)
_Reserved. When Kimi reviews `bdb-scroll`, append findings here with source `Kimi`, dedupe against IDs above, and bump priority only if new evidence warrants._
