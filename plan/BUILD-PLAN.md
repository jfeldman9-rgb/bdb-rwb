# The Legend of Claudia: BDB's Awakening — rebuild on the RWB Phaser engine

*Build plan, written Tue Oct 27, 2026 by Claude (Opus), for Jason Feldman. Plan only: no game code, no pushes, and `rwb-w2` and the RWB remotes are untouched.*

**Sources read:** packet `/workspace/bdb-packet/src/Claudia_Handoff/` (`HANDOFF.md`, `FILE_MANIFEST.json`, `game/app/game/{BDBGame.tsx, world.ts, rules.ts, types.ts, experience.ts, save.ts, audio.ts}`, `game/media/voice-lines/*.txt`) and RWB `/workspace/rwb-s8/` (`README.md`, `plan/PLAN.md`, `src/{config, stages, input, hud, audio, assets, fighter, enemies, riley, stage1, loial, powers, rand-call, moilan-call, mat-call, stage7-lifecycle, stage8-lifecycle, stage8-def, stage4-def, call7-cutscene, call8-cutscene, cutscene, cutscene-hooks, cutscene-scene, music, bot}.js`, `assets/riley.json`, `assets/riley.anims.json`).

---

## 1. Executive summary

Jason chose a **rebuild**. The packet HANDOFF recommends polishing the React/Canvas game in place. This plan ignores that advice. The React/Canvas game is used only as a design document: story, chapter names, enemy roster, boss phases, Papacito rules, and voice lines. All code is new and follows RWB patterns.

**What we build.** A new Phaser 4 game at `/workspace/bdb-rwb`. Its scaffold is copied from the `rwb-s8` engine core: Phaser boot, touch/pad input, the `Fighter` actor, atlas loader, HUD scene, audio bus, cutscene player, call-in charge model, bot, and `node --test` suites. The game has **3 stages, one per packet chapter**. The finale is the dual-Wingmen boss fight, ending in a Papacito finisher.

**What changes for fun on iPhone:**
- **The eggplant gun fires straight only.** There is no aiming, no charge-and-release, no assisted targeting, and no overheat. Hold FIRE and Bob shoots along his lane.
- **No pits and no platforming.** We use RWB's belt-scroll depth lane. The packet's falls back to checkpoint are what make it frustrating on a phone, and they go away.
- **Five big thumb buttons:** FIRE, JUMP, DASH, PAPI, DAD.
- **New call-in.** Bob's dad, with a Boston accent, swings a giant fly swatter engraved "BDB". It uses the same charge/KO-recharge model as Riley's Rand and Moilan call-ins.
- **Papacito becomes a screen wipe.** Cartoon women run across the screen yelling "Papi! Papi!" and every Yetti on screen faints.

Art and voices stay as placeholders until `/workspace/bdb-art` fills and the ElevenLabs/IndexTTS lines are rendered. The game must be fully playable on placeholders first.

---

## 2. Architecture: reuse vs port vs drop

### 2.1 Reuse from RWB (copy, then trim)

| Area | RWB source | What BDB keeps |
|---|---|---|
| Boot / viewport | `index.html`, `lib/phaser.min.js` (Phaser 4.2.1, vendored, no npm), `src/main.js`, `src/startup.js`, `src/viewport.js`, `src/graphics-lifecycle.js`, `src/graphics-notice.js` | 1280×720 logical (`config.js` `VW, VH`), startup guard, lost-context recovery, no build step |
| Config | `src/config.js` | `LANE_TOP/LANE_BOT` depth band, `HITSTOP`, `SHAKE`, `coarsePointer()`, `chooseRenderScale()` (touch ≤1.5), `bloomOnByDefault()` (off on touch) |
| Input | `src/input.js` (`KEYS`, `PAD_MAP`, `take()/peek()` buffer, `#stick` touch, double-tap run) | Remap actions: `attack→fire`, `jump→jump`, `run→dash`, `special→papi`, `assist→dad`. Drop `power`. |
| Actors | `src/fighter.js`, `src/anim-pivot.js`, `src/actor-id.js`, `src/enemies.js` (`TYPES` table + `Enemy` state machine: approach/wait/attack/hurt/down/getup/held/dead) | Same state machine for Yettis; `canBeHit` gate; shadow + depth sort |
| Projectile | `src/stage1.js` `spawnFireball()` / `updateFireballs()`: horizontal `x += dir*680*dt`, lane hit test `|e.y - f.gy| < 42` | Eggplant uses this horizontal-only model as-is |
| Call-in rules | `src/rand-call.js`, `src/moilan-call.js` (`CALL7`), `src/mat-call.js` (`CALL8`): charges 1, KOs 10, recharge 45 s, maxCalls, perPhase 1, boss `bossFloor()` gates 0.66/0.33, never kills boss | Copied as pure `dad-call.js` with the same shape |
| Call-in actor | `src/loial.js` (runs in from left, lane-tracks, sweeps, leaves; i-frames; voice at start/end) | Template for `dad.js` (the in-engine swatter pass) |
| Call-in video | `src/call7-cutscene.js` / `src/call8-cutscene.js` (`bag8()` shuffle bag in sessionStorage, prefetch blob, `CutscenePlayer` with `maxMs:11000`) | `dad-call-cutscene.js`: bag of D1–D3 clips |
| Strike lifecycle | `src/stage7-lifecycle.js` `callMoilan()/stepStrike7()/endStrike7()`, `call7Context()`; `src/stage8-lifecycle.js` `call8Context()/call8()` | Same refuse → spend → freeze → resolve at t → thaw flow |
| Cutscenes | `src/cutscene.js` (`STAGE_CLIPS`, `SKIP_ACTIONS`, `createSeen`, playsinline, gesture bless), `src/cutscene-hooks.js` (`wrapStart(n,key)`, `startBoss` wrap), `src/cutscene-scene.js` | Stage-entry clips, boss-intro clip, victory clip |
| HUD | `src/hud.js` (`HUD` Phaser scene, `BOSS_BANNER`, `bossLabel`, `mashRing` + `MASH_NEED = 6`, `speakerColor`, captions) | Hearts, shake meter, PAPI/DAD charge pips, boss bar, mash ring for the Lecturer grab |
| Audio | `src/audio.js` (`say()` with captions/queue, `registerLines()`, `preloadClips/releaseClips`, `installAudioLifecycle`, `sfx`, `playTrack`), `src/music.js` (`MusicDirector`, `FADES`) | Voice bus, per-stage clip residency, iOS unlock on gesture |
| Assets | `src/assets.js` (`queueCharJson/queueCharPages/makeCharAnims/releaseChars`), atlas format of `assets/riley.json` + `assets/riley.anims.json` (canvas `[720,600]`, `baseline 570`, per-frame `holds`), `spike-art/tools/pack.py` | Same format. Jason's 720×600 art brief already matches it exactly. |
| Stage registry | `src/stages.js` (`STAGE_CHARS`, `STAGE_TEXTURES`, `resolveStage`, zone `{at,l,r,waves}`), `src/stage8-def.js` (`zones`, `boss`, `music`, `next()`, `onBossPhase`, `bossDown`) | `stage1-def.js`…`stage3-def.js` in the same shape |
| Bot / tests / perf | `src/bot.js` (`?demo=1`, `boss-coverage`), `tests/*.test.mjs` (`node --test`, no install), `src/perf.js`, `src/perf-panel.js`, `tools/audit-stage1.mjs` | Campaign bot, the full-stage simulation test pattern, fight p95 ≤16.7 ms target |

