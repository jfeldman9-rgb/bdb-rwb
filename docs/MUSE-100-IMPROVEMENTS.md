# BDB — 100 Improvements (Muse planning pass, 2026-10-28) — planning-only, no code changes

Branch context: `bdb-scroll` (latest). Read: `plan/BUILD-PLAN.md`, `plan/STATUS.md`, `docs/LENGTH-DIFFICULTY.md`, `docs/MUSE-LEVEL-1.md`, `docs/BOB-LINES.md`, `docs/CUTSCENE-STEER.md`, `docs/ART-UPDATE-STEER.md`, `docs/GPU-MEMORY.md`, `ASSETS-LISTING.txt`, plus `src/campaign.js`, `bob.js`, `dad.js`, `dad-call.js`, `dad-call-cutscene.js`, `yettis.js`, `cutscene*.js`, `parallax.js`, `camera.js`, `hud.js`, `stage*-def.js`, `voice-lines.js`, `story.js`, `quality-governor.js`, `perf.js` (and neighbors).

Locked facts honored throughout: RWB-length stages (~150–220 s Adventure bot, ~9 min campaign per `docs/LENGTH-DIFFICULTY.md`); Bob confined to the left third (`CAM_LEAD ≈ 0.28` in `src/config.js` / `src/camera.js`); eggplant straight only (`vy = 0`, no aiming); phone-first; **no upgrade shop in v1**; Dad is a call-in (cutscene → wipe), clean-shaven, giant BDB fly swatter, catchphrase exactly `Son, sometimes you just need to use the fly swatter to keep the women away!`; Bob = Benedict (`6q6UVsvekS0UjrUXFz79`), Dad = Dad C Southie (`1S9vaAuPfgP7iQzynh4n`); all existing quoted lines stay word-for-word. Nothing below re-opens a locked decision.

Key verified gaps this plan leans on (read from source, 2026-10-28): `playDadCall()` in `src/dad-call-cutscene.js` has no caller and `DAD_CLIPS = ['D1']` has no matching mp4 in `ASSETS-LISTING.txt`; `src/barks.js` has no caller, so most registered voice IDs never fire; `kidnap` / `rescue_pre_boss` keys exist in `STAGE_CLIPS` but nothing plays them; hover/charger/choir/lecturer/interventionist/choirmaster/wingman/claudia ship as 860×180 silhouette pages (`docs/GPU-MEMORY.md`); Nightmare is not bot-clearable (`docs/LENGTH-DIFFICULTY.md`).

---

## 1. Gameplay / feel

**1. Tiered hit-stop instead of a flat 4 frames**
- Why: every eggplant hit currently freezes the sim the same amount, so bonks, shield-breaks, and KOs feel identical to chip hits.
- Implementation: in `Campaign.hit()` (`src/campaign.js`) replace the fixed `hitStop = 4/60` with `HITSTOP.light/medium/heavy` from `src/config.js` by outcome (bonk, shield-break, KO, boss-gate); mirror in `handleEvents()` shake/flash in `src/game-scene.js`. Extend `tests/eggplant.test.mjs`.
- Effort: S · Priority: P1

**2. Muzzle flash, shell-casing eggplant bits, and recoil on FIRE**
- Why: `fireGun()` only sets `bob.shootTime`; with no muzzle feedback, holding FIRE at 5 shots/s reads as a silent stream on a phone.
- Implementation: `src/game-scene.js` `handleEvents()` `fire` branch: 1-frame flash sprite at the `createShot()` spawn point (`src/eggplant.js`), 2 px opposite-facing nudge on the Bob `Fighter` view, tiny purple chip particles via the existing `this.particles` pool.
- Effort: S · Priority: P1

**3. Eggplant splat decal + squash on impact**
- Why: shots vanish on hit (`stepShot` sets `alive = false`); the joke weapon needs a visible splat to sell each 12-damage hit.
- Implementation: emit impact position/dir from `Campaign.hit()` (already emits `hit`), draw a short-lived splat in `src/game-scene.js` `effects()` where eggplants are currently procedural ellipses; cap decal count for perf.
- Effort: S · Priority: P1

**4. Lane-change "whoosh" step and landing dust**
- Why: vertical lane steps are the main dodge, but `Bob.update()` gives them no feedback; new players won't feel the lane system working.
- Implementation: detect lane-band crossing and `z` landing in `src/game-scene.js` `syncViews()` (compare previous view y/z), spawn dust from the particle pool and a soft `sfx` step in `src/audio.js`.
- Effort: S · Priority: P2

**5. Dash trail and shield-break burst**
- Why: dash-through-shield is the Zone 1 lesson, yet the dash is just the walk anim sped sideways and `breakShield()` only changes a banner.
- Implementation: afterimage ghosts while `bob.dashTime > 0` in `src/game-scene.js`; gold shard burst on the `shield` event when `shieldBroke` (plumb the flag through `Campaign.hit()`). Keep the `HALO PRIVILEGES REVOKED.` banner.
- Effort: S · Priority: P1

**6. Point-blank bonk gets its own thump, ring, and star burst**
- Why: the bonk (<90 px, `GUN.bonkRange`) is Bob's only "melee" but uses the same hit path as a shot; players can't tell they discovered it.
- Implementation: distinct event kind from `fireGun()`'s bonk return in `src/campaign.js`; `src/game-scene.js` draws an expanding ring + stars; add `sfx.bonk` in `src/audio.js`; one Stage 1 `stagePrompt()` hint in `src/hud.js` the first time an enemy is in bonk range.
- Effort: M · Priority: P1

**7. Hurt feedback: red vignette pulse + controller/phone-safe rumble substitute**
- Why: `hurtBob()` only plays `sfx.hurt`; on a bright phone screen a lost heart is easy to miss mid-pack.
- Implementation: on the `hurt` event in `src/game-scene.js`, brief red edge vignette via `this.g` overlay + `cameras.main.shake(120, .004)`; optional `navigator.vibrate(30)` guarded behind coarse-pointer + a settings flag in `src/save.js`.
- Effort: S · Priority: P1

**8. KO feather burst scaled by enemy size; Papacito KOs get hearts**
- Why: BUILD-PLAN §4.2 promises feather bursts and heart/feather Papacito deaths; today every KO is the same 15 beige dots.
- Implementation: `src/game-scene.js` `ko` handler: branch on `data.source` (`bob`/`papi`/`dad`, already recorded by `recordKo()`), feather-white for gun, pink hearts for `papi`, star splat for `dad`; count scales with `e.boss`.
- Effort: S · Priority: P2

**9. Slow-mo beat on boss phase gates and the Papacito finisher**
- Why: phase gates (`bossPhaseFor` 66%/33%) and the finisher are the campaign's biggest beats but play at full speed under a banner.
- Implementation: add a `slowmo` timer to `Campaign.update()` (dt × 0.35 for ~0.5 s) triggered in `hit()` on `result.phase` and in `usePapi()` on `result.finisher`; `src/fx.js` already has a `slowmo` concept to mirror. Guard bot determinism in `tests/campaign-sim.test.mjs`.
- Effort: M · Priority: P2

**10. "GO →" travel beats: ambient props and a running start between zones**
- Why: the 80 px walk-ups between 1280 px arenas are dead air; free-roam is where the left-third scroll should feel like a journey.
- Implementation: scatter non-interactive mid-plate props in `src/backdrop.js`/`src/parallax.js` keyed to zone gaps in `stage*-def.js`; keep `moveBounds()` left-third rule (`src/camera.js`) unchanged; Bob keeps walk speed (no run state — locked scope).
- Effort: M · Priority: P2

