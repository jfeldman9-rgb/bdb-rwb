# BDB — Muse Pass 4 review (game feel & pacing)

**Reviewer:** Muse Wonder (read-only pass; no game code changed, no merge, no deploy)
**Reviewed:** draft PR #11, head `cursor/bdb-pass4-cfe0` @ `3f76903`, base `cursor/bdb-pass3-7221`
**Against:** `docs/MUSE-100-IMPROVEMENTS.md`, `docs/REVIEW-MUSE-PASS3.md` (branch `cursor/muse-pass3-review-54c5`), and the Pass 4 claim list in `docs/FIX-LIST.md` (P4-1…P4-18)
**Method:** fresh clone from GitHub (`gh repo clone`, branch `cursor/bdb-pass4-cfe0`), `npm ci`, `npm test` under Node 24.22.1; a browser-entry import audit of `index.html` → `lib/phaser.min.js` → `src/bootstrap.js` → `src/main.js`; headless bot runs (`node tools/bot-sim.mjs <difficulty> <hz>`) at 30/60/120 Hz on Story/Adventure/Nightmare; source read of the feel/pacing/mobile paths; and `tools/browser-smoke.mjs` under headless Chrome 156 (SwiftShader) against a server run from that same fresh clone, repeated against the Pass 3 base commit `298879e` for regression attribution.

## Score: 6 / 10

| Area | Score | One-line verdict |
|---|---|---|
| Combat feel | 7/10 | Single-splat kills, choir aura, shield cracks, separation and the longer boss corpse are all real code now; none of it can be seen in a browser until the P1 below is fixed. |
| Pacing (per stage) | 8/10 | Adventure holds the 140–240 s band at every rate and every stage; Story is shorter by design; campaign ≈9.5 min on Adventure. |
| Difficulty curve | 6/10 | The Pass 3 P1 is closed — Nightmare clears at 30 Hz — but Nightmare S3 at 60 Hz is a deterministic outlier, and Story is still deathless-flat. |
| Cutscene / call-in flow | 6/10 | Dad's catchphrase now queues as a scripted line, the story player owns the clip pause, Stage 2 music no longer blips — all test-verified, none browser-reachable past the create crash. |
| Readability | 6/10 | Boss bars tick the 66%/33% gates, the choir ring matches the 300 px buff, shield chips draw cracks; hostile shapes are still Graphics primitives and the finisher pulse is still text-only. |
| Mobile controls | 4/10 | Escape/P no longer start a run and the rotate listener exists and is unit-tested, but the browser smoke dies before any touch/rotate/recovery check runs, and there is still no device evidence. |

**The sim-level pass is the best one yet, and the score is still capped by the browser.** Every Pass 3 finding I filed is either fixed and verified below or honestly deferred. But the shipped game still does not reach gameplay in a real (headless) browser: `GameScene.create()` throws part-way through, the scene never starts, and — in an unhappy interaction with a Pass 4 fix — the freeze guard now politely waits forever for a `started` flag that will never be set. This crash predates Pass 4 (it reproduces identically at `298879e`), so it is not a Pass 4 regression; it is, however, the reason every presentation claim in P4-14…P4-17 remains unverified where it matters, exactly as in Pass 3.

**Locked rules re-verified intact (not findings, do not "fix"):** eggplant fires straight (`vy = 0`, `src/eggplant.js:4,15`), `CAM_LEAD = 0.28` (`src/config.js:4`, and respawn now uses the constant — P4-9), no shop/upgrade code anywhere in `src/` or `index.html`, Dad's catchphrase word-for-word at `src/story.js:7`, and `assets/cutscenes/intro_v3.mp4` untouched (not in the diff). Choirmaster HP/volleys/adds untouched (HP still 1140).

---

## Evidence: fresh clone, tests, import audit (this reviewer's runs)

