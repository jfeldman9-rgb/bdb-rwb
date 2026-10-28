# Kimi review — Pass 4 (draft PR #11)

**Branch/commit:** `cursor/bdb-pass4-cfe0` @ `3f76903` into `cursor/bdb-pass3-7221` @ `298879e`
**Date:** 2026-10-28 · **Reviewer:** Kimi (read-only; no game code touched)
**Method:** fresh `git clone` of the PR head → `npm ci` → `npm test`; a static import-graph crawl from the browser entry; line-by-line read of the full diff (`298879e..3f76903`, 30 files, +599/−92) and of every touched module at HEAD; `tools/bot-sim.mjs` re-run at 60/30/120 Hz; each P4 claim in `docs/FIX-LIST.md` checked against the code.

## Score: 8/10

Every one of the eighteen P4 claims is real, tested, and verified below against the diff — no ghost fixes, no doc-only claims. The fresh-clone numbers in the PR body and `docs/OVERNIGHT-STATUS.md` reproduce exactly (210/210; bot times match to the tenth of a second). Locked items are all intact. What holds the score at 8: a latent (today-unreachable) Wingman-finisher softlock that P4-4's own new restore path makes representable but leaves unhandled and untested; a freeze-guard error counter that never resets and can false-positive a healthy stage; a fragile `source` contract on the new `killImpact` ko gate; and a P4-7 "per-frame lists are reused" claim that covers the named sites but leaves the two hottest allocation sites (gun target scan, `events.splice(0)`) untouched.

---

## Fresh-clone verification (reproduced, not trusted)

| Check | Result |
|---|---|
| `git clone` → checkout `cursor/bdb-pass4-cfe0` (`3f76903`) | clean |
| `npm ci` | OK, 0 vulnerabilities (lockfile has no runtime deps) |
| `npm test` | **210/210 pass**, 0 fail (~1.0 s) — matches the PR/OVERNIGHT-STATUS claim |
| Browser entry `index.html:83` (`lib/phaser.min.js` then `src/bootstrap.js`) | both exist (`phaser.min.js` 1.37 MB) |
| Import-graph crawl from `src/bootstrap.js` (incl. dynamic `import('./main.js')`) | **54 modules reachable, 100 import edges checked, 0 missing files, 0 missing named/default exports** — `shot-feel.js`, `bindRotatePause` (`src/rotate-block.js:21`), `noteRenderer` (`src/perf.js:170`) all resolve |
| `tools/bot-sim.mjs adventure` 60/30/120 Hz | stage clears 165.1/189/206.5 · 165/194.1/198.2 · 161.4/193.3/203.8 s; campaign 165.1/187.1/212.9 · 165/184.7/206.6 · 161.4/197.6/206.9 s — **identical to the doc's claims**, all inside 140–240 s |

Crawl caveat (my checker, not the game): 4 of 58 `src/` modules are not reachable from the browser entry and are imported by nothing at all — `crate-texture.js`, `cutscene-scene.js`, `music.js`, `perf-panel.js`. Pre-existing dead code (untouched by this PR); `tests/boot.test.mjs` still parses them. Hygiene item, not a finding against the pass.

## Locked items — all intact

- Eggplant fires straight: `vy: 0` in `createShot` and re-asserted every step (`src/eggplant.js:4,14`); the nightmare-clear harness asserts `shot.vy === 0` per shot. No aiming added.
- `CAM_LEAD = 0.28` (`src/config.js:4`) — unchanged; respawn now uses the constant (`src/campaign.js:267`).
- No shop: zero `shop`/`upgrade` references in `src/`.
- Quoted lines exact: `src/voice-lines.js`, `src/story.js`, `docs/BOB-LINES.md` are not in the diff; `STORY.dad` catchphrase (`src/story.js:7`) byte-identical.
- `assets/cutscenes/intro_v3.mp4`: no `assets/` path in the diff.
- Choirmaster HP 1140 (`src/yettis.js:11`), `choirMultiplier` 1.28 (`src/yettis.js:83-85`), shield break at 3 (`src/yettis.js:133`), minion corpse hold 0.5 s (`src/corpses.js:2`) — all unchanged.