**Do not copy:** every `stage2`–`stage8` module, `riley3`, `balefire`, `powers.js` angreal content, the WoT enemies (`whitecloaks`, `myrddraal`, `draghkar`, `belal`, etc.), `twix.js`, `rwb-s8/.git`, or any RWB remote config.

### 2.2 Port / rewrite from the packet

| Packet source | Becomes | Notes |
|---|---|---|
| `world.ts` `ZONE_NAMES`, `starts`, enemy placements | `stage{1,2,3}-def.js` | Chapters become stages; placements become waves |
| `world.ts` `makeEnemy` dims/HP (walker 2, guard 4, hover 3, charger 4, choir 3, lecturer 4, boss 18) | `yettis.js` `TYPES` | HP ×12 to fit RWB damage scale (eggplant = 12) |
| `BDBGame.tsx` `updateEnemy` (lines ~685–830) | `yettis.js` per-role `think()` | Behaviour moves onto the lane (see §4) |
| `BDBGame.tsx` `bossTransition` + `rules.ts` `applyBossDamage`, `isBossFinisherReady`, `canActivatePapacito` | `wingman.js` + `papacito.js` (pure) | Port the rules **verbatim** and port their tests |
| `rules.ts` `collectShake` (3 shakes → 1 charge, cap 2) | `papacito.js` | Unchanged |
| `BDBGame.tsx` `activatePapacito` (kills visible non-bosses; boss only on finisher) | `papacito.js` `papacitoEffect()` | Same rule; new presentation |
| `experience.ts` `DIFFICULTIES` (pace/damage/recovery/grace) | `difficulty.js` | Keep the 3 tiers; **delete `selectTarget` and `assisted`** |
| `save.ts` (`normalizeSave`, `bdb-awakening-save-v2`) | `save.js`, key `bdb-rwb-save-v1` | Keep unlockedStage/beaten/bestScore/difficulty; shop deferred (§8) |
| `audio.ts` `VOICES` map + `media/voice-lines/*.txt` | `voice-lines.js` via `registerLines()` | Reuse packet mp3s as placeholders |
| Messages ("CHECKPOINT: EGO INTACT", "HALO PRIVILEGES REVOKED.", "THE FLOOR LEFT THE CHAT.", "PHASE II: HEAVENLY HR VIOLATION", "PHASE III: TWO WINGMEN. ONE TERRIBLE PLAN.", "BOUNDARIES SUCCESSFULLY MASHED.") | `story.js` banner strings | Keep. These jokes are the game's voice. |

### 2.3 Explicitly DROP

- **Manual aiming** (`aimX/aimY`, pointer aim, up/down aim keys), **charge-aim cannon** (`chargeTime`, release-to-fire, `charged` shots), **assisted targeting** (`experience.ts` `selectTarget`), **overheat** (`heat/overheated`).
- **Platforming:** cloud/velvet/crate platforms, pits, `dropThroughTime`, `groundPounding`, stomp. Crates come back only as breakable props (RWB `crate-texture.js`).
- **React 19 / Next 16 / Vinext / Vite / Cloudflare Worker / `.openai/hosting.json` / drizzle** for gameplay. RWB is static files served over HTTP.
- **`elon-console.webp`** in the Papacito overlay (`BDBGame.tsx` `drawPapacito`). It is a real public figure's likeness and does not belong in the new Papacito. Drop it.

---

## 3. Stages / levels

### 3.1 Recommendation: 3 RWB stages, not one long runway

- **iPhone sessions are short.** Each stage runs about 5–7 minutes, with a clean save point at each stage start.
- **Memory.** RWB unloads per stage (`STAGE_CHARS`/`STAGE_TEXTURES`, `releaseChars`, `releaseClips`), so only one chapter's atlases and voice lines are resident at a time.
- **Free cutscene slots.** `cutscene-hooks.js` `wrapStart(n,key)` plays a chapter clip on entry with no new plumbing.
- **Same structure as the packet.** It already had chapter select at x=84/1640/3240, so this is a 1:1 mapping.

Each stage follows the `stage8-def.js` shape: 3 locked fight zones (`at,l,r,waves`) and then a boss zone. A **zone checkpoint** is set when each zone clears. Death respawns Bob at the last cleared zone with full hearts. Continues are unlimited.

