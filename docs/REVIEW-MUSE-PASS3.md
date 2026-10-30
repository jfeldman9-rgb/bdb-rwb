# BDB — Muse Pass 3 review (game feel & pacing)

**Reviewer:** Muse Wonder (read-only pass; no game code changed, no merge, no deploy)
**Reviewed:** draft PR #6, head `cursor/bdb-pass3-7221` @ `1eb6f3a`, base `cursor/bdb-pass2-d377`
**Against:** `docs/MUSE-100-IMPROVEMENTS.md`, `docs/REVIEW-MUSE-PASS2.md` (branch `cursor/muse-pass2-review-bb6b`), and the Pass 3 claim list in `docs/FIX-LIST.md` (P3-1…P3-13)
**Method:** full PR diff (34 files, +844/−150), source read of the feel/pacing/mobile paths, `npm test` on a clean checkout of the PR head, and headless bot runs (`node tools/bot-sim.mjs <difficulty> <hz>`) at 30/60/120 Hz on Story/Adventure/Nightmare.

## Score: 5.5 / 10

| Area | Score | One-line verdict |
|---|---|---|
| Combat feel | 6/10 | Catchphrase-on-impact and per-enemy Papi timing are real; the recoil/shape work is in a file that was never committed, and two Pass 2 feel items claimed as removed/fixed are still in the tree. |
| Pacing (per stage) | 7/10 | Adventure holds the 140–240 s band at 30/60/120 Hz; Story is correctly shorter; S3 remains the long, hurt-heavy tail. |
| Difficulty curve | 6/10 | Full-stage Nightmare now clears at 60 and 120 Hz — the Pass 2 P0 is fixed at the tested rate — but Stage 3 Nightmare never finishes at 30 Hz, and the guard test only runs at 60 Hz. |
| Cutscene / call-in flow | 7/10 | Chapter 2/3 intro skip, kidnap-then-narrate ordering, Dad bless persistence and Phaser parking are structurally right — but none of it can run in a browser until the P0 below is fixed. |
| Readability | 6/10 | Wingman telegraph now uses the halo lanes and W1/W2 bars are labelled; hostile shapes exist only as a call into the missing module, and choir aura / shield cracks remain absent (deferred, honestly). |
| Mobile controls | 5/10 | Touch-label caching is good; the single rotate listener is an import of a function that does not exist, so the mobile entry path is part of the boot break. No device test exists. |

**This PR is not mergeable as-is, and the score is capped by that, not by design quality.** The sim-level work (Nightmare finishability, voice queue, Dad timing, Papi front) is genuinely good and verified below. But the head commit does not boot: `src/game-scene.js` imports a module that is not in the repository, and two named imports (`bindRotatePause`, `noteRenderer`) have no exports. The PR body reports "192/192" tests; a clean checkout runs 184 tests and fails 5. Everything presentation-side in P3-12 — recoil kick, hostile shapes, the rotate listener — is therefore unverifiable as shipped, however it behaved on the author's machine.

**Locked rules re-verified intact (not findings, do not "fix"):** eggplant fires straight (`vy = 0`, `src/eggplant.js:4,15`; asserted per-shot in `tests/nightmare-clear.test.mjs:172`), `CAM_LEAD = 0.28` (`src/config.js:4`), no shop/upgrade code anywhere in `src/`, Dad's catchphrase word-for-word at `src/story.js:7` and now emitted on impact (see below), and `assets/cutscenes/intro_v3.mp4` untouched (not in the diff).

---

## Evidence: tests and bot sims (this reviewer's runs, clean checkout)

`npm test` on PR head: **179 pass / 5 fail** (184 total), not 192/192. The 5 failures are all the same root cause (P0 below): `tests/boot.test.mjs`, `tests/clip-hold.test.mjs`, `tests/corpses-scene.test.mjs`, `tests/stage-cutscene.test.mjs`, `tests/victory-claudia.test.mjs`.

Bot sims, 60 Hz (`tools/bot-sim.mjs`, which now drains `dad_callin` — P3-1, verified at `tools/bot-sim.mjs:13-14`):