## Claim-by-claim verification (P4-1 … P4-18)

| ID | Verdict | Evidence |
|---|---|---|
| P4-1 30 Hz Wingman soak | **Verified** | `Wingman.canBeHit` excludes `phase===3 && hp<=1` (`src/wingman.js:31-36`); both shot paths already filter on `canBeHit !== false` (`src/eggplant.js:10,15`). New tests: shot-through at 1/30 dt (`tests/wingman-sim.test.mjs:8-19`) and full-stage clears S1–S3 at 60 **and** 30 Hz (`tests/nightmare-clear.test.mjs:200-210`). |
| P4-2 stuck card on slow load / stray error | **Verified** | `started` now set at end of `create`, not `init` (`src/game-scene.js:53,82`); loader in flight skips the guard (`src/recovery.js:77,89`); one same-origin error counts a strike, two trip (`src/recovery.js:96-102`); empty `filename` ignored. Tests cover slow preload, single/repeat error, empty filename (`tests/recovery.test.mjs:63-109`). But see **F1**. |
| P4-3 catchphrase dropped | **Verified** | `dad_catchphrase$` added to `SCRIPTED_VOICE` (`src/audio.js:435`) → queues behind the sounding line with a stretched deadline (`src/audio.js:477-482,502`). Test: `tests/voice-queue.test.mjs:133-146`; fixture text matches `STORY.dad` exactly. |
| P4-4 dead Wingman revived | **Verified, with a latent hole** | Respawn snapshots `wingHp`+`wingDead` (`src/campaign.js:250-256`); restore re-kills (`src/campaign.js:148-153`); phase advance clears both (`src/wingman.js:76-77`). Tests: `tests/nightmare-clear.test.mjs:154-184`. See **F2**. |
| P4-5 stacked Reload listener / guard teardown | **Verified** | `showStuck` expando-guarded against both its own repeat and startup's listener (`src/recovery.js:31-36`, `src/startup.js:60-62`); idempotent destroy on game `destroy` (`src/recovery.js:115-130`). Tests: `tests/recovery.test.mjs:111-153`. |
| P4-6 clip pause ownership | **Verified** | `startHeldClip` no longer calls `pauseForClip` (`src/game-scene.js:171-179`); `play()` aborts a live clip first (`src/cutscene-hooks.js:18`) and `abort()` is callback-free by contract (`src/cutscene.js:150,213-223`), so no double-resume and no done-callback storm; `destroy()` resumes (`src/cutscene-hooks.js:25`). Tests: `tests/stage-cutscene.test.mjs:62-88`, `tests/title-flow.test.mjs:90-107`. |
| P4-7 per-frame lists + boss-bar gates | **Verified for the named sites; partial overall** | `keep()` in-place sweeps (`src/campaign.js:21-25,132,373,385,391`); stepping copy reused (`src/campaign.js:376-379`); `liveSet` reused (`src/game-scene.js:110-111`); particles compacted in place (`src/game-scene.js:165-167`); HUD bars/layout reuse `this._bars`/`this._laid` (`src/hud.js:8-52,73,86`); 66%/33% ticks drawn (`src/hud.js:93-94`, `BOSS_GATES` `src/yettis.js:14`). Tests pin reuse identity and tick positions (`tests/wingman-sim.test.mjs:39-57`). See **F4**. |
| P4-8 Stage 2 music blip | **Verified** | `trackForStageStart` returns null when a cutscene event is queued (`src/game-scene.js:23-26,75-76`); the `?nocutscenes=1` path still starts the track via the synchronous `done()` — no silent stage. Test: `tests/stage-cutscene.test.mjs:90-94`. Residual blip at the stage-3 boss: **F5**. |
| P4-9 hardcoded 0.28 | **Verified** | `cp.x-VW*CAM_LEAD` (`src/campaign.js:267`). Pinned by `tests/camera.test.mjs:48-53` — a regex-on-source test, see test-gap note T3. |
| P4-10 mercy banner / double splat | **Verified** | Checkpoint and mercy compose one banner (`src/campaign.js:272-275`); `killImpact` drops the bob-ko event entirely and keeps papi/dad ko splats (`src/shot-feel.js:8-12`, `src/game-scene.js:205`); every bob kill emits `hit` (kind heavy) immediately before `recordKo`'s `ko` (`src/campaign.js:195-200,210`), so no kill goes silent today. Tests: `tests/nightmare-clear.test.mjs:77,103`, `tests/presentation.test.mjs:16-23`. Fragile contract: **F3**. |
| P4-11 locked vs spent / recharge display | **Verified** | `'locked'` split from `'spent'` (`src/dad-call.js:23-24`); locked banner keeps the old wording (`src/dad-call.js:38`, `src/campaign.js:226`); spent shows `kos/10 KOs · ⌛s` only while recharging (`src/dad-call.js:39-45`). Tests: `tests/dad-call.test.mjs:26-37`. |
| P4-12 Escape/P start the title | **Verified** | `titleWantsBegin` requires a pad-held pause for the pause action (`src/input.js:8-13`); the Title scene polls the pad before asking (`src/main.js:52`); pad Start and Enter still begin; gameplay pause untouched. Tests: `tests/input-map.test.mjs:10-35`. |
| P4-13 two-swat docs | **Verified** | `plan/BUILD-PLAN.md`, `plan/STATUS.md`, `docs/MUSE-100-IMPROVEMENTS.md` now say one swat; `src/dad.js` untouched and the enter/swat/exit timing test still pins the single swat. |
| P4-14 choir aura | **Verified** | `choirAura` (`src/yettis.js:87-90`); ring + 3 orbiting notes + gold buff pulse (`src/game-scene.js:144-151`); multiplier still 1.28. Test: `tests/yettis.test.mjs:14`. Cosmetic nit: **F6**. |
| P4-15 shield cracks + rising clang | **Verified** | `shieldHits` drives 1/2 crack strokes (`src/game-scene.js:153`); chips ride the shield event (`src/campaign.js:184`) into `sfx.clang(chip)` (`src/game-scene.js:195`, `src/audio.js:182`); first chip keeps the old 1250 Hz (`src/audio.js:143-145`); break still the third hit (`src/yettis.js:131-137`). Test: `tests/yettis.test.mjs:6`. |
| P4-16 same-lane separation | **Verified** | `separateEnemies`: 46 px gap, ≤8 px/body/pair, `actorId`-ordered, bounds-clamped, bosses exempt — and Wingmen are `boss: true`, so the council is exempt too (`src/yettis.js:92-117`, `src/wingman.js:27`). Called once per sim step (`src/campaign.js:393`). Tests incl. tie-break and boss immunity: `tests/yettis.test.mjs:28-44`. Bot band holds at 60/30/120 Hz (table above). Minor reach note: **F7**. |
| P4-17 boss corpse hold | **Verified** | `BOSS_CORPSE_S = 1.2` vs `CORPSE_S = 0.5`, same fade tail (`src/corpses.js:2-15`); applied by model boss-ness (`src/game-scene.js:125`). Test: `tests/corpses.test.mjs:24-33`. |
| P4-18 chapter vs title wording | **Verified** | `messages.chapter` selected only when the title already finished (`src/startup.js:13,25`); boot-time asset failures keep the old wording. Test: `tests/recovery.test.mjs:76-86`. |

