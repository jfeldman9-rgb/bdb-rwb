# BDB: Jason feedback, Oct 28. Investigation and build plan

Read-only investigation. No game source, asset, test, or git changes. The only write is this file.
Trees: `/workspace/bdb-plan` = `jfeldman9-rgb/bdb-rwb` main @ `ed26baf` (Pages live). `/workspace/rwb-dialogue-ref` = RWB `rwb-w2` @ `90b11f2`. `/workspace/bdb-art/cutscenes/intro-v3/` = intro art. It is not committed.
No quota or rate-limit errors happened this session.

## 0. Verified hashes

| File | md5 | Video frames | Notes |
|---|---|---|---|
| `bdb-plan/assets/cutscenes/intro_v3.mp4` (Pages, committed in `8c53d59`) | `e0f50a72e2fd75c0128d4a62d9f32cb7` | **1608** | Same file as `final/intro_v3_pre_yell.mp4`. **No yell. Dad shot missing.** |
| `bdb-art/.../final/intro_v3_pre_yell.mp4` | `e0f50a72…` | 1608 | Backup taken before the yell mix (GEN-LOG `bob_yell.backup`) |
| `bdb-art/.../final/intro_v3.mp4` | `ff4c0d20db1fe1480a0096a4c5bf1977` | **1608** | **Has the yell** (21.79–26.59 s). **The Dad shot is still missing.** |
| `bdb-art/.../_v3/intro_v3.mp4` = `final/intro_v3_pages.mp4` | `e1912568ec3d796b04d26f31b7627ae3` | **1847** | Older cut (`a873034`, 02:14). Dad is present but with the old full-white-hair likeness. No yell. |
| `bdb-art/.../final/intro_v3_hi.mp4` | `46b4e419…` | 1608 | Hi-bitrate master of the broken cut |
| `bdb-art/.../remix/video_concat.mp4` | `61944c5d…` | 1799 | Broken concat. It is the source of the broken cuts. |
| `/workspace/bdb-rwb/assets/cutscenes/intro_v3.mp4` (dirty) | **not verified.** The sandbox blocked md5 outside the three allowed dirs. | n/a | Jason says it matches `ff4c0d20`. If so, it has the same Dad gap. **Do not commit it as-is.** |

GEN-LOG yell, exact: `"line": "Hold on Claudia! Papacito is coming! It's eggplant time!"`, `g_start 21.79`, `g_end 26.59`, Benedict `6q6UVsvekS0UjrUXFz79`, `eleven_v3` (`GEN-LOG.json:56-66`). The shot list includes `s05_dad` (`SHOT-LIST.md:18`, `GEN-LOG.json:31-35`).

---

## 1. Root cause: the intro yell is missing

**Which file loads.** Title start → `src/main.js:42` `beginChapter` → `src/title-flow.js:6-9` returns key `'intro'` (`'intro_v2'` only with `?intro=v2`) → `src/cutscene-hooks.js:26,31` `player.play(STAGE_CLIPS[clipKey])` → `src/cutscene.js:15` `intro: ['intro_v3']` → `src/cutscene.js:169-170` sets `v.src = 'assets/cutscenes/intro_v3.mp4'`, poster `intro_v3.jpg`. The story cap is `STORY_MAX_MS = 90000` (`cutscene.js:25`, used at `cutscene-hooks.js:14`), so the whole 61.57 s clip plays. The old 30 s cut-off is fixed. The smoke test pins the same file (`tools/browser-smoke.mjs:165`).

**Why there is no yell.** The committed asset is the pre-yell cut:
- `git log -- assets/cutscenes/intro_v3.mp4`: the last change is `8c53d59` at 03:05:19 ("Dad likeness v4 … only Dad shot re-cut").
- The yell was mixed afterwards. GEN-LOG says `bob_yell.added 2026-10-28T03:23`. `final/intro_v3.mp4` is from 03:25, and `intro_v3_pre_yell.mp4` (03:21) is a byte-identical copy of what is committed (`e0f50a72`).
- Later passes kept `intro_v3.mp4` locked as "untouched" (`docs/OVERNIGHT-STATUS.md:89,134`; `docs/FIX-LIST.md:6,39,68,109`). Pass 6 says outright: "The Papacito shout is not in the tree" (`OVERNIGHT-STATUS.md:138`).
- Audio check, RMS from 21.5 to 21.6 s: Pages is about −50 dB (music bed only), final is about −37 dB, so the Pages cut has no yell. Per-second RMS from 20 to 28 s in `final/intro_v3.mp4` matches `remix/audio_mix.wav` within 0.07 dB. The yell is in the final's audio track.

