# Claude review — Pass 2 draft PR #2

**PR:** [#2](https://github.com/jfeldman9-rgb/bdb-rwb/pull/2) `cursor/bdb-pass2-d377` @ `c9cf35a` into `bdb-pass1-grok` @ `97d9861` (19 commits, 32 files).
**Date:** 2026-10-28 · **Reviewer:** Claude (read-only; no game code touched, no merge, no deploy).
**Method:** I read the full `src/` + `index.html` diff and the code around it, and checked every claim in the PR body and `docs/OVERNIGHT-STATUS.md` against the source. I also re-checked Kimi's deferred F4–F8 and G5 (`docs/REVIEW-KIMI-PASS1.md` on `bdb-kimi-review-pass1`) and the locked rules. `npm test` gives **168 pass, 0 fail** (node v22.23.4; `engines` asks for ≥24). Three suspicions were reproduced with throwaway scripts outside the repo:
- a muted Dad clip being tapped for sound;
- a three-line voice queue;
- the Stage-2 boss bot run, comparing the base branch with the PR head.

## Score: 7/10

The pass is broad, honest about what it deferred, and most items land with a real mechanism and a test. Kimi's F1, F2 and F3 are fixed at the right layer, and G1–G4 and G6 are genuinely closed. The new corpse test drives the real `GameScene.prototype.syncViews`, which was the weakest spot after Pass 1. The locked rules hold.

Three points off:
- **P1-5 introduced a real regression.** Tapping a muted Dad clip for sound now skips the clip (reproduced). The "iOS bless" it claims to port never runs before a clip, so the first Dad call of each stage still starts on an element that was never blessed.
- **P1-12 changed the Stage-2 boss's difficulty without saying so.** The Choirmaster's halo volley was always empty on the base branch. This PR turns it on for the first time and also stops phase-1 add top-ups. In the Adventure bot run, boss hits go from 1 to 4 and deaths from 0 to 1. That may be the right call, but it is a design change hidden inside a bug fix.
- **Partial fixes and tests that only check source text.** P1-11 lands its kills about half a second before the runners reach most targets. P1-13 skips the longest clip (the intro). The F1 fix covers two queued lines, not three. The freeze-guard half of recovery is still unwired. Several new tests regex the source instead of exercising behaviour.

No crash paths, no locked-rule breaks, no meaningful performance regressions.

**Locked rules: verified intact**
- **Eggplant fires straight, no aiming.** `src/eggplant.js` is untouched: `vy: 0` at `src/eggplant.js:4` and re-zeroed at `:15`. Knockback (P1-8) moves only Bob (`src/bob.js:19,73-77`).
- **`CAM_LEAD` = 0.28.** Unchanged at `src/config.js:4`, and respawn still uses `cp.x-VW*0.28` (`src/campaign.js:239`). `src/camera.js` is untouched.
- **No shop.** There is no shop or upgrade code in `src/` or `index.html`.
- **Quoted lines exact.** `src/voice-lines.js`, `src/story.js` and `docs/BOB-LINES.md` are untouched. The new strings are all banners: the Dad refusal banners (`src/dad-call.js:29-41`) and the mercy banners. "DAD'S ON HIS COFFEE BREAK." is retired pre-rewrite text (`docs/REVIEW-CLAUDE.md:289`), not a locked line, and it survives as the fallback.
- **`assets/` untouched.** This includes `intro_v3.mp4`.

---

## Claim-by-claim verification

| Item | Verdict | Evidence |
|---|---|---|
| **P1-5** Dad clip keys + iOS bless | **Keys fixed; bless not delivered; regression** | Keys: `installDadKeys` routes SKIP actions to `handle.skip` and consumes the Input press (`src/dad-call-cutscene.js:64-77`), and it is removed on finish or abort. Bless: see C1 and C2. |
| **P1-8** knockback slide | **Fixed** | `takeHit({dir})` → `knockV` 200 (340 for a charger), exponential settle (`src/bob.js:19,73-77`). It is applied after the movement block, so it slides while hurt or knocked down. It is clamped to bounds. Respawn builds a fresh Bob, so no carry-over. All four `hurtBob` call sites pass a source x. The grab-timeout self-hit passes `dir=0`. |
| **P1-10** refusal banners | **Fixed, two nits** | Every `why` maps to its own banner (`src/dad-call.js:29-41`; `tests/dad-call.test.mjs:25-30`). Nits in C10. |
| **P1-11** Papi wipe with runners | **Mechanism fixed; timing off** | The kill is deferred by `PAPI_WIPE_DELAY` and resolves inside the frozen `papiTime` (`src/campaign.js:18,199,299-306`). It is cleared on respawn and on stage load. The finisher waits too (`tests/wingman-sim.test.mjs:2`). But 0.45 s is not when the runners arrive (C4). |
| **P1-12** Choirmaster single summon | **Fixed as worded; unflagged difficulty swing** | The telegraph no longer summons (`src/yettis.js:151`). Volley-skip fix at `:148`. See C3. |
| **P1-13** park Phaser behind story video | **Partial** | `startHeldClip` now calls `pauseForClip` (`src/game-scene.js:151,154`), which covers kidnap, rescue and victory. The title intro is not covered (C6). |
| **P1-15** pad Start / Enter | **Fixed** | Title takes `pause` (pad Start = button 9 → `pause`) at `src/main.js:50`. Gameplay toggles on `pause`\|\|`start` at `src/game-scene.js:188`. Input ignores keys aimed at focused buttons (`src/input.js:16`), so there is no double toggle with the Pause button. Nit in C12. |
| **P1-16** Dad stand clamp | **Fixed (clamp); docs half open** | `standX ≤ camX+VW-200` (`src/dad.js:22`; tested). `plan/BUILD-PLAN.md` §4.4 still promises two swats (C13). |
| **P1-17** 44pt pause/mute + safe area | **Fixed** | `min-width/height:44px` plus a `max(…, env(safe-area-inset-*))` position (`index.html:31,33`). The DOM is not CSS-scaled, so 44 CSS px is 44 pt on iOS. The "ready state" and "mash prompt" parts are pre-existing code that a new regex test re-asserts. |
| **P1-18** HUD band / per-Wingman HP / street label | **Fixed, one usability nit** | Band alpha .92 → .55 and one bar per Wingman (`src/hud.js:5-12,43-44`). The street label is gone (`src/parallax.js:36-37`); the only consumer, `backdrop.title?.destroy()`, is null-safe. Nit in C11. |
| **P1-19** de-metronome + soften heals (scoped) | **Fixed as scoped and disclosed** | Zone 4 gets a deterministic ±0.2 s stagger on delayed entries only (`src/campaign.js:88-94`). Nightmare's zone-clear heal closes half the gap (`src/campaign.js:68-73`). Zone 5 and Adventure are left alone so the bot band holds, which is disclosed. The band is asserted at 30, 60 and 120 Hz and is green. |
| **recovery.js wired** | **Partial** | `installResumeCleanup` (`src/main.js:58`) and a stage-aware Reload on the startup card (`src/startup.js:57`) are wired. `recovery.js` has no imports, so the startup guard stays Phaser-free. The freeze guard (`showStuck`) is still dead code (C8). |
| **Kimi F1** voice queue | **Fixed for 2-line sequences** | The deadline is now `max(base, remaining + 1 s)`, capped at 10 s. Lines queued behind a still-loading line are stretched when it starts (`src/audio.js:463-468,482-485`). `claudia_leave` after `nar_victory` and the stage-start where-bark now survive (`tests/voice-queue.test.mjs`). A third queued line is still dropped (C5). |
| **Kimi F2** pre-gameplay governor throw | **Fixed** | `st.fx` guarded (`src/quality-governor.js:80,85`). The first gameplay sighting always reapplies the stored tier (`:94-99`). Tested at `tests/press-governor.test.mjs:70-93`. |
| **Kimi F3** boss lane-shove | **Fixed** | Bosses never move (`src/yettis.js:53`) but still count as pinned bodies when the stay slots are given out (`:58-61`). Tested at `tests/yettis.test.mjs:25`. |
| **G1 / G2 / G3 / G4 / G6** | **Closed** | G1 is the 2-line queue test. G2 drives the real `syncViews` through hold, fade and destroy, plus Bob's exclusion and the respawn view swap (`tests/corpses-scene.test.mjs`). G3 covers the breath mercy (`tests/nightmare-clear.test.mjs:124-134`). G4 is the boss-lane test. G6 is the title-screen governor test. |

---

## Findings (prioritized)

### C1 — P1 · Tapping a muted Dad clip for sound now skips it (regression from P1-5)
- **Where:** `src/dad-call-cutscene.js:73-75`, versus `src/cutscene.js:124-130`.
- **What happens:** `installDadKeys` adds a window-level `pointerdown` listener that calls `player.bless()`. When iOS refuses unmuted autoplay, the clip falls back to muted and shows "TAP FOR SOUND". The player's own tap handler then relies on `r.muted` still being true at `touchend`: it treats the first tap as unmute-only and swallows the follow-up click (`:128`).
  - `pointerdown` always fires before `touchend`, so the new listener unmutes first.
  - By the time `touchend` arrives, `r.muted` is false, and the same tap falls through to `this.skip(r, 'tap')` (`:130`).
- **Reproduced:** with a fake DOM past the 900 ms guard, `touchend` alone leaves the clip running (`done = null`). `pointerdown` followed by `touchend` gives `done = 'skip'`.
- **Effect:** a player who taps for sound loses the Dad clip on exactly the device the bless was meant for.
- **Fix direction (not applied):**
  - Drop the in-clip `pointerdown` bless, since the overlay already handles it.
  - Or have it set `r.swallowClickUntil` and skip the following `touchend` and `click`.
  - Add a test that dispatches `pointerdown` then `touchend` on a muted run.

### C2 — P1 · The iOS bless is not a port of `installRandBless`; the first Dad clip of every stage starts on an unblessed element
- **Where:** `src/dad-call-cutscene.js:66,75,101,107`, `:54`, and `src/main.js:37`.
- **Why it never runs before a clip:** the listeners are installed inside `playDadCall` (`:107`) and removed in `finish` or abort, so they only exist while a clip is up. The "idle gesture" branch (`if (!handle?.active) { player?.bless?.(); return; }`, `:66`) is unreachable: `handle` is assigned in the same synchronous call that installs the listener.
- **Why each stage starts fresh:** `abortDadCall` runs on every scene shutdown and sets `player = null` (`:54`). Each stage therefore builds a new `CutscenePlayer` and a new `<video>` (`:101`) that no gesture has ever touched.
- **The Title doesn't help:** its gesture blesses only the story player (`src/main.js:37`).
- **Result:** on iOS the first Dad clip per stage still hits `NotAllowedError` and falls back to muted, which is exactly what FIX-LIST P1-5 asked to fix. Then C1 makes the "tap for sound" tap skip the clip.
- **Test:** `tests/dad-cutscene.test.mjs:82` is titled "idle gestures bless the reused element" but asserts nothing about blessing.
- **Fix direction:** what `docs/REVIEW-CLAUDE.md:190-191` already prescribed:
  - Install a capture-phase `pointerdown`/`touchend` bless in `GameScene.create` and remove it on shutdown.
  - Keep one Dad `CutscenePlayer` alive across stages.
  - Or reuse the story player's blessed element for Dad clips.

### C3 — P1 (design sign-off) · P1-12 quietly made the Stage-2 boss a different fight
- **Where:** `src/yettis.js:127-128,132,148,151`; `src/campaign.js:138`.
- **Volleys now fire for the first time.** On the base branch, `[0,1,2].filter(i => i !== this.volley++ % 3)` ran `volley++` once per element, starting from `volley: 0`. Every lane was filtered out on every volley: `node -e` prints `[]` four times in a row. The Choirmaster's signature halo wall never fired. The fix (`:148`) is correct, and now two-of-three-lane walls fire on every attack (cooldowns 1.5, 1.2 and 0.95 s). `docs/OVERNIGHT-STATUS.md` mentions the fix but not the consequence.
- **Phase 1 no longer tops up adds.** Removing the telegraph summon leaves the phase timer (gated `phase >= 2`, `:127`) and the roar (only on phase transitions, `:132`). Phase 1 now gets only the opening two walkers (`src/campaign.js:138`) and then goes solo. Before, every telegraph topped it back up to two.
- **Bot, Stage 2, same seed, base → PR:**

| Difficulty | Boss time | Boss hits on Bob | Boss deaths | Halos fired | Stage time |
|---|---|---|---|---|---|
| Adventure | 49.0 → 42.2 s | 1 → 4 | 0 → 1 | 0 → 24 | 189 → 182 s |
| Nightmare | 78.8 → 51.5 s | 6 → 3 | 2 → 1 | 0 → 38 | 319 → 263 s |

- **Assessment:** the Adventure band still holds. But the boss is now more dangerous per attack and emptier in phase 1, and the fight shape has changed. The fixes themselves are right. This needs a human playtest and Jason's sign-off rather than riding in as "P1-12".
- **No phase-1 add test:** the new test (`tests/yettis.test.mjs:23`) proves the telegraph doesn't summon and the roar does. It doesn't check phase-1 add pressure.

### C4 — P2 · The Papi wipe still lands before the runners reach most enemies
- **Where:** `src/campaign.js:18` versus `src/papacito-fx.js:6,9`.
- **The mismatch:** the runners start at screen x = −180 − i·90 and move at 980 px/s in screen space. After 0.45 s the front runner is at screen x ≈ 261. Enemies stand in the right half of the arena (spawns at `zone.l+780+`, so screen x ≈ 700–1100). The runner front reaches them about 0.9–1.3 s after the shout, so the kills still land 0.5–0.8 s before the runners arrive. The 0.45 s figure appears to come from the "~0.5 s" estimate in FIX-LIST, which measured the first runner entering the screen, not reaching anyone.
- **Fix direction:** resolve each kill at its own arrival time, `(e.x - camX + 180) / 980`, which is well under `papiTime = 2.5`. Or keep one delay but derive it from the median target.

### C5 — P2 (latent) · The F1 fix holds two queued lines, not three
- **Where:** `src/audio.js:465,485` and `src/game-scene.js:146`.
- **Cause:** a queued line's deadline is computed once, from the line sounding at queue time. The stretch on start only applies to entries whose `behind` matches the line that just started.
- **Reproduced** with the PR's own fake-audio harness: lines of 3.4 s, 3.9 s and 1.0 s, queued the way `playHeld` does it (`wait` 0, 2.5, 5). The third expires at 5 s while line 2 runs until 7.3 s, and it never plays.
- **Severity:** no shipped path queues three lines in one instant today. The victory and kidnap holds are two lines each, and armed lines are spaced out, so this is latent. It bites the moment a third held line is added.
- **Fix direction:** when any line starts, re-stretch every queued entry to the cumulative end of the lines ahead of it, still capped. Add a three-line test.

### C6 — P2 · P1-13 misses the longest clip: the title intro
- **Where:** `src/main.js:40`.
- **What happens:** the intro (61.6 s for v3, 72.3 s for v2, measured by Kimi) plays from the Title scene with no `pauseForClip`. Phaser keeps rendering the title for the whole clip, which is the battery and draw cost Argon flagged ("intro/victory").
- **Test:** the claim's test (`tests/press-governor.test.mjs:65-68`) is a regex over `game-scene.js`, so it cannot catch this.
- **Fix direction:** wrap the intro `story.play` with `pauseForClip(this.game)`.

### C7 — P2 · Kimi F7 still open, and P1-10 makes the contradiction visible
- **Where:** `src/dad-call.js:50-57` versus `:24`; `src/campaign.js:243`.
- **What happens:** `grantZoneMercy` restores a charge but leaves `phaseCalls` alone. Picture a Nightmare boss-arena death #3 after Dad was already used in that phase. The banner says "MERCY. DAD'S BACK ON THE LINE." The next press then says "DAD ALREADY SWATTED THIS PHASE." The P1-10 banner is accurate, but now the two messages openly contradict each other.
- **Fix direction:** clear `phaseCalls` for the current phase in the mercy grant, or fall back to the `'breath'` trio in that state.

### C8 — P2 · The freeze-guard half of `recovery.js` is still unwired
- **Where:** `src/recovery.js:24`.
- **What's missing:** `showStuck` has no caller and nothing detects a stalled frame loop. The PR's "recovery.js wired" covers the resume-flag cleanup and the startup card's Reload only. The commit title says exactly that, so the claim is honest, but FIX-LIST P1-7's "recovery" is still half open.
- **Side note:** the stage-aware Reload also fires for stage asset-load failures (`src/game-scene.js:54` calls `__bdbStartup.fail`), which is the desirable case.

### C9 — P2 · Kimi F6 has already drifted: the Wingman halo telegraph is drawn on the wrong lanes
- **Where:** `src/game-scene.js:134` versus `src/wingman.js:52` and `src/yettis.js:27`.
- **What happens:** the halo volley fires at `LANE_TOP + i*59` (y = 572, 631, 690), but the telegraph fills bands at `572 + i*39` (572–608, 611–647, 650–686). The third band never reaches the bottom lane at y = 690, so the safe/unsafe read for the final boss's key attack is visually off.
- **Origin:** this dates to `a7607da`, not this PR. It is the concrete drift Kimi predicted.
- **Fix direction:** use `laneY(i)` from `src/yettis.js` here and in `stepDust` (`src/game-scene.js:86`).

### C10 — P3 · Refusal-banner nits (P1-10)
- **Where:** `src/dad-call.js:23,37`.
- **Misleading "spent" banner:** `refuseReason` folds "Dad not unlocked yet" into `'spent'` (`:23`). Before Stage 1 Zone 3 a press reads "DAD'S OUT OF SWATS (0/1 · CALL 0/3)" for a Dad who hasn't arrived.
- **No recharge progress:** the spent banner shows charge and call counts but not the 10-KO / 45 s progress. Muse's point (`docs/MUSE-100-IMPROVEMENTS.md:250`) was that players can't learn that rule.

### C11 — P3 · The two Wingman bars are indistinguishable
- **Where:** `src/hud.js:9,44`.
- **What happens:** `bossBars` computes `W1`/`W2` labels, but the draw loop ignores them and paints both bars `0xd6a2ff`. The Wingman sprites are tinted violet and pink (`src/game-scene.js:98`), so the bars could borrow those tints.
- **Minor perf:** two filters, a map and an `entries()` per frame (negligible).

### C12 — P3 · Escape and P now start the game from the title
- **Where:** `src/main.js:50`.
- **What happens:** taking `pause` on the title is what makes pad Start work, but keyboard Escape and P map to `pause` too. Escape normally means "back", so starting a run on it is surprising. Consider gating this to the pad, or to Enter only.

### C13 — P3 · The "second swat" docs bug wasn't reconciled
- **Where:** `plan/BUILD-PLAN.md` §4.4 and `docs/MUSE-100-IMPROVEMENTS.md:254-255`.
- **What's wrong:** these still promise two swats. The new code comment (`src/dad.js:4`) explains the single-swat atlas. Either fix the plan doc or add the second swat to the backlog.

### C14 — P3 · Stage 2's chapter narration is captioned but never heard on first entry
- **Where:** `src/campaign.js:57,65` and `src/game-scene.js:69,149`.
- **What happens:** `create` drains `voice nar_ch2` and then `cutscene kidnap` in one pass. `say()` captions `nar_ch2` and starts loading it, then `startHeldClip` runs `stopSceneAudio()`, which cancels the load. This came from the Pass-1 drain order, not this PR. If the kidnap clip is meant to replace the chapter VO, skip the emit. Otherwise hold `nar_ch2` with the others.

### C15 — P3 · Several new "tests" only grep the source
- **Where:**
  - `tests/input-map.test.mjs:10-11` (P1-15, P1-17)
  - `tests/press-governor.test.mjs:65-68` (P1-13)
  - `tests/wingman-sim.test.mjs:6-18` (HUD band, street label)
- **What's wrong:** these assert on source text, so a refactor that keeps behaviour breaks them, and a behavioural break that keeps the text passes. C6 is an example of the second case. Prefer driving `Title.update` / `GameScene.update` with a stub Input, and `startHeldClip` with a stub `game`, as `tests/corpses-scene.test.mjs` already does.

---

## Kimi's deferred items — status on this PR

| Item | Status | Where |
|---|---|---|
| **F4** dead `fx.hitstop` / `fx.slowmo` | **Still open.** Both are written (`src/fx.js:51,57`) and read nowhere outside `fx.js`. | Wire or delete. |
| **F5** per-frame `matchMedia` | **Still open.** `syncRotatePause` is called every frame (`src/game-scene.js:187`) and builds a new `MediaQueryList` each time (`src/rotate-block.js:6`). | Cache one MQL per scene and listen for `change`. |
| **F6** lane constants restated | **Still open, and it has drifted** (see C9). Restated at `src/game-scene.js:86`, `:134` (wrong spacing), `src/yettis.js:149-150` (`/59`, `*59` next to `LANE_H` at `:27`) and `src/wingman.js:52`. | Import `LANE_H` / `laneY`. |
| **F7** mercy charge unusable in a spent boss phase | **Still open; now visible** (see C7). | `src/dad-call.js:50-57`. |
| **F8** cosmetic | **Mostly open.** (a) The Stage-2 music blip remains: `playTrack('stage2')` at `src/game-scene.js:67`, then `playTrack(null)` from the drained kidnap event in the same `create` (`:69` → `:149`). (b) The mercy banner still overwrites the checkpoint banner in the same tick (`src/campaign.js:242-244`). (c) Kill impacts still splat twice and play two hit SFX (`src/game-scene.js:184`). (d) The "hurt drives `fx.impact`" overlap with P1-8 is resolved: the knockback slide has now landed alongside it. | |
| **G5** rotate overlay only browser-tested | **Still open**, and correctly deferred: it needs `tools/browser-smoke.mjs` or a device. No new coverage. | |

## Performance
No meaningful regressions:
- Knockback, the Papi pending timer and the voice-queue stretch are all O(1) per frame or per event.
- The extra Choirmaster halos add a handful of `hostile` entries.
- `bossBars` allocates small arrays per frame.
- Pre-existing per-frame costs are untouched: F5 `matchMedia`, and K6 DOM writes (`#tbPapi`/`#tbDad` `textContent` every frame, `src/hud.js:46`).
- The governor now calls `setRS` once per scene start even at tier 0. `setRS` returns early when the scale hasn't changed (`src/quality-governor.js:68-69`), so this is free.

## Test gaps (new)
- **G7:** nothing dispatches `pointerdown` then `touchend` on a muted Dad clip. This would have caught C1.
- **G8:** nothing checks that a Dad clip is blessed before it starts (C2). The test named for it asserts nothing.
- **G9:** there is no three-line voice-queue test (C5).
- **G10:** nothing checks Papi kill timing against where the runners are (C4).
- **G11:** there is no Choirmaster phase-1 add-pressure or volley-count test (C3). The bot band is the only guard, and it is Adventure-only.
- **G12:** the P1-13, P1-15 and P1-18 tests check source text, not behaviour (C15).

## Not verified here
Device behaviour is unverified: the iOS bless and gesture flow, real portrait hardware, a real gamepad, the 44 pt targets on a notched phone, and legibility of the .55 HUD band over bright plates. The bot runs are one deterministic seed each. `tools/browser-smoke.mjs` was not run.

## Bottom line
Merge into `bdb-pass1-grok` only after these:
- **C1 (required):** a one-line regression on the target device.
- **C2:** the claimed fix doesn't reach the first Dad clip.
- **C3:** Jason or a playtester should accept the new Choirmaster fight. The code is right; the design change was never called out.

C4–C8 are good follow-ups. Everything else can ride a later pass. Tests: 168/168 green.
