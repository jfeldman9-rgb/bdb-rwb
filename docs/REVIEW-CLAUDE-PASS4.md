# Claude review: Pass 4 (draft PR #11)

**Branch reviewed:** `cursor/bdb-pass4-cfe0` @ `3f76903`, into `cursor/bdb-pass3-7221` @ `298879e`.  
**Scope:** read-only. No game code changed, no merge, no deploy.  
**Score: 4.5 / 10**

The eighteen P4 items are mostly implemented as described, and the unit and bot tests are green. The score is held down by two things. First, the game does not get past Start in a real browser: entering gameplay throws in `FX.makeTextures` on every run. Pass 3 introduced this and pass 4 did not catch it, because the "browser entry resolves" claim only checked imports. Second, P4-1 introduces a regression: Dad is refused for the rest of a Wingman phase-3 fight once one Wingman is at 1 HP.

---

## 1. Fresh clone

```
git clone -b cursor/bdb-pass4-cfe0 https://github.com/jfeldman9-rgb/bdb-rwb.git
npm ci       # up to date, audited 1 package, 0 vulnerabilities
npm test     # tests 210, pass 210, fail 0  (~1.0 s)
```

- Node here is 22.23.4, but `package.json` asks for `"node": ">=24"`. The tests pass on 22. `tools/browser-smoke.mjs` says it needs Node 24's `WebSocket`, and it also runs on 22.
- 210 tests is up from 192 at `298879e`, which is 18 new tests.

### Browser-entry imports

`index.html:83` loads `lib/phaser.min.js` as a classic script, then `src/bootstrap.js` as a module. I walked every static and dynamic `import` from `src/bootstrap.js` and checked that each target file exists and that each named binding is exported. I also ran `node --check` on every `src/*.js` file.

| | Count |
|---|---|
| Modules reachable from `src/bootstrap.js` | **54** |
| Import edges | **103** |
| Named bindings checked | **213** |
| Unresolved (missing file or missing export) | **0** |
| `src/*.js` syntax failures | 0 |
| `src/` files never imported | 4: `crate-texture.js`, `cutscene-scene.js`, `music.js`, `perf-panel.js` (already flagged as dead code in earlier reviews) |

The first scan reported seven missing exports. All seven were my parser misreading comma lists such as `export const VW = 1280, VH = 720;`, and I checked each one by hand. Real Chrome 156 (headless, SwiftShader WebGL, Phaser 4.2.1) also loads the whole graph with no 404s and reaches the title screen.

**Imports resolving does not mean the game boots.** See B1.

---

## 2. Findings, highest priority first

### B1 (P0, carried over from pass 3, not caught): gameplay throws on entry in every browser run

- `src/game-scene.js:67` generates a `shadow` texture if one doesn't exist.
- Three lines later, `src/game-scene.js:70` runs `new FX(this)`.
- `FX.makeTextures` only skips when `glow` already exists (`src/fx.js:22`), so it goes on to `radial('shadow', …)` at `src/fx.js:31`.
- Phaser's `textures.createCanvas` returns `null` for a key that is already in use (console: `Texture key already in use: shadow`). That makes `c.getContext()` at `src/fx.js:24` throw `TypeError: Cannot read properties of null (reading 'getContext')`.
- `GameScene.create` stops at line 70, before the Claudia sprite, the music, the listeners, `syncViews`, and `started = true`.

What the player sees, on both `?autostart=1` and `?demo=1`, from a clean page with nothing modified: Start leads straight to the stuck card, "The game hit a snag / Code: FRAME_ERROR TypeError".

<img alt="Pass 4 stuck card on Start" src="/opt/cursor/artifacts/screenshots/pass4-start-crash.png" />