- **Fresh GitHub clone of `3f76903`: `npm ci` clean, `npm test` = 210/210.** The PR body's headline number reproduces exactly this time — the Pass 3 lesson landed. (Reviewer artifact, not a finding: cloning from a local path instead of GitHub makes `tests/boot.test.mjs`'s private-remote check fail on the `origin → /workspace` URL, 209/210. From the real remote it is 210/210.)
- **Browser-entry imports all resolve.** `index.html` loads `lib/phaser.min.js` (present, 1.4 MB) then `src/bootstrap.js`, which dynamic-imports `src/main.js`. I audited all 58 modules in `src/`: every relative import names a file that exists, and every named import names a real export — including the three that sank Pass 3 (`src/shot-feel.js` is committed; `bindRotatePause` is exported from `src/rotate-block.js:21` and used at `src/game-scene.js:78`; `noteRenderer` is exported from `src/perf.js:170` and used at `src/main.js:66`). Multi-name declarations (`export const VW = 1280, VH = 720`) initially look like missing exports to a naive regex audit; they are fine, and `tests/boot.test.mjs` importing every module under a DOM stub corroborates it. **Module linking is not the problem this pass. Runtime scene creation is (P1).**

## Evidence: bot sims (this reviewer's runs, fresh clone)

Deterministic — repeated runs reproduce every figure to the decimal.

| Run | S1 | S2 | S3 | Campaign | Deaths (per stage, fresh starts) |
|---|---|---|---|---|---|
| Story 30 Hz | 126.5 s | 137.6 s | 151.8 s | 416.7 s | 0 / 0 / 0 |
| Story 60 Hz | 127.9 s | 141.1 s | 155.6 s | 426.0 s | 0 / 0 / 0 |
| Story 120 Hz | 125.3 s | 138.9 s | 152.1 s | 414.8 s | 0 / 0 / 0 |
| Adventure 30 Hz | 165.0 s | 194.1 s | 198.2 s | 563.7 s | 0 / 3 / 2 |
| Adventure 60 Hz | 165.1 s | 189.0 s | 206.5 s | 572.6 s | 0 / 2 / 2 |
| Adventure 120 Hz | 161.4 s | 193.3 s | 203.8 s | 573.4 s | 0 / 3 / 2 |
| Nightmare 30 Hz | 249.0 s | 252.3 s | 283.9 s | 833.4 s | 6 / 5 / 7 |
| Nightmare 60 Hz | 237.6 s | 267.6 s | 320.0 s | 852.1 s | 6 / 6 / 11 |
| Nightmare 120 Hz | 241.8 s | 267.4 s | 271.4 s | 816.0 s | 6 / 6 / 7 |

All 36 runs (27 fresh stage starts — every stage at every rate — plus 9 full campaigns) clear. Adventure's 140–240 s band (MUSE-100, `docs/LENGTH-DIFFICULTY.md`) holds at every rate; the PR body's Adventure figures (165.1 / 189 / 206.5 s at 60 Hz) reproduce exactly from the pushed head. The headline: **Nightmare S3 at 30 Hz went from the Pass 3 result (1800 s cap, uncleared, 8,377 shots) to 283.9 s / 765 shots** — the phase-3 soak is gone, not papered over.

---

## What Pass 4 got right (verified, not just claimed)

