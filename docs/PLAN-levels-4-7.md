# BDB: Stages 4–7 plan (sequel arc, level briefs, assets, build passes)

*Planner: Claude Opus 5.5 (`claude-opus-5-5`), 2026-10-28. This is a plan only. The only file written is this one.
No source, asset, test, package or git changes were made, and nothing was pushed. `npm test` and builds were not run.
No quota, rate-limit or credit errors happened this session.*

Tree: `/workspace/bdb-plan7` = `jfeldman9-rgb/bdb-rwb` `main` @ `8c06396` (live Pages).
RWB reference: `/workspace/rwb-dialogue-ref` (read-only). Its shape was borrowed from `docs/CAMPAIGN-ARC-PLAN.md` and `docs/STAGE7-PLAN.md`: an arc table, a ground-rules section, per-stage briefs, and builder tasks.

Every number below was read from this checkout. Where something is a proposal and not a fact, it says so. The wave tallies in §2 were counted by hand from the paste-ready blocks. Pass A's new test recomputes them.

---

## 0. Facts this plan builds on (verified at `8c06396`)

| Fact | Where |
|---|---|
| `maxStage = 3`. `STAGES = {1,2,3}`. `STAGE_CHARS` has a shared kit plus each stage's boss. | `src/stages.js:5-8` |
| Shared kit: `bob, dad, yetti_walker, yetti_guard, yetti_hover, yetti_charger, yetti_choir, yetti_lecturer, papi_stampede` | `src/stages.js:7` |
| Geometry for every stage: zones at `260/1500/2800/4080/5360`, arenas `l` = `0/1280/2560/3840/5120`, each 1280 px wide. The boss is `at 6700, l 6480, r 7760`. | `src/stage3-def.js`, `src/config.js:7` (`WORLD_W = 7760`) |
| Wave format `[type, 'L'|'R', delay]`. Default `spawnGap` is 105. Zone 4 (index 3) gets a deterministic jitter. | `src/stage1-def.js:1`, `src/campaign.js:124-147` |
| `hpScale 2.2` on every stage. Pace is S1 1.0, S2 1.1, S3 1.15, under `PACE_CAP = 1.25`. | stage defs, `src/campaign.js:18` |
| Core HP: walker 24, guard 48, hover 36, charger 48, choir 36, lecturer 48. Interventionist 1200. Choirmaster **1140**. | `src/yettis.js:3-12` |
| Wingmen are 360 / 360 / 200×2. Phase III floors at 1 HP until the Papacito finisher. | `src/wingman.js:36`, `src/wingman.js:2-8,45-50` |
| Boss gates `[1, .66, .33]`. Per-type `BOSS_ADDS` and `BOSS_COOL`. | `src/yettis.js:14-23` |
| Bark gate: `BARK.gap = 8`, `BARK.cap = 3`, `window = 60` | `src/barks.js:9,12,13` |
| Dad: `maxCalls 3` **per Campaign instance**, so a full run spends him by about S3. A fresh stage start gets a new, unlocked `dadCall`. | `src/dad-call.js:2-6`, `src/campaign.js:76` |
| Papacito: `PAPI_RUNNER_X0 = -180`, `PAPI_RUNNER_SPEED = 980`, `papiTime = 2.5` | `src/papacito.js:5-6`, `src/campaign.js:278` |
| Plates: `s{N}-far`, `s{N}-floor`, `s{N}-mid0..5`, plus a `STREAMS[N]` entry and `assets/bg/MANIFEST.json` | `src/zone-stream.js:17-54` |
| Bot timings (Adventure, after rebuild): S1 153.6/159.3/156.1, S2 186.8/193.7/190.9, S3 211.3/209.4/219.8 s at 30/60/120 Hz | `docs/LENGTH-DIFFICULTY.md` "After rebuild" |
| GPU: Stage 1 kit is 8.370 MiB ASTC and 33.482 MiB RGBA (`_pack_report.json`). The budget target is **under 60 MiB**. Role pages are 0.68–1.09 MiB ASTC. | `assets/chars/_pack_report.json`, `docs/GPU-MEMORY.md` |
| `bot-sim.mjs` loops stages `[1,2,3]`, with an 1800 s cap per run. | `tools/bot-sim.mjs:22-24` |
| Campaign test: a 1500 s cap, `stages [1,2,3]`, `unlockedStage 3`, `papi <= 20`, every stage 140–240 s | `tests/campaign-sim.test.mjs:2` |
| "Every stage uses every Yetti role" test | `tests/length-difficulty.test.mjs:26-49` |
| Save clamps `unlockedStage` to 3. `beaten` (which unlocks Nightmare) is set on the S3 clear. | `src/save.js:7,19-20` |
| Chapter select only has options 1–3 | `index.html:69` |
| Victory runs when `def.next` is null (S3). The S3 clear banner is `STORY.victory`. | `src/campaign.js:420,428`, `src/stage3-def.js:24` |
| Claudia's cage is drawn only when `stageNo === 3` | `src/game-scene.js:108-109` |
| Music: every id maps to `assets/audio/bdb-rise.mp3` | `src/audio.js:210` |
| Clips: `kidnap: ['kidnap_1','kidnap_2']`, `rescue_pre_boss`, `victory: ['rescue_2']`. `STAGE_CLIPS` was locked by an earlier pass. | `src/cutscene.js:30-37`, `docs/OVERNIGHT-STATUS.md:183` |

---

## 1. Sequel arc (plain English)

The Wingmen's last words in Stage 3 were "We'll… reform." (`src/voice-lines.js`, `wingman_defeat`). They do. Bob gets Claudia out of the Moonlit Keep and down into the city for one last afterparty. At 1 AM the Yetti High Council sends its whole nightlife wing after him: bouncers, DJs, a matchmaker and finally the Arch-Yetti. They snatch Claudia again, and the kidnap clip replays. Then they drag her up the cable car, under the mountain into the Yetti salt-mine afterhours, where La Celestina tries to marry her off to a nice Yetti. At sunrise they take her to the Papacito Tribunal, where the Arch-Yetti means to formally revoke Bob's Papacito status. Bob chases her through four more stages, one for each hour from 1 AM to dawn. The ladies of the Papacito stampede overrule the court, and Bob gets Claudia home for real this time.

| Stage | Hour | Place (Colombian nightlife, fictionalised) | Boss | Claudia |
|---|---|---|---|---|
| 1–3 | 10 PM–midnight | Boulevard → clouds → Moonlit Keep | Interventionist / Choirmaster / Wingmen | Rescued at the end of S3 |
| **4** | ~1 AM | Party strip and salsa club (El Poblado / Parque Lleras feel) | **The Bouncer** | Re-kidnapped at the start (existing `kidnap` clip) |
| **5** | ~2:30 AM | Hillside barrio, graffiti escalators, cable car | **DJ Halo** | Seen in a pink gondola overhead |
| **6** | ~4 AM | Yetti salt-mine afterhours under the mountain | **La Celestina** | On the wedding altar in the boss arena |
| **7** | ~5:30 AM, dawn | Mountaintop High Court (funicular summit) | **The Arch-Yetti** (Papacito finisher) | Caged in the witness box. Final rescue and victory. |

---

## 2. Level briefs

### 2.0 Shared rules for all four stages

- **Geometry is identical to S1–S3.** Each stage has 5 zones and a boss arena, with the same `at/l/r` numbers as `src/stage3-def.js`. Each zone has 3 waves of `[type, side, delay]` entries. `hpScale` stays at 2.2. Every zone mixes at least 3 roles. Each stage has at least 45 wave Yettis, at least half of them staggered, and at least 8 left-flank entries (`tests/length-difficulty.test.mjs`).
- **Plate mapping.** The new stages are fully painted, so `STREAMS[N]` maps zones 1–5 to `mid0..mid4` and the boss to `mid5`. There are no derived-plate ordering quirks like S2/S3's `mid0,mid1,mid3,mid4,mid5,mid2`. Plate sizes match S3: mids 1280×720, far like `s3-far` (1600×720), floor like `s3-floor`. The lane band (screen y 572–690) stays clear of busy detail.
- **New Yetti variants: four, and at most two atlases per stage.** This bounds GPU growth (§4.2).

  | Stage | Variant atlases resident (`STAGE_VARIANTS`) |
  |---|---|
  | S4 | `yetti_salsero` |
  | S5 | `yetti_salsero`, `yetti_tagger` |
  | S6 | `yetti_tagger`, `yetti_minero` |
  | S7 | `yetti_minero`, `yetti_bailiff` |

  A stage's waves and boss adds may only use the six core roles plus that stage's variants. A new test enforces it.
- **Pace ramp.** S4 1.15, S5 1.18, S6 1.20, S7 1.22. All are under `PACE_CAP 1.25` (`src/campaign.js:18`). Nightmare clamps to 1.25 on every stage, the same as today.
- **Dad.** Dad is unchanged: 3 calls per campaign (`src/dad-call.js:2`), so in a full run he is usually spent before S4. A fresh chapter-select start at S4–S7 gets him back. So **each new stage must land in band both ways**: a fresh `bot-sim` start with Dad available, and campaign continuation with Dad spent. Dad's `callEffect` elite list (`src/dad-call.js:73`) is not edited, so Dad's swat outright KOs the new variants. They are "bird-bums" like walkers. That is intended.
- **Papacito.** The stampede is unchanged. Power still comes from guard shake drops, the boss phase-II trio, and the S7 finisher. No new `shakes: true` zones unless Pass E needs them (§5, Pass E ladder step 6).
- **Dialogue.** No new ambient groups or pools. `AMBIENT_ORDER`, `BARK` and the Yetti cycle are unchanged (`src/barks.js`). New lines are **scripted beats only**: one stage-open line, the boss intro, phase II, phase III, defeat, and one Claudia line, the same density as the S3 Wingmen beats. Variants spawn silently. They share the existing Yetti barks (Porkchop / Colombians room / purple car).

### 2.0.1 New Yetti variants (shared across S4–S7)

HP is shown as base, then ×2.2 in game.

| Key / art | Name | Role | HP | Speed | Tell → attack | Counter | Why it fits | Code hook (yettis.js flags; core six unchanged) |
|---|---|---|---|---|---|---|---|---|
| `salsero` / `yetti_salsero` | **Salsero Yetti** | Fast melee flanker that lane-weaves | 30 → 66 | 130 | Every 1.4 s it hops one lane toward Bob (220 px/s vertical). In range (<260 px, same lane) it does a **0.55 s / pace hip-spin with a pink flash**, then a short lunge (0.30–0.50 s at 430·pace, overshoot 60 px). | Step lanes or jump the lunge | 1 AM salsa club; trains lane discipline | `lunge: {reach:260, tell:.55, over:60, min:.3, max:.5}`, `laneHop: 1.4`; light poise |
| `tagger` / `yetti_tagger` | **Tagger Yetti** | Ranged area denial | 36 → 79 | 100 | **Shakes a spray can for 0.65 s / pace (rattle SFX)**, then lobs a paint bomb onto Bob's telegraphed X. It leaves a magenta **splat** in that lane for 1.4 s: one hit if Bob stands in it on the ground. | Jump (z ≥ 65), step out, or shoot the tagger first | Graffiti escalators on the hillside | `ranged: true` (joins `RANGED_TYPES` so the 2-per-lane cap applies), `paint: {ttl:1.4, w:80}`; new hostile kind `'splat'` (speed 0, ttl) |
| `minero` / `yetti_minero` | **Minero Yetti** | Heavy lane-sweeper | 48 → 106 | 75 | **Its headlamp lights Bob's whole lane for 0.8 s / pace.** The lane band is drawn like the Wingman safe-band highlight (`src/game-scene.js:194`). Then a pickaxe slam sends a one-way `'shockwave'` along the lane. | Leave the lit lane or jump the wave | Salt-mine afterhours | `heavy: true` (0.9 s poise), `lamp: {tell:.8}`; reuses the `'shockwave'` kind |
| `bailiff` / `yetti_bailiff` | **Bailiff Yetti** | Shield and grab tank | 54 → 119 | 70 | Gold **gavel-shield** in front: 3 eggplant hits break it, or dash through, exactly like guard (`src/yettis.js:136-146`). Up close it does a **0.65 s raise-gavel tell**, then a "YOU'RE UNDER ARREST" grab using the lecturer grab/mash path (`src/yettis.js:195-196`). | Dash through the shield, then mash out | The tribunal | `shield: true`, `heavy: true`, `grab: true` |