**11. Breakable crates that drop shakes (RWB prop pattern, not a shop)**
- Why: shake economy currently comes only from guards and scripted trios, so PAPI charge pacing is entirely designer-fixed; crates add player agency without any upgrade shop.
- Implementation: crate entities in `stage*-def.js` zone data, hittable via the `stepShot` target list in `src/eggplant.js`, drop logic beside the guard drop in `recordKo()`; texture from `src/crate-texture.js` (already in tree). Sim test in `tests/stage1-sim.test.mjs`.
- Effort: M · Priority: P2

**12. Grab-mash should feel physical: shake Bob, rattle the ring, escalate pitch**
- Why: the Lecturer grab is a HUD ring and a counter; Bob stands still while "held," which undercuts the intervention joke.
- Implementation: in `src/game-scene.js`, jitter the Bob view ±3 px while `state === 'grabbed'`, scale the `mashRing` (`src/hud.js`) with each press, pitch-rising `sfx` ticks in `src/audio.js`; keep `MASH_NEED = 6` and Story auto-mash (`src/bob.js`) untouched.
- Effort: S · Priority: P2

---

## 2. Difficulty / length

**13. Make Nightmare bot-clearable (fix the S2/S3 zone-5 snowball wall)**
- Why: `docs/LENGTH-DIFFICULTY.md` records Nightmare as not bot-clearable (S2/S3 zone 5 wave 2); an unlockable difficulty nobody — bot or human — can finish is a broken promise.
- Implementation: thin overlapping ranged attackers in `src/stage2-def.js`/`src/stage3-def.js` zone 5 (stagger delays so ≤2 snowballs are in flight per lane), verify with `node tools/bot-sim.mjs nightmare` and add a Nightmare floor to `tests/length-difficulty.test.mjs`.
- Effort: M · Priority: P0

**14. Per-difficulty bot gates so length can't silently regress again**
- Why: the rebuild proved clear times drift 4× without a tripwire; current floors only pin Adventure.
- Implementation: extend `tests/length-difficulty.test.mjs` with Story (≥300 s campaign, ≤2 bot deaths) and Nightmare (clears, ≥ Adventure hits) bands driven by `tools/bot-sim.mjs` at 60 Hz; document bands in `docs/LENGTH-DIFFICULTY.md`.
- Effort: S · Priority: P1

**15. Zone-clear full heal is too generous on Adventure/Nightmare**
- Why: `Campaign.update()` sets `bob.hp = bob.maxHp` on every zone clear (15× per stage), so chip damage never accumulates into tension.
- Implementation: heal +1 heart on zone clear (Adventure/Nightmare), full heal only on Story and at boss checkpoints; knob in `src/difficulty.js` (`zoneHeal`), applied in the zone-clear branch of `src/campaign.js`; re-run bot bands (item 14).
- Effort: S · Priority: P1

**16. First-run Story assist: wider grab grace and slower first charger**
- Why: Story is the fresh-phone default, but its only assists are pace/damage/grace scalars; the first grab and first rush still arrive at full lesson speed.
- Implementation: in `src/yettis.js`, scale the first charger telegraph and first lecturer grab wind-up per stage by 1.3× on Story only (track "seen" flags on `Campaign`); assert in `tests/stage1-sim.test.mjs`.
- Effort: S · Priority: P2

**17. Death keeps progress — but price it in score, not silence**
- Why: "lose a life, keep progress" (wave/boss-HP retention in `respawn()`) is bot-required, yet dying is currently free for humans, which flattens stakes.
- Implementation: −10% score (floor at stage-start score) in `Campaign.respawn()`, shown on the checkpoint banner; persist nothing new in `src/save.js`; cover in `tests/campaign-sim.test.mjs`.
- Effort: S · Priority: P2

**18. Mid-stage breather tuning: one low wave after each zone 3**
- Why: zones 4–5 escalate monotonically to 5–6-enemy mixed waves; RWB pacing breathes between peaks, and 150–220 s stages need a valley.
- Implementation: retune one wave per stage in `stage*-def.js` (zone 4 wave 1 → 2 light enemies + a crate/shake per item 11); confirm stage bot times stay inside 140–240 s via `tests/length-difficulty.test.mjs`.
- Effort: S · Priority: P2

**19. Boss add-pressure cap tied to Bob's hearts (rubber-band, invisible)**
- Why: phase-3 adds (`BOSS_ADDS`, `WINGMAN_ADDS` topped up every 9 s) can stack with boss attacks into unavoidable hits at 1 heart.
- Implementation: in `Yetti.update()` add-timer and `Wingmen.update()`, skip a top-up while `world.bob.hp === 1` on Story/Adventure (Nightmare exempt); sim-assert add counts in `tests/wingman-sim.test.mjs`.
- Effort: S · Priority: P2

**20. Shake-economy audit per stage (target ≈1.5 PAPI/min, measured not vibes)**
- Why: PAPI frequency swung from 2.9/min to ~1.5/min in the rebuild by removing trios; nothing measures it per stage today.
- Implementation: add shake/PAPI counters per stage to `Campaign.stats`, print them from `tools/bot-sim.mjs`, and add a soft band (1.2–1.8/min Adventure) to `tests/length-difficulty.test.mjs`; retune guard counts in `stage*-def.js` only if a stage falls out of band.
- Effort: S · Priority: P1

**21. Human pacing pass: timed phone playthroughs recorded in LENGTH-DIFFICULTY.md**
- Why: every length number is bot sim-seconds; `plan/STATUS.md` still lists human pacing and a real-device video as unverified.
- Implementation: no code — 3 timed Story + Adventure phone runs logged in `docs/LENGTH-DIFFICULTY.md` (device, stage times, deaths, where thumbs tired); feed findings into items 13/15/18 before any further wave edits.
- Effort: M · Priority: P1

---

## 3. Enemies / Yettis

**22. Replace the six silhouette Yetti atlases with real role art**
- Why: hover, charger, choir, lecturer (plus both mini-bosses and the Wingman) are 860×180 teal/purple placeholder pages; half the cast reads as debug shapes next to finished Bob/walker/guard.
- Implementation: Game Art frames per BUILD-PLAN §5.1 (720×600, baseline 570) packed by `tools/pack-flat.py --only yetti_hover,yetti_charger,yetti_choir,yetti_lecturer` (+ `tools/compress-ktx.py`); keep `TYPES` art keys in `src/yettis.js`; watch the <20 MiB / KTX budgets in `docs/GPU-MEMORY.md` and `tests/atlas-spec.test.mjs`.
- Effort: L · Priority: P0

**23. Per-role animation states in the view layer (fly, rush, sing, grab, hold)**
- Why: `game-scene.js` collapses most states to `attack/walk/idle` with a fragile fallback chain, so even correct atlases will mis-animate (Level-1 fixed Stage 1 mapping only partially).
- Implementation: explicit state→anim table per type in `syncViews()` (hover `fly/shoot`, charger `telegraph/rush`, choir `sing`, lecturer `grab/hold`, bosses `roar/slam/ring`); static cross-check test: every requested suffix exists in each `*.anims.json` (extend `tests/atlas-spec.test.mjs`).
- Effort: M · Priority: P0

