# Claude review: Pass 5 (draft PR #16)

**Branch reviewed:** `cursor/bdb-pass5-7e78` @ `a8a103c`, into `cursor/bdb-pass4-cfe0` @ `3f76903`.
**Scope:** read-only. No game code changed, no merge, no deploy. Scratch experiments ran in throwaway copies under `/tmp`.
**Score: 7 / 10**

Pass 5 fixes the thing that held pass 4 at 4.5: the game now gets past Start in a real browser. I clicked Start on the real title, skipped `intro_v3.mp4` with Space, and played with real held keys. All thirteen P5 items are in the code, and the numbers in the PR body reproduce exactly from a fresh clone. The score is held down by one change that I think should not ship as written. P5-13 makes Nightmare's snowball rule depend on the simulation step rate. The phone always steps at 60 Hz, so the shipped Nightmare is now more forgiving on snowballs than Adventure. The 30 Hz and 120 Hz bot runs also no longer test the rule the device plays. My scratch runs show the special case is not needed for any stage to clear.

---

## 1. Fresh clone, tests, bots, browser

```
git clone -b cursor/bdb-pass5-7e78 https://github.com/jfeldman9-rgb/bdb-rwb.git   # a8a103c
npm ci       # up to date, audited 1 package, 0 vulnerabilities
npm test     # tests 219, pass 219, fail 0, skipped 0  (~1.1 s)
```

- Node here is 22.23.4, but `package.json` asks for `>=24`. Tests and the smoke both pass on 22.
- 219 is up from 210 at `3f76903`.

### Bot sim (`node tools/bot-sim.mjs <difficulty> <hz>`), seconds / deaths

Every one of the 27 fresh stage starts and 9 full campaigns clears. The Adventure and Nightmare figures match the PR body to the tenth of a second.

| | 30 Hz | 60 Hz | 120 Hz |
|---|---|---|---|
| Story S1 / S2 / S3 | 128.2 / 137.6 / 151.8, 0 d | 128.6 / 141.1 / 155.6, 0 d | 126.0 / 138.9 / 152.1, 0 d |
| Adventure S1 | 182.7 / 2 | 164.9 / 0 | 161.3 / 0 |
| Adventure S2 | 194.1 / 3 | 188.9 / 2 | 193.3 / 3 |
| Adventure S3 | 197.0 / 2 | **225.4 / 5** | 213.1 / 3 |
| Nightmare S1 | 247.5 / 6 | 235.5 / 6 | 235.5 / 7 |
| Nightmare S2 | 260.4 / 6 | 263.6 / 6 | 265.6 / 6 |
| Nightmare S3 | 326.6 / 10 | 326.1 / 10 | 328.4 / 11 |
| Adventure campaign | 582.1 s, 6 d | 584.9 s, 5 d | 573.5 s, 5 d |
| Nightmare campaign | 869.6 s, 23 d | 859.9 s, 23 d | 871.3 s, 27 d |

Pass 4 for comparison (from the pass-4 reviews): Adventure S3 at 60 Hz was 206.5 s with 2 deaths, and Nightmare S3 was 283.9, 320.0, and 271.4 s at 30, 60, and 120 Hz. Nightmare S3 is now uniform across rates, but it got there by getting slower at 30 and 120 Hz, not faster at 60 Hz. See F1 and F4.

### Browser

Chrome 156.0.8078.47, headless, SwiftShader. This is not hardware performance evidence.

- **`npm run smoke` (`tools/browser-smoke.mjs`) passes.** It covers the title, the demo campaign to victory (164.9 / 187.1 / 225.3 s, 5 deaths), simultaneous touch and release, the pause freeze, the portrait rotate block, WebGL context-loss recovery, and the Start, `intro_v3.mp4`, Space-skip, gameplay path. It reports zero runtime or HTTP errors. 35 s wall time.
- **My own Start check (scratch script, not in the repo).** I used a fresh profile at `/`, clicked `#start` with a real mouse event, and the intro video was `intro_v3.mp4`. I pressed Space to skip it, then held ArrowRight and J with real key events for 8 s. Results: `started: true`, stage 1, Adventure, no error card, and `body.playing` set. `elapsed` went from 0.02 to 9.22 in real time. Bob moved from x 180 to 1230 (the arena wall) and fired 33 shots for 3 KOs. He took one hit (hp 3 to 2). Zero exceptions, about 34 fps on SwiftShader. Screenshots are `/opt/cursor/artifacts/review-pass5/01-title.png` to `03-live-gameplay.png`.