- **P4-1 (Pass 3 P1) — the 30 Hz Nightmare stall is fixed at the root.** A phase-3 Wingman floored at 1 HP no longer satisfies `canBeHit` (`src/wingman.js`), so eggplants pass to the partner instead of soaking; the suite now carries the 30 Hz clear and a full Nightmare S1 clear, and my independent 30 Hz campaign run clears all three stages. Choirmaster numbers untouched, as locked.
- **P4-4 (Pass 3 P2) — a dead Wingman stays dead.** `respawn()` records `wingDead` alongside `wingHp`, `startBoss()` restores a dead Wingman as dead instead of flooring him back to 1 HP, and a phase advance clears the previous phase's HP snapshot (`src/campaign.js`, `src/wingman.js`). The untested edge from Pass 3 now has the test.
- **P4-3 — Dad's catchphrase waits its turn.** `dad_catchphrase` joined `SCRIPTED_VOICE` (`src/audio.js:435`), so with cutscenes off (including every Reload resume) the line queues behind whatever is sounding instead of being dropped at the swat. Wording unchanged; still emitted on impact (Pass 3 P3-5).
- **P4-14/P4-15/P4-16/P4-17 (Pass 3 readability deferrals) — all present in code.** Choir aura is a dashed 300 px ring with note glyphs plus a gold pulse on buffed enemies, radius tied to the unchanged ×1.28 `choirMultiplier` (`choirAura`, `src/yettis.js`; drawn in `effects()`); guard shield chips 1–2 draw crack lines and the clang rises 1250 → 1430 → 1610 Hz (`clangPitch`, threshold still 3 frontal hits); same-lane non-bosses under 46 px separate at a capped 8 px/pair/step in `actorId` order with bosses exempt (`separateEnemies`); boss corpses hold 1.2 s against the minion 0.5 s (`BOSS_CORPSE_S`, `src/corpses.js`).
- **P4-7 — boss bars mark the gates, per-frame lists are reused.** `bossBars`/`bossBarLayout` write into reused arrays and the HUD draws the 66%/33% `BOSS_GATES` ticks (`src/hud.js:93-94`); `syncViews`, `effects()`, particles and the sim's dead-entry sweeps (`keep()` in `src/campaign.js`) no longer allocate per step. This is MUSE-100 #79's tick half and part of #88's hot-path concern, done without touching sim behaviour — Adventure times did not move out of band.
- **P4-10/P4-11/P4-12 — the small honest fixes.** A killing eggplant splats once (`killImpact` in `src/shot-feel.js`: Bob's `ko` no longer double-fires light-then-heavy; Papi/Dad KOs still splat); a mercy respawn keeps the checkpoint line and appends the mercy text instead of replacing it; a locked Dad reports `DAD ARRIVES IN ZONE 3.` rather than "out of swats", and a recharging Dad shows `10 KOs · Ns` progress (`refusalBanner`, `src/dad-call.js` — MUSE-100 #45's remaining half); Escape/P no longer start a run from the title while gamepad Start (via `padHeld`) and Enter still do (`titleWantsBegin`, `src/input.js`).
- **P4-2/P4-5/P4-6/P4-8/P4-18 — flow and guard hygiene.** The freeze guard ignores in-flight loads and needs two same-origin errors (empty-`filename` "Script error." no longer trips); `showStuck` no longer stacks a second Reload listener and the guard timer dies with the game; the story player is the sole owner of the clip pause and aborts a live clip before starting another (`src/cutscene-hooks.js`) — this closes the Pass 3 P3 note about `destroy()` leaving the loop paused; Stage 2's bed stays silent when a cutscene is already queued (`trackForStageStart`); a missing chapter file after the title now says so instead of claiming a pre-title failure. P4-9 (respawn via `CAM_LEAD`) and P4-13 (single-swat docs reconciled, no second swat added) are exactly as small as promised.
- **Claim-list discipline.** Unlike Pass 3, every "done" bullet I spot-checked is in the diff, and the deferred list (Choirmaster balance for Jason, Adventure zone-5, real-device rotate, `grabPunish` handoff, static export check, human Story playthrough) matches what the code actually doesn't do. This is the process fix Pass 3 asked for.

---

## Prioritized findings

### P1 — Gameplay never starts in a browser: `GameScene.create()` throws on a texture-name collision (pre-existing, not a Pass 4 regression)

Verified three ways on the fresh clone: `tools/browser-smoke.mjs` (title loads, Phaser 4.2.1, canvas present), a direct `?demo=1&nocutscenes=1` navigation, and a screenshot capture. All fail the same way:

```
TypeError: Cannot read properties of null (reading 'getContext')
    at radial (src/fx.js:24)
    at FX.makeTextures (src/fx.js:31)   ← radial('shadow', …)
    at new FX (src/fx.js:7)
    at GameScene.create (src/game-scene.js:70)
```