**24. Choir buff readability: music notes + aura ring + buffed-enemy tint pulse**
- Why: the 300 px / ×1.28 buff (`choirMultiplier`) is invisible; "kill the choir first" can't be learned from what the screen shows.
- Implementation: `src/game-scene.js` `effects()`: dashed 300 px ring under a singing choir/choirmaster, floating note glyphs, golden edge pulse on buffed enemies (compute via exported `choirMultiplier` in `src/yettis.js`).
- Effort: M · Priority: P1

**25. Hover: brighter shadow-lane ring and a swoop tell**
- Why: straight-fire vs a flyer only works if the shadow lane is unmistakable (BUILD-PLAN risk); the current 90×20 ellipse is faint over busy plates.
- Implementation: thicken/pulse the hover shadow ellipse in `effects()`, add a 0.3 s dip (`z` 65→40) before its snowball in `Yetti.update()` telegraph so the shot has a visible wind-up; hit lane stays `gy` (locked).
- Effort: S · Priority: P1

**26. Guard: shield crack stages for the 3-chip fallback**
- Why: frontal chips silently count to 3 (`shieldHits`) before breaking; players get no progress feedback and assume shots do nothing.
- Implementation: crack lines on the shield ellipse in `effects()` at `shieldHits` 1/2, brighter clang (`sfx.clang` pitch up) per chip in `src/audio.js`; logic unchanged in `Yetti.takeHit()`.
- Effort: S · Priority: P1

**27. Charger: ground scuff + lane scorch during telegraph/rush**
- Why: the rush lane is shown as a flat pink rect; a scuffed-earth trail would teach "this exact lane is death" faster on a small screen.
- Implementation: in `effects()` telegraph branch, darken the rush strip, spawn dust at the charger's feet while `state === 'rush'`, and leave a 1 s fading scuff quad; timings (`0.72/pace`) untouched.
- Effort: S · Priority: P2

**28. Lecturer: pointer-slap wind-up so the grab never feels teleporty**
- Why: the grab resolves at telegraph end if Bob is within 95 px; without a reaching pose it reads as a vacuum.
- Implementation: lecturer/interventionist `grab` anim starts at telegraph start (item 23 mapping), lunge 20 px toward `attackX` in `Yetti.update()` on resolve; keep the exact `This is an intervention.` voice trigger (`world.emit('voice', ...)` already in `src/yettis.js`).
- Effort: S · Priority: P2

**29. Enemy separation: stop Yettis stacking into one sprite**
- Why: walkers converge on the same `pref` distance and overlap into an unreadable blob that also eats eggplants for the pack behind it.
- Implementation: cheap separation pass in `Campaign.update()` after enemy updates (push apart same-lane enemies <46 px, bosses exempt); determinism-safe fixed order by `actorId`; cover in `tests/yettis.test.mjs`.
- Effort: M · Priority: P1

**30. Spawn-in flourish: feather poof + drop shadow grow (no pop-in)**
- Why: staggered/flank spawns (`spawnWave` L-side at `zone.l + 70`) pop into existence at Bob's back, which feels cheap rather than surprising.
- Implementation: 0.25 s spawn-in state in `Yetti` (non-hittable, `canBeHit` false, no attacks) with a poof in `game-scene.js`; L-side spawns also get an off-screen wing-flap `sfx` cue. Wave timing tests updated in `tests/campaign-sim.test.mjs`.
- Effort: M · Priority: P1

**31. Wingman phase 2: travel to the dive spot instead of teleporting**
- Why: `Wingman.update()` sets `x/y` directly to `attackX/attackY` on dive — the boss vanishes and lands, so the 0.7 s shadow telegraph teaches nothing about where he came from.
- Implementation: interpolate position + `z` arc over the telegraph in `src/wingman.js` (keep the landing ellipse telegraph in `effects()` and `THE FLOOR LEFT THE CHAT.`); update `tests/wingman-sim.test.mjs` position assertions.
- Effort: M · Priority: P1