**Implementation rule.** Replace the hard-coded type lists in `src/yettis.js` with `TYPES[type]` flags: `HEAVY` (line 82), the `['guard','hover']` snowball list (line 188), the grab list `['lecturer','interventionist']` (line 196), the ranged list (line 221), and `shield: type === 'guard'` (line 133). The legacy types must resolve to **exactly** the same flags. Add a test for that.

`choirMultiplier` (lines 83-91, `return 1.28` at :88) and `CHOIR_AURA` (:93) are **not edited**. No new type joins the choir buff check.

### 2.1 Stage 4: THE AFTERPARTY RELAPSE

- **Key** `rumba` · **title** `THE AFTERPARTY RELAPSE` · **def file** `src/stage4-def.js` · **bg** `s4-mid5` · **pace** 1.15 · **hpScale** 2.2
- **Theme.** About 1 AM. The rescue party spills into a Medellín-style party strip (El Poblado / Parque Lleras feel; all signage invented). The Yettis crash it and grab Claudia again.
- **Opening.** On the first S4 load in a campaign, emit the existing `'kidnap'` cutscene (`kidnap_1`, `kidnap_2`; no `STAGE_CLIPS` change). Then `nar_ch4`, then `armVoice('claudia_s4', 2)` and `armVoice('bob_s4', 4.5)`.

**Backgrounds (`assets/bg/s4-*.webp`):**

| Plate | Zone | Visual beat |
|---|---|---|
| `s4-far` | all | The valley's city lights under a purple-orange haze. The Moonlit Keep (S3) is a tiny silhouette on a far peak, for continuity. |
| `s4-floor` | all | Wet pavers with pink and teal neon reflections, confetti, spilled plastic aguardiente cups |
| `s4-mid0` | Z1 | **Calle de la Rumba.** Bar fronts with invented neon ("LA GOZADERA", "BAR EL PAPI"), an arepa cart, string lights |
| `s4-mid1` | Z2 | **Club door.** Velvet rope, a queue of Yetti silhouettes, a marquee reading "SALSA ETERNA" |
| `s4-mid2` | Z3 | **Dance floor.** Mirror ball, an orquesta stage with congas and brass, dancer silhouettes |
| `s4-mid3` | Z4 | **Behind the bar and kitchen.** Bottle wall, empanada fryers, steam, a swinging kitchen door |
| `s4-mid4` | Z5 | **Back-alley stairs.** Murals, and a parked **chiva rumbera** (a painted party bus) |
| `s4-mid5` | Boss | **Rooftop VIP terrace.** Giant neon "VIP", city skyline, pool glow, the Bouncer's velvet-rope gate |

**Waves** (paste-ready; 55 Yettis; base HP 1992 → pool ≈ 4382 at ×2.2; 40 staggered, 18 flank):
```js
zones: [
  { at: 260, l: 0, r: 1280, waves: [
    [['walker','R',0],['salsero','R',.8],['walker','L',2]],
    [['guard','R',0],['salsero','L',1],['hover','R',2.2]],
    [['lecturer','R',0],['salsero','R',.8],['walker','L',1.8]] ] },
  { at: 1500, l: 1280, r: 2560, waves: [
    [['salsero','R',0],['salsero','L',.6],['choir','R',1.6]],
    [['charger','R',0],['guard','R',1],['walker','L',2]],
    [['hover','R',0],['salsero','L',.8],['lecturer','R',1.8],['walker','R',2.8]] ] },
  { at: 2800, l: 2560, r: 3840, waves: [
    [['choir','R',0],['salsero','R',.6],['salsero','L',1.4],['guard','R',2.2]],
    [['charger','L',0],['hover','R',.8],['lecturer','R',1.8]],
    [['walker','R',0],['walker','L',.8],['salsero','R',1.6],['charger','R',2.6]] ] },
  { at: 4080, l: 3840, r: 5120, waves: [
    [['guard','R',0],['salsero','L',.6],['hover','R',1.4],['walker','L',2.4]],
    [['lecturer','R',0],['charger','L',1],['salsero','R',2]],
    [['choir','R',0],['guard','R',.6],['salsero','L',1.6],['walker','R',2.6]] ] },
  { at: 5360, l: 5120, r: 6400, waves: [
    [['salsero','R',0],['salsero','L',.8],['charger','R',1.6],['hover','L',2.4]],
    [['choir','R',0],['lecturer','R',.6],['guard','L',1.4],['salsero','R',2.4]],
    [['guard','R',0],['charger','L',.8],['salsero','R',1.6],['hover','R',2.4],['lecturer','L',3.2],['walker','R',4]] ] },
], boss: { at: 6700, l: 6480, r: 7760, type: 'bouncer', name: 'THE BOUNCER' }, next: 5
```
(While S4 is the last stage, Pass A sets `next: null`. Pass B sets it to 5.)

**Enemy mix:** salsero 16, walker 10, guard 7, hover 6, lecturer 6, charger 6, choir 4. Salsero is the lesson. The core six are all present.

**Boss: THE BOUNCER** (`bouncer`, a `Yetti` boss through the standard single-bar path)
- **Fantasy.** A 9-foot Yetti doorman with a clipboard and a velvet rope. "You're not on the list."
- **HP 1260** (band 1200–1320). One bar, gates at 66% and 33% (`BOSS_GATES`, `src/yettis.js:14`), a roar at each gate.
- **Phase I (1260→832).** A front **clipboard shield**: `shield: true`, so 3 hits or a dash breaks it. He re-shields at every roar. Close up he does a **velvet-rope grab** (lecturer path, 0.65 s tell, mash out). No adds.
- **Phase II (832→416).** Adds an **arena charge** when Bob keeps his distance (the same rule as Interventionist phase III: 0.8 s red tell, `rushCool` 5 s). Adds `['salsero','walker']`. Phase-II shake trio, as today.
- **Phase III (416→0).** A **two-way stomp** `'shockwave'` (like Interventionist P3, `src/yettis.js:200`), a charge and a grab. He re-shields every 12 s. Adds `['guard','salsero','charger']`.
- `BOSS_COOL.bouncer = [1.3, 1.1, .9]`. New keys only. `interventionist` and `choirmaster` entries are untouched.
- **Art.** `walk 8, block 2, grab 4, hold 2, rush 6, stomp 4, roar 4, hurt 3, down 5` (38 frames). Clipboard and rope are readable props. Pink-gold lanyard.
- **Expected boss fight (bot, 60 Hz):** 38–48 s.

**Targets:**

| | Story | Adventure | Nightmare |
|---|---|---|---|
| Clear (fresh stage) | 120–150 s | **175–205 s** | report only; may not clear |

**Dad / Papacito:** no new touchpoints. A fresh-start Dad is available. Guards drop shakes.

**Voice (scripted beats):**

| id | Speaker (cast) | Text | Trigger |
|---|---|---|---|
| `nar_ch4` | Narrator (Jason IndexTTS, local) | Chapter Four. The Afterparty Relapse. | `loadStage(4)` (existing `nar_ch${stage}` emit) |
| `claudia_s4` | Claudia | Bob! Not again! | `armVoice` 2 s |
| `bob_s4` | Bob | Again? Seriously? | `armVoice` 4.5 s |
| `bouncer_intro` | Bouncer → reuse **Yetti** (Daniel `onwK4e9ZLuTAKqWW03F9`) | You're not on the list, Papi. | `startBoss` (existing `${z.type}_intro` emit) |
| `bouncer_phase2` | Bouncer | The rope comes out now. | gate II |
| `bouncer_phase3` | Bouncer | Club's closed. Forever. | gate III |
| `bouncer_defeat` | Bouncer | Fine. You're on the list. | boss KO |

Banners: `PHASE II: THE ROPE COMES OUT` · `PHASE III: LAST CALL`.

### 2.2 Stage 5: THE GONDOLA OF NO RETURN

- **Key** `cable` · **title** `THE GONDOLA OF NO RETURN` · `src/stage5-def.js` · **bg** `s5-mid5` · **pace** 1.18
- **Theme.** About 2:30 AM. The Yettis haul Claudia up the hillside on the cable car. Bob climbs the barrio on foot: escalators, rooftops, mid-station, summit. A street party with picó sound systems runs the whole way.
- **Opening:** `nar_ch5`, then `claudia_s5` at 2 s, then `bob_s5` at 4.5 s.

**Backgrounds (`assets/bg/s5-*.webp`):**