Mechanism, read from source: `create()` first generates a `'shadow'` texture (`src/game-scene.js:67`), then constructs `new FX(this)` (line 70). `FX.makeTextures()` guards only on `'glow'` not existing, then calls `textures.createCanvas('shadow', …)` — Phaser's `createCanvas` returns `null` when the key is already registered (confirmed in `lib/phaser.min.js`), and `radial()` dereferences it. The throw aborts `create()` after the backdrop and HUD are built but before `syncViews()`, `started = true`, or the `playing` body class: the player is left looking at a frozen stage backdrop with no Bob, no enemies, and no way forward. My capture of that state (backdrop rendered, nothing else) matches the code path exactly.

Attribution, stated plainly: **the identical failure reproduces at `298879e` (the Pass 3 base), so Pass 4 did not break this** — the collision dates to the feel-rig wiring that put `FX` after the shadow generation. What Pass 4 did do is claim "browser entry loads" (true, at module-link level) while its own deferral list quietly kept the browser smoke out of scope, so a second consecutive pass ships presentation work that has never run in a browser. Two aggravating details:

- **The freeze guard cannot save the player.** P4-2 deliberately makes the guard wait while `!s?.started`; a `create()` throw leaves `started` false forever, and the error handler's own `scene()?.started` gate swallows the very exception that should trip it. The stuck-card work is good, but this is now its blind spot: a create-time crash is indistinguishable from an infinitely slow load.
- **The test suite structurally cannot catch this.** `tests/boot.test.mjs` imports every module under a DOM stub (module-link only — the Pass 3 P0 class), and the scene/FX tests stub the texture API with objects that always succeed. 210/210 green and an unstartable game are fully compatible, which is precisely why the count keeps being quoted while the browser goes unchecked.