**32. Wingman volley: vary the safe band pattern; Choirmaster moves his pulpit**
- Why: `safeBand = volley++ % 3` is a perfectly predictable rotation, and the Choirmaster (`speed: 0`) is a stationary turret for a 52 s bot fight — longer for humans.
- Implementation: seeded safe-band sequence (never the same band 3× running, never Bob's band twice after a hit) in `src/wingman.js`; Choirmaster side-steps between volleys in `Yetti.update()` (slow drift toward lane center of remaining adds). Keep phase HP/banners identical.
- Effort: M · Priority: P2

---

## 4. Bob

**33. Jump, dash, and grabbed animation states for Bob**
- Why: `syncViews()` maps dash→walk, dead→knockdown, and has no jump/grabbed pose; Bob is the most-watched sprite and his airtime currently plays walk/idle.
- Implementation: request 3 new mini-anims in the Bob sheet (jump 3f, dash 2f, grabbed-struggle 2f) via Game Art/`FPS.md`, pack with `tools/pack-flat.py --only bob`, map in the Bob branch of `syncViews()`; no physics changes in `src/bob.js`.
- Effort: M · Priority: P1

**34. Facing snap: brief turn skid instead of instant flip**
- Why: `view.face(model.facing)` flips instantly; with flank spawns Bob flip-flops every few frames while the bot/human retargets.
- Implementation: purely visual 80 ms skid (squash + dust) when `facing` changes while moving, in `src/game-scene.js`; sim `facing` logic in `src/bob.js` untouched.
- Effort: S · Priority: P2

**35. Low-health state: drooped idle, heartbeat vignette, heavier breathing SFX**
- Why: at 1 heart Bob looks and sounds identical to full health; the HUD hearts are small on a phone.
- Implementation: tint/posture swap at `bob.hp === 1` in `syncViews()` (use hurt frame as idle base until real art), pulsing vignette in `effects()`, heartbeat loop gated in `src/audio.js`.
- Effort: M · Priority: P1

**36. Respawn entrance: "I'm back, baby!" gets a pose, not a blink-in**
- Why: `respawn()` teleports a fresh Bob with 2 s i-frames; the flashing alpha reads as a glitch, not a comeback.
- Implementation: spawn poof + 0.4 s `getup` anim + expanding ring in `game-scene.js` on Bob-view recreation; keep `bob_respawn_01` (`I'm back, baby!`) exactly as-is.
- Effort: S · Priority: P2

**37. Idle personality barks on a timer (wire the orphaned barks module for Bob)**
- Why: Bob is silent between scripted lines; his best jokes (`Where is Claudia???`) are registered but never triggered anywhere.
- Implementation: see item 62 (the `src/barks.js` wiring); Bob-specific half: `barkWhere` while free-roaming, `barkCory` rare roll — lines and IDs unchanged from `src/voice-lines.js`.
- Effort: S · Priority: P1

**38. Victory pose + Claudia freed beat at stage 3 clear (in-engine)**
- Why: `finishStage()` kills all enemies and shows a banner; Claudia's cage (drawn in `game-scene.js` create) never opens in-engine before the video.
- Implementation: on `clear` event stage 3: cage bars fade, Claudia swaps to `freed` anim, Bob plays `victory`/idle toward her for the 2.5 s `clearTimer`; then the `rescue_2` clip (item 74) plays as today.
- Effort: M · Priority: P2

**39. Footstep timing locked to walk-cycle frames**
- Why: no footstep audio exists; the 12-frame walk at 18 fps sliding silently over streets/clouds/stone undersells three distinct stages.
- Implementation: per-stage step `sfx` (street/cloud puffs/stone) fired on walk-frame indices from `syncViews()`, volume scaled by quality tier; files registered like other `sfx` in `src/audio.js`.
- Effort: S · Priority: P2

**40. Bob hurt voices wired to the hurt event (they exist and never play)**
- Why: `bob_hurt_01..03` (`Oof!`/`Ow!`/`Ugh!`) are in `PRESENT` with mp3s on disk, but `hurtBob()` only emits `hurt` → `sfx.hurt`.
- Implementation: in `Campaign.hurtBob()` emit a rotating hurt voice ID (shuffle bag, 0.8 s min gap), knockdown uses `Ugh!`; assert rotation in `tests/bob.test.mjs`.
- Effort: S · Priority: P1

---

## 5. Dad call-in

**41. Wire `playDadCall()` into the Dad flow (it is currently dead code)**
- Why: `src/dad-call-cutscene.js` is a complete RWB-style port (bag, pause, abort) but `Campaign.useDad()` spawns the in-engine `Dad` directly — Jason's locked "cutscene on call, then wipe" does not happen.
- Implementation: in `game-scene.js`, intercept the `dad` event: if `playDadCall(scene, then)` returns true, hold the campaign's Dad resolution until clip end (freeze via existing `setPauseReason('cutscene')` + `dad.update` gate), else run today's in-engine path; `?nocutscenes=1`/bot behavior unchanged. Test the branch in `tests/dad-call.test.mjs` with a stub player.
- Effort: M · Priority: P0

**42. Produce and ship rotating Dad clips D1–D3 (clean-shaven, original design)**
- Why: `DAD_CLIPS = ['D1']` points at `assets/cutscenes/dad/` which has no files in `ASSETS-LISTING.txt`; even wired, the cutscene 404s to the fallback every call, and a single clip can't rotate like Rand/Mat.
- Implementation: 3 silent-or-voiced 5–8 s 960×540 clips (Grok Imagine per BUILD-PLAN §5.3) of clean-shaven Dad with the BDB swatter — original design, **not** from the photo until Jason confirms consent; land as `assets/cutscenes/dad/D1..D3.mp4` + posters, extend `DAD_CLIPS`, keep `maxMs: 11000`; the shuffle bag (`createDadBag`, sessionStorage) already prevents repeats.
- Effort: L · Priority: P0

**43. Catchphrase lands on the swat impact frame, not on button press**
- Why: `useDad()` emits `dad_catchphrase` immediately, ~0.9 s before `DAD_TIMING.impact`; the line `Son, sometimes you just need to use the fly swatter to keep the women away!` should punctuate the wipe.
- Implementation: move the voice emit into the `Dad.update()` resolve callback in `Campaign.update()` (and to the matching beat when the video path in item 41 resolves); caption via existing `say()`/`speakerColor` (Dad gold).
- Effort: S · Priority: P1

**44. Dad entrance variety: rotate `dad_call_01..03`, exit lines `dad_done_01/02`**
- Why: five rendered Dad mp3s exist and none ever play; every call currently reuses the catchphrase alone, which will wear out fast at 3 calls/campaign.
- Implementation: shuffle-bag picker in `Campaign.useDad()` (enter line) and on `dad.gone` (exit line), catchphrase reserved for the impact (item 43); all texts stay exactly as in `src/voice-lines.js`.
- Effort: S · Priority: P1

**45. Distinct refusal feedback per `refuseReason` (stop abusing the coffee break)**
- Why: every refusal (empty screen, boss-invulnerable, phase cap, spent) banners `DAD'S ON HIS COFFEE BREAK.` and Bob's `Dad! Now!` (`bob_dadwait_01`) never plays; players can't learn the 10-KO/45 s rule.
- Implementation: map `refuseReason` results (`src/dad-call.js`) to specific banners in `Campaign.useDad()` (`NO TARGETS`, `BOSS IS UNTOUCHABLE`, `DAD ALREADY SWATTED THIS PHASE`, recharge shows KOs remaining) + `bob_dadwait_01` on `spent`; keep the Stage-1 `DAD ARRIVES IN ZONE 3.` special case. Extend `tests/dad-call.test.mjs`.
- Effort: S · Priority: P1

**46. Second swat for crowded screens (the plan promised two) — not in v1**
- Why: an early BUILD-PLAN draft specified 2 overhead swats. The packed atlas is one swat, and `dad.js` plays that single 8-frame swat. v1 does not add a second.
- Implementation: do not loop the swat. Tests in `tests/dad-call.test.mjs` pin enter 6@12, swat 8@16, exit 6@12.
- Effort: M · Priority: P2

**47. Dad targets the densest cluster, not just `bob.x + 150`**
- Why: `standX` is fixed relative to Bob, so Dad often swats air beside the pack he just wiped — the effect lands but the picture doesn't.
- Implementation: in `useDad()`, pick the median x of visible hittables as `standX` (clamped to screen), pass to `new Dad(...)`; freeze the choice at call time for determinism.
- Effort: S · Priority: P1

**48. Swat aftermath: flattened "like flies" splat decals + star KO pose**
- Why: BUILD-PLAN wants regulars swatted "like flies" (cartoon splat, no gore); today Dad KOs use the generic particle puff and bodies vanish.
- Implementation: `recordKo(e, 'dad')` already tags the source — `game-scene.js` `ko` handler leaves a 3 s star-splat decal at each Dad KO and plays `knockdown` flattened (scaleY 0.6) for elites put `down` by `callEffect()`.
- Effort: S · Priority: P2

**49. Dad meter: show KOs and seconds as two pips filling, not tiny text**
- Why: recharge needs both 10 KOs and 45 s (`tickDadCall`), but the HUD renders it as 15 px text (`3/10 · 22s`) that no phone player will parse mid-fight.
- Implementation: graphical two-segment pip beside the DAD touch button in `src/hud.js` (KO fill + time ring), pulse at `READY`; keep the text for desktop. Rules in `src/dad-call.js` unchanged.
- Effort: M · Priority: P1

---

## 6. Art

**50. Final Dad sprite pass: clean-shaven check, readable BDB swatter at phone size**
- Why: Jason locked clean-shaven Dad with a giant legible "BDB" swatter; at 0.52 view scale the engraving and face must survive a phone screen, and likeness is original-design until photo consent is confirmed.
- Implementation: Game Art revision of the `dad` enter/swat/exit frames (6/8/6 per `DAD_ANIMS` in `src/dad.js`); repack via `tools/pack-flat.py --only dad` + KTX; verify legibility at 390 px-wide screenshot; drop the procedural paddle fallback in `game-scene.js` `effects()` once `dad_swat` is final.
- Effort: M · Priority: P0

**51. Real paintings for the 8 derived mid plates (`mid3..mid5` per stage)**
- Why: `docs/LENGTH-DIFFICULTY.md` flags `s{1,2,3}-mid3..5` as mirrored/zoomed/regraded derivatives (`tools/derive-plates.py`); zones 4–5 and the boss currently fight in visibly recycled rooms.
- Implementation: 8 new 1280-wide plates dropped into `assets/bg/` with the same keys (`STREAMS` in `src/zone-stream.js`); keep the readable MOTEL sign decision for `s1-mid5`; no code change beyond assets + contact screenshots.
- Effort: L · Priority: P1

**52. Foreground parallax layer (lamp posts, columns, rubble) for depth**
- Why: the backdrop is far + mid + floor only; a near layer scrolling past the lane is the cheapest way to sell the left-third scroll and stage identity.
- Implementation: add a `fore` TileSprite at scrollFactor 1.15, depth above floor but below actors, in `buildParallax()` (`src/parallax.js`) / `src/backdrop.js`; sparse dark silhouettes per stage in `STREAMS`; governor-hideable (item 90).
- Effort: M · Priority: P2

**53. Eggplant projectile sprite with spin (replace the procedural ellipse)**
- Why: the signature weapon is drawn as two ellipses and a triangle in `effects()`; it deserves a real 3-frame spinning sprite with a motion streak.
- Implementation: small prop atlas (eggplant, snowball, halo, shockwave, shake) loaded beside char pages in `src/assets.js`; `effects()` swaps Graphics shapes for pooled sprites keyed to `world.projectiles`/`hostile`.
- Effort: M · Priority: P1

**54. Hostile readability set: snowball vs halo vs shockwave silhouettes**
- Why: all three hostiles are the same stroked ellipse in different tints; at Nightmare density they must be distinguishable by shape, not color alone (colorblind-safe too).
- Implementation: distinct sprites from the prop atlas (item 53): round snowball with trail, flat rolling halo ring, wide low shockwave bar; hit tests in `Campaign.update()` unchanged.
- Effort: M · Priority: P1

**55. Protein shake pickup: bobbing bottle + glow + magnet shimmer**
- Why: shakes are 24×32 procedural rects that blend into plates; missing a shake costs a PAPI charge, so pickups must shout.
- Implementation: sprite + sine bob + pulsing glow in `effects()`/prop pool; small attraction radius visual only (pickup test stays 55×48 in `src/campaign.js`).
- Effort: S · Priority: P1

**56. Claudia: real caged/freed art and a portrait (currently tinted silhouette)**
- Why: Claudia is a 368×168 placeholder page tinted pink in `game-scene.js`; she is the goal of the game and invisible as a character until the final video.
- Implementation: Game Art `claudia` idle-caged 4f + freed 4f + 256×256 portrait (BUILD-PLAN §5.1/5.2), repack, remove the `0xffb4d7` tint, keep her in `STAGE_CHARS[3]` (`src/stages.js`).
- Effort: M · Priority: P1

**57. Papacito runners: 4 tasteful variants with real run cycles**
- Why: `papi_runners` is a single 644×168 placeholder page; the screen-wipe set piece (10 runners × 2.5 s) currently repeats one silhouette.
- Implementation: 4 fully-clothed adult variants per the §4.3 tasteful brief (sundress, salsa outfit, tracksuit, bride/grandma gag), 8f runs; `src/papacito-fx.js` assigns variants round-robin; Muse/Argon tasteful check per BUILD-PLAN Step 3/5 gates.
- Effort: L · Priority: P1

**58. Boss portrait cards on intro (Interventionist, Choirmaster, Wingmen)**
- Why: bosses arrive with a text banner only; RWB-style portrait + name slam makes each of the 3 boss gates feel like an event.
- Implementation: 256×256 portraits in the prop/UI set; `src/hud.js` shows a 1.2 s intro card on the `boss` event (pause sim via existing `hitStop`-style freeze or `clearTimer` pattern — pick freeze in `Campaign.startBoss()`).
- Effort: M · Priority: P2

**59. Stage title cards as painted plates, not HUD text**
- Why: chapter titles render as small Arial text pinned in the backdrop (`buildParallax` title at alpha 0.55) plus a banner; first impressions of each world deserve the packet's chapter-card energy.
- Implementation: painted card per stage key shown full-screen 2 s on stage entry (skippable tap), sequenced after any entry cutscene in `src/main.js`/`game-scene.js`; keep `nar_ch{1,2,3}` voice over it.
- Effort: M · Priority: P2

**60. Contact-sheet + in-game screenshot review pack per art drop**
- Why: art has repeatedly landed without visual QA in-engine (tints, scale 0.38 pack vs 0.42–0.54 view scales, the known `yetti1_attack_05` fist clip).
- Implementation: `tools/import-art` step (BUILD-PLAN 6.1) writes `docs/contact/<key>.png` and three `tools/browser-smoke.mjs` captures per stage into `docs/shots/`; checklist added to `docs/ASSET-NOTES.md`.
- Effort: S · Priority: P1

---

## 7. Audio / voice

**61. Reconcile `PRESENT` against files on the asset box (two IDs have no mp3s)**
- Why: `src/voice-lines.js` `PRESENT` claims `yetti_colombian_room_01/02` and `yetti_purple_car_01/02`, but `ASSETS-LISTING.txt` has no such mp3s (only `yetti_porkchop_*`); `tests/media.test.mjs` asserts every `PRESENT` file exists on the dev tree where assets live.
- Implementation: render the 4 missing Yetti lines (texts locked: `Stay away from the Colombians room.` and `Bob why is your car purple?` — see item 63 on caption drift) into `assets/audio/voice/`, or drop them from `PRESENT` until rendered so `setVoiceFiles()` stops promising files; verify on the asset box.
- Effort: S · Priority: P0

**62. Wire `src/barks.js` into the campaign (module exists, zero callers)**
- Why: cooldown logic for `Where is Claudia???` (18 s), the Cory joke (55 s / 8%), and three Yetti cycles (7 s) is written and unit-testable, but nothing imports it — the game's funniest ambient layer is silent.
- Implementation: instantiate `createBarks()` in `Campaign` constructor; call `barkWhere` in free-roam, `barkCory` on zone clear, `barkYettiWave` in `spawnWave()`, `barkYettiAttack` on first telegraph per cooldown, `barkYettiTaunt` on Bob hurt; emit via existing `voice` events. New `tests/barks.test.mjs` for cooldowns with seeded RNG.
- Effort: M · Priority: P0

**63. Caption-vs-locked-line audit (Colombians room / purple car drift)**
- Why: locked verbatim lines are `Stay away from the Colombians room.` and `Bob why is your car purple?`, but `voice-lines.js` captions read `Stay away from the Colombian's room!` and `Bob, why is your car purple?` — captions must match what Jason locked and what the audio says.
- Implementation: diff every `LINES` caption in `src/voice-lines.js` against `docs/BOB-LINES.md` + the locked list; fix captions (not audio) to the locked wording, or get Jason's explicit pick where audio already differs; add a verbatim-lines test to `tests/media.test.mjs` (Dad catchphrase via `STORY.dad` is the pattern).
- Effort: S · Priority: P0

**64. Papacito audio stack: chorus + `I'm the Papacito!` + laugh, sequenced**
- Why: `usePapi()` emits only `bdb_laugh` (`Ha! Dead!`); `papi_chorus`, `bob_papacito_01/02`, and `bob_papi_01` (`Not now, ladies!`) never play, so the wipe is quieter than a normal KO chain.
- Implementation: in `usePapi()`/`game-scene.js` `papi` handler: `barkPapacito()` (already in `src/barks.js`) at trigger, `papi_chorus` layered as runners cross (`src/papacito-fx.js` start), `bob_papi_01` at the tail; finisher variant keeps `bdb_laugh`. Use the `say()` queue priorities in `src/audio.js`.
- Effort: S · Priority: P1

**65. Stage and boss music: replace the single `bdb-rise.mp3` placeholder**
- Why: `STAGE_MUSIC` maps 3 stages + 3 bosses, but the tree ships one track, so clouds, keep, and every boss share the boulevard loop for 9 minutes.
- Implementation: 6 loops (stage1/2/3 + boss1/2/3) at matched loudness/tempo, wired through `src/music.js` `MusicDirector`/`playTrack(stageN|bossN)` (already emitted by `game-scene.js`); add per-file existence to `tests/media.test.mjs`.
- Effort: L · Priority: P1

**66. Music intensity ducking: calm in free-roam, full in locked fights**
- Why: a flat loop at constant intensity fatigues across 150–220 s stages and fights the barks (item 62) for attention.
- Implementation: `MusicDirector` gain/filter states keyed to `Campaign.locked`/`bossActive` (expose via `perf` context already computed in `game-scene.js` update); duck −6 dB under voice `say()` in `src/audio.js`.
- Effort: M · Priority: P2

**67. Combat SFX differentiation per enemy role**
- Why: every hit is `sfx.hit(ko?)`; guards, hovers, and lecturers landing/dying identically wastes the role readability the art pass (item 22) buys.
- Implementation: role-flavored variants in `src/audio.js` `sfx` (shield clang exists; add choir note-break, hover wing-flap loop while alive, charger skid); trigger from existing `hit/ko/shield` events with `data` type plumbed from `Campaign.hit()`.
- Effort: M · Priority: P2

**68. Voice residency per stage (stop preloading nearly every line everywhere)**
- Why: `stageLines(n)` filters only `nar_ch*`, so `preloadClips()` decodes ~50 mp3s on every stage entry — decode hitches and heap on the phone for lines that stage never speaks.
- Implementation: real per-stage line sets in `src/voice-lines.js` (stage barks/intros/boss only + shared Bob/Dad core); `releaseClips` already runs on shutdown in `game-scene.js`; assert set sizes in `tests/media.test.mjs`.
- Effort: S · Priority: P1

**69. Loudness pass: normalize all voice mp3s to one LUFS target**
- Why: packet placeholders, ElevenLabs renders, and IndexTTS narrator lines come from three pipelines; phone speakers will bury the quiet third (audition `_raw/` files in `ASSETS-LISTING.txt` hint at many takes).
- Implementation: offline normalize script over `assets/audio/voice/*.mp3` (mono 64 kbps per BUILD-PLAN §5.4), report written next to `voice-manifest.json`; keep `_raw/` out of the shipped tree (item 99).
- Effort: M · Priority: P2

---

## 8. Cutscenes

**70. Play the kidnap sequence before Stage 2 (clips ship, hook doesn't)**
- Why: `STAGE_CLIPS.kidnap = [kidnap_1, kidnap_2]` and both mp4s exist, but nothing calls `story.play('kidnap')` — narratively Claudia is never stolen on screen (CUTSCENE-STEER asked for this hook).
- Implementation: in `game-scene.js` stage-transition path (where `stageNo` changes trigger `scene.restart`), or in `Campaign.loadStage` via a `cutscene` event: play `kidnap` once on entering stage 2 per campaign (respect `createSeen` in `src/cutscene.js`); `?nocutscenes=1` skips.
- Effort: S · Priority: P0

**71. Play `rescue_1` before the Stage 3 boss (same orphaned key)**
- Why: `rescue_pre_boss` ("Bob and Dad at the cloud fortress") is defined and on disk but unplayed; the Wingmen intro is only a banner + `wingman_council` line.
- Implementation: hook the `boss` event for stage 3 in `game-scene.js` to `story.play('rescue_pre_boss', …)` with the sim paused via `setPauseReason('cutscene')`; fall back to today's flow on skip/fail (CutscenePlayer already never blocks).
- Effort: S · Priority: P1

**72. Opening v3: finish the intro chain and retire the flag gracefully**
- Why: opening cutscenes v3 are in progress while the game still defaults to packet `opening` with `intro_v2` behind `?intro=v2` (`INTRO_V2` in `src/cutscene.js`, branch in `src/main.js:37`).
- Implementation: when Jason OKs v3, land it as the default `intro` key (keep `opening.mp4` file as rollback), make `?intro=v2` select the old v2 for comparison, and sequence `nar_intro_01..03` + `I brought the eggplant.` (`bdb_open`, currently unplayed) as captions/voice over the silent beats. Update `docs/CUTSCENE-STEER.md` status.
- Effort: M · Priority: P1

**73. Captions/subtitles for silent clips (kidnap/rescue are 6 s and mute)**
- Why: the Game Art clips are silent; on a muted phone the story beats (kidnap, fortress, freed Claudia) are pure pantomime.
- Implementation: timed caption overlays in `CutscenePlayer` (reuse HUD caption styling/`speakerColor`), lines drawn only from existing locked text (`nar_kidnap`, `claudia_open`, `claudia_leave`, Dad catchphrase where he appears); no new quoted lines invented.
- Effort: M · Priority: P1

**74. Victory chain: `rescue_2` → packet `victory` dialogue beat → score screen**
- Why: `STAGE_CLIPS.victory = ['rescue_2']` orphaned the packet `victory.mp4` and its `Is that what I think it is?` exchange (`claudia_question`/`bdb_produce` ids exist, unplayed).
- Implementation: Jason picks one: (a) `rescue_2` only + in-engine Claudia/Bob voice beat (item 38), or (b) `['rescue_2', 'victory']` chain; either way wire `claudia_question` → `Die, Yetti, die!` is wrong context — use `claudia_leave` + `nar_victory` (both unplayed today) over the tail. Remove the losing file from `PRESENT`-style checks.
- Effort: S · Priority: P1

**75. Poster frames for every clip (media test expects `.jpg` per clip)**
- Why: `tests/media.test.mjs` requires `assets/cutscenes/<clip>.jpg` for every `STAGE_CLIPS` entry; `ASSETS-LISTING.txt` has posters only for `opening` and `victory` — kidnap/rescue/intro_v2 start on black.
- Implementation: ffmpeg first-frame extracts (the packer already does this where available, per README) for `kidnap_1/2`, `rescue_1/2`, `intro_v2`, and future `dad/D1..D3`; verify on the asset box where files live.
- Effort: S · Priority: P1

**76. Skip affordance teaching: persistent "TAP TO SKIP ▶▶" + hold-to-skip on repeat views**
- Why: skippability exists (`SKIP_ACTIONS`, touch hint inside the player) but first-time phone players sit through `opening` unsure the game has started.
- Implementation: keep the existing hint; for clips in `createSeen`, allow any-touch instant skip with the 450 ms `GUARD_MS` reduced; first view keeps tap-to-skip armed after guard. No change to `?nocutscenes=1`.
- Effort: S · Priority: P2

**77. Chapter-select should not replay long intro chains**
- Why: starting at chapter 2/3 from the title currently plays `intro` (main.js plays it before every `scene.start`), then dumps the player mid-story.
- Implementation: in `src/main.js` `begin()`, play `intro`/`intro_v2` only for chapter 1 / fresh campaign; later chapters play their title card (item 59) + `nar_ch{n}` only. Demo (`?demo=1&stage=`) unaffected.
- Effort: S · Priority: P2

---

## 9. UI / UX

**78. Icon HUD: replace text glyphs (♥ ▰) with art + big touch-button states**
- Why: hearts, shake segments, and PAPI/DAD charges are 15–27 px text inside a 116 px black bar; on a phone the two super moves must read at a glance from the buttons themselves.
- Implementation: heart/shake/PAPI/DAD icons in `src/hud.js` (Phaser images from the UI set, item 58's pipeline); `#tbPapi/#tbDad` buttons keep the count but gain a `ready` glow class driven by the existing DOM sync at the end of `HUD.update()`; `index.html` CSS only.
- Effort: M · Priority: P0

**79. Boss bar: per-Wingman bars with phase ticks and 1 HP finisher pulse**
- Why: the HUD sums all boss HP into one bar, so in phase 3 players can't tell which Wingman still needs weakening — the exact information the finisher requires.
- Implementation: in `HUD.update()` draw one bar per alive boss with 66%/33% tick marks (`BOSS_GATES` from `src/yettis.js`); at `hp <= 1` pulse the bar gold and mirror `stagePrompt()`'s `PRESS PAPI TO FINISH` state.
- Effort: M · Priority: P1

**80. Off-screen enemy indicators for left-flank spawns**
- Why: `L`-side entries step in at `zone.l + 70`, which can sit behind the left-third camera edge; Bob gets hit by an enemy the player never saw arrive.
- Implementation: edge chevrons in `src/hud.js` for alive enemies outside `[camX, camX + 1280]`, colored by role, hidden during boss fights with adds capped (item 19). Pairs with the spawn poof (item 30).
- Effort: M · Priority: P1

**81. Score popups and a running KO/combo counter**
- Why: score (300/KO, 500/PAPI kill, 4000 finisher) is computed silently; floating numbers are the cheapest arcade juice and teach the PAPI economy's value.
- Implementation: pooled text popups from `ko`/`papi` events in `game-scene.js` (cap 12 live, governor-scalable); combo = KOs within 3 s tracked presentation-side only (no sim/score change).
- Effort: M · Priority: P2

**82. Pause menu: resume, restart stage, chapter select, mute, quality readout**
- Why: pause is a banner word (`PAUSED`) over a frozen scene; phone players who pocket the phone need obvious waypoints back, and mute currently has no in-game surface.
- Implementation: DOM overlay beside the title/victory panels in `index.html`, wired through `setPauseReason('manual')` in `game-scene.js`; actions reuse `scene.restart` / title flow / `isMuted` toggle in `src/audio.js`.
- Effort: M · Priority: P1

**83. Settings persistence: auto-fire, vibration, captions size**
- Why: `save.js` already persists `autoFire`, but there is no settings surface to flip it (or future toggles) without editing localStorage.
- Implementation: settings block on the title screen (`src/main.js` title scene + `index.html`), persisted through `normalizeSave/persistSave` in `src/save.js`; auto-fire keeps its locked straight-only semantics in `Campaign.update()`.
- Effort: M · Priority: P2

**84. First-session tutorial extends to zones 4–5 and both later stages**
- Why: `TUTORIALS` covers Stage 1 zones 1–3 on the first run only (`bestScore === 0`); new mechanics in later stages (lecturer density, choirmaster volleys, Wingman bands) get no teaching at all.
- Implementation: per-stage first-encounter prompts keyed like `seenTutorials` in `Campaign.spawnWave()` + `stagePrompt()` rules in `src/hud.js` (halo safe-band, dive shadow, finisher); store "seen" per save in `src/save.js` so chapter-select restarts don't reteach.
- Effort: M · Priority: P1

**85. Death screen beat: what killed you + one-line tip before respawn**
- Why: death cuts straight to `CHECKPOINT: EGO INTACT`; a 1 s "RUSHED BY A CHARGER — JUMP THE RED FLASH" card turns every death into a lesson.
- Implementation: record last damage source in `hurtBob(charger)`/hostile hits (`src/campaign.js`), show tip text during the existing 1.1 s `dead` state (`src/bob.js`) via `HUD.banner`; no timing changes.
- Effort: S · Priority: P1

**86. Accessibility: caption size/background, reduce-flash, colorblind telegraphs**
- Why: telegraphs are red-on-plates, Dad hits flash full-screen (`cam.flash`), and captions are fixed 20 px — three cheap settings cover most phone accessibility complaints.
- Implementation: `reduceFlash`/`captionScale` flags in `src/save.js`; `game-scene.js` honors reduce-flash, `HUD.say()` scales captions with a dark backing strip, telegraphs gain a striped pattern overlay (shape, not just hue — pairs with item 54).
- Effort: M · Priority: P2

---

## 10. Mobile performance

**87. Real-device iPhone p95 gate (the number that has never existed)**
- Why: `plan/STATUS.md` and BUILD-PLAN 6.6 both gate on fight p95 ≤16.7 ms on hardware; every measurement so far is SwiftShader, which proves nothing about Safari.
- Implementation: run `?demo=1` Adventure on a recent and an older supported iPhone, capture `window.__bdbPerf.report()` (`src/perf.js` `fightGate`), record renderer/RS/quality in `docs/GPU-MEMORY.md` next to the texture table; fix by items 88–90 before any visual additions.
- Effort: M · Priority: P0

**88. Kill the per-frame Graphics redraw (pool sprites for projectiles/hostiles/FX)**
- Why: `effects()` clears and redraws every ellipse, HP bar, and telegraph through one `Graphics` object every frame — the known Phaser-on-mobile hot path, worst exactly when 6 Yettis + volleys fill the screen.
- Implementation: pooled sprites for projectiles/hostiles/pickups (items 53–55 art doubles as the fix), HP bars as cropped sprite pairs, telegraphs as tinted zone quads toggled visible; keep `Graphics` only for the cage/mash ring. Re-measure with item 87.
- Effort: L · Priority: P0

**89. Fighter view pooling instead of create/destroy per spawn**
- Why: `syncViews()` constructs a new `Fighter` (sprite + shadow) for every `spawnYetti` and destroys it on death — ~190 allocations per campaign, each mid-fight.
- Implementation: per-atlas view pools in `game-scene.js` (reuse hidden views, reset via `Object.assign` as today); Dad view already follows this pattern. Watch `releaseChars` interplay in `src/assets.js` on stage switch.
- Effort: M · Priority: P1

**90. Reconcile the quality governor with BDB's actual scene API**
- Why: `installGovernor` (`src/quality-governor.js`) steps `st.fx.quality`, `st.setBloom()`, `st.snowFront`, `st.setBackdropLit()`, `st.kit`, `st.runId` — RWB stage API that BDB's `GameScene` does not expose (it has `backdrop`, `particles`, `papiFX`); tiers risk no-op or throw on the exact slow phones that need them.
- Implementation: implement the governor contract on `GameScene` (`runId`, particle-count scaling in `effects()`/`handleEvents()`, backdrop layer hiding in `src/backdrop.js`, bloom already off on touch via `bloomOnByDefault`) and add a governor integration test in `tests/lifecycle.test.mjs` driving `?q=5` headlessly.
- Effort: M · Priority: P0

**91. Texture residency audit after the real-art drops (KTX budget guardrail)**
- Why: silhouette pages are 0.15 MiB ASTC each today; final role art (item 22) will multiply stage GPU several-fold, and the naive Dad pack already broke the 20 MiB RGBA test once (`docs/GPU-MEMORY.md`).
- Implementation: after each repack, refresh the per-page table via `assets/chars/_pack_report.json`, keep Stage-kit ASTC ≤ ~8 MiB as a soft gate in `tests/atlas-spec.test.mjs`, and serve `.ktx` gzip/brotli per the GPU-MEMORY note (server config, outside `src/`).
- Effort: S · Priority: P1

**92. First-load budget: lazy-load stage 2/3 textures and cutscene posters on chapter entry only**
- Why: per-stage residency (`STAGE_TEXTURES`, `releaseChars`) works after boot, but the phone still pays title → stage-1 over cellular; every extra plate/clip in the initial path delays TAP TO START.
- Implementation: audit what `preload()` in `game-scene.js` + title flow fetch before first input; defer `kidnap/rescue/dad` clip posters to their stage entries (CutscenePlayer already loads on demand — keep it that way); log transferred bytes in `tools/browser-smoke.mjs`.
- Effort: M · Priority: P2

**93. Fixed-timestep spiral guard under thermal throttling**
- Why: `update()` accumulates real dt and runs whole 1/60 steps; a throttled phone at ~20 fps runs 3 sim steps + render per frame, deepening the hole the governor is trying to escape.
- Implementation: cap steps per frame at 3 and drop (not accumulate) the remainder with a `perf` excluded-boundary note (`src/perf.js` `setSuspended` pattern); bot sims use explicit dt and stay deterministic.
- Effort: S · Priority: P1

**94. Battery/thermal courtesy: pause rendering work when tab hidden, cap at 60**
- Why: input already clears on `visibilitychange`, but long phone sessions heat-throttle; an uncapped render loop during cutscenes/Dad freezes wastes the budget needed in fights.
- Implementation: verify Phaser `fps` target config in `src/main.js` boot (target 60, `forceSetTimeOut` off), suspend `perf` sampling + `papiFX` updates while hidden (patterns in `src/graphics-lifecycle.js`); assert no stuck `pauseReasons` on return in `tests/lifecycle.test.mjs`.
- Effort: S · Priority: P2

---

## 11. Polish / bugs

**95. Unplayed voice-ID sweep: every registered line must have a trigger or be cut**
- Why: beyond barks/hurt/Papi gaps, `bdb_open` (`I brought the eggplant.`), `bdb_produce` (`Die, Yetti, die!`), `claudia_open`, `nar_intro_*`, `nar_kidnap`, `nar_victory`, `yetti_turnback`, `choir_serious`, and `wingman_defeat` are registered with mp3s and never emitted (`emit('voice')` sites in campaign/yettis/wingman total eight).
- Implementation: add trigger points (first shot fired → `bdb_open`; first KO per stage → `bdb_produce`; first yetti telegraph → `yetti_turnback`; choir first sing → `choir_serious`; Wingmen `complete` → `wingman_defeat`; narrator chain per items 72–74) and a test in `tests/media.test.mjs` listing every `LINES` key with ≥1 emit site or an explicit cutscene/caption use.
- Effort: M · Priority: P0

**96. `tools/browser-smoke.mjs` touch check flake: assert input state, not pixels moved**
- Why: the held-stick check (`held.x > before.x + 30`) flaked under SwiftShader frame pacing (35 px vs 32 px baseline per `docs/LENGTH-DIFFICULTY.md`); a flaky smoke test trains everyone to ignore it.
- Implementation: assert `Input.held`/snapshot state + any positive displacement over a fixed step count via the debug hook, keeping the simultaneous-touch coverage; document in the smoke script header.
- Effort: S · Priority: P1

**97. Determinism: seed the presentation RNG leaks out of the sim**
- Why: sim purity is the campaign-test foundation, but `pick/rand` (`src/config.js`), bark rolls, and `Math.random()` in `game-scene.js` particles make "same inputs, same run" claims fragile as more rolls (items 32/62) land.
- Implementation: single seeded RNG injected into `Campaign` (barks already accept one in `src/barks.js`); presentation keeps `Math.random()`; extend `tests/campaign-sim.test.mjs` with a two-run identical-stats assertion at 60 Hz.
- Effort: M · Priority: P1

**98. Save-data hygiene: version migrations + corruption fuzz**
- Why: `bdb-rwb-save-v1` normalization discards shop fields today; new settings (items 83/86) will grow the shape, and one corrupt localStorage write on a phone must never brick TAP TO START.
- Implementation: explicit migration table in `src/save.js` `normalizeSave`, fuzz cases (junk types, NaN, huge scores, future version) in `tests/save.test.mjs`; keep unlock semantics (`resolveDifficulty` Nightmare gate) identical.
- Effort: S · Priority: P1

**99. Ship-tree slimming: keep audition/raw/candidate media out of deploys**
- Why: `ASSETS-LISTING.txt` shows ~60 `_raw/`, `samples/`, and candidate files sitting under served `assets/audio/voice/` — deploy weight, cache confusion, and unreleased takes one directory listing away from players.
- Implementation: move raw/audition material to the art workspace (outside the served root), keep only `PRESENT` mp3s + `voice-manifest.json`/`voice-cast.json` in tree; note the rule in `docs/ASSET-NOTES.md`. (Asset-box task; no `src/` change.)
- Effort: S · Priority: P1

**100. Gate the two missing reviews: run Muse (Step 3) and Argon (Step 5) checklists for real**
- Why: `plan/STATUS.md` records both review gates as never performed; their checklists (no-aim grep, tasteful Papi/Dad pass, touch/background torture, texture-residency keys) are exactly the failures this list keeps rediscovering.
- Implementation: execute BUILD-PLAN Step 3 + Step 5 checklists as written, file `plan/REVIEW-MUSE.md` and `plan/REVIEW-ARGON.md` with severities, and treat blockers as P0 above new features; re-run after items 22/41/42/62/90 land.
- Effort: M · Priority: P0

---

## Top 15 — do first (recommended build order)

1. **#62 — Wire `src/barks.js` into the campaign** (funniest layer in the game is silent; pure wiring)
2. **#95 — Unplayed voice-ID sweep** (every registered line gets a trigger; catches #40/#44/#64 leftovers)
3. **#63 — Caption-vs-locked-line audit** (locked verbatim text is law; two known drifts)
4. **#61 — Reconcile `PRESENT` against files on the asset box** (media test honesty before barks reference missing mp3s)
5. **#41 — Wire `playDadCall()` into the Dad flow** (locked call-in design; dead code today)
6. **#70 — Play the kidnap sequence before Stage 2** (one hook; clips already ship)
7. **#42 — Produce and ship rotating Dad clips D1–D3** (clean-shaven, original design; starts Game Art clock early)
8. **#13 — Make Nightmare bot-clearable** (an unlockable mode must be finishable)
9. **#22 — Replace the six silhouette Yetti atlases** (longest art pole; unblocks #23)
10. **#23 — Per-role animation states in the view layer** (makes #22 actually move)
11. **#50 — Final Dad sprite pass** (clean-shaven + legible BDB swatter at phone size)
12. **#90 — Reconcile the quality governor with BDB's scene API** (slow phones currently unprotected)
13. **#88 — Kill the per-frame Graphics redraw** (pool sprites; doubles as the prop-art landing)
14. **#87 — Real-device iPhone p95 gate** (first honest performance number; validates #88/#90)
15. **#78 — Icon HUD + big touch-button states** (PAPI/DAD readability is core phone UX)