Deferred list in `docs/FIX-LIST.md` is consistent with the diff: no Choirmaster/volley/add retune, no zone-5 heal change, no `grabPunish` rework, no static export check.

---

## Findings (prioritized)

### M1. Latent softlock: a one-dead-one-alive Wingman restore can never be finished — `src/wingman.js:9-17,88-91`, restore at `src/campaign.js:148-153`
P4-4's own new test constructs exactly this state (`tests/nightmare-clear.test.mjs:154-172`: W1 alive at 40 HP, W2 restored dead) but only asserts the corpse stays down — it never asks whether the stage can still be completed. From that state: the live Wingman floors at 1 HP and becomes unhittable (`canBeHit`, `src/wingman.js:31-36`); `isBossFinisherReady` demands `liveBosses.length === 2`, so Papacito is refused forever ("WEAKEN BOTH WINGMEN FIRST", `src/papacito.js:35-41`); `Wingmen.complete` demands *all* wingmen dead (`src/wingman.js:89-91`). No mercy, no softlock trio (that only fires when `ready`), no way out.
**Reachability today:** none found — the finisher is the only Wingman kill path, it always schedules every live boss inside one 2.5 s `papiTime` window (`src/papacito.js:53-64`, `src/campaign.js:329-340`), and Bob cannot be hurt during `papiTime` (update returns before hostile/enemy steps). So both wingmen always die together, and the mixed state is synthetic-only. But P4-4 made it *representable* in the checkpoint, and any future change (a partial finisher, a new boss damage source, a Dad retune post-Jason) walls the run hard.
**Fix (hardening, no behavior change today):** treat a dead Wingman as satisfied in `isBossFinisherReady` (e.g. `phase === 3 && bosses.length === 2 && bosses.every(b => !b.alive || b.hp <= 1)`), and/or let `Wingmen.update` complete when every wingman is dead. Add a test that finishes the stage from the synthetic one-dead restore.