**Restoring it.** Copying `final/intro_v3.mp4` (`ff4c0d20`) into the repo is not enough, because it inherits the broken video track (see §2). The fix is one rebuild that solves §1 and §2 together. This is **Step A** below: a local media job on the art box with ffmpeg, done before the Grok builder starts.

---

## 2. Root cause: the Dad scene is gone but his line remains

**This is not a code problem.** All 7 shots are in `remix/list.txt`, and `remix/timeline.json:107-123` places s05 at 35.48 s with the catchphrase at 35.93–40.49 s.

**It is a broken concat.** The `8c53d59` Dad re-cut produced `remix/shots/s05.mp4` at **24 fps, timebase 1/12288** (193 frames, 8.04 s). Every other shot is **30 fps, 1/15360** (for example `s04.mp4`: 243 frames, 30/1, 1/15360). Concatenating mismatched streams with stream copy lost the s05 frames:
- `video_concat.mp4` has 1799 frames. `intro_v3_hi.mp4`, the Pages file, and `final/intro_v3.mp4` all have **1608 frames** with `avg_frame_rate 48240/1847`. The good older cut (`e1912568`) has **1847 = 61.567 s × 30**.
- A frame dump of the Pages file and the yell final (`ffprobe … select='gte(t,35)*lte(t,44)'`) shows frames up to **35.433 s** and nothing until **43.433 s**. That is an **8.0 s hole** that covers the whole Dad shot.
- During the hole, the player holds the last s04 frame (Bob with the gun). The audio track still carries `dad_catchphrase` at 35.93–40.49. Subtitles are burned into the frames, so Dad's subtitle is lost along with the picture.

What Jason sees: a freeze, Dad's voice, and no Dad.

**The source art is fine.** `stills/s05_dad.jpg` (02:59) shows the v4 bald-fringe Dad swatting a Yetti with a "BDB" swatter while Bob cheers. `clips/enc/s05_dad_v.mp4` and `remix/shots/s05.mp4` are complete. Only the 24 fps stream needs normalising.

**Subtitles are not baked into the shots.** In the caption band, `remix/shots/s01.mp4` peaks at luma 185–193, while the Pages cut peaks at 255 where text is present. So the final step is: burn `remix/subs/intro.ass`, then mux the audio. `intro.ass` and `intro_yell.ass` are identical (`df0ba81c…`) and include the yell subtitle (`intro.ass:19`).

### Step A: local intro rebuild (art box with ffmpeg; Jason or a local session, not the cloud builder)
```bash
cd /workspace/bdb-art/cutscenes/intro-v3
# 1. Normalise the Dad shot to the other shots' rate and timebase
ffmpeg -y -i remix/shots/s05.mp4 -an -vf "fps=30,format=yuv420p" -c:v libx264 -preset slow -crf 16 \
  -video_track_timescale 15360 remix/shots/s05_30.mp4
ffprobe -v error -select_streams v -show_entries stream=nb_frames,r_frame_rate,time_base -of compact remix/shots/s05_30.mp4
#    expect: r_frame_rate=30/1  time_base=1/15360  nb_frames=241
# 2. Concat with a re-encode, not -c copy
sed 's#/s05.mp4#/s05_30.mp4#' remix/list.txt > remix/list_fixed.txt
ffmpeg -y -f concat -safe 0 -i remix/list_fixed.txt -an -vf "fps=30,format=yuv420p" -c:v libx264 -preset slow -crf 16 \
  -video_track_timescale 15360 remix/video_concat_fixed.mp4
#    expect nb_frames=1847, duration≈61.567
# 3. Burn subs and take the approved yell mix byte-for-byte from the ff4c0d20 final (stream copy)
ffmpeg -y -i remix/video_concat_fixed.mp4 -i final/intro_v3.mp4 -map 0:v -map 1:a \
  -vf "ass=remix/subs/intro.ass,scale=960:540:flags=lanczos,format=yuv420p" -r 30 \
  -c:v libx264 -profile:v main -level 3.1 -preset slow -crf 27 -g 48 -c:a copy -movflags +faststart -shortest \
  final/intro_v3_fixed.mp4
ffmpeg -y -i final/intro_v3_fixed.mp4 -frames:v 1 -vf scale=640:360 -q:v 5 final/intro_v3_fixed.jpg
```
**QC gates, all required before the file goes to the branch:**
1. `nb_frames` is 1847 ± 2, `r_frame_rate=30/1`, duration 61.5–61.6 s, size under 25 MiB (the earlier cut was about 14 MB).
2. Frame list from 35 to 44 s has a step of 0.0333 s with no gap. (Same `ffprobe` select as above.)
3. A contact sheet at 22 / 24 / 26 s shows the yell subtitle. One at 36.5 / 38.5 / 40.5 s shows Dad, the BDB swatter, and the catchphrase subtitle.
4. Per-second RMS from 20 to 28 s is within 0.5 dB of `final/intro_v3.mp4`, meaning the yell is still present.
5. Record the new md5 in `GEN-LOG.json` as `pages_fix`, with a note on the cause (24 fps s05 plus stream-copy concat).