- **Origin:** `602f05a` ("Wire the feel rig…") put `new FX` after the existing `shadow` generator. The pass-3 base `298879e` fails the same way (`src/game-scene.js:62` and `:65` there).
- **Why 210/210 doesn't catch it:** no test runs `GameScene.create()`. `stage-cutscene`, `corpses-scene`, `clip-hold` and `victory-claudia` all build the scene with `Object.create(GameScene.prototype)`. `boot.test.mjs` only imports modules.
- **Confirmed fix, tested in a scratch copy only:** I added one guard at the top of `radial` (`if (s.textures.exists(key)) return;`). With that, `tools/browser-smoke.mjs` reaches the title screen, runs the full demo campaign to victory (stages `[1,2,3]`, times `165.1 / 187.1 / 212.9 s`, 4 deaths), and passes the touch-layout checks. Another option is to drop `shadow` from FX, since `fighter.js:10` uses the `game-scene` ellipse anyway.
- **Second problem in the same script:** after the touch section, `tools/browser-smoke.mjs:71` asserts `/opening.mp4/`, but the intro is now `assets/cutscenes/intro_v3.mp4` (`src/cutscene.js:15`). The smoke script cannot pass as written. It is a stale RWB-era assertion, not a game bug.
- **Effect on the docs:** `docs/OVERNIGHT-STATUS.md` (pass 4 section) says "The browser entry … resolves". That is true of the imports only. Nobody loaded the game in a browser this pass.

### B2 (P1, regression from P4-1): Dad is refused for the rest of phase 3 once one Wingman is floored

`src/wingman.js:31-36` makes a phase-3 Wingman at 1 HP return `canBeHit === false`. `Campaign.useDad` computes `bossInvuln: visible.some(e => e.boss && !e.canBeHit)` (`src/campaign.js:231`), so a floored Wingman now looks invulnerable to Dad.

I reproduced it with `new Campaign({stage:3})`, `startBoss(3)`, both Wingmen hovering on screen at HP `[1, 200]`, and Dad holding 1 charge:

| | `useDad()` | Banner |
|---|---|---|
| Base `298879e` | `true` | `THE WINGMEN…` (the swat lands) |
| Pass 4 | `false` | `THE BOSS IS BRAGGING — WAIT FOR AN OPENING.` |

For the rest of the fight, while the partner still has 200 HP, Dad is unavailable and the banner is misleading. `dad-call.js:70` also drops the floored Wingman from swat targets, which is fine. The `bossInvuln` test is the problem. Fix: count only a real invulnerable state (`split`, `roar`) as `bossInvuln`, or treat "alive and floored" as not-invulnerable. No test calls `useDad` in phase 3 with one Wingman floored.

### B3 (P2, P4-2): the error-strike counter never decays

`src/recovery.js:74`, `:99` and `:101`: `strikes` counts every same-origin error for the whole session and never resets. Two unrelated one-off errors minutes apart, with the loop still beating, show the "stage stopped running" card over a game that is still running. The rule in `docs/FIX-LIST.md` ("a single stray error does not trip; a repeat does") is met literally, but "repeat" should mean "repeat within a window" or "the loop stopped beating". Suggested fix: reset `strikes` in `note()` after a clean beat interval, or require that `last` has not advanced since the first strike. The check at `:90` duplicates the one at `:101`.

### B4 (P2, P4-5): the stuck card's own Reload listener is single-use

`src/recovery.js:33-35` adds the click handler with `{ once: true }` and sets `retry.__bdbStuck = true` permanently. If `startup.js` has not marked the button (`__bdbResume`), the first stuck card works. After a resume, a second stuck card adds no listener because `__bdbStuck` is still set, and the old listener is gone, so the button does nothing. In the shipped page `startup.js` always sets `__bdbResume`, so this only affects embeds and tests. Either drop `once` or clear the flag when the listener fires.

### B5 (P2, P4-7): Wingman HP bars get 66% and 33% ticks that mean nothing

`src/hud.js:93-94` draws `BOSS_GATES` ticks on every bar. The Yetti bosses really do gate at 0.66 and 0.33 (`src/yettis.js:15-17`). Each Wingman phase, though, is a separate HP pool (`WINGMAN_HP[phase]`): phases advance when a Wingman dies, and phase 3 floors at 1 (`src/wingman.js:2-8`). On the W1 and W2 bars the ticks are noise and suggest gates that don't exist. Draw them on the single `BOSS` bar only.

### B6 (P3, P4-6): aborting a clip silently drops the first clip's `done`