### 3.2 Per stage

**Stage 1 — BOULEVARD OF BETTER JUDGMENT** (`stage1-def.js`, key `boulevard`)
- *Intent:* teach move, fire, jump, and dash on a night city boulevard. Three tutorial prompts appear only on the first run.
- *Zone 1:* 2 walkers, then walker + guard. This wave teaches that the shield blocks shots and a dash breaks it.
- *Zone 2:* hover + walker, then charger + walker. Teaches jumping over the charge. First guaranteed protein shake ×3, which gives the first PAPI charge.
- *Zone 3:* choir + 2 walkers + guard. Teaches killing the choir first because it buffs the others. First DAD charge appears here.
- *Mini-boss: "The Interventionist".* A big Lecturer: walks in, grabs, Bob mashes free. Two phases, uses the `intervention.mp3` line. New art is limited to a scaled, tinted Lecturer plus 1 slam anim.
- *Checkpoints:* zone 1, 2, 3 clears ("CHECKPOINT: EGO INTACT").

**Stage 2 — THE CELESTIAL INTERVENTION** (`stage2-def.js`, key `clouds`)
- *Intent:* sky lane on a cloud bank. Mostly air threats, and the Council lore lands here.
- *Zone 1:* lecturer + walker, then hover ×2.
- *Zone 2:* choir + charger + hover, then guard ×2 (shield pair).
- *Zone 3:* mixed wave of 5, with a guaranteed shake trio.
- *Mini-boss: "The Choirmaster".* Stationary, buffs 3 respawning walkers, and sweeps halo rings down the lane in 3 bands. Kill the adds, then him.
- *Checkpoints:* each zone clear.

**Stage 3 — CLAUDIA'S MOONLIT KEEP** (`stage3-def.js`, key `keep`)
- *Intent:* castle courtyard to throne terrace under moonlight. Claudia is visible caged in the background.
- *Zone 1:* walker + lecturer + hover.
- *Zone 2:* guard + choir + charger.
- *Zone 3:* hover + guard + lecturer + walker.
- *Boss zone:* the Wingman (§3.3).
- *Checkpoints:* each zone clear, plus a boss-retry checkpoint at the start of the current phase.

### 3.3 Finale: the Wingmen

The packet's 3 boss phases map onto RWB boss phases (`boss.phase`, `onBossPhase`, and gates 0.66/0.33 in `rand-call.js`):

| Phase | Packet (`BDBGame.tsx` ~711–768, `bossTransition`) | Lane version |
|---|---|---|
| Intro | Bob passes x>4140: "THE COUNCIL DENIES THIS RESCUE." | Boss-intro clip via `startBoss` wrap, then a `council-denies` voice line |
| 1 | Hovers, fires an 8-way halo ring | Hovers, fires **halo rings that roll down the lane in 2 of 3 bands** (the `VOLLEY_BANDS` idea from `stages.js`). The open band is telegraphed. Jump or step lanes to dodge. |
| 1→2 | HP 18 → reset, "PHASE II: HEAVENLY HR VIOLATION", 3 shakes spawn | Same banner, and 3 shakes guaranteed |
| 2 | Telegraph, dive, ground pound, a velvet platform crumbles | **Shadow marks his landing spot on the lane (0.7 s) → dive → shockwave along that lane band.** "THE FLOOR LEFT THE CHAT." |
| 2→3 | Splits into 2 Wingmen (role 1 and 2), 10 HP each, 3 shakes | Same split with a 2-second in-engine flash, and 3 shakes guaranteed |
| 3 | HP floors at 1 (`applyBossDamage`); when both are at 1 → "PAPACITO FINISHER READY" | Same, ported verbatim. **PAPI is the only kill.** Dad's swatter also respects the floor (`bossFloor()` = 1 in phase 3). |
| Finish | `canActivatePapacito` → `finisher` → `bossComplete` | Papacito finisher variant (§4.3), then victory clip |