Then copy `final/intro_v3_fixed.mp4` to `assets/cutscenes/intro_v3.mp4` and `final/intro_v3_fixed.jpg` to `assets/cutscenes/intro_v3.jpg` in the first commit of the feature branch (§5).

**Fallback, only if Step A fails:** `_v3/intro_v3.mp4` (`e1912568`) has all 1847 frames but uses the pre-v4 Dad likeness and has no yell. **Do not ship it.** It is only a reference.

**Option B, gated on Jason (dialogue diet inside the intro).** The intro has **11 lines in 61.6 s (10.7/min), with 38.3 s of voice: 62% of runtime is talking** (sum of `timeline.json` event durations). Dropping `nar_v3_02` + `bob_complicated` (s02) and `nar_v3_04` (s04) gets to 8 lines and 25.6 s of voice (42%), and keeps every locked or required line: the yell, `I brought the eggplant.`, the Dad catchphrase, and `Die, Yetti, die!`. This needs a fresh VO mix from `remix/vo/*.wav` plus `music_base.wav` with the same ducking. `remix/` has no script for that mix. `audio/mix_and_stitch.sh` is the older per-shot mixer. Then re-burn an `.ass` with those three events removed. **Not part of this PR unless Jason picks it after previewing Step A.** He liked the remixed VO earlier (`OVERNIGHT-STATUS.md:24`).

---

## 3. Dialogue diet vs RWB

### 3.1 Measurements

| | RWB (`90b11f2`) | BDB (`ed26baf`) |
|---|---|---|
| Intro | 4 clips = **59.6 s** (twinkletoes 11.42, moiraine 15.04, intro 15.04, intro_battle 18.13; `src/cutscene.js:12`) | 1 clip = **61.57 s**. 11 VO lines, 62% voiced, 10.7 lines/min |
| Stage-entry clips | 15.04 s per stage (`cutscene.js:13-17`: stages 1–4, 6) | S2 kidnap 6+6 s, S3 rescue_1 6 s, victory 6 s (`src/cutscene.js:17-19`) |
| Ally call clip | Rand 5–10 s | Dad D1–D3 4.0 s **with their own VO** (D1 RMS −20 dB from 0.5 to 2.5 s, against a −36 dB bed) |
| Stage-open voice | S1: **2 lines**, narrator at 0 s and Riley at 5.2 s (`src/stage1.js:79-80`) | S1: **6 lines in 18 s** right after the intro: `nar_ch1`, `bdb_open`@4, `nar_intro_01`@8, `nar_intro_02`@13, `nar_intro_03`@18, plus `bob_where_claudia` (`src/campaign.js:97-106`). `nar_intro_01/02` **repeat intro VO word for word** (`voice-lines.js:9-10` vs `timeline.json:17,34`) |
| Scripted in-play lines | S1 has about 10 ids over a ~179 s bot clear, so **≈3.4/min** (`src/audio.js:15-31`, `stage1.js:360,383`). S7 has 25 ids in total, all scripted (`stage7-voice.js`) | Boss intros, phases, Dad, Papi, respawn. About the same as RWB |
| Combat-bark mechanism | Event-only. `interrupt=false` drops a bark if anything is sounding. Per-type **8 s GAP** (`stage4-voice.js:35-44`, `stage5-voice.js:55-66`). Rotation with no repeats (`stage6-voice.js:55-62`). Stage 8 policy waits are line 10 / bark 2 / react 1 s (`stage8-voice.js:280-287`). S1 Riley barks fire on 35–50% of events (`riley.js:114,127,162,175,236`). **No per-second timers.** | Per-second random rolls (`campaign.js:397-402`). Laugh on **every KO** with a 3 s cd (`:219`). Shared Yetti pool every 7 s (`barks.js:6`). Where every 18 s at each wave spawn and stage load (`barks.js:3`, `campaign.js:106,144`). Turnback every 8 s (`yettis.js:219`). Hurt 1.4 s (`:214`). Choir 10 s (`:162`) |
| Ambient emits per minute | **≈3–5** (estimate: scripted 3.4 plus gated barks) | **≈28–36** (estimate, below) |