<img alt="Live gameplay after real Start and intro skip" src="/opt/cursor/artifacts/review-pass5/03-live-gameplay.png" />

---

## 2. Findings, highest priority first

### F1 (P1, P5-13): Nightmare's snowball rule depends on the step rate, and the device gets the most lenient value

- `src/campaign.js:27-31`: `snowClearZ('nightmare', dt)` returns **50** when `Math.round(1/dt) === 60`, otherwise 58. Adventure and Story return 65. The rule is used for every hostile projectile at `src/campaign.js:394`.
- `src/game-scene.js:234`: the device loop always calls `w.update(1/60, …)`. So on every phone and desktop, Nightmare snowballs, including the Choirmaster's volleys, clear at a 50 px jump. Adventure needs 65 px. **On the shipped rate, Nightmare is now more forgiving than Adventure on this one rule.**
- The multi-rate bot proxy that P4-1 built now tests two different games. The 30 Hz and 120 Hz runs use 58, and only the 60 Hz run uses the rule the device plays. A future change that breaks the 50 px path can only fail at 60 Hz.
- **The special case is not needed for finishability.** In a scratch copy I made `snowClearZ` return 58 for Nightmare at every rate. Every stage at every rate still cleared. Nightmare S3 at 60 Hz took 348.8 s with 12 deaths instead of 326.1 s with 10, and 30 Hz and 120 Hz were unchanged. With 65 for everyone (the pass-4 rule) it also cleared: S3 at 60 Hz took 351.0 s with 13 deaths. In both scratch runs only one test failed: the unit test that pins the values, `tests/nightmare-clear.test.mjs:237`. All full-stage Nightmare clear tests passed. The 50 px case buys about 23 s and 2 bot deaths at 60 Hz, so the bot numbers line up across rates.
- **Why it happens.** The comment at `src/campaign.js:20-26` says the 60 Hz step samples the bot's jump at z≈53 while a snowball overlaps. That is a property of the bot's timing, not of a human's. Fitting a gameplay constant to one sample of a deterministic bot is overfitting.
- `docs/FIX-LIST.md` P5-13 says "Choirmaster, pace, and the eggplant are untouched." The Choirmaster's numbers are untouched. His fight is still easier to dodge on Nightmare, because his volleys are hostile projectiles.
- **Suggested fix:** one rate-independent clear per difficulty. 58 for Nightmare is the simplest choice, and it clears everywhere. Better still, make the collision test sweep Bob's z over the step the way it already sweeps x (`Math.min(oldX,p.x)…`), so the result stops depending on where the samples land. If 60 Hz Nightmare S3 is still judged too long, that is a balance question for Jason, not a harness fix.

### F2 (P2, not on the P5 list): a `create()` throw after the title still leaves a blank screen with no card

This is the exact failure class that cost passes 3 and 4. P5-1 fixed that one crash, but nothing would surface the next one.

- `src/recovery.js:109`: the freeze guard ignores every error while `!s?.started`. The interval check also treats `!started` as a load in progress and keeps stamping.
- `src/startup.js:41`: once the title is ready, startup's own error listener detaches.
- **Reproduced in Chrome** without changing repo code. From the page, I replaced `GameScene.prototype.assemble` with a function that throws, then clicked Start. After 12 s the gameplay scene was not active, `started` was false, the Phaser loop was still running, and `#startup-error` was hidden. The screen was blank (`/opt/cursor/artifacts/review-pass5/05-create-throw-12s.png`). Muse raised this blind spot in pass 4.
- **Suggested fix:** wrap `assemble()` in `create()` (`src/game-scene.js:71-74`) and call `showStuck` on a throw. Alternatively, let the freeze guard trip when the gameplay scene has been booting for longer than `FREEZE_MS` with the loader idle. Add a test that makes `assemble` throw and asserts the card shows.

### F3 (P2, P5-1): the boot-crash fix is only guarded by the Chrome smoke, which is not in `npm test`