| Run | S1 | S2 | S3 | Campaign | Deaths (per stage / campaign) |
|---|---|---|---|---|---|
| Story 60 Hz | 128.6 s | 141.4 s | 155.9 s | 426.0 s | 0 / 0 / 0 |
| Adventure 60 Hz | 166.4 s | 182.4 s | 214.1 s | 579.8 s | 1 / 1 / 3 |
| Nightmare 60 Hz | 210.6 s | 262.0 s | 322.7 s | 823.5 s | 4 / 6 / 10 |

Adventure at 30 Hz: 163.1 / 187.9 / 201.2 s, campaign 560.6 s. At 120 Hz: 163.3 / 178.9 / 206.2 s, campaign 553.7 s. The 140–240 s Adventure band (MUSE-100, `docs/LENGTH-DIFFICULTY.md`) holds at every rate. Story at 120 Hz also clears deathless (126.0 / 139.0 / 152.9 s).

Nightmare at 120 Hz clears everything (195.7 / 312.0 / 312.5 s; campaign 862.0 s, 25 deaths). **Nightmare at 30 Hz does not:** S1 (237.1 s) and S2 (263.4 s) clear, but S3 hit the 1800 s cap uncleared, having reached phases `3:2`/`3:3`, with 8,377 shots fired vs 839 for the same stage at 60 Hz — the Wingmen fight loops rather than progresses at that step size. See P1-2.

Note on PR-body numbers: the body cites Adventure 166.4 / 196.8 / 210.2 s; my 60 Hz run reproduces 166.4 exactly but gets 182.4 / 214.1 for S2/S3. All values are inside the band, but the S2 figure is not reproducible from the head commit — consistent with the P0 picture of results captured against files that were never committed.

---

## What Pass 3 got right (verified, not just claimed)

- **P3-1 Nightmare finishability (the Pass 2 P0) is fixed at 60 Hz.** The root cause was correctly identified as respawn restoring Wingman HP, not boss tuning: `respawn()` now snapshots `checkpoint.wingHp` (`src/campaign.js`, respawn) and `startBoss()` restores it clamped, and the new full-stage test (`tests/nightmare-clear.test.mjs:164-184`, fresh stage start, `dad_callin` drained, straight-fire asserted per shot) passes. My independent full-campaign Nightmare bot run also clears (823.5 s). Choirmaster numbers were left alone, as locked.
- **P3-5 catchphrase on impact.** `finishDadCallin()` no longer emits the line at spawn; it fires inside the `Dad.update` resolve callback alongside `dadhit` (`src/campaign.js`, the `this.dad` update branch). Line wording unchanged. This closes MUSE-100 #43 / Pass 2 P1.
- **P3-8 Papi front timing.** The flat 0.45 s delay is gone: `papiHitTime(screenX)` in `src/papacito.js:5-10` shares `PAPI_RUNNER_X0 = -180` / `PAPI_RUNNER_SPEED = 980` with `src/papacito-fx.js:2,10`, each victim is scheduled at front-arrival for its own screen x, and score lands when the last one falls. This is the Pass 2 P2 done properly, and it produces the left-to-right cascade for free.
- **P3-4 telegraph geometry.** Wingman halos and their telegraph rects now both derive from `laneY(i)` / `LANE_H` (`src/wingman.js` snowball spawn; `src/game-scene.js` telegraph branch; choirmaster volley in `src/yettis.js` uses the same helpers). The 39-vs-59 px mismatch from Pass 2 is closed at the source-constant level.
- **P3-2 voice queue.** Scripted lines (`nar_`, `bdb_open`, `claudia_`, boss intros) now wait behind the sounding line, and *every* queued entry's deadline is stretched when a line starts, not only the one directly behind it (`src/audio.js`, `SCRIPTED_VOICE` / `narrationYields` / the queue-stretch loop). Kidnap is emitted before `nar_ch2` so the clip's audio stop can't eat the narration (`src/campaign.js`, stage-load). The third-queued-line case has a behaviour test.
- **P3-6 chapter flow.** `chapterIntroKey` returns null past chapter 1 (`src/title-flow.js`), so chapters 2/3 no longer replay the 61 s intro; story clips park the Phaser loop via the shared `pauseForClip` (`src/cutscene-hooks.js`).
- **P3-3 / P3-10 / P3-11 / P3-9.** Dad player/bless persistence across stages (`ensureDadPlayer`, `installDadGestureBless` in `src/dad-call-cutscene.js`), side-by-side labelled W1/W2 bars with a dead Wingman kept as an empty bar (`bossBars`/`bossBarLayout` in `src/hud.js`), mercy clearing the spent phase plus `camMax` reset to the checkpoint camera on respawn (`src/dad-call.js`, `src/campaign.js`), and the grab fixes (dead grabber releases without damage; timeout routes through `hurtBob` via `grabPunish`, `src/bob.js` / `src/campaign.js`) are all present in code and covered by the new behaviour tests that do run.
- **P3-13 test quality.** The regex-only checks really were converted to behaviour tests (title flow, recovery, voice policy, HUD band), and the heal test name now matches its Nightmare-only assertion (`tests/length-difficulty.test.mjs`). This is how the P0 below *should* have been caught — see the finding for why it wasn't.

