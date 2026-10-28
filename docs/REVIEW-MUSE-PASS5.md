# BDB — Muse Pass 5 review (game feel & pacing)

**Reviewer:** Muse Wonder (read-only pass; no game code changed, no merge, no deploy)
**Reviewed:** draft PR #16, head `cursor/bdb-pass5-7e78` @ `a8a103c` ("Pass 5: clear Nightmare snowballs at 50px on a 60 Hz step"), base `cursor/bdb-pass4-cfe0`
**Against:** my Pass 4 review (PR #13, `docs/REVIEW-MUSE-PASS4.md` on `cursor/muse-pass4-review-8008`, overall **6/10**), the Pass 5 claim list in `docs/FIX-LIST.md` (P5-1…P5-13), and the locked rules recorded there.
**Method:** fresh GitHub clone of `cursor/bdb-pass5-7e78` @ `a8a103c` into a clean directory, `npm ci`, `npm test` under Node 24.22.1; `node tools/bot-sim.mjs <difficulty> <hz>` at 30/60/120 Hz on Story, Adventure and Nightmare (9 runs, each printing 3 fresh stage starts + 1 campaign); the repo's `tools/browser-smoke.mjs` under headless Chrome (SwiftShader); **plus an independent real-time headless-Chrome playthrough of my own** — loaded `?nocutscenes=1`, clicked the actual Start button (`#start`, "BEGIN THE RESCUE →"), waited for `started === true` on Stage 1, then held `D` + `J` (move + fire) with a Space jump for ~13 s of wall-clock play and screenshotted title / gameplay-start / early / mid / later combat, a mobile-landscape touch viewport, and a portrait rotate viewport. Screenshots referenced below are from those two browser runs.

## Score: 6.5 / 10 (Pass 4: 6/10)

| Area | Pass 4 | Pass 5 | One-line verdict |
|---|---|---|---|
| Combat feel | 7/10 | **7/10** | Same mechanics, but now actually visible in a browser: purple eggplants in flight, splat particles, foot dust, a knocked-down Yetti corpse on its back. No change to the underlying hit-stop/recoil model this pass, so no score change — the gain is that it can finally be *seen*, not that it got better. |
| Pacing (per stage) | 8/10 | **7/10** | Adventure still holds the locked 140–240 s band at every rate/stage, but Nightmare S3 parity was bought by making 30/120 Hz as long as 60 Hz (see P1), and Adventure's own rate spread widened. |
| Difficulty curve | 6/10 | **6/10** | The Pass 4 outlier is gone in the narrow sense (rates agree), but they agree at ~326 s / 10–11 deaths; Story is still deathless-flat and Nightmare campaign is still a 23–27-death checkpoint attrition. |
| Cutscene / call-in flow | 6/10 | **7/10** | First pass where this is browser-verified end-to-end: `intro_v3.mp4` plays inline and skips to real gameplay, the demo campaign drains 3 Dad call-ins and 14 Papis to victory, and Claudia's rescue caption fires — docked for the victory caption being half-buried under the victory overlay (below). |
| Readability | 6/10 | **6/10** | In-browser gains (shield prompt + gold-shield visual, corpse holds, caption system live) are offset by what the browser now reveals: boss placeholder silhouettes and caption/banner stacking. |
| Mobile controls | 4/10 | **6/10** | The smoke that died at `create()` in Pass 4 now passes simultaneous touch, touch release, Story default, pause-freeze, portrait rotate and graphics-context recovery in-browser. Still zero real-device evidence, so it cannot go higher. |

**The headline change is real and it is the one Pass 4 asked for: the game boots and finishes in a browser.** The P1 that capped the last two reviews — `GameScene.create()` throwing on the `'shadow'` texture collision — is fixed at the root (GameScene owns the shadow; `src/fx.js:31` now documents why FX must not re-register it), and my independent Start-click playthrough confirms it without using the smoke's demo-stepping shortcut: title → click → `started: true`, Stage 1, frames advancing, no error card, 47 shots / 4 KOs in 13 s of held keys. What keeps this at 6.5 rather than 7+ is that Pass 5's other headline — Nightmare pace parity — converged *upwards* to the worst rate, and the two oldest open questions (Story flatness, a human playthrough) are still open and still bot-only.

**Locked rules re-verified intact (not findings, do not "fix"):** eggplant fires straight (`vy = 0`, `src/eggplant.js`, set on creation and re-zeroed every step), `CAM_LEAD = 0.28` (`src/config.js:4`, respawn uses the constant), no shop/upgrade code in `src/` or `index.html`, Choirmaster untouched (HP 1140, `src/yettis.js:11`), `assets/cutscenes/intro_v3.mp4` untouched (not in the Pass 5 diff), Adventure inside 140–240 s per stage at every rate (below). Dad's catchphrase is exact (see quote audit). The quoted-lines lock, however, is **not** fully exact — see the dedicated audit; that drift predates Pass 5 and Pass 5 did not touch it, but "unchanged" and "exact" are different claims.

---

## Evidence: fresh clone, tests (this reviewer's runs)

- **Fresh GitHub clone of `a8a103c`: `npm ci` clean, `npm test` = 219/219 under Node 24.22.1.** Reproduces PR #16's headline exactly. (On the VM's system Node 22, `npm ci` prints the expected `EBADENGINE >=24` warning and still completes with 0 vulnerabilities; there are no runtime dependencies to install — `package-lock.json` contains only the root package.)
- **Pass 5 diff scope spot-checked:** `3f76903..a8a103c` touches no voice/story/barks file and no asset (quote audit below), removes the four dead modules as claimed (`crate-texture`, `cutscene-scene`, `music`, `perf-panel`; `page-base.js` correctly kept), and the P5-13 mechanism is exactly as described — `snowClearZ()` (`src/campaign.js:27`) returns 65 for Story/Adventure, 58 for Nightmare, and 50 only when `Math.round(1/dt) === 60`, with unit pins for all five cases in `tests/nightmare-clear.test.mjs:238-243`.

## Evidence: bot sims (this reviewer's runs, fresh clone)

Deterministic; repeated figures reproduce PR #16's table cell-for-cell on Adventure and Nightmare.

| Run | S1 (s / deaths) | S2 (s / deaths) | S3 (s / deaths) | Campaign (s / deaths) |
|---|---|---|---|---|
| Story 30 Hz | 128.2 / 0 | 137.6 / 0 | 151.8 / 0 | 418.4 / 0 |
| Story 60 Hz | 128.6 / 0 | 141.1 / 0 | 155.6 / 0 | 426.7 / 0 |
| Story 120 Hz | 126.0 / 0 | 138.9 / 0 | 152.1 / 0 | 415.5 / 0 |
| Adventure 30 Hz | 182.7 / 2 | 194.1 / 3 | 197.0 / 2 | 582.1 / 6 |
| Adventure 60 Hz | 164.9 / 0 | 188.9 / 2 | 225.4 / 5 | 584.9 / 5 |
| Adventure 120 Hz | 161.3 / 0 | 193.3 / 3 | 213.1 / 3 | 573.5 / 5 |
| Nightmare 30 Hz | 247.5 / 6 | 260.4 / 6 | **326.6 / 10** | 869.6 / 23 |
| Nightmare 60 Hz | 235.5 / 6 | 263.6 / 6 | **326.1 / 10** | 859.9 / 23 |
| Nightmare 120 Hz | 235.5 / 7 | 265.6 / 6 | **328.4 / 11** | 871.3 / 27 |

All 36 runs (27 fresh stage starts + 9 campaigns) clear, at every rate, on every difficulty. Three readings matter:

1. **Correction to the "326 s / 10 deaths at every rate" shorthand:** it is exact at 30 Hz (326.6/10) and 60 Hz (326.1/10) but **120 Hz is 328.4 s / 11 deaths** in my fresh run — which is also what PR #16's own body says. The convergence claim is true; the "10 at every rate" version of it is not, and should not be quoted forward.
2. **Parity was achieved by raising the other rates to 60 Hz, not by relieving 60 Hz.** Against Pass 4 (S3: 283.9/7 @30, 320.0/11 @60, 271.4/7 @120), Pass 5's 60 Hz cell barely moved (326.1/10) while 30 Hz got ~43 s longer / +3 deaths and 120 Hz ~57 s longer / +4 deaths. P5-13's own comment is honest about the mechanism (the 60 Hz step samples the jump descent at z≈53 under an overlapping snowball; clearing at 50 px dodges that one sample), and the device loop really is fixed at 1/60 — but the *felt* result is that Nightmare's finale is now uniformly a ~5.4-minute, 10-death stage and a ~14.3-minute, 23–27-death campaign. That is a pacing/difficulty fact, not a finishability one, and it is why Pacing drops a point despite the band holding.
3. **Adventure's rate spread widened.** Pass 4's Adventure S3 was 198–207 s across rates; Pass 5's is 197.0 / 225.4 / 213.1 s with deaths 2 / 5 / 3, and S1 spread grew to 161–183 s. Everything remains inside the locked 140–240 s band, but 60 Hz S3 at 225.4 s / 5 deaths / 20 hurts is now the closest cell to the ceiling, and 60 Hz is the rate the device actually steps at. Story, meanwhile, is byte-for-byte the Pass 4 story: deathless everywhere, 8–12 hurts per *campaign*.

## Evidence: browser (this reviewer's runs, fresh clone)

- **Independent real-time playthrough (mine, not the repo smoke):** title screenshot shows the full title (difficulty/chapter selects, Adventure default, "BEGIN THE RESCUE →"); clicking Start reached gameplay with `started: true`, Stage 1, no error card, `elapsed` advancing. Holding `D`+`J`: 2.5 s → Bob x 180→626, 9 shots, 1 KO; 7.4 s → 29 shots, 3 KOs; 13.1 s → 47 shots, 4 KOs, **1 death** (Bob respawned back at x≈594). Screenshots show, in real play: the tutorial banner ("MOVE + HOLD FIRE. EGGPLANTS FLY STRAIGHT."), Bob's "Where is Claudia???" and "Ha! Dead!" captions, a gold-shield guard with the "DASH THROUGH THE GOLD SHIELD" prompt, purple splat particles on the Yetti, foot dust, and a KO'd Yetti lying on its back (the corpse hold, visible in a browser for the first time). Zero runtime/HTTP errors across the whole session.
- **Repo browser smoke (fresh clone):** passed in full — demo campaign clears all 3 stages to victory (584.9 s, 191 KOs, 5 deaths, stage times 164.9/187.1/225.3 matching my Adventure 60 Hz bot run), then touch (simultaneous stick+FIRE moves and shoots, release stops fire, touch default is Story), pause freezes `elapsed`, portrait emulation shows the rotate overlay (`display:flex`), landscape hides it, WebGL context loss/restore shows and clears the graphics notice, and a `cutscenes=1` Start plays an inline `intro_v3.mp4` (asserted, not `opening.mp4`) that Space skips into started gameplay. Touch buttons measure 61.7×51.4 px (FIRE 61.7×77.1) — above the 44 px floor. This is Chromium/SwiftShader: it is *functional* evidence, not hardware performance evidence, exactly as the smoke's own report states.
- **What the screenshots also show (findings below):** the Stage 1 boss is a pale-blue placeholder silhouette and the Wingmen are flat purple silhouettes that can fully occlude Bob mid-fight; on the victory screen Claudia's "Let's leave before they reform." caption is rendered *behind/under* the "BOUNDARIES SUCCESSFULLY MASHED." eyebrow of the victory overlay, half-legible, while "CLAUDIA RESCUED." appears twice (in-game banner + overlay heading); in my mid-combat shot the zone banner and the narrator caption are stacked on adjacent lines competing for the same band.

---

## Quoted-lines audit (exactness, not just "unchanged")

Pass 5 changes no line (`git diff 3f76903..a8a103c` on `src/voice-lines.js`, `src/story.js`, `src/barks.js`, `index.html` is empty), so PR #16's "quoted lines unchanged" is literally true. But checked against the *locked* wordings, two lines are still not exact — the suspicion in the review request is confirmed, on screen:

| Line | Locked wording | On-screen / in code | Exact? |
|---|---|---|---|
| Yetti, `yetti_colombian_room_01/02` | `Stay away from the Colombians room.` (`docs/MUSE-100-IMPROVEMENTS.md` #63: no apostrophe, full stop) | `Stay away from the Colombian's room!` (`src/voice-lines.js:21`; identical in `assets/audio/voice-manifest.json`) | **No** — `Colombian's` ≠ `Colombians`, and `!` ≠ `.` |
| Yetti, `yetti_purple_car_01/02` | `Bob why is your car purple?` (#63, no comma) | `Bob, why is your car purple?` (`src/voice-lines.js:21`; manifest identical) | **No** — added comma |
| Dad catchphrase, `dad_catchphrase` | `Son, sometimes you just need to use the fly swatter to keep the women away!` | Identical via `STORY.dad` (`src/story.js`), pinned by `tests/media.test.mjs` | **Yes** |
| Bob, `bdb_open` / `bdb_produce` | `I brought the eggplant.` / `Die, Yetti, die!` (Jason-mandated, `docs/BOB-LINES.md`) | Identical (`src/voice-lines.js:6`) | **Yes** |

On-screen confirmation, not just source: the repo smoke's own touch screenshot (`touch-stage1.png`, Story, Stage 1) naturally captures the wave bark as **`YETTI / Stay away from the Colombian's room!`** — the caption path is `barkYettiWave` → `yetti_colombian_room_01/02` → `LINES` text → `HUD.say()` verbatim (`src/barks.js:17`, `src/hud.js:86`), and I reproduced the same caption string through the HUD in my own session. The rendered audio says the same thing as the caption (all 49 `LINES` captions match the voice manifest text exactly, 0 diffs — caption and recording agree with *each other*; they both drift from #63's locked text). So this is the known MUSE-100 #63 item still open, not a Pass 5 regression: either the locked text or the caption+recording needs Jason's pick, and per #63 the fix should not silently reword audio. Minor adjacent note: the title screen's prose still reads "Bob brought options." (`index.html`) — the *old* `bdb_open` from `docs/BOB-LINES.md`. It is title copy, not a quoted voice line, but it is the one place a player sees the superseded line.

---

## What Pass 5 got right (verified, not just claimed)

- **P5-1 (Pass 4 P1) — the boot crash is fixed and browser-gated.** FX no longer registers `'shadow'`; GameScene owns it (`src/game-scene.js:79`, comment at `src/fx.js:31`). Both my Start-click playthrough and the repo smoke reach started gameplay, and the smoke now asserts `started`, advancing frames, no error card, Stage 1 and `intro_v3.mp4` — the gate Pass 4 asked for exists and runs from the pushed head.
- **P5-2 — sole-survivor finisher.** `isBossFinisherReady` now returns true when every *living* Wingman is at 1 HP including a single survivor (and false when both are dead), `wingHp <= 0` stays dead on respawn even without `wingDead`, and a floored phase-3 Wingman is no longer treated as "bragging" for Dad-refusal purposes (`isBossBragging`). Covered by behaviour tests, and the Nightmare/Adventure S3 bot clears at all three rates exercise the path end-to-end.
- **P5-13 — multi-rate Nightmare parity, as scoped.** Snowball clear is Nightmare-only and rate-scoped; Story/Adventure stay at 65 px and their tables are essentially unchanged from Pass 4. The convergence is real (326.6/326.1/328.4 s). Its *direction* is a finding below, not a correctness complaint.
- **P5-3…P5-12 spot-checks hold up:** freeze-guard strikes reset on a healthy beat/stage change with a persistent Reload listener; gate ticks only on the continuous boss bar; choir pulse draws alongside the ring via cached `choirBuff`; separation skips hold/telegraph states; the clip-abort path settles the previous clip with `'abort'`; a chapter `loaderror` fails the chapter in `create()` before `started`; `killImpact('ko')` splats on a missing `source`; a same-batch boss event no longer blips Stage 3's boss music; and the four dead modules are gone with `page-base.js` correctly retained. The 219-test suite (up from 210) carries behaviour tests for the camera-respawn, freeze-guard and press-ownership claims.
- **Claim discipline stays good.** Every bot figure in PR #16's body reproduced exactly from my fresh clone, including the awkward one (120 Hz Nightmare S3 = 328.4/11) that the "10 deaths at every rate" shorthand glosses over.

## Prioritized findings

### P1 — Nightmare parity converged at the ceiling, and the mechanism is a single-sample dodge

Pass 4's finding was "60 Hz is Nightmare's hardest rate." Pass 5 closed the gap by making 30/120 Hz match 60 Hz's *worst* sample interaction rather than by easing the fight: Nightmare S3 is now ~326 s with 10–11 deaths at every rate (was 271–284 s / 7 deaths at 30/120 Hz), the Nightmare campaign is 860–871 s with 23–27 bot deaths, and S3 alone runs ~1.45× the length of the longest Adventure stage. The fix itself, `snowClearZ`, is honestly documented but brittle by construction: it keys on `Math.round(1/dt) === 60` and on one specific descent sample (z≈53) missing a 50 px threshold. The real device loop is fixed at 1/60 so this is not a device bug today — but any future dt change (120 Hz ProMotion stepping, a changed bot harness rate, a sub-step) silently re-opens or re-closes the gap, and the *player-facing* outcome is that the unlock difficulty's finale got longer and more lethal at two of three rates in a pass whose stated goal was pace parity. Before Nightmare is called finished this needs either a rate-independent jump/snowball interaction (clear height as a continuous function, tested at intermediate rates like 90 Hz) or an explicit decision, recorded with Jason, that ~326 s / ~10 deaths *is* the intended Nightmare S3. Choirmaster numbers remain locked and untouched, correctly.

### P2 — Boss presentation is placeholder silhouettes, now that a browser can show it

Three passes of readability work (gate ticks, choir ring, shield cracks, corpse holds) are finally visible — and the boss screenshots show the Interventionist as a pale-blue mannequin and both Wingmen as flat purple cut-outs with halo rings, against fully painted Yetti minions and backdrops. In the Phase 3 shot a Wingman silhouette completely covers Bob while eggplants and KO debris fill the lower third; the W1/W2 bars themselves are clear and labelled, so this is purely an art/texture gap, but it lands on the three most important fights and it undercuts the finisher read (`PAPACITO FINISHER READY` is still carried by banner text over silhouette targets). This was un-reviewable while the browser was broken; it is the top *visual* item now.

### P2 — Caption/banner/overlay stacking is the main readability cost in real play

In my 13-second session the narrator caption and the zone banner already compete ("ZONE 1 · WAVE 2" over the narrator's line), the tutorial prompt sits at the bottom simultaneously, and the smoke's victory frame shows the failure at its worst: Claudia's locked rescue line is half-hidden behind the victory overlay's eyebrow while "CLAUDIA RESCUED." is printed twice. The caption system itself works (speaker-coloured, timed); it needs priority/dwell rules against banners and a victory sequence that lets Claudia's line finish before (or instead of) the overlay eyebrow — without rewording any line.

### P2 — Story flatness and the missing human playthrough (carried from Pass 3 and Pass 4, unchanged)

Story: 0 deaths and 8–12 hurts per campaign at every rate, for the third consecutive review. Adventure's damage still concentrates in S3 (20 hurts / 5 deaths at 60 Hz vs S1's 2/0). Pass 5 correctly touched neither, but the de facto difficulty verdict for the default-touch difficulty still rests entirely on a bot that plays better than a first-time phone player. One timed human Story + Adventure run remains the cheapest high-value item in the project and is now *possible* for the first time, because the game boots.

### P2 — Quoted-line drift (#63) is still open, and is now confirmed on screen

See the audit above: `Stay away from the Colombian's room!` (on screen, in the smoke's own screenshot) vs locked `Stay away from the Colombians room.`, plus the purple-car comma. Not a Pass 5 regression — Pass 5 changed no line — but the lock says "exact," the recordings and captions agree with each other and not with the lock, and resolving it needs Jason's pick of which side is canonical rather than a silent edit in either direction.

### P3 — Small stuff

- **Blind-play data point:** holding right+fire from spawn died once in 13 s on Adventure S1 (respawn put Bob back at x≈594). That is the lane/shield lesson working as designed, but a first-time player gets one death before the "DASH THROUGH THE GOLD SHIELD" prompt has had much time to teach; worth watching in the human playthrough (P2 above), not retuning on bot evidence.
- **Mobile in-browser is genuinely better; the remaining gap is evidence, not logic.** Touch targets clear 44 px, the stick and buttons did not block the Start flow, portrait correctly blocks with the rotate card. But the landscape touch cluster still overlays the right lane where Yettis approach, there is still no real-device run (iPhone p95 / MUSE-100 #87 remains unmeasured), and SwiftShader frame pacing says nothing about a phone GPU.
- **`snowClearZ` naming/comment** says "50 misses that one sample" — accurate, but the function silently treats any non-60 Hz dt (including `undefined` → 58) as the "other rates" case; a comment naming the device-loop assumption at the call site would keep the next dt change from being a surprise.

---

## Suggested order for Pass 6 (feel/pacing only)

1. **Decide Nightmare S3's intended shape, then make the snowball clear rate-independent** (continuous clear height or a jump-arc fix tested at 30/60/90/120 Hz). Record the decision; do not leave parity resting on the 60 Hz sample. [P1]
2. **One timed human Story + Adventure playthrough** (deaths, thumb fatigue, where the shield lesson lands) — now unblocked for the first time; price Story's flatness and S3's tail with a person before pulling any lever. [P2]
3. **Boss presentation:** painted/textured boss bodies (or at minimum a non-silhouette treatment) for the Interventionist and Wingmen, and a boss-bar finisher pulse so the phase-3 read is not banner-only. [P2]
4. **Caption priority:** boss/finisher/victory lines get dwell priority over wave banners; let Claudia's rescue line complete clear of the victory overlay. No wording changes. [P2]
5. **Quote-drift decision (#63):** Jason picks locked-text vs recorded-text for the two Yetti lines; whichever wins, add the verbatim-lines pin for all `LINES` entries, not just the Dad catchphrase. Also decide whether the title screen's "Bob brought options." prose is intentional. [P2]
6. Only then: a real-device mobile pass (rotate mid-fight, simultaneous touch under fire, p95 frame time) to convert Mobile from "smoke-verified" to measured. [P3]

Nothing above requires touching a locked decision: no aiming, no `CAM_LEAD` change, no shop, no Choirmaster retune, no reworded lines without Jason's pick on #63.

**Bottom line:** Pass 5 did the two things Pass 4 asked for most — the game starts in a browser and is gated there, and Nightmare finishes at every rate — and its claims reproduce exactly from a fresh clone (219/219, every bot cell, zero browser errors). The score rises to 6.5/10, capped now not by whether the game *boots* but by how its hardest stage *feels*: parity at ~326 s and 10 deaths, placeholder bosses, stacked captions, a Story mode still awaiting its first human, and two locked lines that still do not read as locked. The next review should finally be argue-about-fun, not argue-about-finishability — if Pass 6 spends itself on the human playthrough and the Nightmare decision instead of more sim parity.