How the BDB estimate was built: cooldown ceilings × event rates from the Adventure 60 Hz campaign (573.4 s = 9.56 min, about 190 KOs, 45 waves, 25–28 hits, 13–14 Papi; `docs/OVERNIGHT-STATUS.md:126`, `docs/LENGTH-DIFFICULTY.md:39`).
- laugh: about 140 Bob KOs / 9.56 = 14.6/min against a 20/min ceiling → **10–14/min**
- Yetti pool: ceiling 8.6/min; attack telegraphs are frequent → **7–8.6/min**
- turnback: **2–5/min**
- where: 5 triggers/min with an 18 s cd → **≈2.5/min**
- hurt: **≈2.8/min**
- choir: **≈1.5/min**
- cory and produce: **≈1/min each**

Because the narration policy drops barks while a line is sounding (`audio.js:436-438,473-483`), the audible result is **near-continuous chatter limited only by airtime**. I could not run node this session, so these numbers are **estimates**. The builder must measure before and after with the new `tools/voice-rate.mjs` (§5).

**Conclusion:** cutscene runtime is already at RWB density. The overload is (a) the stage-1 re-narration after the intro, (b) per-KO and per-second ambient barks, and (c) Dad's call line playing over his own clip.

### 3.2 Proposed caps (target: ≤ 4 ambient lines/min, ≥ 8 s between ambient lines; scripted beats unchanged)

| Group / id | Trigger | Now | Proposed |
|---|---|---|---|
| **Global ambient gate** (new, `barks.js`) | all non-scripted barks | none | **≥ 8 s since the last ambient line** (RWB GAP) **and ≤ 4 in any rolling 60 s**. Priority when several are due: `bdb_produce` > Yetti pool > `where` > `laugh` > `hurt` > `turnback` > `choir` > `cory` |
| `bdb_produce` **LOCKED** "Die, Yetti, die!" | bonk `campaign.js:240` | cd 2.5 s | cd **12 s**. The first bonk of each stage always speaks |
| `bdb_laugh` "Ha! Dead!" | Bob KO `:219` | cd 3 s, every KO | **every 4th Bob KO**, cd **20 s** |
| `bob_hurt_01..03` | `:214` | cd 1.4 s | **every 2nd hit**, cd **6 s** |
| `bob_where_claudia_01/02` | `:106`, `:144` | cd 18 s, every wave and stage load | **only on wave 1 of a zone**, cd **60 s**. **Removed from stage load** |
| `bob_cory_joke_01/02` | per-second roll `:400` | cd 55 s, 8% | cd **120 s**, 5% |
| Yetti pool: `yetti_porkchop_*` **LOCKED**, `yetti_colombian_room_*` **LOCKED**, `yetti_purple_car_*` **LOCKED** | `:145`, `:216`/`yettis.js:231`, `:401` | shared cd 7 s; taunt roll 0.12/s | shared cd **20 s**. Colombians only on wave 1 of a zone. Porkchop on every 3rd attack telegraph. Purple car roll **0.04/s**. Lines and audio files unchanged |
| `yetti_turnback` | `yettis.js:219` | cd 8 s | cd **30 s** |
| `choir_serious` | `:162` | cd 10 s | cd **45 s** |
| S1 open | `:97-103` | 6 lines | `nar_ch1` + `bdb_open`@4 (**LOCKED "I brought the eggplant."** kept). Remove `nar_intro_01/02/03` and the stage-load `where` |
| S2 open | `:95-106` | kidnap clip + `nar_ch2` + `nar_kidnap` + where | kidnap + `nar_ch2`. Drop `nar_kidnap`, which repeats intro s04 "Heaven sent Yettis…". Drop where |
| S3 open | `:97,104` | `nar_ch3` + `claudia_open` + where | `nar_ch3` + `claudia_open`. Drop where |
| Dad call | `:279` + D clip VO | WebAudio line on top of the clip's own VO | **Do not voice `dad_call_0x` while a D clip is playing.** Still voice it when cutscenes are off |
| Dad catchphrase **LOCKED** | swat impact `:387` | unchanged | unchanged. Keep it on the scripted wait (`audio.js:435`) |
| Papi | `:265` | `bob_papacito_*` + `papi_chorus`@1.4 | crowd line at t=0 (§4). `bob_papacito_*` **only on finisher** |
| Boss intros and phases, `bob_respawn_01`, `dad_done_*`, victory | various | unchanged | unchanged (event-driven, like RWB) |

**Locked quotes stay reachable:** `bdb_open` (S1 open), `bdb_produce` (first bonk), Porkchop (attack telegraph), Colombians (zone wave 1), Purple car (taunt roll), Dad catchphrase (swat). A new test proves each one fires at least once in a seeded Adventure campaign. RNG goes through a `Campaign({ rng })` option into `createBarks(rng)` (`campaign.js:71`, `barks.js:20`), so tests are deterministic. Captions stay exactly as pinned in `tests/voice-cues.test.mjs:12-64`.