### M2. Freeze-guard error strikes never reset — two unrelated errors across a long session trip the stuck card on a healthy stage — `src/recovery.js:74-75,90,96-102`
`strikes` is cumulative for the life of the guard: `onError` increments on any same-origin error with a non-empty filename and trips at 2, and the interval also trips once `strikes >= 2` even with no new error. There is no decay and no reset on a healthy `beat`. Two transient throws minutes apart (a Safari rAF hiccup, a one-off Phaser internal, an extension-in-page-context error that slips the origin check) raise "This stage stopped running" while the loop is beating fine; Reload then costs the player their in-stage progress (resume restarts at the stage start). The P4-2 spec ("a single stray error does not trip; a repeat does") is met literally, but the tests only exercise two-in-a-row (`tests/recovery.test.mjs:63-79`).
**Fix:** reset `strikes`/`pendingError` when a beat lands after the first strike (or require both strikes within a short window, e.g. 5 s), and add a test: error → beats resume → second error much later → no card.

### L1. `killImpact` turns a `ko` without `source` into total silence — `src/shot-feel.js:8-12`, `src/game-scene.js:205`
The ko gate is `data?.source && data.source !== 'bob'`. All three current emitters pass `source` (`src/campaign.js:180,337,341`), so behavior is correct today — but the contract is pinned nowhere. If a future ko path omits `source` (or `recordKo`'s payload is refactored), that kill plays **no** sfx, splat, or particles at all (pre-P4-10, ko always splatted). Default should be loud, not silent: treat unknown/missing source as non-bob (`!(data?.source === 'bob')`). Add an integration test asserting `recordKo` emits `{source}` — the unit test only feeds `killImpact` hand-made data (`tests/presentation.test.mjs:16-23`).

### L2. P4-7 leaves the hottest per-frame allocations in place — `src/eggplant.js:10-11,15-16`, `src/game-scene.js:189`, `src/yettis.js:87-90`
The fix list named `syncViews`, `effects`, particles, and the sim's dead-entry sweeps — all delivered. Still allocating per frame: `fireGun`'s target `filter(...).sort(...)` (two arrays every sim step, fire held or not), `stepShot`'s filter+sort per projectile, `handleEvents`' `this.world.events.splice(0)` (a fresh array every scene frame, empty or not), and — new in this pass — `choirAura(e)` returns a fresh `{r:300,notes:3}` per choir per frame inside `effects` (`src/game-scene.js:145`), plus an O(n²) `choirMultiplier` hypot pass over all enemies in the same loop (`src/game-scene.js:151`). n is small so this is iPhone-GC hygiene, not a measured regression — but the pass-4 framing ("per-frame lists are reused") oversells it. Suggest a module-level frozen `CHOIR_AURA` and the same `keep()`/scratch-array treatment for the gun scan in a future pass.

### L3. Stage-3 boss music still blips ~0.4 s under `rescue_pre_boss` — `src/campaign.js:156-159`, `src/game-scene.js:196,200`
P4-8 gated the *stage-start* track, but `startBoss` emits `boss` then `cutscene` back-to-back; one `handleEvents` pass plays `boss3` and immediately fades it (`playTrack(null,{fade:.4})`). Same class of blip P4-8 fixed, one arena later. Cheap fix: have the `boss` handler skip `playTrack` when a `cutscene` event sits later in the same drained batch, or gate it in `Campaign.startBoss`. Cosmetic.

### L4. Choir `else if` hides the buff pulse on a buffed choir — `src/game-scene.js:145-151`
A choir inside *another* choir's 300 px aura has `choirMultiplier > 1` but draws only its own ring (the `aura` branch), never the gold buffed-ellipse. Two overlapping choirs (or choir + Choirmaster) read as unbuffed even though they are buffed. The pulse check should be independent, not `else if`. Readability nit against P4-14's own goal.

### L5. `separateEnemies` shoves bodies that are mid-interaction — `src/yettis.js:97-117`
The filter is `alive && !boss` only: a `hold`-state Lecturer (grabbing Bob), a `telegraph`/`rush` Charger, or a `down`-state elite still gets pushed ≤8 px/frame. Grab logic is reference-based so nothing breaks, but a holding Lecturer visibly slides away from the grabbed Bob, and a push can tip a walker across the 85 px attack-reach boundary (`src/yettis.js:211,220`) for a hit it hadn't earned. Suggest skipping `hold`/`telegraph`/`rush`/`stun` states. Low impact; the 46 px separation itself and the Adventure band both check out.

---

## Test gaps (non-blocking)

- **T1 (covers M1):** the one-dead restore test asserts state, not finishability (`tests/nightmare-clear.test.mjs:154-172`). Add "stage still completes from this restore" once M1 is hardened.
- **T2:** no integration test pins that `recordKo`'s ko payload carries `source` (see L1), nor that a floored phase-3 Wingman makes `useDad` refuse `empty` instead of spending the call (`src/campaign.js:227-231` — a genuine behavior improvement this pass makes, currently unpinned).
- **T3:** two new tests are regex-on-source (`tests/camera.test.mjs:48-53` matching `cp.x-VW*CAM_LEAD`; `tests/recovery.test.mjs:107` matching `this.started=true` in `create`'s source) — the pattern P3-13 explicitly retired. They pass today but break on a reformat; a behaviour assertion (respawn camX vs `CAM_LEAD`; a stubbed scene through init→create) is cheap.
- **T4:** the `__bdbStuck` branch of `showStuck` (listener added only when startup's guard is absent) is dead in production order and only lightly covered; the 46 px separation bounds clamp (`l+55`/`r-55`) is untested.
- **T5:** P4-14/15's new drawing code (ring, notes, cracks) is unit-tested at the data level only — acceptable for procedural graphics, but nothing would catch a future `g.` typo; the existing `wingman-sim` HUD stub pattern could host a smoke assertion.

## What I verified that the PR did *not* break

- 30 Hz device-step sim: the fix is in the model (`canBeHit`), not the harness dt — device loop still steps 1/60 (`src/game-scene.js:211-212`); only the bot finishability proxy steps 1/30, matching the FIX-LIST note.
- Dad's per-phase budget, mercy phase-clear (`src/dad-call.js:64-65`), and the `'empty'`/`'boss-invulnerable'` refusal ordering are unchanged; a floored Wingman now reads `NO TARGETS IN SIGHT.` instead of burning a call (better, unpinned — T2).
- The both-dead Wingman respawn completes correctly: `defeated` → `complete` → `finishStage` (`src/wingman.js:89-91`, `src/campaign.js:394-396`).
- `nocutscenes=1` stage 2 still gets its music via the synchronous `done()`; the title intro path (`beginChapter`) is untouched.
- Prior green areas stay green: 210 tests across 38 files, including the pass-3 behaviour conversions.

**Bottom line:** mergeable-quality pass once M1 is at least ticketed. Nothing here regresses gameplay, perf, or the locked rules; the two M items are a latent wall and a false-positive edge, not live bugs on today's paths.