---

## Prioritized findings

### P0 — The PR head does not boot: a module and two exports were never committed

Commit `84428f4` ("Turn the regex-only checks into behaviour tests") rewired three imports to code that is not in the tree:

1. `src/game-scene.js:21` — `import { RECOIL_KICK, stepRecoil, hostileShape } from './shot-feel.js'`. There is no `src/shot-feel.js` in the repository (`git log --all -- src/shot-feel.js` is empty). Every scene import fails with `ERR_MODULE_NOT_FOUND`.
2. `src/game-scene.js:19,71` — `bindRotatePause` imported from `./rotate-block.js`, which exports only `PORTRAIT_BLOCK`, `portraitBlocksPlay`, and `syncRotatePause`. The per-frame `syncRotatePause(this)` call in `GameScene.update` was removed in favour of the listener, so rotate-pause currently has *no* working path.
3. `src/main.js:13,66` — `noteRenderer` imported from `./perf.js`, which has no such export (it still exports `bindPerfLifecycle`, which `main.js` no longer calls; the meter survives only because `src/perf.js:189` self-binds on import).

Consequences, all verified on a clean checkout of `1eb6f3a`:

- `npm test`: **179/184**, with the 5 failures above all tracing to the missing module. The PR body's "192/192" and commit `1eb6f3a`'s "192 tests green" are not reproducible from anything in git — the suite in-tree has 184 tests. The most likely story is that the author's working tree held `shot-feel.js` (and the two exports) uncommitted; `tests/boot.test.mjs` caught exactly this and its failure was never seen because the run happened against the dirty tree.
- The browser game cannot start: `main.js` → `game-scene.js` → `./shot-feel.js` is a hard module-link failure before Phaser boots. Every browser-facing claim in this PR (recoil kick, hostile ring/bar shapes, rotate listener, Dad bless, freeze guard) is unverified as shipped, including the ones I credit above from code reading.
- Ironically, P3-13's own boot test is the tripwire — it just needs to be run from a clean checkout (or in CI on the pushed head) to count.

**Fix (for the Pass 4 author, not this review):** commit `src/shot-feel.js`, add `bindRotatePause` to `src/rotate-block.js`, add `noteRenderer` to `src/perf.js`, re-run `npm test` from a clean clone of the pushed head, and correct the PR body's test count. Do not tune any of the three until they exist in git — their feel parameters (kick size/decay, shape mapping) have never been reviewed because they have never been in the repo.

### P1 — Two P3-12 claims are marked done but are not in the code

`docs/FIX-LIST.md` P3-12 and the PR body both claim: "Dead `FX.slowmo` / `FX.hitstop` removed. Snowball knockback follows travel." Neither is true at head:

- `src/fx.js:5,51,57` still defines `this.hitstop` and `this.slowmo`, still sets both in `impact()`, and a repo-wide search finds no reader outside `fx.js` itself. This is the identical dead-knob finding from Pass 2 P2, carried through a pass that claims to have deleted it.
- Projectile knockback is still `this.hurtBob(false, p.x)` at `src/campaign.js:364` — the projectile's *current* x inside the ±30 px overlap window, i.e. effectively random direction, occasionally toward the thrower. The travel direction is right there: hostiles carry `dir` from creation (`src/campaign.js:160`, `snowball(x, y, dir, kind)`). Pass `p.dir` (or a source x upstream of Bob along travel) as Pass 2 specified.

Both are one-line-to-one-file fixes, but as with P0, the pattern is the finding: the claim list was written from the working tree/intent, not re-verified against the diff. Pass 4 should re-audit every "Done" bullet in the PR body against `git diff` before asking for review.

### P1 — Nightmare clears only at the tested step rate; Stage 3 stalls at 30 Hz

The new full-stage Nightmare test steps at exactly `1/60` (`tests/nightmare-clear.test.mjs:167-175`). At 60 and 120 Hz my bot runs clear all three stages (above). At 30 Hz, S3 never clears: 1800 s cap, phases `3:3` reached, 8,377 shots (≈10× the 60 Hz count), 7 deaths. Something in the Wingmen phase-3/finisher loop — most plausibly the bot-vs-`isBossFinisherReady` interplay or add pressure at the larger dt — cycles without progress rather than merely playing slower.

Fair caveat, stated in Pass 2 and still true: `GameScene.update` always steps the sim at fixed `1/60` (`src/game-scene.js`, accumulator loop), so a 30 Hz *device* does not produce 30 Hz sim steps; this is a bot-harness dt, not a literal phone frame rate. But MUSE-100 #13/#14 make bot-clearability the project's own finishability proxy, the proxy is currently single-rate, and a 10× shot-count stall (not a slow clear) suggests a real dt-sensitivity in the phase-3 loop rather than bot clumsiness. At minimum: run the full-stage Nightmare test at a second step rate in Pass 4 and investigate the phase-3 stall before calling Nightmare "finished." Campaign death counts also deserve a look on their own terms: 21 deaths for a full Nightmare campaign bot run (10 in S3 alone) clears the bar, but it is a war of attrition through checkpoints, not a difficulty curve a human will enjoy — see P2.

### P2 — Wingman HP restore has an untested dead-Wingman edge

`respawn()` stores `0` for a dead Wingman (`src/campaign.js`: `wings.map(e => e.alive ? e.hp : 0)`), and `startBoss()` then writes that onto a freshly spawned, `alive = true` body: phase ≥ 3 floors it to 1 HP (a dead boss quietly returns at finisher-threshold), phases 1–2 leave it at 0 HP alive until something hits or heals it. In practice phase transitions make the dead-boss respawn rare, and the tested case (damaged-but-alive, `tests/nightmare-clear.test.mjs:152-162`) works. But "rare and untested" is exactly how the original full-HP-restore bug lived here. One test: kill a Wingman (or force `alive = false`), die, assert the restored pair's hp/alive state is the intended one — whichever that is, write it down.

### P2 — Adventure's tension problem is unchanged, and S3 is still the outlier