---

## 4. Papacito stampede: art, audio, and code

**Current behaviour.** `src/papacito-fx.js:5-11` draws 10 tinted silhouettes from `papi_runners` (`assets/chars/papi_runners.anims.json:153-154` is `"placeholder": true`, "local coloured silhouettes"; 7 unique frames), screen-space (`setScrollFactor(0)`), and destroys them at 2.5 s. The caption is `papi_chorus` "Papi! Papi! PAPI!" (`voice-lines.js:14`), armed at 1.4 s (`campaign.js:265`). Kills follow `papiHitTime` (`papacito.js:5-10`). The sim holds for `papiTime=2.5` (`campaign.js:262,373-386`). Kills: every visible non-boss, or the Wingman finisher (`papacito.js:53`).

**Keep all sim numbers.** `PAPI_RUNNER_X0 = -180`, `PAPI_RUNNER_SPEED = 980`, `papiTime 2.5`, the kill set, score, and `canActivatePapacito` all stay. **Bot times and the 140–240 s band do not move**, and bosses (Choirmaster 1140) take no new damage. "Damages" is delivered visually: trample knockdowns, dust, and stars on each KO at the moment the front reaches it. Boss chip damage is **not** in this PR. (A 3% chip clamped at the gate is possible later, but it would push S1, currently 161–165 s, toward the 140 s floor. Jason's decision.)

### 4.1 Art (Step A2, local art box; adult, tasteful, cartoon)
- New atlas key **`papi_stampede`**: 6 women, `run1..run6`, **8 frames each at 16 fps, looped**. Source PNGs go to `/workspace/bdb-art/sprites/papi_stampede_run{1..6}_{00..07}.png`, 720×600 RGBA, feet on the y=570 baseline, facing right, full sprint left to right.
- Style: same painterly comic brawler look as the Bob and Yetti sheets (`refs/*_sheet_v3.jpg`). **Clearly adult (about 25–60) Colombian women, fully clothed in street clothes**, no suggestive poses or framing. Wardrobe and props for a Black Friday rush:
  - sundress with cardigan and shopping bags
  - jeans and blouse, filming on a phone held high
  - Colombia football jersey holding a hand-lettered **"PICK ME!"** sign
  - office skirt-suit with heels in hand
  - tracksuit with a **"TE AMO PAPACITO"** heart sign
  - abuela in a church dress swinging a handbag

  Expressions: starstruck and determined. Arms pumping, hair flying, leaning hard forward.
- Pack: add a `REAL` entry to `tools/pack-flat.py:43-66`: `'papi_stampede': ('papi_stampede', {f'run{i}': (8, 16, 0) for i in range(1, 7)})`. Add `run5`/`run6` to `LOOP` (`pack-flat.py:78`). Run `python3 tools/pack-flat.py --only papi_stampede`, which also runs `compress-ktx.py`. Commit `assets/chars/papi_stampede{.anims.json,-N.json,-N.webp,-N.astc.ktx,-N.etc2.ktx}` and the updated `_pack_report.json`.
- GPU: stage-1 ASTC is 7.96 MiB against the 60 MiB test ceiling (`docs/GPU-MEMORY.md:13-16`, `tests/atlas-spec.test.mjs:87-90`). 48 frames at `DRAW_SCALE 0.38` fit easily.

### 4.2 Audio (Step A3, local)
- New voice ids **`papi_crowd_01`, `papi_crowd_02`**. Speaker `'Crowd'`. Text **exactly** `We love you Papacito! Pick me!`. Use `eleven_v3`, layering the cast voices Papi1 Candy `Nggzl2QAXh3OijoXD116`, Papi2 Kate `bshPAWYM9E3kueiqa6gJ`, Papi3 Bella `wrxvN1LZJIfL3HHvffqe` (`assets/audio/voice-cast.json`), offset 30–80 ms so it reads as a crowd. Two different takes. Each ≤ 2.4 s, −16 LUFS, mp3 in `assets/audio/voice/`, with entries in `voice-manifest.json`.
- Cost guide: the 56-char yell cost 75.99 credits (GEN-LOG). 30 chars × 3 voices × 2 takes ≈ **250 credits**.
- No new file for the rumble: add synthesized `sfx.stampede()` in `src/audio.js` next to `sfx.papi` (`:173`). Noise footfalls at about 12 Hz for 2.3 s, a low rumble, and one short "doors open" two-tone at t=0.

### 4.3 Code (cloud builder)
1. `src/stages.js:7`: in `shared`, replace `'papi_runners'` with `'papi_stampede'`. Leave the `papi_runners` files on disk; `tests/atlas-spec.test.mjs:45` still checks they exist.
2. `src/papacito-fx.js` becomes `PapacitoStampede`. The class name `PapacitoFX` stays exported so `game-scene.js:9,107,116,253,270` do not change.
   - **16 runners** in 3 rows, feet at screen y ≈ 575 / 630 / 690, scale 0.30 / 0.33 / 0.36, depth 18000 + row×100 + i. Variant = `run{(i%6)+1}`, with a staggered start frame.
   - **Runner 0 (front):** `x = PAPI_RUNNER_X0 + age*PAPI_RUNNER_SPEED`, exactly, so the visual front equals the kill schedule.
   - **Other runners:** deterministic offsets 40–900 px behind the front with ±20 px jitter from the index. The pack is densest at the front, like a door-burst.
   - At age 2.5 s, every runner is past x 1370, off-screen right. Destroy at 2.5 s.
   - Everything stays screen-space (`setScrollFactor(0)`). **No camera calls.**
3. `src/game-scene.js:253`: `papi` starts the stampede and plays `sfx.stampede()`. Do not call `sfx.papi()` as well.
4. `src/game-scene.js:260` (`ko` handling): for `data.source==='papi'`:
   - dust burst `fx.dust.emitParticleAt(x, y, 14)`
   - 6 star particles in the existing `this.particles` style
   - the existing knockdown corpse (`syncViews` path, `:161-166`)

   `killImpact` already gives papi KOs a splat (`tests/presentation.test.mjs:23`).
5. `src/campaign.js:265`:
   - Banner: `'PAPACITO STAMPEDE!'`, or the finisher banner unchanged.
   - Emit voice `papi_crowd_0{1|2}` alternating at t=0.
   - Emit `bob_papacito_*` only when `result.finisher`.
   - Stop arming `papi_chorus`. Keep it in `LINES`/`PRESENT`.
6. `src/voice-lines.js`:
   - Add `papi_crowd_01/02: ['Crowd','We love you Papacito! Pick me!']`.
   - Add them to `PRESENT` **only when the mp3s exist**. Otherwise they stay caption-only through `setVoiceFiles` (`voice-lines.js:26`, `audio.js:404-407`).
   - Set `VOICE_ROLES.Runners` to `'bdb-papi-adult-crowd'`.
7. `src/audio.js:436-438` `narrationYields`: return `'interrupt'` for `/^papi_crowd_/` so the crowd is never dropped or delayed behind a bark.

---

## 5. Ready-to-send Grok builder prompt

```text
ROLE: Builder for BDB (repo jfeldman9-rgb/bdb-rwb). Model: Grok / Cursor cloud grok-4.7.
BASE: main @ ed26baf. BRANCH: cursor/bdb-feedback-oct28 (already contains the Step A media commit; see PRECONDITIONS).
DELIVERY: one DRAFT PR into main. Preview deploy only. Do NOT merge, do NOT push to main, do NOT deploy production.
Jason must approve the preview before any merge.

PRECONDITIONS (stop and report if any fail; do not invent placeholder art or audio):
- assets/cutscenes/intro_v3.mp4: video nb_frames 1847±2, 30/1 fps, duration 61.5–61.6 s, and NOT md5 e0f50a72e2fd75c0128d4a62d9f32cb7 (old Pages)
  or ff4c0d20db1fe1480a0096a4c5bf1977 (yell master with the 8 s Dad frame gap).
- assets/chars/papi_stampede.anims.json exists, anims papi_stampede_run1..run6, 8 frames @16 fps, loop, placeholder:false, gpu ASTC+ETC.
- assets/audio/voice/papi_crowd_01.mp3 and papi_crowd_02.mp3 exist and are listed in assets/audio/voice-manifest.json with
  text exactly "We love you Papacito! Pick me!". (If only the mp3s are missing: register both ids caption-only, leave them out
  of PRESENT, and say so in the PR.)
Do NOT re-encode, trim, or regenerate any mp4 or atlas yourself.

TASKS
T1 Intro guard test. New tests/intro-media.test.mjs: reuse the mp4 box walker from tests/cutscene-cap.test.mjs:8-40, find the
   'vide' trak, read stbl/stts. Assert total samples >= 1840, every sample delta <= 2x the median delta (no frozen gap), and
   mvhd duration 61.4–61.7 s. This must FAIL on the old e0f50a72 file (one ~8 s delta at 35.43 s) and PASS on the new one.

T2 Dialogue diet (see PLAN-feedback-oct28.md §3.2; scripted beats unchanged):
   - src/barks.js: add a global ambient gate. At least 8 s since the last ambient line and at most 4 ambient lines in any
     rolling 60 s. Priority: bdb_produce > yetti pool > where > laugh > hurt > turnback > choir > cory.
     BARK: whereCd 60, coryCd 120, coryChance 0.05, yettiCd 20, taunt roll 0.04.
     Colombians line only on wave 1 of a zone. Porkchop only on every 3rd attack telegraph.
   - src/campaign.js:
     :71 accept Campaign({rng}) and pass it to createBarks(rng).
     :97-106 S1 opens with nar_ch1 + armVoice('bdb_open',4) only. Delete the nar_intro_01/02/03 arms and the stage-load
       barkWhere. S2: drop the nar_kidnap emit. S3: keep claudia_open.
     :144-145 barkWhere and barkYettiWave only when waveIndex===0.
     :214 hurt on every 2nd hit, cd 6. :219 laugh on every 4th Bob KO, cd 20. :240 bdb_produce cd 12, and the first bonk of a
       stage always speaks. :162 choir_serious cd 45. All of these go through the global gate except the first bonk.
     src/yettis.js:219 yetti_turnback cd 30.
   - Dad: in campaign.useDad (:279-280) emit 'dad_callin' BEFORE the dad_call voice. In src/game-scene.js handleEvents (:246),
     skip voice ids matching /^dad_call_0/ while this.cutscene?.dad is true (the D1–D3 clips carry their own Dad VO).
     When cutscenes are off, the line still plays. dad_catchphrase on the swat impact (:387) is unchanged.
   - New tools/voice-rate.mjs: same loop as tools/bot-sim.mjs:9-21, seeded rng. Counts 'voice' events per id and per group
     (ambient vs scripted) for an Adventure campaign at 30/60/120 Hz, and prints per-minute rates excluding papi/dad/cutscene
     time. Run it on main BEFORE your changes and on the branch AFTER. Put both tables in the PR.

T3 Papacito stampede (PLAN §4.3). Sim numbers stay frozen: PAPI_RUNNER_X0 -180, PAPI_RUNNER_SPEED 980, papiTime 2.5,
   kill set, score.
   - src/stages.js:7 shared: replace 'papi_runners' with 'papi_stampede'.
   - src/papacito-fx.js: 16 runners, 3 rows (feet y≈575/630/690, scale .30/.33/.36). Variants run1..run6. Front runner
     x = PAPI_RUNNER_X0 + age*PAPI_RUNNER_SPEED exactly; the rest 40–900 px behind with deterministic jitter. Screen-space
     only (setScrollFactor(0)). No camera, scroll, or shake calls. Destroy at 2.5 s, when all are past x 1370.
     Keep the exported class name PapacitoFX.
   - src/audio.js: add sfx.stampede() (synthesized footfalls ~12 Hz for 2.3 s, low rumble, two-tone "doors open").
     narrationYields returns 'interrupt' for /^papi_crowd_/.
   - src/game-scene.js:253 papi plays sfx.stampede() and starts the FX. :260 a ko with source 'papi' adds a dust burst
     (14) and 6 star particles.
   - src/campaign.js:265 banner 'PAPACITO STAMPEDE!' (finisher banner unchanged). Voice papi_crowd_01/02 alternating at
     t=0. bob_papacito_* only on finisher. Stop arming papi_chorus (keep it registered).
   - src/voice-lines.js: papi_crowd_01/02 = ['Crowd','We love you Papacito! Pick me!']. Add to PRESENT if the mp3s exist.
   - tests/atlas-spec.test.mjs:52,87 replace papi_runners with papi_stampede in the stage-1 kit lists. Keep the :45 file
     check. Add a test: papi_stampede has run1..run6, 8 frames @16 fps, loop, placeholder false.

TESTS (add or update; never weaken a locked-quote assertion)
- tests/voice-cues.test.mjs:69-74: bdb_open still at 4 s; assert nar_intro_01/02/03 are NOT emitted.
  :152-154: expect papi_crowd_0x instead of papi_chorus.
  Add the exact-text pin "We love you Papacito! Pick me!" for both ids (and the manifest when present).
- New tests/voice-diet.test.mjs, seeded Adventure campaign at 60 Hz:
  ambient <= 4.0/min, total voice <= 7.0/min, no two ambient lines < 8 s apart, S1 opening voices == ['nar_ch1','bdb_open'].
  Each of these fires >= 1 time: bdb_open, bdb_produce, a yetti_porkchop_*, a yetti_colombian_room_*, a yetti_purple_car_*,
  dad_catchphrase.
- New tests/papacito-fx.test.mjs (fake scene): >= 14 sprites from papi_stampede, all scrollFactor 0, front x matches
  papiHitTime, all gone at 2.5 s, cameras.main scroll untouched.
- New dad-voice test: with a playing D clip (scene.cutscene.dad), dad_call_0x is not said. With cutscenes off, it is said.
- T1 intro-media test.
- All existing tests still pass, including tests/papacito.test.mjs, tests/barks-cutscenes.test.mjs, stage1-sim (>= 140 s),
  and the nightmare-clear tests.

COMMANDS
npm test
node tools/bot-sim.mjs adventure 30 ; node tools/bot-sim.mjs adventure 60 ; node tools/bot-sim.mjs adventure 120
node tools/bot-sim.mjs nightmare 60
node tools/voice-rate.mjs      (before on main, after on branch)
npm run smoke                  (if Chrome is available. Capture a screenshot mid-stampede and one of the intro at ~38 s.)

ACCEPTANCE
- Intro: intro_v3.mp4 plays the Bob yell "Hold on Claudia! Papacito is coming! It's eggplant time!" with its subtitle at
  21.8–26.6 s, and the Dad swatter shot (picture and subtitle) at 35.5–43.5 s. No freeze. The intro-media test passes.
- Dialogue: voice-rate after ≤ 4 ambient/min and ≤ 7 total/min at all three rates. Every locked quote still fires. The
  stage-1 opening is 2 lines. Dad's call line never plays over a D clip.
- Papi: visible stampede of 16 clothed adult women. The front edge kills Yettis as it reaches them. Crowd yell caption
  "We love you Papacito! Pick me!". No camera or scroll change.
- Adventure fresh stage times at 30/60/120 Hz stay within ±2 s of docs/OVERNIGHT-STATUS.md:126 and inside 140–240 s.
  Nightmare is no worse.
- npm test green. In the PR body: test count, the bot-sim table, before/after voice-rate tables, screenshots, the preview URL.
- Append "Pass 7" to docs/OVERNIGHT-STATUS.md with the model used (grok-4.7) and a done/deferred list.

DO NOT TOUCH
eggplant vy=0 (src/eggplant.js:4); CAM_LEAD 0.28 (src/config.js:4, src/camera.js:4) and all camera/scroll code; no shop;
Choirmaster hp 1140 (src/yettis.js:11); choirMultiplier 1.28 (src/yettis.js:83-88); NIGHTMARE_S3*/snowClearZ (src/campaign.js:27-47);
Adventure stages 140–240 s; locked quote text and audio files: "Son, sometimes you just need to use the fly swatter to keep the
women away!", "I brought the eggplant.", "Die, Yetti, die!", "Pork Chop Sandwiches!", "Stay away from the Colombians room.",
"Bob why is your car purple?"; src/cutscene.js STAGE_CLIPS/STORY_MAX_MS; intro_v2 flag; Dad D1–D3 clips; any mp4.
```

---

## 6. Do-not-touch list

- **Scrolling and camera:** `CAM_LEAD = 0.28` (`src/config.js:4`, re-exported `src/camera.js:4`), `updateCamera` and `lockSnaps` usage, zone and plate streaming. The stampede is screen-space only and adds no camera shake.
- **Eggplant:** straight fire, `vy: 0` (`src/eggplant.js:4`). No aiming.
- **No shop.**
- **Choirmaster:** `hp: 1140` (`src/yettis.js:11`) and `choirMultiplier` 1.28 (`src/yettis.js:83-88`), adds and cooldowns. `NIGHTMARE_S3`, `NIGHTMARE_S3_TRIMS`, `snowClearZ` (`src/campaign.js:27-47`).
- **Stage length:** Adventure 140–240 s per stage. Papi sim constants are frozen (`papacito.js:5-6`, `campaign.js:262`).
- **Locked quotes, text and audio:**
  - `Son, sometimes you just need to use the fly swatter to keep the women away!` (`story.js:7`)
  - `I brought the eggplant.`
  - `Die, Yetti, die!`
  - `Pork Chop Sandwiches!`
  - `Stay away from the Colombians room.`
  - `Bob why is your car purple?`

  Pinned in `tests/voice-cues.test.mjs:12-64`. The intro yell is exactly `Hold on Claudia! Papacito is coming! It's eggplant time!`.
- **Cutscene plumbing:** `STAGE_CLIPS`, `STORY_MAX_MS`, `?intro=v2` (`src/cutscene.js:10-25`), and Dad D1–D3 clips (`src/dad-call-cutscene.js:10`).
- **New sprites:** adults only, fully clothed, tasteful cartoon.
- **Builder limits:** the builder does not touch any mp4. Step A is the only media change, and it is QC-gated.

## 7. Model used this session

Claude **Opus 5.5** (`claude-opus-5-5`), via Claude Code, in a read-only planning session on 2026-10-28. No quota or rate-limit errors.