| Plate | Zone | Visual beat |
|---|---|---|
| `s5-far` | all | A steep hillside of glowing houses climbing into dark mountains. The cable-car line crosses the sky, and one **pink gondola** (Claudia's) glows. |
| `s5-floor` | all | Brick and concrete stair-landings with painted footprints and spray-paint dust |
| `s5-mid0` | Z1 | **Base station.** Turnstiles, cabins swinging in, a station clock reading 2:30 |
| `s5-mid1` | Z2 | **Graffiti escalators.** Covered outdoor escalators and bright murals (invented art, no real artists' work), a breakdance speaker |
| `s5-mid2` | Z3 | **Rooftop hop.** Corrugated roofs, water tanks, laundry lines, a parrot on an antenna |
| `s5-mid3` | Z4 | **Mid-station tower.** Cables overhead, a pylon, an oblea vendor's cart |
| `s5-mid4` | Z5 | **Mirador.** City panorama, and the first **picó** speaker tower, painted and glowing |
| `s5-mid5` | Boss | **Summit station DJ booth.** A huge painted picó wall and DJ Halo's booth built into a gondola cabin |

**Waves** (56 Yettis; base HP 2088 → ≈ 4594):
```js
zones: [
  { at: 260, l: 0, r: 1280, waves: [
    [['tagger','R',0],['walker','R',.8],['walker','L',2]],
    [['salsero','R',0],['hover','R',1],['tagger','L',2.2]],
    [['guard','R',0],['lecturer','L',1],['walker','R',2]] ] },
  { at: 1500, l: 1280, r: 2560, waves: [
    [['tagger','R',0],['tagger','R',.8],['charger','L',1.8]],
    [['choir','R',0],['salsero','L',.6],['walker','R',1.6]],
    [['guard','R',0],['hover','L',1],['salsero','R',1.8],['walker','L',2.8]] ] },
  { at: 2800, l: 2560, r: 3840, waves: [
    [['charger','R',0],['tagger','R',.6],['salsero','L',1.4],['hover','R',2.2]],
    [['lecturer','R',0],['lecturer','L',1],['tagger','R',2]],
    [['choir','R',0],['guard','R',.8],['charger','L',1.8],['walker','R',2.8]] ] },
  { at: 4080, l: 3840, r: 5120, waves: [
    [['tagger','R',0],['salsero','L',.6],['guard','R',1.4],['walker','L',2.4]],
    [['hover','R',0],['hover','L',1],['charger','R',2],['tagger','R',3]],
    [['choir','R',0],['lecturer','R',.6],['salsero','L',1.6],['walker','R',2.6]] ] },
  { at: 5360, l: 5120, r: 6400, waves: [
    [['tagger','R',0],['tagger','L',.8],['charger','R',1.6],['salsero','L',2.4]],
    [['guard','R',0],['choir','R',.6],['lecturer','L',1.4],['hover','R',2.4]],
    [['charger','R',0],['salsero','L',.8],['tagger','R',1.6],['guard','R',2.4],['lecturer','L',3.2],['hover','R',4]] ] },
], boss: { at: 6700, l: 6480, r: 7760, type: 'dj', name: 'DJ HALO' }, next: 6
```
**Enemy mix:** tagger 11, salsero 8, walker 8, hover 7, guard 6, lecturer 6, charger 6, choir 4.

**Boss: DJ HALO** (`dj`, single-bar `Yetti` boss, `ranged: true`)
- **Fantasy.** The Yetti Council's hype DJ, spinning from a gondola booth. He drops the bass on Bob.
- **HP 1200** (band 1140–1260). He keeps ranged distance (pref 330, speed 60) and holds his lane, like any boss (`stepRangedLane` returns early for bosses).
- **Phase I.** A **bass drop**: a 0.7 s tell (speaker-cone pulse ring), then one floor `'shockwave'` in **both** directions in his lane. Jump it. Adds `['walker','tagger']` at the phase timer.
- **Phase II.** Adds a **record scratch**: two vinyl `'halo'` discs into Bob's lane and one adjacent lane, alternating up and down every volley. This is new `dj` code with its own cadence. It is *not* the Choirmaster branch (`src/yettis.js:189-194`), which stays byte-identical. Adds `['hover','tagger','walker']`.
- **Phase III.** **THE DROP**: a 1.2 s build banner `WAIT FOR IT…`, then three full-arena shockwaves 0.25 s apart, so the jump timing matters. It repeats on `BOSS_COOL.dj[2]`. Adds `['charger','salsero','hover']`.
- `BOSS_COOL.dj = [1.5, 1.2, 1.0]`. `dj` is **not** a choir type and gives no buff.
- **Art.** `idle 6, scratch 6, drop 6, roar 4, hurt 3, down 5` (30 frames), plus a static booth prop if needed. Headphones, a gold halo used as a turntable, sunglasses.
- **Expected boss fight:** 42–52 s.

**Targets:** Story 125–155 s · **Adventure 185–215 s** · Nightmare: report only.

**Dad / Papacito:** none new.

**Voice:**

| id | Speaker | Text | Trigger |
|---|---|---|---|
| `nar_ch5` | Narrator | Chapter Five. The Gondola of No Return. | load |
| `claudia_s5` | Claudia | Bob! Up here! The cable car! | 2 s |
| `bob_s5` | Bob | Going up, Yettis! | 4.5 s |
| `dj_intro` | **DJ Halo (new voice)** | Hands up for heaven! Not you, Bob. | boss start |
| `dj_phase2` | DJ Halo | Let me scratch that. | gate II |
| `dj_phase3` | DJ Halo | Wait for it… the DROP! | gate III |
| `dj_defeat` | DJ Halo | Mic… dropped. | KO |

Banners: `PHASE II: REQUEST DENIED` · `PHASE III: WAIT FOR IT…`.

### 2.3 Stage 6: THE SALT MINE AFTERHOURS

- **Key** `salt` · **title** `THE SALT MINE AFTERHOURS` · `src/stage6-def.js` · **bg** `s6-mid5` · **pace** 1.20
- **Theme.** About 4 AM. The cable car ends at a mine mouth. Under the mountain the Yettis run an afterhours club inside carved salt halls, loosely inspired by Colombia's salt-mine caverns but fictional ("Mina de Sal de los Yettis"). La Celestina, the Council's matchmaker, has Claudia on a wedding altar. **No real religious iconography.** The altar is a crystal wedding arch.
- **Opening:** `nar_ch6`, then `bob_s6` at 2 s. `claudia_s6` plays at boss start, 3.5 s after `celestina_intro`, the same pattern as `claudia_question` in S3 (`src/campaign.js:206`).

**Backgrounds (`assets/bg/s6-*.webp`):**

| Plate | Zone | Visual beat |
|---|---|---|
| `s6-far` | all | Cavern depths, glowing teal salt crystals, a distant underground river |
| `s6-floor` | all | White salt-crust floor with mine-cart rails and puddles that reflect strobe colours |
| `s6-mid0` | Z1 | **Mine mouth.** Timber beams, a hand-painted "AFTERHOURS →" sign, lanterns, parked carts |
| `s6-mid1` | Z2 | **Salt tunnel.** Miner lamps, carved pillars, strobe spilling round the bend |
| `s6-mid2` | Z3 | **Great salt hall nightclub.** Carved arches lit in shifting club colours, a Yetti crowd |
| `s6-mid3` | Z4 | **Underground lake bar.** Rowboats, a salt-block bar counter, bottles lit from below |
| `s6-mid4` | Z5 | **Wedding antechamber.** Silleta flower arrangements (an Antioquia flower-fair nod), Yetti guests in rows, piled bouquets |
| `s6-mid5` | Boss | **Crystal wedding arch.** Claudia on the altar (drawn like the S3 cage), La Celestina's stage, a confetti cannon |

**Waves** (56 Yettis; base HP 2268 → ≈ 4990):
```js
zones: [
  { at: 260, l: 0, r: 1280, waves: [
    [['minero','R',0],['walker','R',.8],['walker','L',2]],
    [['tagger','R',0],['guard','R',1],['walker','L',2.2]],
    [['lecturer','R',0],['minero','L',1],['hover','R',2]] ] },
  { at: 1500, l: 1280, r: 2560, waves: [
    [['minero','R',0],['minero','R',.8],['charger','L',1.8]],
    [['choir','R',0],['tagger','L',.6],['walker','R',1.6]],
    [['hover','R',0],['guard','L',1],['tagger','R',1.8],['walker','L',2.8]] ] },
  { at: 2800, l: 2560, r: 3840, waves: [
    [['choir','R',0],['minero','R',.6],['charger','L',1.4],['tagger','R',2.2]],
    [['lecturer','R',0],['lecturer','L',1],['minero','R',2]],
    [['guard','R',0],['hover','R',.8],['charger','L',1.8],['walker','R',2.8]] ] },
  { at: 4080, l: 3840, r: 5120, waves: [
    [['tagger','R',0],['minero','L',.6],['guard','R',1.4],['walker','L',2.4]],
    [['charger','R',0],['charger','L',1],['tagger','R',2],['hover','R',3]],
    [['choir','R',0],['lecturer','R',.6],['minero','L',1.6],['walker','R',2.6]] ] },
  { at: 5360, l: 5120, r: 6400, waves: [
    [['minero','R',0],['minero','L',.8],['tagger','R',1.6],['charger','L',2.4]],
    [['choir','R',0],['guard','R',.6],['lecturer','L',1.4],['hover','R',2.4]],
    [['guard','R',0],['minero','R',.8],['tagger','L',1.6],['lecturer','R',2.4],['charger','L',3.2],['walker','R',4]] ] },
], boss: { at: 6700, l: 6480, r: 7760, type: 'celestina', name: 'LA CELESTINA' }, next: 7
```
**Enemy mix:** minero 11, walker 9, tagger 8, charger 7, guard 6, lecturer 6, hover 5, choir 4.

**Boss: LA CELESTINA** (`celestina`, single-bar `Yetti` boss)
- **Fantasy.** The Yetti Council's matchmaker tía: a veil, a fan, a ring box. She has "found Claudia a nice Yetti husband".
- **HP 1300** (band 1240–1360).
- **Phase I.** A **bouquet toss**: a 0.65 s fan-flutter tell, then one `'halo'` bouquet into Bob's lane. Then a **blink**: a new `state 'blink'` of 0.4 s where `canBeHit` is false. She reappears 300–500 px away on a random lane, seeded from `actorId` and `volley` so the sim stays deterministic. Dad and Papi already refuse on a bragging boss (`isBossBragging`, `src/wingman.js:26-31`). Adds `['walker','tagger']`.
- **Phase II.** Adds **"the ring"**: grab and mash through the lecturer path, with a 0.65 s ring-box tell. Adds `['minero','guard']` (the groomsmen).
- **Phase III.** **Bridal train**: a full-width charge rush (0.8 s red tell), then bouquets in **two** lanes with one safe lane (Wingman `safeBand` pattern, `src/wingman.js:65,72`; new code, not a Wingman edit). Adds `['charger','minero','tagger']`.
- `BOSS_COOL.celestina = [1.4, 1.15, .95]`.
- On defeat, banner `THE YETTIS GRAB CLAUDIA. UP THE SHAFT!` Claudia's altar sprite tweens up and out (cosmetic).
- **Art.** `walk 8, toss 6, blink 4, ring 4, hold 2, rush 6, roar 4, hurt 3, down 5` (42 frames). Gold-white veil, a pink fan, a ring box that reads at 0.38 scale.
- **Expected boss fight:** 45–55 s.

**Targets:** Story 130–160 s · **Adventure 195–225 s** · Nightmare: report only.

**Dad / Papacito:** none new. Claudia is drawn in the boss arena (generalised cage, §5 Pass A).

**Voice:**

| id | Speaker | Text | Trigger |
|---|---|---|---|
| `nar_ch6` | Narrator | Chapter Six. The Salt Mine Afterhours. | load |
| `bob_s6` | Bob | Down we go. | 2 s |
| `celestina_intro` | **La Celestina (new voice)** | Ay, Bob. I found her a nice Yetti husband. | boss start |
| `claudia_s6` | Claudia | I am NOT marrying a Yetti! | boss start +3.5 s |
| `celestina_phase2` | La Celestina | Something borrowed… something YOU. | gate II |
| `celestina_phase3` | La Celestina | Everyone! To the altar! | gate III |
| `celestina_defeat` | La Celestina | Fine! Marry the eggplant man! | KO |

Banners: `PHASE II: SOMETHING BORROWED` · `PHASE III: SPEAK NOW OR FOREVER HOLD YOUR EGGPLANT`.

### 2.4 Stage 7: THE PAPACITO TRIBUNAL (finale)

- **Key** `tribunal` · **title** `THE PAPACITO TRIBUNAL` · `src/stage7-def.js` · **bg** `s7-mid5` · **pace** 1.22 · `next: null` (final)
- **Theme.** About 5:30 AM, dawn. The mine shaft comes out at a mountaintop sanctuary-court reached by funicular. It is fictional and Monserrate-flavoured, with no real church depicted. The Arch-Yetti presides over a tribunal that will revoke Bob's Papacito title. The ladies of the stampede pack the balcony.
- **Opening:** `nar_ch7`, then `bob_s7` at 2 s. The final victory plays the existing `victory` clip (`rescue_2`), `nar_victory`, then `claudia_s7` in place of `claudia_leave`, then `dad_s7`.

**Backgrounds (`assets/bg/s7-*.webp`):**

| Plate | Zone | Visual beat |
|---|---|---|
| `s7-far` | all | A pink-gold dawn over the Andes, the city waking below, the last stars |
| `s7-floor` | all | Polished marble court tiles with feathers and Yetti footprints |
| `s7-mid0` | Z1 | **Funicular summit.** Mountain steps, a canelazo stand closing for the night |
| `s7-mid1` | Z2 | **Gallery of judges.** Portraits of past Arch-Yettis, velvet banners reading "LEX YETTI" |
| `s7-mid2` | Z3 | **Jury box.** Rows of robed choir Yettis, a stenographer Yetti |
| `s7-mid3` | Z4 | **Evidence vault.** Exhibit A: **Bob's purple car** on a plinth (the "Bob why is your car purple?" callback). Exhibit B: a giant eggplant under glass. |
| `s7-mid4` | Z5 | **High Court doors.** Huge carved doors, two Wingmen statues ("reformed"), sunrise beams |
| `s7-mid5` | Boss | **The bench.** A towering judge's bench and gavel, Claudia caged in the witness box, the ladies in the balcony (they foreshadow the finisher) |

**Waves** (56 Yettis; base HP 2466 → ≈ 5425; the heaviest pool, Pass E trims here first):
```js
zones: [
  { at: 260, l: 0, r: 1280, waves: [
    [['bailiff','R',0],['walker','R',.8],['walker','L',2]],
    [['minero','R',0],['hover','R',1],['walker','L',2.2]],
    [['guard','R',0],['lecturer','L',1],['bailiff','R',2]] ] },
  { at: 1500, l: 1280, r: 2560, waves: [
    [['choir','R',0],['bailiff','R',.6],['charger','L',1.6]],
    [['minero','R',0],['minero','L',1],['hover','R',2]],
    [['lecturer','R',0],['guard','L',.8],['bailiff','R',1.8],['walker','L',2.8]] ] },
  { at: 2800, l: 2560, r: 3840, waves: [
    [['bailiff','R',0],['choir','R',.6],['charger','L',1.4],['hover','R',2.2]],
    [['minero','R',0],['lecturer','L',1],['minero','R',2]],
    [['guard','R',0],['bailiff','L',.8],['charger','R',1.8],['walker','L',2.8]] ] },
  { at: 4080, l: 3840, r: 5120, waves: [
    [['minero','R',0],['bailiff','L',.6],['hover','R',1.4],['walker','L',2.4]],
    [['charger','R',0],['charger','L',1],['lecturer','R',2],['guard','R',3]],
    [['choir','R',0],['bailiff','R',.6],['minero','L',1.6],['walker','R',2.6]] ] },
  { at: 5360, l: 5120, r: 6400, waves: [
    [['bailiff','R',0],['bailiff','L',.8],['minero','R',1.6],['charger','L',2.4]],
    [['choir','R',0],['guard','R',.6],['lecturer','L',1.4],['hover','R',2.4]],
    [['guard','R',0],['minero','R',.8],['bailiff','L',1.6],['lecturer','R',2.4],['charger','L',3.2],['hover','R',4]] ] },
], boss: { at: 6700, l: 6480, r: 7760, type: 'archyetti', name: 'THE ARCH-YETTI' }, next: null
```
**Enemy mix:** bailiff 11, minero 9, walker 7, charger 7, guard 6, hover 6, lecturer 6, choir 4.

**Boss: THE ARCH-YETTI** (`archyetti`, new `src/archyetti.js`; reuses the Wingmen finisher rules without editing `src/wingman.js`)
- **Fantasy.** The presiding judge of the Yetti High Council: a powdered wig over the fur, gold robes, a gavel the size of a door.
- **HP 1380** (band 1300–1460). One bar, `BOSS_GATES`. **Phase III floors at 1 HP** through the existing `applyBossDamage(3, …)` (`src/wingman.js:2-8`). While floored, `canBeHit` is false so eggplants pass through, the same as the Wingman floor rule at `src/wingman.js:45-50`. `isBossFinisherReady` (`src/wingman.js:10-23`) turns true, and the banner reads `PAPACITO FINISHER READY` (`STORY.finisher`). The ladies stampede and overrule the court. That is the only way to end the fight, the same rule as S3.
- **Phase I (1380→911).** A **gavel slam**: 0.65 s raise tell, then a two-way `'shockwave'`. Adds `['bailiff','walker']`.
- **Phase II (911→455).** **THE VERDICT**: three-lane `'halo'` bands with one rotating safe lane (Wingman pattern) plus an arena charge. Adds `['minero','bailiff','hover']`.
- **Phase III (455→1).** Both of the above on shorter cooldowns. Adds `['bailiff','minero','charger']`. Once floored, a **softlock trio** drops after 8 s with no Papi charge, copied from `src/wingman.js:115-119` into the new controller.
- A small controller `TribunalCourt` exposes `phase / ready / complete`. Campaign, bot and HUD read `this.finisher = this.wingmen || this.court` wherever they read `this.wingmen?.phase` / `.ready` today:
  - `src/campaign.js:270,292,494,497`
  - `src/bot.js:10,12`
  - `src/hud.js:6,58`

  S3 keeps going through `this.wingmen`, unchanged. Change the phase stat push at `src/campaign.js:494` from the literal `3:` to `${this.stageNo}:` (S3 output is unchanged).
- `BOSS_COOL.archyetti = [1.3, 1.1, .9]`.
- **Art.** `walk 8, gavel 6, verdict 4, rush 6, roar 4, floored 4, hurt 3, down 5` (40 frames), plus the existing `claudia` stand-in in the cage.
- **Expected boss fight:** 50–62 s, including the finisher.

**Targets:** Story 135–165 s · **Adventure 205–235 s** · Nightmare: report only.

**Dad / Papacito.** Dad's boss swat already floors at 1 in phase III (`bossFloor`, `src/dad-call.js:68`), so it helps reach the finisher. No constants change. The Papacito finisher is the climax. `PAPI_RUNNER_*` and `papiTime` are unchanged.

**Voice:**

| id | Speaker | Text | Trigger |
|---|---|---|---|
| `nar_ch7` | Narrator | Chapter Seven. The Papacito Tribunal. | load |
| `bob_s7` | Bob | Court's in session, Yetti! | 2 s |
| `archyetti_intro` | Arch-Yetti → reuse **Wingman** (Cornelius `6sFKzaJr574YWVu4UuJF`; he heads the same council) | Bob. This court finds you… not a Papacito. | boss start |
| `archyetti_phase2` | Arch-Yetti | The verdict is snow. | gate II |
| `archyetti_phase3` | Arch-Yetti | Order! ORDER in my court! | gate III |
| `archyetti_defeat` | Arch-Yetti | The court… is adjourned. | finisher KO |
| `claudia_s7` | Claudia | Took you long enough, Papacito. | final victory (replaces `claudia_leave` only after S7) |
| `dad_s7` | Dad | That's my boy! Wicked big Papacito! | final victory, after `claudia_s7` |

Banners: `PHASE II: THE VERDICT` · `PHASE III: ORDER IN THE COURT` · final `STORY.finalVictory = 'CLAUDIA RESCUED. FOR REAL THIS TIME.'`. `STORY.victory` keeps showing on the S3 clear.

### 2.5 Length summary (targets; Pass E measures and records the real numbers)

| Stage | Wave Yettis / pool (×2.2) | Boss HP | Adventure target (30/60/120 Hz) | Story | Nightmare |
|---|---|---|---|---|---|
| S1 (live) | 53 / 4182 | 1200 | 153.6 / 159.3 / 156.1 | ~125 | not bot-cleared on S2/S3 |
| S2 (live) | 55 / 4735 | 1140 🔒 | 186.8 / 193.7 / 190.9 | | |
| S3 (live) | 56 / 5000 | 360+360+200×2 | 211.3 / 209.4 / 219.8 | | |
| **S4** | 55 / ≈4382 | 1260 | **175–205** | 120–150 | report |
| **S5** | 56 / ≈4594 | 1200 | **185–215** | 125–155 | report |
| **S6** | 56 / ≈4990 | 1300 | **195–225** | 130–160 | report |
| **S7** | 56 / ≈5425 | 1380 + finisher | **205–235** | 135–165 | report |
| Campaign S1–S7 | | | **≈ 1330–1450 s (~23 min)** | | |

The hard band is 140–240 s for every stage at every rate, for both fresh-start and campaign-continuation runs. S3 already sits at 209–220 s, so S4 is deliberately a breather after the Act 1 finale, and the curve climbs back to the top of the band at S7. S7 carries the most risk of going over 240 s (its pool is ≈ 8% over S3's, plus a 1380 bar and the finisher). That is why the Pass E ladder starts with S7's zone-5 stragglers.

---

## 3. Locked rules checklist (do not touch)

| Locked item | Where | What "untouched" means |
|---|---|---|
| Eggplant flies straight, `vy = 0` | `src/eggplant.js:4` (`createShot`), `src/eggplant.js:24` (`stepShot`) | No arcs, homing, spread or upgrades. `GUN` (`src/eggplant.js:1`) is unchanged. |
| `CAM_LEAD = 0.28` | `src/config.js:4`, re-exported at `src/camera.js:4` | Value and all camera code unchanged |
| Scrolling and camera follow | `src/camera.js` (`updateCamera`, `lockSnaps` at `:69`), `src/zone-stream.js` (`MID_SCROLL 0.4` `:12`, `PLATE_FADE`, `PLATE_W/H`, `plateRuns/plateRect`), `src/parallax.js` | Only **add** `STREAMS[4..7]` entries. No changes to functions or constants. |
| No upgrade shop | whole repo (none exists; `docs/OVERNIGHT-STATUS.md:56`) | No shop, currency, unlock tree or stat upgrades |
| Locked Bob quotes, verbatim | `docs/BOB-LINES.md:8-9,19`; `src/voice-lines.js:6`; `assets/audio/voice/bdb_open.mp3`, `bdb_produce.mp3` | "I brought the eggplant." / "Die, Yetti, die!": text and audio unchanged. Yetti captions and Dad's catchphrase (`docs/BOB-LINES.md:21-29`) unchanged. |
| Choirmaster | `src/yettis.js:11` (`hp: 1140`), `src/yettis.js:21` (`BOSS_ADDS.choirmaster`), `src/yettis.js:23` (`BOSS_COOL.choirmaster`), the `choir`/`choirmaster` branch at `src/yettis.js:189-194`, `summonWalkers` `src/campaign.js:214` | Unchanged. S2 stays as it is. No new stage retunes it, and no shared refactor may change its numbers. |
| `choirMultiplier` 1.28 and choir aura | `src/yettis.js:83-91` (`return 1.28` at `:88`), `CHOIR_AURA` `:93` | Unchanged. No new type joins the choir check. |
| Bark gate | `src/barks.js:3-14` (`gap: 8` `:9`, `cap: 3` `:12`, `window: 60`), `AMBIENT_ORDER`, the Yetti cycles | Unchanged. No new ambient groups. `tests/voice-diet.test.mjs` limits still pass. |
| Papacito sim | `src/papacito.js:5-6` (`PAPI_RUNNER_X0`, `PAPI_RUNNER_SPEED`), `collectShake`, `canActivatePapacito`, `papacitoEffect`, `papiTime = 2.5` `src/campaign.js:278` | Unchanged |
| Dad sim | `src/dad-call.js` (whole file: `DAD` `:2`, caps, `callEffect`, `bossFloor`, mercy) | Unchanged. 3 calls per campaign. |
| Wingmen (S3 boss) | `src/wingman.js` | Unchanged. S7 imports `applyBossDamage` / `isBossFinisherReady` and copies its patterns into `src/archyetti.js`. |
| S1–S3 content | `src/stage1-def.js`, `src/stage2-def.js`, `src/stage3-def.js` | **Byte-identical.** S3's `next: 4` is applied in `src/stages.js` as `{...STAGE3, next: 4}` frozen, so `stage3-def.js` stays untouched. |
| S3 Nightmare special cases | `NIGHTMARE_S3`, `NIGHTMARE_S3_TRIMS`, `snowClearZ`, `ADVENTURE_S3_DAMAGE` (`src/campaign.js:20-48`) | Unchanged. Do not copy them to S4–S7. |
| Cutscene table and intro | `STAGE_CLIPS` / `STORY_MAX_MS` (`src/cutscene.js:30-41`), `assets/cutscenes/*.mp4` bytes | Unchanged. S4 reuses the `'kidnap'` key and S7 the `'victory'` key. |
| Existing derived plates and atlases | `assets/bg/s1-*`..`s3-*`, `assets/chars/*` for existing keys | No re-encode churn. Run `tools/derive-plates.py` / `tools/pack-flat.py` **only** for new keys (`--only`). |
| Existing tests | `tests/*.test.mjs` | Do not edit, **except** assertions that hard-code 3 as the *final* stage or a 3-stage campaign (listed in Pass A). Those switch to `maxStage`. |

---

## 4. Full new-asset inventory

### 4.1 Background plates (32 new files plus manifest rows)

Path convention: `assets/bg/s{N}-{far|floor|mid0..mid5}.webp`. Add a `"s{N}"` list to `assets/bg/MANIFEST.json` in the same order as `s1`–`s3`: far, mid0..5, floor. Add a `STREAMS[N]` entry in `src/zone-stream.js`: zones → `mid0..mid4`, boss → `mid5`.

| Stage | Files | Beats (see §2) | Source |
|---|---|---|---|
| S4 | `s4-far, s4-floor, s4-mid0..5` (8) | party strip → club door → dance floor → bar/kitchen → chiva alley → VIP rooftop | **Cursor `GenerateImage`** for plates (cloud builder can do it), or ChatGPT / Gemini image gen (Jason's logins). Use `assets/bg/s3-mid0.webp` and `chapter1-boulevard.webp` as style references. |
| S5 | `s5-*` (8) | base station → graffiti escalators → rooftops → mid-station → mirador picó → summit DJ booth | same |
| S6 | `s6-*` (8) | mine mouth → salt tunnel → salt-hall club → lake bar → flower antechamber → crystal wedding arch | same |
| S7 | `s7-*` (8) | funicular summit → judges gallery → jury box → evidence vault (purple car) → court doors → the bench | same |

Rules for plates:
- 1280×720 mids, far and floor at the same size as `s3-far` / `s3-floor`. `webp` q80 `method 6`, as in `tools/derive-plates.py:56`.
- Keep the lane band (screen y 572–690) calm and readable. Signage must not be mirrored.
- Total size per stage should be ≤ the S3 plate set on disk (`du -cb assets/bg/s3-*.webp`).

Prompt skeleton:
> "Painted 2D side-scrolling beat-'em-up background, 1280×720, flat painterly style matching the reference, Colombian nightlife at {hour}, {beat}. Horizon and props in the upper two thirds; the bottom 20% is open floor for fighters. No text except {sign text}, no real logos, no real people."

**Fallback so code passes never block on art.** Add new-key entries to `PLATES` in `tools/derive-plates.py` that derive a temporary `s{N}-*` set from existing art by regrading. Its `main()` currently rewrites **every** entry, so add an `--only s4-` style filter first, so `s1`–`s3` are never re-encoded. Painted plates replace the derived ones on the same branch when they arrive. A derived plate is acceptable for a preview but **not** for the Pass E sign-off.

Optional: no chapter key art. `def.bg` is unused metadata (only stage defs reference it), so point it at `s{N}-mid5`.

### 4.2 Sprite atlases

Path convention (same as now):
- `assets/chars/<key>-0.{webp,astc.ktx,etc2.ktx,json}` and `<key>.anims.json`, built by `python3 tools/pack-flat.py --only <key>`.
- That command runs `tools/compress-ktx.py` and updates `assets/chars/_pack_report.json`.
- Source frames: `/workspace/bdb-art/sprites/<key>_<anim>_NN.png`, 720×600 logical canvas, feet at y=560 like the role sheets (`tools/pack-flat.py:7-15`).
- Add a `REAL` entry in `tools/pack-flat.py` for each key (`DRAW_SCALE 0.38`, `:23`, unchanged).
- Until art lands, add a `STANDINS` entry and run `node tools/make-placeholders.mjs`.

| Key | Kind | Anims (frames @ fps) | Frames | ASTC page budget | Source |
|---|---|---|---|---|---|
| `yetti_salsero` | variant | idle 6@12, walk 8@12, spin 4@16, lunge 4@16, hurt 3@14, knockdown 5@14 | 30 | ≤ 1.0 MiB | ChatGPT image gen sheet (Jason login), slice per role-sheet rules. Gemini for alternates. |
| `yetti_tagger` | variant | idle 6@12, walk 8@12, shake 4@16, throw 6@16, hurt 3@14, knockdown 5@14 | 32 | ≤ 1.0 MiB | same |
| `yetti_minero` | variant | walk 8@12, lamp 4@12, slam 6@16, hurt 3@14, knockdown 5@14 | 26 | ≤ 1.0 MiB | same |
| `yetti_bailiff` | variant | idle 6@12, walk 8@12, block 2@10, grab 4@16, hold 2@8, hurt 3@14, knockdown 5@14 | 30 | ≤ 1.0 MiB | same |
| `bouncer` | boss | walk 8, block 2, grab 4, hold 2, rush 6, stomp 4, roar 4, hurt 3, down 5 | 38 | ≤ 1.25 MiB | same |
| `dj` | boss | idle 6, scratch 6, drop 6, roar 4, hurt 3, down 5 | 30 | ≤ 1.25 MiB | same |
| `celestina` | boss | walk 8, toss 6, blink 4, ring 4, hold 2, rush 6, roar 4, hurt 3, down 5 | 42 | ≤ 1.25 MiB | same |
| `archyetti` | boss | walk 8, gavel 6, verdict 4, rush 6, roar 4, floored 4, hurt 3, down 5 | 40 | ≤ 1.25 MiB | same |
| `claudia` | existing stand-in | reused in the S6 altar and S7 cage | 0 new | 0.06 MiB (existing) | none |

Also needed:
- **Projectile and FX draws.** The `'splat'` puddle, vinyl `'halo'` disc tint, bouquet tint, gavel shockwave and minero lamp band are **code-drawn** in `src/game-scene.js`, the same way halos and shockwaves are drawn today. No atlas.
- **Boss anim mapping.** `src/game-scene.js:154` picks boss anims with per-type ternaries. Generalise it to a per-type state→anim map in `TYPES[type].anims`. The existing three bosses must map exactly as they do today.

**GPU residency per stage.** Estimates from `_pack_report.json`: shared kit ≈ 8.22 MiB ASTC (the Stage 1 kit of 8.370 minus `interventionist` 0.155).

| Stage | `STAGE_CHARS` = shared + | ASTC est. | RGBA (IMG fallback) est. | Cap |
|---|---|---|---|---|
| S1 (live) | interventionist | 8.37 | 33.48 | |
| S4 | salsero, bouncer | ≤ 10.5 | ≤ 42 | **≤ 12 MiB ASTC, ≤ 48 MiB RGBA** |
| S5 | salsero, tagger, dj | ≤ 11.5 | ≤ 46 | same |
| S6 | tagger, minero, celestina, claudia | ≤ 11.6 | ≤ 46.5 | same |
| S7 | minero, bailiff, archyetti, claudia | ≤ 11.6 | ≤ 46.5 | same |

All of these are under the **60 MiB** budget target in `docs/GPU-MEMORY.md`. Stage changes keep releasing exclusive pages through `residencyDelta` / `releaseChars` (`tests/campaign-sim.test.mjs:3`).

**ASK JASON** if "stay under stage-1 ASTC ceilings" means the literal 8.37 MiB Stage 1 kit and not the 60 MiB budget. If it does, every new stage can carry only **one** variant plus a boss painted at ≤ 0.6 MiB. Then `STAGE_VARIANTS` becomes one per stage, and the S5–S7 waves swap the second variant for core roles.

### 4.3 Voice lines

Path convention: `assets/audio/voice/<id>.mp3`, mono 24 kHz 64 kbps mp3 with loudnorm (`voice-manifest.json` `format`).
- Add each id to `LINES` and, once its mp3 exists, to `PRESENT` in `src/voice-lines.js`. Lines that are not in `PRESENT` still caption and are not fetched (`src/audio.js:12`), so code passes can land caption-only.
- Update `assets/audio/voice-manifest.json`: `present`, `line_count`, credits.
- Model `eleven_v3`, the same as the current manifest.

| id | Cast key → voice_id | Text (exact) | Chars |
|---|---|---|---|
| `claudia_s4` | Claudia `5GR0JTHRVmv00OeaRI9u` | Bob! Not again! | 15 |
| `bob_s4` | Bob `6q6UVsvekS0UjrUXFz79` | Again? Seriously? | 17 |
| `bouncer_intro` | Yetti `onwK4e9ZLuTAKqWW03F9` (reuse) | You're not on the list, Papi. | 29 |
| `bouncer_phase2` | Yetti | The rope comes out now. | 23 |
| `bouncer_phase3` | Yetti | Club's closed. Forever. | 23 |
| `bouncer_defeat` | Yetti | Fine. You're on the list. | 25 |
| `claudia_s5` | Claudia | Bob! Up here! The cable car! | 28 |
| `bob_s5` | Bob | Going up, Yettis! | 17 |
| `dj_intro` | **DJHalo (new)** | Hands up for heaven! Not you, Bob. | 34 |
| `dj_phase2` | DJHalo | Let me scratch that. | 20 |
| `dj_phase3` | DJHalo | Wait for it… the DROP! | 22 |
| `dj_defeat` | DJHalo | Mic… dropped. | 13 |
| `bob_s6` | Bob | Down we go. | 11 |
| `celestina_intro` | **Celestina (new)** | Ay, Bob. I found her a nice Yetti husband. | 42 |
| `claudia_s6` | Claudia | I am NOT marrying a Yetti! | 26 |
| `celestina_phase2` | Celestina | Something borrowed… something YOU. | 34 |
| `celestina_phase3` | Celestina | Everyone! To the altar! | 23 |
| `celestina_defeat` | Celestina | Fine! Marry the eggplant man! | 29 |
| `bob_s7` | Bob | Court's in session, Yetti! | 26 |
| `archyetti_intro` | Wingman `6sFKzaJr574YWVu4UuJF` (reuse) | Bob. This court finds you… not a Papacito. | 42 |
| `archyetti_phase2` | Wingman | The verdict is snow. | 20 |
| `archyetti_phase3` | Wingman | Order! ORDER in my court! | 25 |
| `archyetti_defeat` | Wingman | The court… is adjourned. | 24 |
| `claudia_s7` | Claudia | Took you long enough, Papacito. | 31 |
| `dad_s7` | Dad `1S9vaAuPfgP7iQzynh4n` | That's my boy! Wicked big Papacito! | 35 |
| `nar_ch4`..`nar_ch7` | Narrator (Jason IndexTTS 2.5, **local, 0 credits**) | Chapter Four. The Afterparty Relapse. / Chapter Five. The Gondola of No Return. / Chapter Six. The Salt Mine Afterhours. / Chapter Seven. The Papacito Tribunal. | n/a |

New casting. Add both to `voice-cast.json` once Jason picks the voice IDs:
- **DJHalo.** ElevenLabs Voice Library: "hype Latin club DJ / radio host, male 30s, Colombian-accented English, big energy, takes reverb well". v3 tags `[excited]`, `[shouting]`. If nothing fits, use **Yetti** (Daniel) with `[excited]`.
- **Celestina.** Library: "sly older Colombian tía matchmaker, female 50s, warm and slightly raspy, theatrical". v3 tags `[playful]`, `[dramatic]`. If nothing fits, ship caption-only. Do not reuse Claudia, because they share a scene.

**Credit estimate.** About 634 characters ElevenLabs-side. At about 1 credit per character on `eleven_v3` × 3 takes, that is ≈ 1,900 credits, plus about 300 for auditioning two library voices. **Ceiling: 2,500 credits.**
- For scale, the Oct 28 Dad+Bob re-render was about 572 (`voice-manifest.json` `credits`).
- Narrator lines are local IndexTTS.
- Rendering runs on Jason's box (API key). The cloud builder lands caption-only.
- Model the script on `/workspace/rwb-dialogue-ref/tools/tts-stage3-lines.py`. Read IDs from `assets/audio/voice-cast.json`. Never hard-code a key.

### 4.4 Music cues: **ASK JASON BEFORE SPENDING**

The default costs nothing. Extend the id list in `src/audio.js:210` with `stage4..7` and `boss4..7`, all mapping to the existing `assets/audio/bdb-rise.mp3`, the same as stages 1–3 today. That is all Passes A–D do.

| Cue id | Wanted feel | Path if approved | Status |
|---|---|---|---|
| `stage4` / `boss4` | Salsa brava / timba loop; boss: brass-stab salsa dura | `assets/audio/music/stage4.mp3`, `boss4.mp3` | **ASK JASON BEFORE SPENDING** |
| `stage5` / `boss5` | Dembow / champeta street party; boss: picó bass-heavy drop | `stage5.mp3`, `boss5.mp3` | **ASK JASON BEFORE SPENDING** |
| `stage6` / `boss6` | Dark electro-cumbia / cumbia rebajada; boss: wedding-march cumbia | `stage6.mp3`, `boss6.mp3` | **ASK JASON BEFORE SPENDING** |
| `stage7` / `boss7` | Orchestral cumbia with vallenato accordion; boss: court-drama epic | `stage7.mp3`, `boss7.mp3` | **ASK JASON BEFORE SPENDING** |
| `finale` sting | 10–15 s victory sting over the `victory` clip end | `finale.mp3` | **ASK JASON BEFORE SPENDING** |

No source tool is assumed. If Jason approves, he picks the tool and the budget. Loops ≤ 90 s, mp3 128 kbps, streamed like the current `MUSIC` entries.

### 4.5 Cutscenes

No new clips by default. S4 replays the existing `'kidnap'` clips, and S7 uses the existing `'victory'` clip (`src/cutscene.js:33,35`). New Grok Imagine clips (a re-kidnap at the party, the tribunal rescue) would need a `STAGE_CLIPS` edit, and an earlier pass locked that table. **Ask Jason first. No Seedance and no Manus.**

---

## 5. Build passes for Grok 4.7 (Cursor)

Each pass is stacked: A from `main@8c06396`, B from A's tip, and so on. Each pass opens a **draft PR** into the previous pass's branch (A into `main`). Nobody merges, and nothing touches Pages, until **Jason says "preview yes"**. Preview link: `https://raw.githack.com/jfeldman9-rgb/bdb-rwb/<commit-sha>/index.html?stage=N` (`?stage` is bounded by the save's `unlockedStage`, `src/main.js:36`).

### Pass A: Stage 4 plus the shared plumbing (branch `cursor/bdb-level-4`)

**Goal.** Grow the campaign from 3 to 4 stages without changing S1–S3 behaviour by a single bot-sim number. Ship Stage 4 (The Afterparty Relapse) with the Salsero variant and The Bouncer.

**Builder prompt (paste as-is):**
```
You are building Bob's Dating Brawl (BDB) Stage 4 in repo jfeldman9-rgb/bdb-rwb.
Read docs/PLAN-levels-4-7.md fully first; §2.0, §2.0.1, §2.1, §3, §4 and §5 Pass A are your spec.
Branch: create cursor/bdb-level-4 from main@8c06396. Open a DRAFT PR into main. Never merge.
Never push to or change GitHub Pages, and never deploy, until Jason replies "preview yes".

LOCKED — do not change (see §3 of the plan for the full list):
- eggplant vy=0 (src/eggplant.js:4, :24) and GUN
- CAM_LEAD=0.28 (src/config.js:4) and ALL camera/scroll code (src/camera.js incl. lockSnaps,
  src/zone-stream.js functions/constants, src/parallax.js). Only ADD STREAMS[4].
- no upgrade shop, ever
- Bob quotes verbatim "I brought the eggplant." / "Die, Yetti, die!" (docs/BOB-LINES.md:8-9,19)
- Choirmaster hp 1140, BOSS_ADDS/BOSS_COOL.choirmaster, choir branch, choirMultiplier 1.28
  (src/yettis.js:11,21,23,88,189-194)
- BARK gap 8 / cap 3 / window 60 (src/barks.js:9,12,13); no new ambient groups
- PAPI_RUNNER_* (src/papacito.js:5-6), papiTime, all of src/dad-call.js, all of src/wingman.js
- src/stage1-def.js, stage2-def.js, stage3-def.js byte-identical; NIGHTMARE_S3*, snowClearZ
- STAGE_CLIPS / STORY_MAX_MS and cutscene mp4 bytes
- never re-encode existing assets/bg or assets/chars files (use --only for new keys)
- existing tests: edit ONLY the assertions that hard-code 3 as the final stage (listed below)

Step 0 (baseline): at 8c06396 run `npm test` and record the pass count. Run
`node tools/bot-sim.mjs adventure 30|60|120`, `story 60`, `nightmare 60`, and save the JSON to
logs/baseline-8c06396-<diff>-<hz>.json.

Step 1 (shared plumbing):
- src/stages.js: import STAGE4. STAGES = {1,2,3:Object.freeze({...STAGE3,next:4}),4}. maxStage=4.
  Add STAGE_VARIANTS={1:[],2:[],3:[],4:['salsero']} and CAGED=new Set([3]).
  STAGE_CHARS[4]=[...shared,'yetti_salsero','bouncer'].
- src/yettis.js: replace hard-coded type lists (HEAVY :82, snowball list :188, grab list :196,
  ranged list :221, shield :133) with TYPES flags (shield/heavy/grab/ranged). Legacy types must
  resolve to identical flags (add a test). Add TYPES.salsero {hp:30,speed:130,art:'yetti_salsero',
  lunge:{reach:260,tell:.55,over:60,min:.3,max:.5},laneHop:1.4} and TYPES.bouncer {hp:1260,
  speed:80,art:'bouncer',boss:true,shield:true,grab:true}. Add new keys ONLY to BOSS_ADDS
  ({bouncer:[[],['salsero','walker'],['guard','salsero','charger']]}) and BOSS_COOL ({bouncer:[1.3,1.1,.9]}).
  Implement the salsero lane-hop and lunge, and the bouncer phases from §2.1 (shield re-arms on roar,
  P2 charge, P3 two-way stomp and a 12 s re-shield). Emit voice `${type}_phase2/3` on a gate and
  `${type}_defeat` on KO for NEW boss types only.
- src/campaign.js:
  - victory stays "def.next null".
  - Clear banner: !def.next ? STORY.finalVictory : stageNo===3 ? STORY.victory : 'CHAPTER CLEAR · EGO STILL INTACT'.
  - On the first loadStage(4) in a run, emit cutscene 'kidnap' (flag rekidnapPlayed).
  - Arm claudia_s4 @2s and bob_s4 @4.5s.
  - Add `get finisher(){return this.wingmen||this.court||null}` (court is filled in Pass D) and
    swap `this.wingmen?.phase/.ready` reads at :270, :292 and :494 for it. At :494 push `${this.stageNo}:`.
- src/bot.js:10,12 and src/hud.js:6,58: read w.finisher instead of w.wingmen.
  S1–S3 behaviour must be identical.
- src/game-scene.js: draw the Claudia cage for CAGED.has(stageNo) (was stageNo===3).
  Boss anim mapping at :154 goes through TYPES[type].anims, with an identical mapping for the existing bosses.
- src/save.js: clamp unlockedStage to maxStage. `beaten` is still set on the stage-3 clear (Nightmare unlock).
  beaten saves normalise to unlockedStage>=4.
- index.html:69: add <option value="4">04 · Afterparty</option>.
- src/audio.js:210: add 'stage4','boss4' ids mapping to the existing bdb-rise.mp3 (NO new music).
- src/story.js: add STORY.finalVictory='CLAUDIA RESCUED. FOR REAL THIS TIME.'
- tools/bot-sim.mjs: loop stages 1..maxStage. Campaign cap 3000 s.
- tools/voice-rate.mjs: accept a {stage} option.
- tools/browser-smoke.mjs: add --from=N (seed the save's unlockedStage, play ?stage=N&demo=1 to that
  stage's clear, screenshot each plate run).
- Allowed edits to existing tests, and only these:
  - campaign-sim.test.mjs:2: stages = 1..maxStage, unlockedStage = maxStage, step cap rate*3000,
    papi bound -> papi/(elapsed/60) <= 1.8.
  - save.test.mjs: assertions that assume 3 is the last stage.
  - length-difficulty.test.mjs:45: "uses every Yetti role" -> uses every core role plus exactly its
    STAGE_VARIANTS, and only those.

Step 2 (Stage 4 content): create src/stage4-def.js exactly as in plan §2.1 (key rumba, pace 1.15,
hpScale 2.2, next null for now). Add STREAMS[4] (mid0..4 zones, mid5 boss) and the MANIFEST.json "s4" row.

Step 3 (art):
- Plates: generate s4-far, s4-floor and s4-mid0..5 with Cursor GenerateImage (beats in plan §2.1,
  style refs assets/bg/s3-mid0.webp + chapter1-boulevard.webp). If generation is unavailable, add
  s4-* derived entries to tools/derive-plates.py behind a new --only filter and run it for s4- only.
- Sprites: add STANDINS for yetti_salsero and bouncer and run node tools/make-placeholders.mjs.
  When Jason drops painted frames in /workspace/bdb-art/sprites, switch them to REAL and run
  `python3 tools/pack-flat.py --only yetti_salsero,bouncer`.
- Update docs/GPU-MEMORY.md with an S4 row from _pack_report.json.

Step 4 (voice): add the §4.3 S4 ids and nar_ch4 to LINES. Leave them out of PRESENT until the mp3s exist
(caption-only). Do NOT call ElevenLabs. Jason renders on his box.

Step 5 (measure and report): run bot-sim adventure 30/60/120, story 60 and nightmare 60. Put a table in
docs/LENGTH-DIFFICULTY.md under "Stages 4–7" and in the PR body. Tune ONLY stage4-def.js and the new
TYPES/BOSS_* keys, in the plan §5 Pass E ladder order.
Do not use any paid service. Stop and report if anything in the LOCKED list would have to change.
```

**Acceptance (Pass A):**
1. **Golden S1–S3.** `bot-sim` fresh-stage results for stages 1–3 (`seconds, hurts, deaths, papi, dad, kos, phases`) are **identical** to `logs/baseline-8c06396-*` at 30/60/120 Hz for adventure, story and nightmare. The campaign's first three `stageTimes` are identical too.
2. **S4 Adventure:** fresh start 175–205 s target, 140–240 hard, at each of 30/60/120 Hz. Campaign-continuation S4 is also 140–240. S4 hits ≥ 6, deaths ≤ 4.
3. Story and Nightmare S4 numbers are reported. Nightmare may be uncleared, but it must end within the 1800 s cap without throwing.
4. `npm test` passes all tests, with a count ≥ baseline + the new tests. New tests:
   - `tests/levels-4-7.test.mjs` hashes `JSON.stringify` of STAGE1, STAGE2 and the raw STAGE3 import, plus core `TYPES` / `BOSS_*` entries for interventionist and choirmaster, against the baseline.
   - Legacy type flags are identical.
   - S4 geometry and wave rules, recomputing the §2 tallies.
   - Every `STREAMS[4]` key exists as `assets/bg/<key>.webp`.
   - Every `STAGE_CHARS[4]` key has `-0.webp/.astc.ktx/.etc2.ktx/.json` plus `.anims.json`.
   - Every `PRESENT` id has an mp3.
   - `deepEqual(BARK, {...})` against the current values.
   - S4 waves use only core roles plus `STAGE_VARIANTS[4]`.
5. `runVoiceRate({stage:4, hz:60})`: ambient ≤ 4/min, total ≤ 7/min, min gap ≥ 7.95 s.
6. `npm run smoke -- --from=4` clears S4 in headless Chrome, with screenshots of all 6 plate runs. `npm run smoke` (from S1) still reaches victory, now after S4.
7. GPU: the S4 kit is ≤ 12 MiB ASTC and ≤ 48 MiB RGBA in `_pack_report.json`.
8. `git diff main -- src/stage1-def.js src/stage2-def.js src/stage3-def.js src/eggplant.js src/config.js src/camera.js src/barks.js src/papacito.js src/dad-call.js src/wingman.js src/cutscene.js assets/cutscenes assets/audio/voice/bdb_open.mp3 assets/audio/voice/bdb_produce.mp3` is **empty**.

### Pass B: Stage 5 (branch `cursor/bdb-level-5`)

**Goal.** Add Stage 5 (The Gondola of No Return) with the Tagger variant, its paint-splat hazard and DJ Halo. S1–S4 numbers do not move.

**Builder prompt:**
```
You are building BDB Stage 5 in jfeldman9-rgb/bdb-rwb. The spec is docs/PLAN-levels-4-7.md §2.0, §2.0.1, §2.2, §3, §4, §5 Pass B.
Branch: cursor/bdb-level-5 from the tip of cursor/bdb-level-4. DRAFT PR into cursor/bdb-level-4. Never merge.
No Pages and no deploy until Jason says "preview yes".

LOCKED (plan §3): eggplant vy=0 (src/eggplant.js:4,:24); CAM_LEAD 0.28 (src/config.js:4) and all
camera/scroll code (only ADD STREAMS[5]); no shop; Bob quotes "I brought the eggplant." / "Die, Yetti, die!"
verbatim; Choirmaster hp 1140, its adds, cooldowns and branch, and choirMultiplier 1.28 (src/yettis.js:11,21,23,88,189-194)
— DJ Halo is NEW code, never a Choirmaster edit; BARK gap 8 / cap 3 (src/barks.js:9,12); PAPI_RUNNER_*, papiTime,
src/dad-call.js, src/wingman.js; stage1-3 defs byte-identical; STAGE_CLIPS; no re-encode of existing assets;
no edits to existing tests except where a test hard-codes the final stage number.

Step 0: record bot-sim baselines at the cursor/bdb-level-4 tip (adventure 30/60/120, story 60, nightmare 60)
to logs/baseline-level4-<diff>-<hz>.json.
Step 1: src/stage5-def.js exactly as plan §2.2 (key cable, pace 1.18, next null). Set stage4-def.js next:5.
  - stages.js: maxStage=5, STAGE_VARIANTS[5]=['salsero','tagger'], STAGE_CHARS[5]=[...shared,'yetti_salsero','yetti_tagger','dj'].
  - STREAMS[5], MANIFEST "s5", index.html option "05 · Gondola", audio ids stage5/boss5 -> bdb-rise.mp3.
Step 2: TYPES.tagger {hp:36,speed:100,art:'yetti_tagger',ranged:true,paint:{ttl:1.4,w:80}}.
  - New hostile kind 'splat': speed 0, ttl. It hurts Bob once if he is on the ground (z<65) within w/2
    and in the same lane. Code-drawn magenta puddle in game-scene.js.
  - TYPES.dj {hp:1200,speed:60,art:'dj',boss:true,ranged:true}, its phases as in §2.2,
    BOSS_ADDS.dj=[['walker','tagger'],['hover','tagger','walker'],['charger','salsero','hover']], BOSS_COOL.dj=[1.5,1.2,1.0].
  - The bot keeps using only its existing controls. It already jumps near hostiles (src/bot.js:26).
Step 3: art as in Pass A step 3, for s5-* plates and yetti_tagger / dj atlases (STANDINS first, then REAL --only).
Step 4: voice ids from plan §4.3 for S5 plus nar_ch5, caption-only. No ElevenLabs calls.
Step 5: measure, tune ONLY stage5-def.js and the new keys (Pass E ladder), and report the tables in the PR
and docs/LENGTH-DIFFICULTY.md. Update GPU-MEMORY.md. No paid services. Stop if a locked item would have to change.
```

**Acceptance (Pass B):**
1. S1–S4 fresh-stage bot-sim output is identical to `logs/baseline-level4-*`.
2. S5 Adventure fresh start: 185–215 s target, 140–240 hard at 30/60/120. Campaign S5 is 140–240. Hits ≥ 6.
3. Story and Nightmare reported. Nightmare ends without throwing.
4. `npm test` all pass, plus new tests:
   - S5 geometry, waves and variants.
   - The splat hazard: it hurts once, a jump clears it, and it expires at the ttl.
   - The tagger counts toward `MAX_RANGED_PER_LANE`.
   - Asset presence for S5.
   - `BARK` unchanged.
   - The Choirmaster entries hash is unchanged.
5. `runVoiceRate({stage:5})` is within the Pass A limits.
6. `npm run smoke -- --from=5` clears, with 6 plate-run screenshots.
7. S5 kit ≤ 12 MiB ASTC and ≤ 48 MiB RGBA.
8. The same empty-diff check over the locked files as Pass A, now against `cursor/bdb-level-4`.

### Pass C: Stage 6 (branch `cursor/bdb-level-6`)

**Goal.** Add Stage 6 (The Salt Mine Afterhours) with the Minero variant, La Celestina (blink and grab) and Claudia on the altar.

**Builder prompt:**
```
You are building BDB Stage 6 in jfeldman9-rgb/bdb-rwb. The spec is docs/PLAN-levels-4-7.md §2.0, §2.0.1, §2.3, §3, §4, §5 Pass C.
Branch: cursor/bdb-level-6 from the tip of cursor/bdb-level-5. DRAFT PR into cursor/bdb-level-5. Never merge.
No Pages and no deploy until Jason says "preview yes".

LOCKED (plan §3): eggplant vy=0 (src/eggplant.js:4,:24); CAM_LEAD 0.28 (src/config.js:4) and all
camera/scroll code (only ADD STREAMS[6]); no shop; Bob quotes "I brought the eggplant." / "Die, Yetti, die!"
verbatim; Choirmaster hp 1140, its adds, cooldowns and branch, and choirMultiplier 1.28 (src/yettis.js:11,21,23,88,189-194);
BARK gap 8 / cap 3 (src/barks.js:9,12); PAPI_RUNNER_*, papiTime, src/dad-call.js, src/wingman.js (copy
the safeBand pattern into new celestina code, do not edit wingman.js); stage1-3 defs byte-identical;
STAGE_CLIPS; no re-encode of existing assets; existing tests untouched except final-stage-number assertions.

Step 0: baselines at the cursor/bdb-level-5 tip -> logs/baseline-level5-*.
Step 1: src/stage6-def.js exactly as plan §2.3 (key salt, pace 1.20, next null). stage5-def.js next:6.
  - maxStage=6. STAGE_VARIANTS[6]=['tagger','minero'].
  - STAGE_CHARS[6]=[...shared,'yetti_tagger','yetti_minero','celestina','claudia']. CAGED.add(6) (draw it as an altar arch).
  - STREAMS[6], MANIFEST "s6", index.html "06 · Salt Mine", audio stage6/boss6 -> bdb-rise.mp3.
Step 2: TYPES.minero {hp:48,speed:75,art:'yetti_minero',heavy:true,lamp:{tell:.8}}.
  - Lamp tell: draw the lane band. Then a one-way 'shockwave' along the lane.
  - TYPES.celestina {hp:1300,speed:85,art:'celestina',boss:true,grab:true}.
  - 'blink' state 0.4 s, canBeHit false, deterministic reposition 300-500 px from actorId+volley.
  - P2 ring grab. P3 bridal-train rush plus 2-lane bouquets with one safeBand.
  - BOSS_ADDS.celestina=[['walker','tagger'],['minero','guard'],['charger','minero','tagger']], BOSS_COOL.celestina=[1.4,1.15,.95].
  - Arm claudia_s6 at +3.5 s after the boss intro. Defeat banner 'THE YETTIS GRAB CLAUDIA. UP THE SHAFT!'.
Step 3: art for s6-* plates (no real religious iconography, the altar is a crystal wedding arch),
  yetti_minero and celestina atlases (STANDINS, then REAL --only).
Step 4: S6 voice ids plus nar_ch6, caption-only.
Step 5: measure, tune ONLY stage6-def.js and the new keys, report, update GPU-MEMORY.md. No paid services.
```

**Acceptance (Pass C):**
1. S1–S5 output is identical to `logs/baseline-level5-*`.
2. S6 Adventure fresh start: 195–225 s target, 140–240 hard at 30/60/120. Campaign S6 is 140–240. Hits ≥ 6.
3. Story and Nightmare reported.
4. `npm test` all pass, plus:
   - S6 rules.
   - Blink is deterministic: two runs at the same Hz give the same positions.
   - Dad and Papi refuse during blink (`isBossBragging`).
   - Minero poise is heavy.
   - Asset presence.
   - `BARK` and Choirmaster unchanged.
5. Voice rate is within limits.
6. `smoke --from=6` clears.
7. S6 kit is within the GPU caps.
8. The locked-file diff is empty.

### Pass D: Stage 7 finale (branch `cursor/bdb-level-7`)

**Goal.** Add Stage 7 (The Papacito Tribunal) with the Bailiff variant and the Arch-Yetti, whose phase III ends only by the Papacito finisher. Move the campaign's final victory to S7.

**Builder prompt:**
```
You are building BDB Stage 7 (finale) in jfeldman9-rgb/bdb-rwb. The spec is docs/PLAN-levels-4-7.md §2.0, §2.0.1, §2.4, §3, §4, §5 Pass D.
Branch: cursor/bdb-level-7 from the tip of cursor/bdb-level-6. DRAFT PR into cursor/bdb-level-6. Never merge.
No Pages and no deploy until Jason says "preview yes".

LOCKED (plan §3): eggplant vy=0 (src/eggplant.js:4,:24); CAM_LEAD 0.28 (src/config.js:4) and all
camera/scroll code (only ADD STREAMS[7]); no shop; Bob quotes "I brought the eggplant." / "Die, Yetti, die!"
verbatim; Choirmaster hp 1140, its adds, cooldowns and branch, and choirMultiplier 1.28 (src/yettis.js:11,21,23,88,189-194);
BARK gap 8 / cap 3 (src/barks.js:9,12); PAPI_RUNNER_* (src/papacito.js:5-6), papiTime, canActivatePapacito,
papacitoEffect, all of src/dad-call.js, all of src/wingman.js — the Arch-Yetti IMPORTS applyBossDamage and
isBossFinisherReady and copies the 8 s softlock-trio rule (src/wingman.js:115-119) into new code; stage1-3 defs
byte-identical; STAGE_CLIPS (S7 uses the existing 'victory' key); no re-encode of existing assets; existing tests
untouched except final-stage-number assertions.

Step 0: baselines at the cursor/bdb-level-6 tip -> logs/baseline-level6-*.
Step 1: src/stage7-def.js exactly as plan §2.4 (key tribunal, pace 1.22, next null). stage6-def.js next:7.
  - maxStage=7. STAGE_VARIANTS[7]=['minero','bailiff'].
  - STAGE_CHARS[7]=[...shared,'yetti_minero','yetti_bailiff','archyetti','claudia']. CAGED.add(7).
  - STREAMS[7], MANIFEST "s7", index.html "07 · Tribunal", audio stage7/boss7 -> bdb-rise.mp3.
Step 2: TYPES.bailiff {hp:54,speed:70,art:'yetti_bailiff',shield:true,heavy:true,grab:true}.
  - New src/archyetti.js: ArchYetti (hp 1380, BOSS_GATES phases, P3 floor at 1 via applyBossDamage(3,..),
    canBeHit false while hp<=1) and a TribunalCourt controller {phase, ready, complete, softlockTime}.
  - Campaign sets this.court for type 'archyetti'. this.finisher already routes the Papi finisher,
    the bot and the HUD to it.
  - Phases as in §2.4. BOSS_COOL.archyetti=[1.3,1.1,.9].
    Adds: [['bailiff','walker'],['minero','bailiff','hover'],['bailiff','minero','charger']].
  - Final victory (S7 only): existing 'victory' clip + nar_victory + claudia_s7 (instead of claudia_leave) + dad_s7.
    The S3 clear still shows STORY.victory and continues to S4.
Step 3: art for s7-* plates (the purple car in mid3, the ladies in the mid5 balcony), yetti_bailiff and archyetti atlases.
Step 4: S7 voice ids plus nar_ch7, caption-only.
Step 5: measure, tune ONLY stage7-def.js and the new keys, report, update GPU-MEMORY.md. No paid services.
```

**Acceptance (Pass D):**
1. S1–S6 output is identical to `logs/baseline-level6-*`.
2. S7 Adventure fresh start: 205–235 s target, 140–240 hard at 30/60/120. Campaign S7 is 140–240. The phase list includes `7:2` and `7:3`. The bot uses the Papi finisher, so `stats.papi` rises during the S7 boss.
3. The full campaign reaches `victory` with `stats.stages = [1..7]`, `unlockedStage 7`, `beaten true`, `dadCall.calls ≤ 3`, and Papi ≤ 1.8/min.
4. `npm test` all pass, plus:
   - The Arch-Yetti floors at 1.
   - The finisher kills it.
   - A softlock trio drops after 8 s with 0 charges.
   - Dad's swat can't kill it in P3.
   - S3 Wingmen tests are unchanged and pass.
5. `smoke --from=7` reaches the victory panel. A full `npm run smoke` reaches victory after S7. If the harness timeout must grow, grow it in `browser-smoke.mjs` only.
6. Voice rate is within limits for S7, including the final-victory lines.
7. S7 kit is within the GPU caps.
8. The locked-file diff is empty.

### Pass E: balance and integration (branch `cursor/bdb-levels-4-7-balance`)

**Goal.** Make all four new stages sit in their target bands at 30/60/120 Hz, both fresh and in the campaign. Swap any derived or stand-in art that has arrived for the painted versions, wire the voice mp3s Jason rendered, and write the measurement doc. Do this without moving a single S1–S3 number.

**Builder prompt:**
```
You are doing the BDB Stages 4–7 balance and integration pass in jfeldman9-rgb/bdb-rwb.
The spec is docs/PLAN-levels-4-7.md (all of it, §2.5 targets and the §5 Pass E ladder especially).
Branch: cursor/bdb-levels-4-7-balance from the tip of cursor/bdb-level-7. DRAFT PR into cursor/bdb-level-7. Never merge.
No Pages and no deploy until Jason says "preview yes".

LOCKED (plan §3): eggplant vy=0 (src/eggplant.js:4,:24); CAM_LEAD 0.28 (src/config.js:4) and all
camera/scroll code; no shop; Bob quotes "I brought the eggplant." / "Die, Yetti, die!" verbatim;
Choirmaster hp 1140, its adds, cooldowns and branch, and choirMultiplier 1.28 (src/yettis.js:11,21,23,88,189-194);
BARK gap 8 / cap 3 (src/barks.js:9,12); PAPI_RUNNER_*, papiTime, src/dad-call.js, src/wingman.js; stage1-3 defs
byte-identical; NIGHTMARE_S3*; STAGE_CLIPS; existing assets not re-encoded. You may ONLY tune
stage4..7-def.js and the NEW TYPES/BOSS_ADDS/BOSS_COOL keys (salsero, tagger, minero, bailiff,
bouncer, dj, celestina, archyetti), in the ladder order below.

1. Baseline: run bot-sim adventure/story/nightmare at 30/60/120 for every stage plus the campaign. Save to logs/.
2. For each new stage outside its §2.5 Adventure target (fresh OR campaign-continuation, any Hz), apply the
   ladder in order, one step at a time, re-measuring after each:
   (1) add/remove the trailing straggler of zone 5 wave 3 (start with S7);
   (2) swap one variant entry for a core role (or back) in zones 4–5;
   (3) variant base HP ±6;
   (4) new boss HP ±10% (stay in the §2 bands);
   (5) new boss BOSS_COOL ±0.1;
   (6) a `shakes:true` zone (Papi starvation only, max one per stage, justify it in the PR);
   (7) stage pace ±0.02 (stay <= 1.25).
   Never touch hpScale unless steps 1–7 fail; then ask Jason.
3. Hits >= 6 per new stage (no steamroll). Deaths <= 4 per stage at 60 Hz Adventure.
4. Swap any painted art that has arrived (REAL --only), re-run compress, and update GPU-MEMORY.md for S4–S7.
5. Wire the voice mp3s Jason rendered (add them to PRESENT and voice-manifest.json). Run voice-rate per stage.
6. Write docs/LENGTH-DIFFICULTY.md "Stages 4–7" with the full 3×3 table (difficulty × Hz) per stage, the campaign
   totals, and known gaps. Put the same table in the PR body. Do not use paid services.
```

**Acceptance (Pass E):**
1. **Adventure, fresh start**, each of S4–S7 at each of 30/60/120 Hz: inside the §2.5 target, and always 140–240 s.
2. **Adventure, campaign continuation:** every `stageTimes[i]` for stages 1–7 is 140–240 s at each Hz, and the total is ≈ 1330–1450 s.
3. The S1–S3 entries in all reports are identical to the `8c06396` baselines.
4. Story and Nightmare: the full table is reported. Story stages are expected around 120–165 s and must clear. Nightmare **may stay uncleared** (§6), but it must not throw, and its result must be recorded.
5. `npm test` all pass. The count is ≥ the Pass D count.
6. `runVoiceRate` per stage: ambient ≤ 4/min, total ≤ 7/min, gap ≥ 7.95 s. `deepEqual(BARK)` is unchanged.
7. Asset presence: all 32 plates; 8 new atlases × 5 files; every `PRESENT` voice id has an mp3. Placeholder art is listed explicitly in the PR as "still placeholder".
8. GPU: every S4–S7 kit is ≤ 12 MiB ASTC and ≤ 48 MiB RGBA. `docs/GPU-MEMORY.md` has a table row for each.
9. `npm run smoke` reaches victory after S7. `smoke --from=N` passes for N = 4..7.
10. The locked-file diff against `main@8c06396` is empty.

---

## 6. Risks and out-of-scope

**Risks**
- **Nightmare may remain uncleared by the bot.** This is a known S2/S3 gap (`docs/LENGTH-DIFFICULTY.md`, "Known gaps"). S4–S7 at pace 1.25 will likely snowball the same way. Report it; do not chase it in this plan, and do not add `NIGHTMARE_S4+` trims without Jason.
- **Dad is spent before S4 in a full run.** The Dad cap is locked at 3 per campaign (`src/dad-call.js:2`). Stages must be tuned for both the fresh case (Dad available) and the campaign case (Dad gone), which is why Pass E checks both. If the campaign case can't fit in 140–240 without breaking the fresh case, **ask Jason**. Do not change Dad caps.
- **S7 over 240 s.** It has the largest pool and the longest boss. The ladder starts there. If steps 1–5 can't bring it in, cut Arch-Yetti HP to the bottom of its band (1300) before touching anything shared.
- **Campaign test runtime.** A 7-stage, 3-rate campaign test is about 2.5× the current steps. If CI time becomes a problem, split it into a separate `campaign-long` test file. Do not lower the step rate.
- **Test edits.** The existing "uses every Yetti role" test, plus campaign and save assertions that hard-code stage 3 as final, have to change. Only those assertions may change, and the PR must list each one.
- **Shared refactor drift.** Flag-izing `yettis.js` lists and adding `finisher` could perturb S1–S3 by a frame. The golden bot-sim comparison in every pass catches that. Any non-identical S1–S3 number fails the pass.
- **Tool re-encode churn.** `tools/derive-plates.py` `main()` rewrites every `PLATES` entry, and `tools/pack-flat.py` without `--only` repacks every atlas. Both would churn S1–S3 files. Always filter to new keys and check `git status` before committing.
- **Art consistency.** Painted variants and bosses from ChatGPT/Gemini can come back at different scales. Normalise them to role-sheet feet (y=560) and height before packing. No faked frames: no mirrored or interpolated anim frames (the RWB rule, `/workspace/rwb-dialogue-ref/STAGE1.md`).
- **GPU interpretation.** See the §4.2 ASK JASON note on "stage-1 ASTC ceilings".
- **Cultural tone.** Settings are fictionalised Colombian nightlife. There are no real venues, logos, artists' murals or religious sites shown, and the comedy targets the Yettis, not the places.

**Out of scope**
- An upgrade shop. A camera, scroll or `CAM_LEAD` redesign. Eggplant arcs or new weapons.
- Retuning Choirmaster, Interventionist, Wingmen, or any S1–S3 wave.
- Denser ambient dialogue, new ambient bark groups, or changes to `BARK`.
- Any music spend (**ASK JASON BEFORE SPENDING**), new video clips or a `STAGE_CLIPS` change (ask first).
- **No Seedance, no Manus, and no other new paid services.** ElevenLabs is limited to the ≤ 2,500-credit estimate above, rendered by Jason.
- Merging to `main` or touching Pages without Jason's "preview yes".