- The fix is right. `src/fx.js:31` no longer registers `'shadow'`, and `GameScene` owns it (`src/game-scene.js:79`). The comment states the constraint.
- No `npm test` case runs `assemble()` or `FX.makeTextures` against a texture manager that rejects duplicate keys. This was test gap #1 in my pass-4 review. If someone adds a texture key to FX that `GameScene` also makes, 219/219 stays green again. The new `tests/recovery.test.mjs:162` stubs `assemble` out completely.
- `npm run smoke` does catch it, but it needs Chrome at `/usr/bin/google-chrome` or `$CHROME`. It also writes to `/opt/cursor/artifacts/...` (`tools/browser-smoke.mjs:15`, plus a `copyFile` to `/opt/cursor/artifacts/p5-gameplay.png`), so it fails on a normal laptop without that directory. There is no CI in the repo (no `.github/`).
- **Suggested fix:** a node test with a fake `textures` that returns `null` from `createCanvas` for a key in use, run through `FX.makeTextures` after the scene's shadow generator. Also make the smoke's output directory configurable.

### F4 (P2, P5-5): honest telegraphs moved Adventure stage 3 by +19 s and +3 deaths at the device rate, and nothing says so

- I restored only the pass-4 `separateEnemies` (with the camera clamp, without the hold/telegraph skip) in a scratch copy. That reproduced pass 4's Adventure numbers exactly: 165.1 / 189.0 / 206.5 s at 60 Hz, and 165.0 / 194.1 / 198.2 s at 30 Hz. So P5-5 alone moves Adventure S3 at 60 Hz from 206.5 s with 2 deaths to 225.4 s with 5. It also moves Adventure S1 at 30 Hz from 165.0 s with 0 deaths to 182.7 s with 2.
- Both are still inside the 140–240 s band. But 225.4 s is 15 s from the cap, on the rate the device plays. Adventure S3 was already the stage Muse flagged as concentrating damage.
- The PR table shows the number, but neither the PR text nor `docs/FIX-LIST.md` calls out the shift. The FIX-LIST says "Adventure and Story stay at 65" as if Adventure were unaffected.
- Not a code bug. The behavior change is correct: a telegraphing charger stays where its telegraph is drawn. Muse should take a look, and the band check should note the margin.

### F5 (P2, locked line): the on-screen Yetti caption is not the locked text