Pass 3 correctly did not touch this (the heal cut stays scoped to Nightmare, per the honest Pass 2 trade). Restating with fresh numbers so it isn't lost: Adventure S3 is 214.1 s with 17 hurts and 3 bot deaths, against S1's 166.4 s / 6 hurts / 1 death, and zone-clear full heals still reset chip damage five times a stage on Adventure. The lever remains the S3 late-zone/boss spike, not another heal cut (MUSE-100 #15/#18). Story, by contrast, is now arguably *too* flat at the bot level — 0 deaths and 13 hurts across the whole campaign — which is acceptable for the default phone difficulty but worth one human playthrough before anyone "fixes" it (MUSE-100 #21 remains undone: every pacing number in this project is still bot seconds).

### P2 — Readability leftovers (deferred in the PR, confirmed still absent)

Verified absent at head, matching the PR's own deferred list — listed once so the deferral is on record in this review, not as new complaints: choir buff has no visual consumer (`choirMultiplier` is never read by `src/game-scene.js`/`src/hud.js`, MUSE-100 #24); guard shield chips 1–2 draw nothing (`shieldHits` unused by `effects()`); no enemy separation pass (#29); boss corpses still get the flat 0.5 s hold (`src/corpses.js`); boss bars got labels but no 66%/33% phase ticks or `hp ≤ 1` finisher pulse (#79 — `stagePrompt`'s `PRESS PAPI TO FINISH THE RESCUE` carries that information textually). Hostile shapes (#54) are *intended* by P3-12 but live in the missing module (P0), so at head snowball/halo/shockwave are still one ellipse in two tints.

### P2 — Mobile: good caching, unproven device story

The per-frame `getElementById` from Pass 2 is fixed properly — elements are cached once and DOM writes happen only on change (`touchButtons`/`paintTouch` in `src/hud.js`) — and the touch text now also skips redundant `classList` toggles. But: the rotate story at head is an import of a nonexistent function (P0), so "one rotate listener" is a claim about uncommitted code; `titleWantsBegin` still lets Escape/P (the `pause` action) start the game from the title (`src/input.js:9-11`), which Pass 2 flagged as harmless-but-surprising and Claude C12 deferred — it remains deferred, fine, but it is now enshrined in a named helper, so future readers will assume it was decided; and there is still no real-device evidence for any of it (MUSE-100 #87, the iPhone p95 gate, remains the project's oldest unverified number). The freeze guard (`installFreezeGuard`, `src/recovery.js`) is a genuinely good addition for the pocketed-phone case — and, per P0, has never run in a browser from this branch.

### P3 — Small stuff

- `game.beat?.()` is called at the top of `GameScene.update` before the `switching` early-return; a scene that is mid-restart still beats, which is the safe direction for a freeze guard. Fine as-is.
- The kidnap ordering fix means `nar_kidnap` is emitted *after* the `cutscene` event in stage load (`src/campaign.js`); if the clip is skipped instantly (`?nocutscenes=1`), chapter narration and kidnap narration can queue back-to-back. The new voice-queue stretch makes this benign, but it's worth one ear-check in the Pass 4 browser pass.
- PR-body hygiene: the body says S2 Adventure is 196.8 s; the head commit produces 182.4 s. Inside the band, but quote only numbers reproduced from the pushed head (same lesson as P0/P1).

---

## Suggested order for Pass 4 (feel/pacing only)

1. **Land the missing code, then re-verify the claims list.** Commit `src/shot-feel.js`, `bindRotatePause`, `noteRenderer`; clean-checkout `npm test` green; then walk every P3 "Done" bullet against the diff — starting with the two that are currently false (`FX.slowmo`/`FX.hitstop` deletion, projectile knockback via `p.dir`). [P0, P1]
2. **Browser smoke on the actual head** (title → S1 → Dad call-in → rotate → pause) so the presentation half of Pass 3 gets its first real run; this is also where recoil kick and hostile shapes get their first reviewable numbers. [P0]
3. **Nightmare second-rate test + phase-3 stall investigation** at 30 Hz steps; keep Choirmaster numbers untouched per Jason's lock. [P1]
4. Dead-Wingman respawn test, whichever behaviour is intended. [P2]
5. Only then, the deferred readability stack in impact order: hostile shapes in committed code, choir aura, shield cracks, boss-bar phase ticks. [P2]

Nothing above requires touching a locked decision: no aiming, no `CAM_LEAD` change, no shop, no reworded lines, no Choirmaster retune.

**Bottom line:** Pass 3's sim-level fixes are the right fixes and they verify — Nightmare is finishable, Dad's line lands on the swat, Papi kills arrive with the runners, and the telegraph finally tells the truth. But the PR as pushed cannot start, its headline test count cannot be reproduced, and two of its "done" items aren't in the diff. Land the missing files, re-run from a clean checkout, and this is a 7.5+ pass; until then it must not merge.
