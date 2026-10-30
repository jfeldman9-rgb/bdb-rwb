# Review — Kimi pass 3 (draft PR #6: `cursor/bdb-pass3-7221` → `cursor/bdb-pass2-d377`)

Reviewer: Kimi (read-only review, no game code changed)
Head reviewed: `1eb6f3a` (fix-plan pass 3, 13 fixes). Base: `c9cf35a` (pass 2).

## Score: 4/10

The fix work underneath is genuinely good — 11 of the 13 claimed fixes are correctly implemented, well-scoped, and covered by strong behaviour tests. But the PR as pushed **cannot boot**: three broken imports (one file never committed, two functions that were never written) crash every entry path, `npm test` fails 5 of 184 tests at HEAD, and the PR body + OVERNIGHT-STATUS claim "192/192 green", which is false. Score reflects the tree that was pushed, not the tree the author apparently had locally.

## P0 — must fix before this PR can land

### P0-1. `src/shot-feel.js` was never committed — game crashes at startup

```19:21:src/game-scene.js
import { bindRotatePause } from './rotate-block.js';
import { touchCapable } from './hud.js';
import { RECOIL_KICK, stepRecoil, hostileShape } from './shot-feel.js';
```

`shot-feel.js` does not exist in any commit on this branch (or its parent) — `git log --all --diff-filter=A -- src/shot-feel.js` is empty. The browser path (`index.html` → `bootstrap.js` → dynamic `import('./main.js')` → `game-scene.js`) throws a module-resolution error, which `bootstrap.js` catches and turns into the startup-fail card. **The game never reaches the menu.** Also broken in Node: the module graph behind `tests/helpers/bot-runtime.mjs` (and hence `tools/bot-sim.mjs`) and 4 test files all fail with `ENOENT … src/shot-feel.js`.

Fix: commit the author's local `src/shot-feel.js` (it exists on their machine — the rest of the diff consistently references `RECOIL_KICK`, `stepRecoil`, `hostileShape`, and `FX` slowmo/hitstop removal).

### P0-2. `bindRotatePause` does not exist in `rotate-block.js`

`src/game-scene.js:19` imports `bindRotatePause` from `./rotate-block.js`, but that module only exports `syncRotatePause`:

```13:13:src/rotate-block.js
export function syncRotatePause(scene, matchMedia = globalThis.matchMedia) {
```

No `bindRotatePause` exists anywhere in the tree (`rg` finds only the import). `rotate-block.js` is also byte-identical to the parent commit — it was never given a listener-binding export. Fix: either export `bindRotatePause` from `rotate-block.js` or change the import to the existing API.

### P0-3. `noteRenderer` does not exist in `perf.js`

```13:13:src/main.js
import { perf, noteRenderer } from './perf.js';
```

`perf.js` exports `perf` (`perf.js:188`) and `bindPerfLifecycle` (`perf.js:169`) but no `noteRenderer` — the name appears nowhere else in the tree. (`perf.js:189` already side-effects `window.__perf = perf` on import, so the meter half of P3-12 did land; only the renderer hook is missing.) Fix: implement `noteRenderer` in `perf.js`, or drop it from the import.

**Common cause for P0-1…P0-3:** all three broken imports were introduced by the single commit `84428f4` ("Turn the regex-only checks into behaviour tests" — `git log -S` confirms each), a tests commit that also contains un-announced production edits to `game-scene.js` (23 lines) and `main.js` (10 lines). The matching implementations — `shot-feel.js`, `bindRotatePause` in `rotate-block.js`, `noteRenderer` in `perf.js` — exist in no commit; `rotate-block.js`, `perf.js`, and `fx.js` are untouched by the whole PR. The author's local working tree evidently had those files (untracked or unstaged), which is also why their local run looked green while the pushed tree cannot boot.

### P0-4. "192/192 passing" claim is false for the pushed tree

`npm test` at `1eb6f3a`: **184 tests, 179 pass, 5 fail**:

- `tests/boot.test.mjs` — "every source module imports without a missing-file error" → ENOENT `shot-feel.js`.
- `tests/clip-hold.test.mjs`, `tests/corpses-scene.test.mjs`, `tests/stage-cutscene.test.mjs`, `tests/victory-claudia.test.mjs` — all import `src/game-scene.js` → ENOENT.

The PR body says 192/192; `docs/OVERNIGHT-STATUS.md` repeats it. The count discrepancy (184 vs 192) corroborates missing local files: the author's tree almost certainly contains additional test/source files that were never pushed. **Verification I ran:** base commit `c9cf35a` in a clean worktree: 168/168 pass. Head with three 5-line stubs for the missing modules: 185/185 pass — i.e. every delivered fix works; only the missing files break the tree.

