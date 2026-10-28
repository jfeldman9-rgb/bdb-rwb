# BDB — Muse Pass 2 review (game feel & pacing)

**Reviewer:** Muse Wonder (read-only pass; no game code changed, no merge, no deploy)
**Reviewed:** draft PR #2, head `cursor/bdb-pass2-d377` @ `c9cf35a`, base `bdb-pass1-grok`
**Against:** `docs/MUSE-100-IMPROVEMENTS.md`, `docs/FIX-LIST.md` (Pass 2 claims in `docs/OVERNIGHT-STATUS.md`)
**Method:** full PR diff (32 files, +616/−51), source read of the feel/pacing/mobile paths, `npm test`, and headless bot runs at 30/60/120 Hz on Story/Adventure/Nightmare.

## Score: 6.5 / 10

| Area | Score | One-line verdict |
|---|---|---|
| Combat feel | 7/10 | Tiered hit-stop, corpses, splat and knockback are real now; two rig outputs are dead and recoil doesn't pulse. |
| Pacing (per stage) | 7/10 | Adventure sits in the 140–240 s band at every rate, but 30 Hz Stage 1 hugs the ceiling and S3 zone 5 spikes. |
| Difficulty curve | 5/10 | Story→Adventure ramp is clean; Nightmare is still not bot-clearable — the wall moved to the bosses, and the test suite can't see it. |
| Cutscene / call-in flow | 7/10 | Dad clip, voice queue and Phaser-parking all work; the catchphrase still lands ~0.9 s early and chapter select replays the intro. |
| Readability | 5/10 | HUD band and per-Wingman bars help; hostile shapes, choir/shield state and the Wingman telegraph are still misleading. |
| Mobile controls | 7/10 | 44 pt targets, safe-area and portrait block are in; the remaining issues are feedback and per-frame DOM cost, not layout. |

Pass 1 + Pass 2 together close every P0 in `docs/FIX-LIST.md` and most of the feel P1s. What keeps this below 8 is not missing juice — it's that the hardest difficulty still can't be finished by the project's own bot, and two pieces of presentation (telegraph geometry, hostile silhouettes) actively misinform the player at exactly the density where they matter.

**Locked rules re-verified intact (not findings, do not "fix"):** eggplant fires straight (`vy = 0`, `src/eggplant.js:4,15`; asserted in `tests/nightmare-clear.test.mjs`), `CAM_LEAD = 0.28` (`src/config.js:4`), no shop anywhere in `src/`, and PR #2 touches no quoted line (`src/voice-lines.js` is not in the diff; the new refusal banners in `src/dad-call.js:36-51` are HUD banner text, not voice lines). `assets/cutscenes/intro_v3.mp4` untouched.

---

## What Pass 2 got right (verified, not just claimed)

- **Tests:** `npm test` = **168/168 green** on the PR head, up from 143. Several new tests fail on the old code by construction (voice-queue deadlines, corpse integration in `tests/corpses-scene.test.mjs`).
- **P1-8 hurt knockback** is genuinely visible: `knockV` 200 px/s (340 for chargers) with a 9/s settle (`src/bob.js:19,73-76`) integrates to roughly 22 px / 38 px of slide, it runs while hurt/knocked down, and the hearts model is untouched.
- **P1-11 Papi delay** restores cause→effect: activation staggers the crowd (`src/papacito.js`, `stun = delay + 0.2`), kills and score resolve 0.45 s later in `Campaign.update` (`src/campaign.js:199,299-303`), and respawn clears the pending wipe (`src/campaign.js:236`). See F4 for the remaining gap.
- **P1-12** removes the choirmaster's third summon source and fixes a real latent bug — `volley++` inside the band filter meant the choirmaster *never* fired its halo volley (`src/yettis.js`, `skip` hoisted out of the filter). That was a silent boss-difficulty cut; its return is part of F1's boss wall.
- **P1-5 / P1-13** share one `pauseForClip` helper (`src/cutscene-hooks.js:7-12`) so Dad clips and story clips park Phaser identically, skip keys consume the Input press so pause can't toggle underneath (`src/dad-call-cutscene.js:64-77`), and idle gestures bless the reused video element for iOS sound.
- **F1 voice queue** budgets against the sounding line's real remaining duration with grace + cap (`src/audio.js`, `VOICE_QUEUE_GRACE`/`VOICE_QUEUE_MAX`), and stretches deadlines for lines queued during load. This is the correct fix, not a longer constant.
- **P1-17/P1-18** land as specified: 44 px pause/mute with safe-area insets (`index.html:31-33`), HUD slab alpha .92→.55, permanent street label gone (`src/parallax.js`), per-Wingman bars (`src/hud.js:6-13`).
- **Adventure pacing holds the band at all three rates** (bot, Dad call-in handled the way `src/game-scene.js:178` handles it): 60 Hz stages 183/187/226 s, campaign ~590 s, 7 deaths; 30 Hz 234/205/219 s; 120 Hz 176/204/220 s. Story: ~154/159/171 s per stage, 0–2 deaths — correctly below the band by design.