- `src/voice-lines.js:21` captions both takes as **"Stay away from the Colombian's room!"**. The locked text recorded in `docs/MUSE-100-IMPROVEMENTS.md:339` and `:348` (item 63) is **"Stay away from the Colombians room."**. The caption adds an apostrophe and swaps the period for an exclamation mark.
- **Verified on screen.** In live gameplay I spoke `yetti_colombian_room_01` through the game's own `say()` and HUD. The caption read `YETTI  /  Stay away from the Colombian's room!` (`/opt/cursor/artifacts/review-pass5/04-yetti-caption.png`).
- The purple-car line has the same kind of drift: `src/voice-lines.js:22` has "Bob, why is your car purple?" against the locked "Bob why is your car purple?".
- **This is not a pass-5 change.** `voice-lines.js`, `story.js`, `barks.js`, `docs/BOB-LINES.md`, and `assets/` are not in this PR's diff. The caption has read this way since `dae3442`. `assets/audio/voice-manifest.json:615` has the same text, so the rendered audio was generated from the apostrophe version. `docs/BOB-LINES.md` does not list either Yetti line, so the only written lock is MUSE-100 #63. All three pass-4 reviews marked "quoted lines exact" as held, meaning unchanged, not matching the lock.
- **Needs Jason, not a coding pass.** Either the lock is the caption (and BOB-LINES.md should record it), or the caption changes to the locked text. The spoken words are identical either way, so the audio does not need regenerating.

### F6 (P3, P5-7): a superseded clip's held lines get their callback, but their audio is cancelled in the same tick

- `src/cutscene-hooks.js:19-24`: superseding now calls the previous `done('abort')`, which is what P5-7 asked for. In `GameScene` that callback is `held => this.playHeld(held)` (`src/game-scene.js:222`), which calls `say()` for each held line.
- Then `startHeldClip` goes on to `src/game-scene.js:194`, which calls `stopSceneAudio()`. That bumps `voiceRequest` and empties `voiceQueue` (`src/audio.js:118`). `say()` loads audio asynchronously and drops the buffer when `request !== voiceRequest` (`src/audio.js:493`). So the first held line flashes its caption, and none of the held lines is heard.
- The test `superseding a held clip still plays the lines it was holding` (`tests/stage-cutscene.test.mjs:118`) only asserts the array passed to the callback, so its name says more than it checks.
- Unreachable today, since no two clips share a frame (my B6 in pass 4). Either re-queue the superseded lines into the new `voiceHold`, or rename the test.

### F7 (P3, P5-5 notes): "walkers still clamp to the world" is not what the code does

- `src/yettis.js:212` and `:237` clamp walkers to `world.bounds.l+55 … r-55`. Outside an arena, `world.bounds` is the camera view (`src/camera.js:44-46`), not the world. So off-screen walkers are still pulled to the view edge by their own update. Separation no longer does it. This is pre-existing behavior, and the docs line in `docs/FIX-LIST.md` P5-5 is inaccurate, not the code.
- Stunned enemies return before that clamp (`src/yettis.js:166`). Inside an arena, separation can therefore push a stunned body past the wall by up to half the 46 px gap until its stun ends. That is cosmetic.
- `src/campaign.js:406` still passes `this.bounds` to `separateEnemies`, which now ignores the second argument.

### F8 (P3, P5-3): strikes now reset every frame, so "two errors" means two errors in one frame

- `src/game-scene.js:230` calls `game.beat` at the top of `update`, and `note()` clears strikes (`src/recovery.js:91`). This matches the FIX-LIST ("two errors with no beat between them still trip").
- It is safe because of how Phaser's loop works. `lib/phaser.min.js`'s rAF `step` calls the callback before it re-requests the next frame, so a throw in `update` kills the loop and the 8 s freeze check trips. I checked this in the minified source.
- The strike path now practically only fires for two DOM or timer errors in one frame. Worth one sentence in the `installFreezeGuard` comment, so nobody later moves `beat` below the sim step expecting strikes to catch per-frame throws.

### F9 (P3, smoke coverage): the smoke's long campaign is not live play

- `tools/browser-smoke.mjs:104` drives the demo campaign by calling `s.update(0, 1000/60)` 90 times per evaluate, so the scene is stepped by hand instead of by Phaser's loop. The real Start path (`:156` onward) checks `started`, stage 1, and no card, but not that frames advance after the skip. The `elapsed` advance check (`:94-99`) is on the `?demo=1` boot.
- Good enough for P5-1's stated acceptance criteria. A three-line `elapsed` advance check after the Space skip would make the real-Start leg as strong as my scratch check.

### F10 (P3): Node engine

`package.json` says `"node": ">=24"`, and the PR body notes the warning. Everything runs on 22.23.4. Either lower the engine or pin 24 in the environment, so the warning stops being normal.

---

## 3. P5 items against the code and the pass-4 reviews

| ID | Verdict | Evidence | Pass-4 source |
|---|---|---|---|
| P5-1 | **Done.** Verified in Chrome | `src/fx.js:31` drops `'shadow'`, and `src/game-scene.js:79` owns it. The smoke and my real-Start check both reach live gameplay. No unit guard (F3) | Claude B1, Muse P1 |
| P5-2 | **Done** | `isBossFinisherReady` counts living Wingmen only and needs at least 1 (`src/wingman.js:10-23`). `isBossBragging` exempts the phase-3 floor but not split (`:26-30`), and `useDad` uses it (`src/campaign.js:244`). `wingHp <= 0` stays dead (`src/campaign.js:163`). Tests: `tests/nightmare-clear.test.mjs` (survivor finish, Dad swat with one floored), `tests/papacito.test.mjs` | Claude B2, Argon 1, Kimi M1/T1/T2 |
| P5-3 | **Done** | `note()` clears strikes and `rememberStage` clears them on a stage change (`src/recovery.js:83-91`). There is one persistent Reload listener with a refreshed game handle (`:32-41`). See F8 | Claude B3/B4, Argon 3, Kimi M2 |
| P5-4 | **Done** | `ticks` only on the single non-Wingman bar (`src/hud.js:20,31,42,50,103-107`). The pulse is an independent `if` on cached `e.choirBuff` (`src/game-scene.js:163`), set on the sim step (`src/yettis.js:161-163`, `src/wingman.js:58`). Frozen `CHOIR_AURA` (`src/yettis.js:93`). `choirMultiplier` is still 1.28 | Argon 2, Claude B5/B8, Kimi L2/L4 |
| P5-5 | **Done**, notes inaccurate | `separateEnemies` skips `hold` and `telegraph`, with no clamp (`src/yettis.js:103-125`). Push is still 8 px. Bot impact in F4, wording in F7 | Claude B7, Argon 4, Kimi L5 |
| P5-6 | **Done** | Cached metadata keyed on viewport, dpr, quality, renderer, search, and canvas (`src/perf.js:40-82`). No `JSON.stringify` in `tick` (`:117-124`). Reused `perfCtx` (`src/game-scene.js:238`). Loop scans in `fireGun`/`stepShot` (`src/eggplant.js`). I checked that the ordering and tie-breaking match the old sorts. Reused `_evBatch` (`src/game-scene.js:206-211`), `_live` in `Wingmen.update`, a reverse-index `booms` loop, and the `stagePrompt` loop | Argon 5, Claude B8, Kimi L2 |
| P5-7 | **Done**, with F6 | Old `done('abort')` (`src/cutscene-hooks.js:19-24`). `abort()` still does not call `done`, and `destroy()` does not fire victory. The `finished` guard stops a sync `done` from re-arming the hold (`src/game-scene.js:187-194`) | Claude B6 |
| P5-8 | **Done** | `create()` returns on `__bdbStartup.failed` before `assemble` and `started` (`src/game-scene.js:70-75`). Test at `tests/recovery.test.mjs:162`. The broader `create()` throw gap is F2 | Argon 6 |
| P5-9 | **Done** | `data?.source !== 'bob'` (`src/shot-feel.js:10`). An explicit `'bob'` stays silent. `tests/presentation.test.mjs` and the `recordKo` source test | Kimi L1/T2 |
| P5-10 | **Done** | `bossTrackForBatch` returns null when the batch holds a `cutscene` (`src/game-scene.js:29-32`, `:211`, `:218`). The clip end still plays `boss${n}` while `bossActive` (`:189`). Tested | Kimi L3 |
| P5-11 | **Done** | The camera respawn is now a behavior test (`tests/camera.test.mjs`), as is press ownership plus the governor (`tests/press-governor.test.mjs`). Freeze-guard `started` goes through `create` with `assemble` stubbed (`tests/recovery.test.mjs:162`) | Argon 7, Kimi T3 |
| P5-12 | **Done** | `crate-texture.js`, `cutscene-scene.js`, `music.js`, and `perf-panel.js` are deleted. `page-base.js` stays. Nothing in `src/` or `tests/` imports the deleted files, and 219/219 plus the browser load confirm it | Argon 6 |
| P5-13 | **Done as written. Disagree with the approach** | `src/campaign.js:27-31`, `:394`. See F1 | Muse P2 (60 Hz outlier) |

The FIX-LIST deferrals (recharge-banner punctuation, Choirmaster balance) are consistent with the diff.

## 4. Locked rules

| Lock | Status | Evidence |
|---|---|---|
| Eggplant fires straight, `vy=0`, no aiming | **Held** | `src/eggplant.js:4` (`vy: 0`) and `:24` (`shot.vy = 0` every step). The new target scans only pick the nearest enemy in the lane band, as the old `filter/sort` did |
| `CAM_LEAD` = 0.28 | **Held** | `src/config.js:4`, re-exported at `src/camera.js:4`, used at `src/campaign.js:282`. `config.js` is not in the diff |
| No shop | **Held** | No `shop` or `upgrade` in `src/` or `index.html` |
| Quoted lines exact | **Unchanged by this PR**, but one caption does not match its lock (F5) | `voice-lines.js`, `story.js`, `barks.js`, `docs/BOB-LINES.md`, and `assets/` are not in the diff. Dad's catchphrase at `src/story.js:7` is byte-identical. The on-screen Yetti caption reads "Stay away from the Colombian's room!", not the locked "Stay away from the Colombians room." |
| Choirmaster numbers | **Held** | `src/yettis.js:11` (hp 1140), `:21` adds, `:23` cooldowns unchanged. His volleys are easier to jump on Nightmare because of F1 |
| `intro_v3.mp4` | **Untouched** | Not in the diff. Last commit `8c53d59`. sha256 `2cbdc5585ff4…a30888`. It plays on Start in Chrome |

## 5. Suggested order

1. **F1.** Make the Nightmare clear rate-independent (58 everywhere clears every stage at every rate), or sweep z over the step. Then re-run the 30/60/120 table.
2. **F2.** Surface a `create()` throw, with a test that makes `assemble` throw.
3. **F3.** A duplicate-texture-key unit test, plus a configurable smoke output directory.
4. **F5.** Ask Jason which Yetti text is locked, then record it in `docs/BOB-LINES.md`.
5. F4 needs a Muse look at Adventure S3 on the device rate. Then F6 to F10.