**Fix (for the next coding pass, not this review):** make `makeTextures()` skip any key that already exists (per-key guard, like the scene's own `'shadow'` check), or rename the FX radial; then add one real-browser gate — even a trimmed `browser-smoke.mjs` that only asserts title → gameplay `started` → first `syncViews` — run against the pushed head, and let it count before any feel numbers are quoted. Until then, P4-14…P4-17 (aura, cracks, separation visuals, boss corpse) and the recoil/`hostileShape` work from Pass 3 are reviewed-from-code only.

### P2 — Nightmare's hardest rate is now 60 Hz, not 30 Hz

The 30 Hz stall is gone, but the deterministic table above has a new shape: Nightmare S3 takes **320.0 s with 11 deaths / 38 hurts at 60 Hz**, against 283.9 s / 7 deaths at 30 Hz and 271.4 s / 7 at 120 Hz. 60 Hz is the rate the fixed-timestep device loop actually steps at, and the rate the full-stage Nightmare test pins — so the one configuration a phone plays is the one where the Wingmen fight runs ~15% long and ~60% more lethal than its neighbours. This is not a stall (808 shots, in family with 765/734), and the campaign still clears everywhere; it reads as a dt-sensitivity in phase-3 add/finisher pressure worth one investigation before Nightmare is called finished, ideally by extending the multi-rate coverage that P4-1 started rather than by retuning the fight. Campaign death totals (20–24 on Nightmare, 11 of them in S3 at 60 Hz) remain a checkpoint war of attrition, as noted in Pass 3 — finishable is not the same as fun, and only a human run (MUSE-100 #21) can price that.

### P2 — Story flatness and Adventure's S3 tail are unchanged (deferred, on record)

Story clears deathless at every rate with 9–12 hurts across the *whole campaign*; Adventure still concentrates its damage in S3 (13–14 hurts, 2 deaths at every rate, vs S1's 2–4 hurts / 0 deaths). Pass 4 correctly touched neither (the heal cut stays Nightmare-scoped; no wave retunes), and the band discipline is admirable — but the two oldest pacing questions in this project are still open and still bot-only. One timed human Story + Adventure playthrough remains the cheapest high-value item on the list (MUSE-100 #21), and it is also the only way the new aura/crack/separation readability gets judged at phone size.

### P2 — Readability leftovers, narrowed

What remains after P4-14…P4-17: hostile projectiles are still Graphics primitives (ellipse/ring/bar via `hostileShape`) rather than the prop sprites of MUSE-100 #53/#54 — shape-coding exists now, which was the colourblind-safety point, so this is polish rather than a gap; the boss bar got its phase ticks but the `hp ≤ 1` finisher pulse (#79's second half) is still carried only by the `PRESS PAPI…` prompt text; and the per-frame `Graphics` redraw in `effects()` (MUSE-100 #88) survives intact — P4-7 removed allocations around it, not the redraw itself. All three are legitimately behind the browser gate (P1) and the device gate (#87) in priority.

### P2 — Mobile: better logic, still zero device or browser evidence

The title-input fix is correct and well-tested (`padHeld` distinguishes a gamepad Start from Escape/P), the rotate listener is real code this pass, and touch-DOM caching from Pass 3 stands. But the browser smoke — the only automated touch/rotate/pause/context-recovery check in the repo — dies at `create()` (P1) before any of its touch assertions run, so portrait rotation (Kimi G5, deferred again), simultaneous touch, and graphics recovery are as unverified as they were in Pass 3, and the iPhone p95 gate (MUSE-100 #87) remains the project's oldest unmeasured number. The 44 px touch targets in `index.html` are unchanged. Mobile's score reflects evidence, not effort.

### P3 — Small stuff

- `separateEnemies` pushes per *step*, so at bot-harness rates other than 60 Hz separation converges at a different wall-clock speed; the device loop always steps 1/60, so this is a harness curiosity, not a game bug — worth a comment in the test, nothing more.
- `trackForStageStart` keys off "a cutscene event is already queued at create" — correct for the kidnap case it fixes, but any future stage whose opening clip is queued one tick later will blip again. A `world.events`-timing note in the test name would keep the assumption visible.
- PR-body hygiene is genuinely fixed: the quoted Adventure times and the 210/210 count both reproduce from the pushed head. Keep doing exactly that.

---

## Suggested order for Pass 5 (feel/pacing only)

1. **Unbreak the browser, then gate it.** Per-key texture guard (or rename) in `FX.makeTextures`, plus a minimal real-browser assertion (title → gameplay started) run from a clean checkout of the pushed head. Everything below is unverifiable until this lands. [P1]
2. **Full browser smoke on the fixed head** — Dad call-in, rotate, pause, context recovery, cutscene skip — so three passes of presentation work (recoil, hostile shapes, aura, cracks, corpse holds, boss ticks) get their first visual review, and the freeze guard's create-crash blind spot gets a regression test (a `create()` throw should surface the stuck card, not wait forever). [P1, P2-mobile]
3. **Nightmare 60 Hz S3 investigation** with multi-rate full-stage coverage; no Choirmaster or Wingman number changes without Jason. [P2]
4. **One human Story + Adventure playthrough** (timed, deaths, thumb fatigue) before any further pacing lever is pulled. [P2]
5. Only then: finisher pulse on the boss bar, hostile prop sprites, and the `effects()` redraw diet — in that order, and only with device numbers (MUSE-100 #87) to spend against. [P2]

Nothing above requires touching a locked decision: no aiming, no `CAM_LEAD` change, no shop, no reworded lines, no Choirmaster retune.

**Bottom line:** Pass 4 is the first pass whose claims all check out — 210/210 from a real fresh clone, Nightmare finishable at every rate including the 30 Hz case that killed it, Dad's line queued properly, and the readability stack finally in the tree. What keeps it at 6/10 is not anything Pass 4 wrote; it is that the game still cannot start in a browser, for a reason that predates the pass and that the pass's own test and guard design cannot see. Fix the texture collision, run one honest browser smoke, and the next review finally gets to argue about how the game *feels* instead of whether it *boots*.