---

## Prioritized findings

### P0 — Nightmare is still not finishable, and the guard test looks at the wrong place

`FIX-LIST` P0-2 was declared done in Pass 1, and `tests/nightmare-clear.test.mjs` is green — but that test only starts the bot *inside* zone 5 (`clearZone5`, `tests/nightmare-clear.test.mjs:99-115`). A full Nightmare run at 60 Hz (Dad call-in drained exactly as the real scene does) tells a different story:

- S1: zones clear in ~28–52 s each; boss clears in ~48 s after 4 deaths. Fine.
- S2: zones clear; the **Choirmaster fight was still running after 383 s** of boss time (30 deaths in that fight) when the 900 s probe cap hit.
- S3: zones clear; the **Wingmen fight was still running after 637 s** (51 deaths in that fight).

The zone-5 snowball wall is genuinely fixed (lane cap `MAX_RANGED_PER_LANE` holds throughout; mercy at 3rd zone death works, `src/dad-call.js:57-64`). The wall moved, it didn't disappear: Nightmare boss effective HP (chapter `hpScale` × player damage 0.8, `src/difficulty.js:5`) plus pace 1.22 telegraphs outlast a bot that plays by the same rules as a human. A human has better target selection than `src/bot.js`, so this is not proof a human can't do it — but the project rule (MUSE-100 #13/#14) is that an unlockable difficulty must be bot-clearable, and right now no test would catch a regression either way.

**Concrete next step (test first, tune second):** add a full-stage Nightmare bot-clear test (fresh stage start, `dad_callin` drained, generous step cap) for S2/S3 bosses specifically, watch it fail, then tune the boss side only — e.g. Nightmare boss HP or phase-3 add pressure — *not* player damage, which would shorten Adventure too. Do not touch aiming; the locked straight-fire is not the problem.

Related evidence bug: `tools/bot-sim.mjs:13` never drains `dad_callin`, so every number that tool prints silently assumes Dad's wipe never happens (its Nightmare run shows 139 deaths and no clears; Adventure Dad "uses" are counted at `useDad()` but never land). Any future pacing claim sourced from `bot-sim` alone is understated. The tool should mirror `tests/nightmare-clear.test.mjs:108`.

### P1 — Wingman volley telegraph is drawn on the wrong lanes

The volley snowballs spawn at `LANE_TOP + i*59` → y = 572/631/690 (`src/wingman.js:52`), and the hostile hit test is `|bob.y − p.y| < 25` (`src/campaign.js:343`). The telegraph rects are drawn at `572 + i*39` with height 36 (`src/game-scene.js:134`) → bands at 572–608, 611–647, 650–686. Band 1 reads ~18 px high, band 3 ~22 px low relative to where the halo actually travels and hits. On a phone, "stand in the unshaded band" is the whole lesson of this fight (and the fight Bob must survive for the Papi finisher) — the shading currently teaches a safe spot that is inside the hit window at the edges. Fix is one constant: derive the rect y/height from the same `LANE_TOP + i*59` spacing (lanes are 59 apart; rect height should be ≤59 and centered on the lane, not 39-stepped).

### P1 — Hostile projectiles are shape-identical; Nightmare density makes it worse

Snowball, halo and shockwave are all the same stroked ellipse; only tint differs (`src/game-scene.js:141` — `snowball` ice-blue, *everything else* the same gold). Halo vs shockwave are indistinguishable except by source. This is MUSE-100 #54 / FIX-LIST P2-6, still fully open, and it's the readability item that scales worst: at Nightmare pace (×1.22) with the restored choirmaster volley (see above), the player must read *shape* at a glance, and color-only coding fails colorblind players outright. The prop-sprite route (MUSE-100 #53) already has a home planned in `effects()`; even a procedural interim (ring for halo, wide flat bar for shockwave) would close most of the gap without new art.

### P1 — Dad's catchphrase still fires ~0.9 s before the swat lands

`finishDadCallin()` emits `dad_catchphrase` the moment Dad spawns (`src/campaign.js:221`), but impact resolves at `DAD_TIMING.impact` = enter 0.5 s + swat frame 6/16 ≈ **0.875 s later** (`src/dad.js:13-17`). So the locked line — unchanged, correctly — punctuates Dad's jog-in, not the wipe, on every call: clip path included, since the voice is emitted when the in-engine Dad starts after the clip. MUSE-100 #43, still open. Move the emit into the `Dad.update` resolve callback in `Campaign.update` (the `dadhit` site) so line, flash (`src/game-scene.js`, `dadhit` handler) and KOs land on the same frame.

### P1 — Chapter select still replays the full intro

`Title.begin()` unconditionally plays `intro` (61.6 s `intro_v3`, skippable) before `scene.start('gameplay', …)` whatever chapter is chosen (`src/main.js:40`). Starting chapter 2/3 from the title — the exact flow chapter select exists for — opens with the chapter-1 film. MUSE-100 #77, still open. Gate the intro on chapter 1 / fresh campaign; later chapters should go straight in (their `nar_ch{n}` already plays in-stage). No new lines needed.

### P2 — Papi's "lands with the runner front" is only true on the left third

The wipe delay is a flat `PAPI_WIPE_DELAY = 0.45` s for every victim (`src/campaign.js:18,199`), but the runner front is a screen-space sprite starting at x = −180 moving 980 px/s (`src/papacito-fx.js:6,9`). At 0.45 s the front is at ~261 px screen-x; an enemy at the right edge (1280) isn't reached until ~1.49 s — so right-side Yettis still die roughly a second before any runner touches them, now with a stagger pose covering the gap. Pass 2's framing ("kills land when the runners arrive") overstates it. Either make the pending wipe per-enemy (kill time = front arrival at that enemy's screen x) or shorten the claim. Per-enemy timing also gives a satisfying left-to-right cascade for free.

### P2 — Two FX outputs are computed and never consumed

- `FX.slowmo` is set on heavy/finisher impacts (`src/fx.js:57`) and read nowhere — `grep slowmo src/` returns only the writer. Boss phase gates (`hitTier` → `finisher`, `src/campaign.js:24-29`) get hit-stop but not the slow-mo beat MUSE-100 #9 asked for.
- `FX.hitstop` (`src/fx.js:51`) duplicates the sim's real hit-stop (`src/campaign.js:165,173,309`) and is likewise unread; the comment at `src/fx.js:40` even says hit-stop "stays on the sim tier", so this field is a trap for the next editor.

Wire `slowmo` into the scene's step rate (presentation side only, bot determinism intact) or delete both fields. Dead knobs in the feel rig are how the pre-Pass-1 "FX is dead code" P0 happened.

### P2 — Snowball knockback direction is derived from the wrong thing

Melee and charger knockback are correct (source x passed through, `src/campaign.js` hurt sites in `src/yettis.js`/`src/wingman.js`). But projectile hits call `hurtBob(false, p.x)` with the projectile's *current* x (`src/campaign.js:343`) inside a ±30 px overlap window — `Math.sign(bob.x − p.x)` is whichever side of Bob's center the snowball's center happened to be on that frame, i.e. effectively random, and can knock Bob *toward* the pack that threw it. Pass `p.dir` (travel direction) instead: a snowball should always shove Bob the way it was flying. One-argument change, but it's the most common hurt in zones 4–5, so it's the knockback players will actually learn from.

### P2 — Recoil is a constant offset while firing, not a kick

`handleEvents` sets `this.recoil = 12` on *every* `fire` event (`src/game-scene.js`, `fire` branch) and `applyRecoil` decays it at 90/s — at the gun's 5 shots/s the value is re-pinned faster than it decays, so holding FIRE just parks Bob's sprite ~6.6 px back with no per-shot pulse. The muzzle flash and splat (P1-2, landed in Pass 1) carry the shot feel; recoil as implemented adds a static lean. Either decay much faster than the refire interval (kick-and-return between shots) or drop the pretense and keep flash-only. Minor, but it's the difference between "gun kicks" and "Bob leans".

### P2 — Boss bars: labels computed, never drawn; no phase/finisher information

`bossBars()` returns `W1`/`W2` labels (`src/hud.js:6-13`) but the draw loop uses only `ratio` (`src/hud.js:44`) — two anonymous purple bars, no 66%/33% phase ticks, no gold pulse at `hp ≤ 1` where the Papi finisher opens (MUSE-100 #79, half-landed). `stagePrompt` does say `PRESS PAPI TO FINISH THE RESCUE`, which covers the finisher; the bars themselves still don't say which Wingman is which. Also note the discontinuity: when one Wingman dies, `bossBars` falls back to a single summed bar, so the surviving boss's bar visibly jumps. Draw the label text beside each bar and keep dead Wingmen as an empty labeled bar.

### P2 — Remaining readability debt (unchanged from the 100-list, worth restating once)

- Choir buff is still invisible: no aura ring, no notes, no tint on buffed enemies (`choirMultiplier` has no consumer in `src/game-scene.js`/`src/hud.js`) — "drop the choir first" is taught by a Stage-1 prompt (`src/hud.js`, `stagePrompt`) and then never reinforced visually. MUSE-100 #24.
- Guard shield chips 1–2 show nothing: `shieldHits` exists (`src/yettis.js:99-104`) but `effects()` draws the same ellipse until the break. Crack stages are MUSE-100 #26.
- No enemy separation pass (MUSE-100 #29): same-lane walkers still converge on one sprite, which also body-blocks eggplants for the pack behind. The new lane machinery for *ranged* Yettis (F3) shows the pattern to reuse.

### P2 — Adventure zone-clear heal: accepted risk, keep it on the books

Pass 2 scoped P1-19 to zone-4 stagger + Nightmare-only heal soften (`healZoneClear`, `src/campaign.js:69-73`: Nightmare closes half the missing hearts, min +1) after bot evidence showed wider cuts pushed S3 to 263 s at 120 Hz. That trade is honestly logged in the PR body and I don't dispute the band math. But the underlying observation stands: on Adventure, chip damage still resets 5× per stage, and my probe's Adventure deaths (2/3/2 per stage) come almost entirely from bosses and the S3 zone-5 spike (57 s, 2 deaths, 7 hits — the clear pacing outlier, vs 33–37 s for S3 zones 1–4). If a future pass wants Adventure tension, the lever is that zone-5 spike and boss chip, not another heal cut. Note also the test that covers this is misnamed — `late zones stagger spawns; zone clears heal half on Adventure…` asserts Adventure keeps the *full* heal — rename it before someone reads the title as the spec.

### P2 — Mobile: per-frame DOM lookups on the hot path

`HUD.update()` runs `document.getElementById` twice every frame for the Papi/Dad buttons (`src/hud.js:46`), on top of text setters. Kimi's K6 flagged this pre-Pass-1; still open. Cache the two elements in the HUD constructor. On a throttled iPhone this is exactly the GC/layout pressure the quality governor (now correctly keeping its floor, F2) is trying to buy back. Everything else mobile checks out: stick deadzone (0.23) + knob travel (`src/input.js:47-54`), multi-touch via pointer capture per button, portrait block with in-play re-prompt, `visibilitychange` input clear, and the `.tb` cluster meets 44 pt. One feedback gap: touch FIRE/JUMP/DASH get a `.on` class, but the stick gives no haptic-style visual beyond the knob and there's still no `navigator.vibrate` hurt cue (MUSE-100 #7's optional half) — on a bright screen, the hurt vignette + knockback now lands, so this is polish, not a blocker.

### P3 — Small stuff

- `pauseForClip` parks the whole Phaser loop behind story clips; if a clip stalls and the player's only recovery is a key/tap, confirm the DOM overlay (not Phaser) owns that input — it does (`src/cutscene.js` overlay listeners), but this coupling deserves the one browser test G5 was deferred for. Flagging as untested-on-device, same as the PR does.
- Corpse lifetime is a flat 0.5 s for a walker and for a boss (`src/corpses.js:2`); bosses deserve the longer hold their phase banners get. Cosmetic.
- `Title.update` now begins on `pause` as well as `start`/`fire` (`src/main.js:50`) — intended by P1-15, but it means the first press that dismisses some OS/gamepad overlay can also start the game. The intro's skip guard (450 ms) makes this harmless in practice.

---

## Suggested order for Pass 3 (feel/pacing only)

1. Nightmare full-stage bot-clear test (boss-scoped), then boss-side tuning until it passes. [P0 above]
2. Wingman telegraph geometry + hostile shape pass (ring/bar/ellipse). [P1]
3. Catchphrase on the impact frame; intro only for chapter 1. [P1]
4. `bot-sim` drains `dad_callin`; rename the heal test. [evidence hygiene, do with #1]
5. Per-enemy Papi kill timing; projectile knockback via `p.dir`; wire or delete `FX.slowmo`/`FX.hitstop`. [P2]
6. Boss-bar labels/ticks, choir aura, shield cracks, cached HUD elements. [P2]

Nothing above requires touching a locked decision: no aiming, no `CAM_LEAD` change, no shop, no reworded lines.