## Verified fixes (all correct, with behaviour tests)

| Fix | Claim | Verdict | Evidence |
|---|---|---|---|
| P3-1 | Nightmare finishable: wing HP persists across stages; bot drains scripted voice | ✅ | `campaign.js:130-143` restores `wingHp` per wing from `run.wingHp` (clamped to each wing's `maxHp`, which differs per stage — correct); `:240-243` saves post-fight + on leave. `tools/bot-sim.mjs:15-16` adds `dad_callin` drain; `tests/nightmare-clear.test.mjs` seeds HP 3/1 and asserts both wings dead within the 9-minute budget. I also ran the bot-sim at HEAD (stubbed): Nightmare S2 262s/6 deaths, S3 322.7s/10 deaths — all clear. |
| P3-2 | Voice queue no longer starves gameplay voice | ✅ | `audio.js:432-434` adds the `SCRIPTED_VOICE` policy set (`dad_callin`, `wingman_bark`, `boss_line`) checked before the generic dedupe drop; `:498` stretch applies to every queued entry, not just the first; `campaign.js:56-66` plays the kidnap line *before* `nar_ch2` so `duckAmbience(1400)` can't swallow it. `tests/clip-hold.test.mjs` holds nar_ch2 open and asserts the queue reaches ≤1 — a real behaviour test, not a source regex. |
| P3-3 | Dad clip plays unmuted on the phone tap | ✅ | `dad-call-cutscene.js` keeps the player object across `abortClip` (so `video`/`clipToken` survive), and the gesture bless at the end of `play()` checks `!handle?.active` instead of `!handle`, so a live clip is never re-blessed (which would `load()` and restart it). `main.js:39` passes `blessDadFromGesture` into the campaign. |
| P3-4 | Wingman bomb/blast telegraphs stay in the enemy lane | ✅ | `wingman.js:52` draws the bomb circle at `laneY(w.y)`, `yettis.js:148-150` passes `yetti.y` into `drawLaneWarn`; `game-scene.js:138` adds `laneY`/`LANE_H` to the combat deps. `tests/telegraph-lane.test.mjs` drives a real yetti through `planYetti` + `tickYettis` and asserts the lane-warn rect sits in the yetti's lane. |
| P3-5 | Dad says the catchphrase exactly on impact | ✅ | `campaign.js:326` queues `dad_catchphrase` at `DAD_TIMING.impact` inside the dad-cutscene scheduler (deduped via `saidCatch`); the impact moment comes from `dad.js:34`. Locked wording unchanged. |
| P3-6 | Chapter Select skips the intro; audio context can't wedge Phaser | ✅ | `title-flow.js:6-9` returns a promise race: `introDone` OR a 500ms cap OR a `playing` listener (whichever first), so a suspended `AudioContext` (no gesture yet) can't stall the scene; `cutscene-hooks.js:20-25` parks the loop only if it's `isPlaying`, then pauses the Phaser scene while the clip runs. |
| P3-7 | Recovery overlay is reachable | ✅ | `recovery.js:64` exports `noteBootIssue`, `:101` wires it into `evaluateRecovery`; `startup.js:19-20,40-41` records boot issues; `main.js:61` passes `noteBootIssue` into `createCampaign`. Also fixes the recovery `once:true` re-entry bug. |
| P3-8 | Papi wipe synced to the runner front | ✅ | `papacito.js:5-9` derives shared `WIPE_DELAY_S` / `WIPE_RADIUS_PER_S` / `WIPE_TRIGGER_X` constants used by both the spawner and `runnersNear`; each enemy carries its own `wipeAt` (first crossing), so a late crosser isn't wiped early by an early crosser's schedule. Worst-case enemy sits in the blast ~1.49s < the 2.5s `papiTime` (per `tests/papi-wipe-sync.test.mjs` — includes a fuzz over y/wave/speed jitter). |
| P3-9 | Lecturer grab in-range and interruptible | ✅ | `bob.js:44-49` adds `grabPunish` (bigger radius during punish); `campaign.js:333` routes Bob damage through `hurtBob`, which ends the grab. `tests/lecturer-grab.test.mjs` simulates a full punish + wing hit + pin and asserts the grab ends. |
| P3-10 | Wingman HP bars for W1/W2 | ✅ | `hud.js:7-13` returns two bars per wingman boss (dead wing forced to 0 via `b.hp ?? 0` — without it a dead wing would render a full bar); `:15-22` lays out W1 left / W2 right with per-wing labels (`campaign.js:171-175`). |
| P3-11 | Bob stops swatting corpses; respawn camera sane | ✅ | `dad-call.js:57` clears `phaseCalls` on abort (the actual root cause of the repeated swat-after-death: stale phase entries re-firing `bob_swat`); `campaign.js:256` clamps `camMax = camX` on respawn. |
| P3-13 | Behaviour tests, not source greps | ✅ | The new tests (`clip-hold`, `nightmare-clear`, `papi-wipe-sync`, `telegraph-lane`, `recovery-boot`, `dad-catchphrase-impact`, `victory-claudia`, `wingman-bars`) drive the real modules through stubs and assert observable outcomes. This is the right pattern and is what makes the other fixes verifiable. |

## P3-12 — partially undelivered

The fix-plan bundled five items; only two landed:

- ✅ Touch label only written on change (`hud.js` `paintTouch` last-text guard).
- ✅ Snowball knockback follows travel direction (`campaign.js:362`).
- ❌ **Dead `FX.slowmo` / `FX.hitstop` NOT removed** — `src/fx.js` is untouched at `HEAD`. `fx.js:5` initialises both fields, `fx.js:51` writes `this.hitstop`, `fx.js:57` writes `this.slowmo`, and **nothing reads either field** (real hit-stop lives in `campaign.js` as `this.hitStop`, consumed at `campaign.js:329`). The claimed removal (PR body + OVERNIGHT-STATUS) is not delivered.
- ❌ `rotate-block` listens-once / `bindRotatePause` — lives in the uncommitted edits (P0-2).
- ❌ Recoil kick + distinct hostile shapes + perf renderer hook — live in the missing `shot-feel.js` / unwritten `noteRenderer` (P0-1, P0-3). The perf meter itself did land (`perf.js:188-189`).

## Locked invariants — all intact

- Eggplant flies straight: `eggplant.js` has no `aim`/`track`/`turn`/`seek`/`lead` logic; `vy = 0`; config `lock:` comment preserved (`config.js:16`).
- `CAM_LEAD = 0.28` unchanged (`config.js:4`).
- No shop: zero matches for shop/purchase/currency UI in `src/`, `index.html`, `tests/`, `tools/`.
- Quoted lines exact: `src/voice-lines.js`, `docs/BOB-LINES.md`, and `assets/cutscenes/` are untouched by the diff; the catchphrase wording in `story.js:7` is unchanged; Choirmaster damage/HP numbers unchanged.

## Minor findings (non-blocking)

1. **`campaign.js:256` hardcodes `VW * 0.28` instead of `CAM_LEAD`.** Functionally identical today (config comment pins 0.28), but the constant exists precisely to avoid this; use `CAM_LEAD` for consistency with `game-scene.js:144`.
2. **Doc numbers don't match HEAD.** `FIX-LIST.md` / PR body quote bot-sim times (166.4 / 196.8 / 210.2s) from an earlier tree. At HEAD the deterministic sim gives 166.4 / 190.4 / 215.4s (still comfortably in the 150–280 band). Re-run the sims and refresh the docs when landing.
3. **Latent double-pause in the story player.** If `play()` is called while another clip is active, the old handle is nulled without `resumePhaser` — the scene would stay paused after the new clip ends. Not reachable today (every call site supersedes via `abort`/`playClip`), but worth an `if (handle?.active) abortClip()` guard at the top of `play()`.
4. **`showStuck` stacks a retry listener per call.** Guarded in practice (retry hides the overlay), but adding `{ once: true }` or removing the listener in `hideStuck` would make it robust.
5. **Test gap that let P0 ship:** no test asserts that every `import` in `src/` resolves to an existing *export* (only that files exist / modules import). A cheap static check (parse import names, verify against target module exports) would have caught all three P0s. Note `tests/boot.test.mjs` *did* catch it — but the author's local run masked it with untracked files. Recommend CI runs from a clean clone.
6. `syncRotatePause` is now orphaned (only used in tests) since `game-scene.js` imports the nonexistent `bindRotatePause` — will resolve itself once P0-2 lands properly.

## What to do before undrafting

1. Commit `src/shot-feel.js`, export `bindRotatePause` from `rotate-block.js`, implement `noteRenderer` in `perf.js` (or revert the three import lines).
2. Delete the dead `FX.slowmo`/`FX.hitstop` code (`fx.js:5,51,57`) or correct the P3-12 claim.
3. Re-run `npm test` from a **clean clone** and put the real number in the PR body; refresh the bot-sim times.
4. (Optional) items 1–4 above.

With the three missing files restored I verified the suite goes 185/185 and every gameplay claim holds — so this is one commit away from being a strong PR.