`src/cutscene-hooks.js:18` aborts a live clip when a new `play` starts, and `CutscenePlayer.abort()` never calls `done` (`src/cutscene.js:85`, `:148`). The first `startHeldClip` callback is lost (`src/game-scene.js:171-178`). That callback is the one that would `playHeld(held)` and, for `victory`, show the victory panel. The second call also resets `voiceHold = []`, so any voice held during the first clip is dropped. The three clip triggers (`kidnap`, `rescue_pre_boss`, `victory`) never share a frame and the loop is paused under a clip, so normal play can't reach this today. If two clips do overlap later, it will lose lines or the victory panel without any error. Either call the old `done` with `'abort'` or document that callers must not overlap clips.

### B7 (P3, P4-16): separation clamps to the camera view in free roam

`src/yettis.js:103-104` clamps pushed bodies to `bounds.l + 55 … bounds.r - 55`. Outside an arena, `bounds` is the camera view (`src/camera.js:44-46`). Two overlapping Yettis that are off screen to the right (or left behind) would be pulled to the view edge. A 1500 s Adventure bot campaign and a Nightmare run showed **0** off-screen-to-on-screen snaps, so this is latent. Big per-step x jumps (over 40 px) happen on the base too (knockback), at 49 on the base versus 45 on pass 4 in Adventure. Suggested fix: clamp only to the pair's existing min and max, or skip pairs that are off screen.

### B8 (P3, P4-14 performance): the choir pulse adds an O(n²) scan with allocations every frame

`src/game-scene.js:151` calls `choirMultiplier(e, w.enemies)` for every live enemy each render frame. `src/yettis.js:84` scans every enemy with `Math.hypot` and builds a fresh `['choir','choirmaster']` array inside `.some`. The sim already pays this cost for damage. The render pass now pays it again every frame, which goes against the allocation work in P4-7. Hoist the type check into a `Set` or a `===` pair, or cache the multiplier on the enemy during the sim step. The aura also costs 12 `beginPath`/`strokePath` pairs per choir (`:145-150`), which is small but not free on a phone.

### B9 (P3, P4-11): small issues in the recharge banner

`src/dad-call.js:41-44` reads `DAD'S OUT OF SWATS (0/1 · CALL 1/3). · 3/10 KOs · 27s`. The `). ·` punctuation is awkward, and the seconds are computed once per press, so the countdown doesn't tick. It's correct that it shows both conditions, since a recharge needs 10 KOs **and** 45 s (`:12`).

### B10 (P3, P4-17): the boss hold length is described inconsistently

`BOSS_CORPSE_S = 1.2` (`src/corpses.js:4`) with an 0.18 s fade means the boss stays fully opaque for about 1.02 s. `docs/OVERNIGHT-STATUS.md` says "stays fully opaque through the minion hold (0.5 s), then fades", which reads as if the hold were 0.5 s. The behaviour matches the FIX-LIST intent. Related: on a Wingman phase change, the outgoing pair is dropped from `enemies` while alive and becomes a boss corpse (`src/game-scene.js:110-125`), so it now lingers 1.2 s next to the new pair's split. Worth a look in a browser once B1 is fixed.

---

## 3. P4 claims, one by one