**Softlock guard (fixes the packet HANDOFF's "investigate" item):** in phase 3, if Bob has 0 PAPI charges and both Wingmen are at 1 HP, a shake trio drops every 8 s until he has a charge. Assisted targeting no longer exists, so the packet's "keeps shooting a floored boss" bug cannot happen.

---

## 4. Mechanics specs

### 4.1 Bob and the eggplant gun (`bob.js`, `eggplant.js`)

- **Move:** 8-way stick inside the lane band (`LANE_TOP..LANE_BOT`). Walk 270 px/s, which is the packet's `vx` clamp.
- **Jump:** short hop (packet `vy -515`, gravity 1180). Used to dodge snowballs, halo rings and charger rushes. Coyote/buffer windows come from `difficulty.grace`.
- **Dash (kept from packet):** 0.2 s at 520 px/s, i-frames 0.28 s. **Works on the ground and in the air** (the packet allowed air only, which is too fiddly on a phone). 1 stock, refilled on landing or after 0.6 s. **Dashing through a shielded guard breaks its shield** (packet `damageEnemy` `stomp/charged` path), with the "HALO PRIVILEGES REVOKED." banner.
- **Eggplant gun:** FIRE fires horizontally in `facing` direction. **`vy` is always 0.**
  - Projectile spawns at hand height (`R.y - R.z - 150`), but hits are tested on the ground lane `gy = R.y` with `|e.y - gy| < 42`. That is exactly how RWB fireballs work (`stage1.js:469`).
  - Speed 680 px/s, range off-screen +200.
  - Damage 12 (×`difficulty.damage`), knockback, light hit-stop.
  - Hold FIRE to auto-repeat at **5 shots/s**. Tap for a single shot.
  - No heat, no charge.
  - Bob's `shoot` anim (4 frames) plays; firing doesn't stop walking.
  - A point-blank shot (<90 px) does a **"bonk"**: extra knockback and a 0.4 s stun. This is the packet's `cannonBash` folded into the same button.
- **Health:** 3 hearts (Story 5). Hit → `hurt` (3f). A third hit in 2 s, or a charger hit, → `knockdown` (4f) → `getup` (4f) with 1.5 s i-frames.
- **Grab (Lecturer):** Bob is held and the `mashRing` shows. Any 6 button presses (`MASH_NEED`) break free, ending with "BOUNDARIES SUCCESSFULLY MASHED." Story mode auto-adds 3.5 presses/s, as the packet did.

### 4.2 Yetti roles (`yettis.js`): packet behaviour → RWB enemy pattern

| Packet kind | RWB pattern used | Lane behaviour | Counter |
|---|---|---|---|
| walker | `grunt` (approach/attack) | Walks up, slaps | Shoot |
| guard | `spear` + front shield flag | Slow advance, lobs a snowball along the lane; front blocks eggplants | Dash through, hit from behind, Dad, Papi |
| hover | `hound` flank + ranged | Floats above its shadow lane, swoops, fires a straight snowball | Shoot its shadow lane; jump the snowball |
| charger | new `rush` state | 0.72 s red telegraph, then charges along the lane at 430 px/s | Jump or step lanes, then shoot during recovery |
| choir | support (stationary) | Sings; buffs allies within 300 px (+28% speed, faster fire) | Kill first |
| lecturer | grab (RWB grab system, `riley-grab-safety` pattern) | Walks up and grabs: "This is an intervention." | Mash free, keep distance |
| boss | `Chieftain` boss subclass pattern | §3.3 | — |

All Yettis are **angelic, winged, white-furred, and comic**. Deaths are a feather burst (packet `feather` particles); Papacito kills are a heart/feather burst.

### 4.3 Papacito power (`papacito.js` pure rules + `papacito-fx.js` presentation)

- **Charges:** 3 protein shakes = 1 charge, max 2 (`collectShake`, ported verbatim). Shakes drop from guards on KO (as in the packet) and from scripted zone drops.
- **Trigger:** PAPI button. Refused (nothing spent, short caption) when paused, in a cutscene, during a Dad strike, when no Yetti is on screen, or in phase 3 before the finisher is ready ("WEAKEN BOTH WINGMEN FIRST").
- **General clear:** every on-screen non-boss Yetti is KO'd, 500 points each. Bosses in phases 1–2 are **untouched** (packet rule). The game pauses for a 2.5 s set piece and resumes.
- **Boss finisher:** phase 3 with both Wingmen at 1 HP. Both are removed, +4000 points, then victory.
- **VFX (placeholder first):**
  - 10 runner sprites in 2 rows cross left to right over 2.5 s.
  - Chorus "Papi! Papi!" (ElevenLabs, 3–4 voices layered), plus the existing `papacito-laugh` line from Bob.
  - Yettis get hearts over their heads, spin, and drop in a feather puff.
  - Warm gold vignette (reuse `vignette-overlay.js`). Bloom stays off on touch.
- **Tasteful boundary, written into the art brief:**
  - Fully clothed runners (sundresses, salsa outfits, track suits, a bride, a grandma or two for the joke).
  - Clearly adult, varied body types and ages, cartoon style.
  - No slow motion, no camera dwell on bodies, no body-part close-ups, no suggestive poses.
  - The joke is that the Yettis can't handle how popular Bob is, not the women's bodies.
  - Muse and Argon reviews check this explicitly.

### 4.4 Call-in: Bob's dad and the BDB fly swatter (`dad-call.js`, `dad.js`, `dad-call-cutscene.js`)

- **Rules (`dad-call.js`):** a copy of `CALL7`'s shape. Pure, unit-tested.
  - `DAD = { charges: 1, maxCharges: 1, kos: 10, recharge: 45, maxCalls: 3, perPhase: 1, bossFrac: 0.06, eliteFrac: 0.6, inv: 2, gates: [0.66, 0.33] }`.
  - Recharge needs **10 Bob KOs and 45 s since the last call** (`tickCall7` logic).
  - First charge is granted at Stage 1 zone 3 (taught there).
  - Refusal reasons are the same as `refuseReason`: paused, victory, busy, papi-active, empty, boss-invulnerable, spent, phase.
- **Effect:**
  - On-screen regular Yettis (walker/hover/choir) are swatted out. They KO "like flies" with a cartoon splat and stars, not gore.
  - Elites (guard/charger/lecturer) lose 60% HP and are knocked down 1.6 s, and any guard **loses its shield**.
  - The boss loses 6% max HP, clamped at the phase gate. **Dad never kills a boss** (`bossFloor`).
  - Bob gets 2 s of i-frames.
- **Presentation:** two layers, mirroring Stage 7/8.
  1. **Video (when cutscenes are enabled):** `dad-call-cutscene.js` is a copy of `call8-cutscene.js`. It has a `bag8` shuffle of `assets/cutscenes/dad/D1..D3.mp4` (≤8 s each), prefetched to a blob after the first gesture, with `maxMs: 11000`. The game freezes during the strike (`freezeStrike/thawStrike` pattern) and the effect resolves at t=0.65 s.
  2. **In-engine fallback (bot, `?nocutscenes=1`, quality ≥4, video fail):** `dad.js` copies `loial.js`. Dad jogs in from the left edge, lane-tracks the nearest group, and makes one overhead swat (the packed atlas is a single swat; v1 does not add a second), then leaves right. Voice at start and end.
- **Character:** Bob's dad, built from the reference photo at `/workspace/bdb-art/ref/bobs-dad-photo.jpg` (path only; not opened for this plan). Older guy, Boston sports gear (generic, no team logos), giant fly swatter with "BDB" stamped on the mesh. Lines are Boston-accent ElevenLabs (§5.4).

### 4.5 Difficulty (`difficulty.js`)

Keep the three tiers **as one multiplier table**, ported from `experience.ts` `DIFFICULTIES`:

| Tier | pace | eggplant dmg | recovery | grace | hearts | default? |
|---|---|---|---|---|---|---|
| Story | 0.72 | 1.6 | 2.3 | 0.19 | 5 | Default on touch devices |
| Adventure | 1.0 | 1.0 | 1.35 | 0.13 | 3 | Default on desktop |
| Nightmare | 1.22 | 0.8 | 0.85 | 0.09 | 3 | Unlocks after first clear |

There is no "assisted" toggle, because no aiming exists to assist. One title-screen setting remains: **Auto-fire** (off by default). When on, FIRE stays held whenever a Yetti is in Bob's lane and in front of him. It still only fires straight.

---

## 5. Asset and voice list

All art drops into `/workspace/bdb-art/{sprites,bg,props,ui,cutscenes}`. Frames are single 720×600 PNGs with feet on baseline y=570 (same as `assets/riley.anims.json`). `tools/pack-atlas` (port of `spike-art/tools/pack.py`) packs them into `assets/chars/<key>-0.webp` + `<key>-0.json` + `<key>.anims.json`. **Normal maps are optional.** We ship `?lit=0`-style flat lighting on iPhone first.

### 5.1 Characters (atlas key, anims with frame counts)

| Key | Anims | Notes |
|---|---|---|
| `bob` | idle 6, walk 8, shoot 4, hurt 3, knockdown 4, getup 4 (**Jason's brief**) | Plus wanted-later: jump 3, dash 2, victory 4 |
| `dad` | run 6, swat 4, cheer 3 | Swatter reads "BDB" |
| `claudia` | idle-caged 4, freed 4, portrait | Background in Stage 3, cutscenes |
| `yetti_walker` | walk 6, attack 4, hurt 2, down 3 | Base angelic Yetti, small wings |
| `yetti_guard` | walk 6, shield 2, attack 4, hurt 2, down 3 | Golden halo-shield |
| `yetti_hover` | fly 6, shoot 3, hurt 2, down 3 | Big wings, drop-shadow sprite |
| `yetti_charger` | walk 6, telegraph 2, rush 4, hurt 2, down 3 | Red-eyed telegraph |
| `yetti_choir` | sing 6, hurt 2, down 3 | Robes, sheet music |
| `yetti_lecturer` | walk 6, grab 3, hold 2, hurt 2, down 3 | Glasses, pointer |
| `wingman` | hover 6, ring 4, telegraph 2, dive 3, land 3, hurt 2, split 4 | Two palette variants for role 1/2 |
| `papi_runners` | run 8 × 4 variants (or 1 sheet with 4 rows) | Tasteful brief §4.3 |
| Mini-bosses | `interventionist` (= lecturer ×1.4 + slam 4), `choirmaster` (= choir ×1.4 + ring 4) | Cheap reuse |

### 5.2 Backgrounds, props, UI

- **BG strips (1280 wide, per Jason's brief):** per stage, `far` + 3–4 `mid` plates + `floor` (`STREAMS` pattern in `stage8-def.js`).
  - Stage 1: city boulevard at night, with neon "BETTER JUDGMENT" signage.
  - Stage 2: cloud council, columns, harps.
  - Stage 3: moonlit keep courtyard to throne terrace.
  - The packet's `console/chapter1-boulevard.webp`, `chapter2-clouds.webp`, `chapter3-castle.webp` and `astra-keep.webp` are stretched as **placeholders**.
- **Props:** eggplant projectile (3-frame spin), eggplant splat, snowball, halo ring, protein shake pickup, crate/planks, Claudia's cage, feather burst, heart burst, swatter "SWAT" burst.
- **UI:** heart icon, shake meter (3 segments), PAPI and DAD button icons + charge pips, boss bar frame, chapter title cards, title logo.
- **Portraits (256×256):** Bob, Claudia, Dad, Wingman, Interventionist, Choirmaster, Narrator (or none).

### 5.3 Cutscene shot list (960×540, ≤15 s each, H.264 + poster jpg, `playsinline`)

All are **Grok Imagine** image-to-video from painted keys. No Seedance or Manus. The packet's `opening.mp4`/`victory.mp4` serve as placeholders.

| ID | When (hook) | Length | Beat |
|---|---|---|---|
| `intro` | First title tap (`wrapStart(1,'intro')`) | 15 s | Narrator: Bob, his on-and-off ex, and Claudia "the Colombian". Bob shrugs: "I brought options." |
| `kidnap` | After intro | 12 s | Winged Yettis swoop on Claudia and fly her to the Moonlit Keep: "Bob. Winged Yettis locked me in Moonlit Keep." |
| `stage2` | `wrapStart(2,2)` | 10 s | Bob climbs into the clouds; the Council of Yettis frowns down |
| `stage3` | `wrapStart(3,3)` | 10 s | Moonlit Keep reveal; Claudia in the tower window |
| `boss3` | `startBoss` wrap | 8 s | The Wingman lands: "The council denies this rescue." |
| `dad/D1–D3` | Dad call-in (bag) | 5–8 s each | Dad winds up the BDB swatter; three variants |
| `victory` | `bossDown` | 15 s | Cage opens. "Is that what I think it is?" / "Legally, it's produce." / "Let's leave before they reform." |
| `papi` (optional) | Not in v1 | — | Papacito stays in-engine (cheaper, always available) |

### 5.4 Voice lines

**Engine.** Character voices are ElevenLabs. The **Narrator is Jason's cloned voice via IndexTTS 2.5**, ref `/workspace/jasonvoice/ref/jason_ref_nodenoise.wav`.

**Files.** Output goes to `assets/audio/voice/<id>.mp3` (mono, 64 kbps) and is registered with `registerLines()`. Captions use `speakerColor`.

| id | Speaker | Line | Source |
|---|---|---|---|
| `bdb_open` | Bob | "I brought options." | Packet `bdb-open.mp3` placeholder → ElevenLabs Bob |
| `bdb_produce` | Bob | "Legally, it's produce." | Packet → ElevenLabs |
| `bdb_laugh` | Bob | "Ha! Ha ha ha! Ha ha!" | Packet `papacito-laugh.mp3` → ElevenLabs |
| `claudia_open` | Claudia | "Bob. Winged Yettis locked me in Moonlit Keep." | Packet → ElevenLabs Claudia (light Colombian accent) |
| `claudia_question` | Claudia | "Is that what I think it is?" | Packet → ElevenLabs |
| `claudia_leave` | Claudia | "Let's leave before they reform." | Packet → ElevenLabs |
| `yetti_turnback` | Yetti | "Turn back Papi!" | Packet `turn-back-papi.mp3` (alert line) |
| `choir_serious` | Choir Yetti | "Papi, be serious." | Packet `papi-serious.mp3` |
| `lecturer_intervention` | Lecturer | "This is an intervention." | Packet `intervention.mp3` |
| `wingman_council` | Wingman | "The council denies this rescue." | Packet `council-denies.mp3` |
| `nar_intro_01` | Narrator (Jason) | "This is Bob. Big Dick Bob, to his friends. And to most of his enemies." | **New, IndexTTS** |
| `nar_intro_02` | Narrator | "Bob and his ex are on again. Or off again. Nobody, including Bob, is sure." | New, IndexTTS |
| `nar_intro_03` | Narrator | "Then there's Claudia. The Colombian. It's… complicated." | New, IndexTTS |
| `nar_kidnap` | Narrator | "Heaven, it turns out, has opinions. And Yettis. With wings." | New, IndexTTS |
| `nar_ch1` / `nar_ch2` / `nar_ch3` | Narrator | Chapter cards: "Chapter One. The Boulevard of Better Judgment." etc. | New, IndexTTS |
| `nar_victory` | Narrator | "And Bob? Bob was, briefly, a man of good judgment." | New, IndexTTS |
| `dad_call_01` | Dad (Boston) | "Bobby! Get behind me, kid!" | **New, ElevenLabs** |
| `dad_call_02` | Dad | "Yettis? In this economy? Get outta heah!" | New |
| `dad_call_03` | Dad | "Wicked big swattah, wicked small bird-bums." | New |
| `dad_done_01` | Dad | "Call ya mothah." | New |
| `dad_done_02` | Dad | "BDB, baby. It's on the swattah." | New |
| `papi_chorus` | Runners (3–4 voices) | "Papi! Papi! PAPI!" | New, ElevenLabs layered |
| `bob_papi_01` | Bob | "Ladies, please. One at a time." | New |
| `bob_hurt_01..03` | Bob | Grunts | New |
| `bob_respawn_01` | Bob | "I'm fine. I'm great. That was on purpose." | New |
| `bob_dadwait_01` | Bob | "Dad's on his coffee break." (call refused) | New |
| `bob_papiwait_01` | Bob | "Need more protein." (PAPI refused) | New |
| `wingman_phase2` | Wingman | "This is a divine performance review." | New |
| `wingman_phase3` | Wingmen | "Two wingmen. One terrible plan." | New |
| `wingman_defeat` | Wingman | "We'll… reform." | New |
| `interventionist_intro` | Mini-boss | "Bob. We all love you. That's why we're here." | New |
| `choirmaster_intro` | Mini-boss | "From the top! And-a-one, and-a—" | New |

**Music:** `bdb-rise.mp3` (packet) is the placeholder for every track. Later tracks are stage1/2/3 and boss via the `STAGE_MUSIC` pattern.

---

## 6. Repo / branch recommendation

- **Location:** `/workspace/bdb-rwb` (this folder). It becomes a **standalone Phaser game**. It is *copied* from the `rwb-s8` engine core, not a git fork of RWB, so no RWB history or remotes come along.
- **Git:** `git init` locally in Step 2 with **no remote**. Work on `main` locally, plus a `slice` branch per pipeline step if wanted. Whether or where to push is Jason's call later.
- **Hands off:** **`rwb-w2` is never touched.** Live RWB 1.1 stays separate. `rwb-s8` is read-only for this project. Nobody edits RWB to suit BDB; any shared improvement gets copied over.
- **Packet:** `/workspace/bdb-packet` is read-only reference. Its live Site (`proteinpowda.chatgpt.site`) and `.openai/hosting.json` identity are not reused.
- **Layout:**
  ```
  bdb-rwb/
    index.html  lib/phaser.min.js
    src/  config.js input.js audio.js music.js hud.js fighter.js anim-pivot.js actor-id.js assets.js
          startup.js viewport.js graphics-lifecycle.js perf.js perf-panel.js cutscene.js cutscene-hooks.js
          game-scene.js bob.js eggplant.js yettis.js wingman.js papacito.js papacito-fx.js
          dad-call.js dad.js dad-call-cutscene.js difficulty.js save.js story.js voice-lines.js
          stages.js stage1-def.js stage2-def.js stage3-def.js bot.js
    assets/ chars/ bg/ props/ ui/ audio/voice/ cutscenes/{,dad/}
    tests/*.test.mjs   tools/{make-placeholders.mjs, pack-atlas.py, audit.mjs, import-art.mjs}
    plan/BUILD-PLAN.md
  ```

---

## 7. Pipeline task list with acceptance tests

Conventions:
- Tests are `node --test tests/*.test.mjs` (Node 24, no npm install, as in RWB README).
- "Playable" means served over HTTP (`python3 -m http.server`) and played on desktop Chrome **and** a real iPhone in Safari.
- Each task lists **owner · files · acceptance**.

### Step 1 — Claude plan (this doc)
1.1 **Write `plan/BUILD-PLAN.md`** · Claude (Opus) · `plan/BUILD-PLAN.md` only · *Done when:* all 8 sections are present; every reuse claim cites a real `rwb-s8` path; no other file is modified; nothing is pushed; Jason has read it and answered the §8 questions (or accepted the defaults).

### Step 2 — Codex/Astra: first coding session (vertical slice = Stage 1 on placeholders)

2.1 **Scaffold from RWB core** · Codex · `index.html`, `lib/`, `src/{config,input,audio,music,hud,fighter,anim-pivot,actor-id,assets,startup,viewport,graphics-lifecycle,perf,cutscene,cutscene-hooks}.js`, `tests/boot.test.mjs`
- `boot.test.mjs` passes. It (a) imports every `src/*.js` without throwing under a DOM stub, and (b) greps `src/` and finds **no** `stage[2-8]`, `loial`, `rand-call`, `balefire`, `riley3` or `twix` imports.
- `git remote -v` prints nothing.
- Title screen renders over HTTP.

2.2 **Placeholder atlases** · Codex · `tools/make-placeholders.mjs`, `assets/chars/*`, `tests/atlas-spec.test.mjs`
- The generator writes coloured silhouette frames for every key in §5.1.
- The test asserts `bob.anims.json` has `canvas [720,600]`, `baseline 570`, and anims `bob_idle`=6, `bob_walk`=8, `bob_shoot`=4, `bob_hurt`=3, `bob_knockdown`=4, `bob_getup`=4.
- Every frame named in `.anims.json` exists in the atlas JSON.

2.3 **Input remap + touch layout** · Codex · `src/input.js`, `index.html` touch buttons, `tests/input-map.test.mjs`
- The test asserts actions `fire/jump/dash/papi/dad` exist for keyboard, pad and touch.
- No action is named `aim` or `power`.
- Playable check: on iPhone, five buttons are reachable by thumb in landscape and don't overlap the safe area.

2.4 **Bob controller** · Codex · `src/bob.js`, `tests/bob.test.mjs`
- Simulated input moves within `LANE_TOP..LANE_BOT`.
- Jump returns to the same lane y.
- Dash works grounded and airborne, uses one stock, and refills.
- Hurt → knockdown on the 3rd hit within 2 s → getup with i-frames.
- Lecturer grab breaks at 6 presses.

2.5 **Eggplant gun, straight only** · Codex · `src/eggplant.js`, `tests/eggplant.test.mjs`
- For every stick direction (8 + neutral), every spawned eggplant has `vy === 0` and constant `y`.
- It hits a target at `|dy| ≤ 41` and misses at `|dy| ≥ 43`.
- Holding FIRE for 1 s gives 5 ±1 shots.
- `grep -E "aim|charge|heat|overheat" src/eggplant.js src/bob.js` finds nothing.
- Guard front-block and back-hit both behave correctly.

2.6 **Yetti roles (walker, guard, hover, charger)** · Codex · `src/yettis.js`, `tests/yettis.test.mjs`
- Each role's state machine cycles under a seeded RNG.
- The guard shield blocks frontal shots and breaks on dash contact.
- The charger telegraph lasts 0.72 s ×`pace` before the rush.
- The hover's hittable lane is its shadow lane.

2.7 **Papacito rules + placeholder FX** · Codex · `src/papacito.js`, `src/papacito-fx.js`, `tests/papacito.test.mjs`
- The packet `tests/game-rules.test.ts` cases for `collectShake`, `canActivatePapacito`, `isBossFinisherReady` and `applyBossDamage` are **ported and pass**.
- A wipe KOs only on-screen non-bosses.
- Refusal spends nothing.

2.8 **Dad call-in (rules + in-engine actor)** · Codex · `src/dad-call.js`, `src/dad.js`, `tests/dad-call.test.mjs`
- Charge model: 1 charge; recharge needs 10 KOs **and** 45 s; maxCalls 3; perPhase 1.
- Regulars are KO'd and elites drop to 40% and lose their shield.
- On the boss, 6% damage clamped at `bossFloor`, which is never below 1 in phase 3.
- Every refusal reason is covered.

2.9 **Stage 1 def + game scene + HUD** · Codex · `src/{stages,stage1-def,game-scene,hud,story,difficulty,save}.js`, `tests/stage1-sim.test.mjs`
- Headless sim with bot input clears Stage 1 (3 zones + Interventionist) on Adventure in under 8 simulated minutes with 0 exceptions.
- Zone checkpoints respawn correctly.
- Save writes `unlockedStage: 2`.

2.10 **Bot** · Codex · `src/bot.js`
- `?demo=1&stage=1` completes Stage 1 in the browser with no input.
- The bot uses PAPI and DAD at least once each.

**Step 2 exit:** all tests green, plus a 60-second screen capture of Stage 1 on iPhone attached to the review.

### Step 3 — Muse review (gate)
Muse gets the diff and the captures. **Gate checklist (all must pass):**
- [ ] No aiming code path exists. Eggplant `vy` is 0 in every test.
- [ ] Controls feel good on iPhone: Jason or a tester clears Stage 1 on Story **without reading instructions**.
- [ ] No RWB leftovers: WoT names, Riley lines, Loial or balefire.
- [ ] No pit/fall deaths anywhere.
- [ ] Rules ported verbatim from `rules.ts` (side-by-side diff in the review).
- [ ] Dad charge model matches `CALL7` semantics; refusal spends nothing.
- [ ] Papacito placeholder respects the §4.3 tasteful boundary.
- [ ] Fight p95 ≤16.7 ms on desktop; iPhone number recorded (not yet gating).
- [ ] Findings list filed as `plan/REVIEW-MUSE.md` with severity; blockers fixed before Step 4.

### Step 4 — Antigravity session (content complete)
4.1 **Choir + Lecturer + mini-bosses** · `src/yettis.js`, `src/stage{1,2}-def.js` · Choir buff radius 300 / ×1.28 is tested. Lecturer grab is tested. Interventionist and Choirmaster each have 2 phases and pass `boss-sim` tests.
4.2 **Stage 2 and Stage 3 defs** · `src/stage2-def.js`, `src/stage3-def.js`, `src/stages.js` · `STAGE_CHARS`/`STAGE_TEXTURES` are per stage. The test asserts Stage 1 atlases are released on entering Stage 2 (`releaseChars` pattern).
4.3 **Wingman boss, 3 phases + split + finisher** · `src/wingman.js`, `tests/wingman-sim.test.mjs`
- A seeded sim reaches phase 3, floors both Wingmen at 1, and then:
  - eggplant and Dad cannot kill them;
  - PAPI with ≥1 charge ends the fight;
  - with 0 charges, a shake trio drops within 8 s (softlock guard).
4.4 **Difficulty + save** · `src/difficulty.js`, `src/save.js`, `tests/save.test.mjs` · `normalizeSave` handles junk, NaN and a missing key. Nightmare unlocks after a clear. Touch defaults to Story.
4.5 **Cutscene + voice wiring (placeholders)** · `src/cutscene.js` `STAGE_CLIPS`, `src/cutscene-hooks.js`, `src/dad-call-cutscene.js`, `src/voice-lines.js`
- The packet `opening.mp4`/`victory.mp4` play at intro and victory.
- Every id in §5.4 is registered.
- Missing mp3s fall back to captions without errors (test).
- `?nocutscenes=1` skips every clip.
4.6 **Full-campaign bot** · `src/bot.js`, `tests/campaign-sim.test.mjs` · Headless: Stage 1 → 2 → 3 → victory on Adventure with 0 exceptions.

### Step 5 — Argon review (gate)
- [ ] The campaign sim and browser `?demo=1` both reach the victory clip.
- [ ] Each stage is 5–8 minutes for a human on Adventure (timed playthrough recorded).
- [ ] Boss phase 3 can't softlock (test plus a manual run with 0 charges).
- [ ] Touch: simultaneous pointers, cancelled touches, and app switch/background → resume all leave nothing stuck (RWB `input.clear()` on blur). Audio unlocks on first tap, and video plays inline.
- [ ] Portrait shows a "rotate" prompt; notch/safe areas are respected.
- [ ] Memory: per-stage residency verified (texture keys after a stage switch).
- [ ] Tasteful check on all Papacito and Dad presentation.
- [ ] Standing rules: no Seedance/Manus assets, no paid agents, no Claude Fable or extra-usage in any tool config or notes.
- [ ] Findings in `plan/REVIEW-ARGON.md`; blockers fixed before Step 6.

### Step 6 — Cursor (Grok): art, voice and final polish
6.1 **Art import** · `tools/import-art.mjs`, `tools/pack-atlas.py`, `assets/**`
- Each PNG dropped in `/workspace/bdb-art/sprites/<key>/<anim>_NN.png` packs to an atlas.
- `atlas-spec.test.mjs` still passes; placeholder flags flip off per key.
- Contact sheet written to `docs/contact/<key>.png`.
6.2 **BG strips + props + UI + portraits** · `stage*-def.js` streams, `hud.js` · Every stage renders with no placeholder plates. The HUD uses the final icons.
6.3 **Cutscenes in** · `assets/cutscenes/{intro,kidnap,stage2,stage3,boss3,victory}.mp4`, `assets/cutscenes/dad/D1..D3.mp4` · Each clip is ≤15 s, 960×540, has a poster jpg and is skippable. The `audit.mjs` cutscene budget is reported.
6.4 **Voices in** · `assets/audio/voice/*.mp3`
- Every §5.4 id has a file.
- Narrator lines come from IndexTTS (Jason ref); everything else from ElevenLabs.
- The duration table is generated (`stage8-voice-durations.js` pattern).
6.5 **Hit-feel polish** · `eggplant.js`, `yettis.js` · Eggplant splat, hit-stop `HITSTOP.light`, feather burst. The Papacito runners use final art.
6.6 **iPhone performance** · `perf.js` · Record fight p95 on a recent iPhone and an older supported iPhone in Safari. **Gate: ≤16.7 ms p95** on the recent one, with bloom off and lit off if needed.
6.7 **Final gate** · all
- `node --test tests/*.test.mjs` is green.
- Campaign bot reaches victory.
- Jason plays it start to finish on an iPhone and says it's fun.
- `README.md` has run instructions and a change log.
- No push without Jason's go-ahead.

---

## 8. Risks and open questions for Jason

**Risks**
- **Lane brawler vs platformer feel.** The rebuild trades the packet's jumping puzzles for RWB's lane combat. That fits a phone better and suits straight-only fire, but it's a different game feel. Step 3 is where we find out.
- **Straight fire vs flying Yettis.** Hover Yettis are hit on their shadow lane. If that confuses players, the fix is a brighter shadow ring, not aiming.
- **Art consistency across about 25 character sheets.** The RWB plan flagged the same risk. Mitigation: placeholders keep the game playable, and keys get swapped in one at a time.
- **Real-person likeness.** Dad is built from a real photo. Jason confirms Dad is fine with it. The Elon overlay is dropped.
- **Usage limits.** Codex, Antigravity and Cursor runs consume plan quotas. No paid extras (Tinyfish, Seedance, Manus, Claude extra-usage) are budgeted.

**Questions (defaults in brackets)**
1. Lane brawler instead of platformer: OK? [Yes]
2. Does Bob's ex appear on screen, or only in narration? Name? [Narration only, unnamed]
3. Keep the protein-bank upgrade shop (double dash, ricochet, shake-heal) from `save.ts`? [Cut for v1, add later]
4. Mini-bosses for Stages 1 and 2, or a plain arena finish? [Mini-bosses, cheap reuse]
5. Dad's first name and catchphrase? [Unnamed "Dad"; "BDB, baby. It's on the swattah."]
6. Auto-fire setting default? [Off]
7. Who voices Bob and Claudia: specific ElevenLabs voices, or should we audition 3 each? [Audition]