| ID | Verdict | Evidence |
|---|---|---|
| P4-1 | **Done, with a regression** | `wingman.js:31-36`. The 30 Hz and Stage 1 Nightmare clears are in `tests/nightmare-clear.test.mjs` (`clearStage(stage, hz)`). It breaks Dad in phase 3 (B2). |
| P4-2 | Done, with a caveat | `started` moved to the end of `create` (`game-scene.js:53`, `:82`). `loading(s)` and empty-`filename` checks are at `recovery.js:89` and `:99`. The strikes never decay (B3). |
| P4-3 | Done | `dad_catchphrase$` was added to `SCRIPTED_VOICE` (`audio.js:435`). The wording is unchanged. |
| P4-4 | Done | `checkpoint.wingDead` is recorded (`campaign.js:252-255`) and restored as dead (`:149-150`). The phase advance clears both (`wingman.js:76-78`). Tested. |
| P4-5 | Done, with a caveat | No more double listener (`recovery.js:31-36`). `installStageRecovery` destroys on `game.events 'destroy'` (`:128`). The single-use listener issue is B4. |
| P4-6 | Done | `pauseForClip` lives only in the story player. `startHeldClip` no longer pauses (`game-scene.js:171-178`). The abort edge case is B6. |
| P4-7 | Done | `keep()` (`campaign.js:21-25`), the reused `stepping` list, `liveSet`, in-place particles, and reused `bossBars`/`bossBarLayout` output. The gate ticks are wrong on Wingman bars (B5). |
| P4-8 | Done | `trackForStageStart` (`game-scene.js:23-26`). With cutscenes off, `story.play` calls `done()` straight away, so the track still starts from `startHeldClip`. |
| P4-9 | Done | `VW*CAM_LEAD` (`campaign.js:269`). `CAM_LEAD = 0.28` (`config.js:4`). |
| P4-10 | Done | The checkpoint line is kept as a prefix on both mercy banners (`campaign.js:273-274`). `killImpact` gives one splat for a Bob kill, and Papi and Dad still splat on the KO (`shot-feel.js:7-12`). |
| P4-11 | Done | `'locked'` is now separate from `'spent'` (`dad-call.js:23-24`, `:38`). The banner shows KO and time progress (B9). |
| P4-12 | Done | `titleWantsBegin` (`input.js:9-14`): Escape and P are consumed without starting, while pad Start and Enter still begin. Tested in `input-map.test.mjs`. |
| P4-13 | Done | No "second swat" promise is left in `plan/`. MUSE-100 #46 now says "not in v1". |
| P4-14 | Done | `choirAura` gives a 300 px ring and 3 notes. The gold pulse is drawn when `choirMultiplier > 1`, and 1.28 is unchanged. Performance is B8. |
| P4-15 | Done | Crack lines at chips 1 and 2 (`game-scene.js:153`). `clangPitch` rises 180 Hz per chip. The break is still on the third hit. |
| P4-16 | Done | `separateEnemies` (`yettis.js:92-117`): same lane, non-boss, sorted by `actorId`, at most 8 px per pair. Adventure bot campaign 599 s (base 595 s). The clamp is B7. |
| P4-17 | Done | `beginCorpse(!!m.boss)` gives 1.2 s; minions stay at 0.5 s. The wording issue is B10. |
| P4-18 | Done | `messages.chapter` is used when `category === 'assets' && finished` (`startup.js:25`). Tested in `recovery.test.mjs:77`. |
| "Browser entry resolves" | **Imports only** | True for imports (54 modules, 0 unresolved), but entering gameplay throws (B1). |

### Locked items

| Lock | Status |
|---|---|
| Eggplant fires straight, no aiming | Held. `vy: 0` at fire, and `shot.vy = 0` every step (`eggplant.js:4`, `:15`). The Nightmare harness asserts `vy === 0` on every shot. |
| `CAM_LEAD` 0.28 | Held. `config.js:4`, re-exported in `camera.js:4`, now used by respawn. |
| No shop | Held. No `shop` or `upgrade` anywhere in `src/`. |
| Quoted lines exact | Held. `voice-lines.js`, `story.js`, `barks.js` and `assets/` are untouched by this PR. The mercy banners only gained the existing `STORY.checkpoint` prefix, and Dad's catchphrase id and text are unchanged. |
| Choirmaster numbers, `intro_v3.mp4` | Untouched. |

---

## 4. Test gaps

1. **Scene boot.** Nothing runs `GameScene.create()` against a texture manager whose `createCanvas` returns `null` for a duplicate key. A minimal fake scene with a `textures` map that enforces unique keys would have caught B1. So would `browser-smoke` in CI, once its `opening.mp4` assertion is fixed.
2. **Dad in phase 3** with one Wingman floored and one hittable (B2).
3. **Freeze guard** with two errors far apart in time while the loop is beating (B3).
4. **The stuck card a second time** after a resume, without `startup.js` (B4).
5. **Separation** with an overlapping pair outside the camera view (B7).
6. **Overlapping clips:** `play` while a clip is active, asserting what happens to the first `done` (B6).

## 5. Suggested order

1. B1 (one-line guard in `fx.js`, or remove `shadow` from FX), plus a create-level test. Fix `tools/browser-smoke.mjs:71` and run the smoke.
2. B2 (`bossInvuln` must not count the phase-3 floor).
3. B3 and B5, then the P3 items.
