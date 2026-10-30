# Stage 2 intro — animated cutscene shot list (Grok Imagine)

Goal: replace the current 11 s silent Ken-Burns `stage2_intro.mp4` with a real multi-shot animated opener in the same style as chapter-1 `intro_v3` (Grok Imagine stills → I2V, 960×540, h264+aac, comic mobile-brawler cutscene).

**Do not generate video or spend credits in this pass.** This file is the plan only.

## Stage 1 wiring (reference)

| Item | Value |
|---|---|
| Default chapter-1 opener | `STAGE_CLIPS.intro = ['intro_v3']` via `title-flow.chapterIntroKey(1)` → `beginChapter` → `cutscene-hooks.createStoryPlayer.play` |
| File | `assets/cutscenes/intro_v3.mp4` + poster `intro_v3.jpg` |
| Cache bust | `INTRO_REV = 'b67d6176'` query on src/poster only for `intro_v3` (`cutscene.clipMedia`) |
| Spec | 960×540, 30 fps, h264 (High) + aac stereo 48 kHz, **~61.55 s**, ~24 MB |
| Cap | `STORY_MAX_MS = 90000` (player wall clock) |
| Audio | Baked into the mp4 (VO + music + burned `.ass` subs). Game does **not** re-play those intro lines on stage 1 open. |
| Build | 7 Grok Imagine I2V clips (~8–10 s) concat → mux IndexTTS/EL VO + music bed. Art tree: `/workspace/bdb-art/cutscenes/intro-v3/` (`SHOT-LIST.md`, `stills/`, `clips/`, `remix/timeline.json`). |
| Short retry clip | `stage1_intro` (11 s, **video-only** Ken Burns) plays after `intro_v3` on a fresh chapter-1 start, or alone with `?intro=short` / `?resume=1`. |

## Stage 2 current content

| Item | Value |
|---|---|
| Clip key | `STAGE_CLIPS.stage2 = ['stage2_intro']` |
| File | `assets/cutscenes/stage2_intro.mp4` (+ identical `stage2_intro.jpg` / `stage2_intro_poster.jpg`) |
| Spec | 960×540, 30 fps, h264, **11.000 s**, **no audio track**, ~1.8 MB |
| Picture | Single painted still, Ken-Burns zoom: Bob from behind on a cloud terrace overlooking marble heaven; smug winged Yettis with gold halos; burned title **CHAPTER 2 • HEAVEN HAS OPINIONS**; "AI-generated" watermark. |
| Title flow | Chapter 2 start → play `stage2_intro` once → `start('stage2')` with `stageIntroPlayed=true` (does not re-request the stage clip). |
| Campaign after opener | Still emits `kidnap` (`kidnap_1`+`kidnap_2`, 6 s each, video-only) then queues voice `nar_ch2`. |
| In-game VO (unchanged script) | `nar_ch2` = "Chapter Two. The Celestial Intervention." (3.36 s). Related existing lines usable in a mux: `nar_kidnap`, `yetti_turnback`, `choir_serious`, `interventionist_intro`, `choirmaster_intro`, `lecturer_intervention`, `wingman_council`. |

## Locks for every shot

- Bob: bald, short dark beard, black tee, blue jeans, sneakers, glossy purple eggplant blaster (match gameplay / intro_v3).
- Yetti: bulky white fur, **tiny** white angel wings, **glowing gold ring halo**, smug grin (match `yetti1_idle_01.png` / sprite — do not enlarge wings into full angel spans).
- **Never show Riley's or Kenzie's faces.** Bob/Claudia/Yetti faces as in intro_v3 are fine.
- Halos and wings stay as drawn (sprite lock above).
- No real photos as generation refs (drawn sheets / game art / existing cutscene stills only).
- Style: comic mobile-brawler cutscene, painterly celestial cloud bank (pink/gold/lavender clouds, white marble columns, golden harps), funny not epic-serious. Match intro_v3 look, not photoreal.

## Target deliverable

- **Length:** ~42 s (7×6 s). Optional stretch to ~8 s/shot (~56 s) to sit closer to intro_v3's 61 s — both fit under `STORY_MAX_MS`.
- **Encode:** 960×540, 30 fps, yuv420p h264 High, aac 128 kbps stereo 48 kHz.
- **Music bed:** duck under VO like intro_v3; prefer a slice of `assets/audio/yetti-anthem.mp3` (58 s) or `bdb-rise.mp3`.
- **Subs:** burn simple `.ass` captions for the VO (intro_v3 pattern), white outline, bottom third.

## Audio layout (existing lines only — do not rewrite script)

Global timeline for a 7×6.0 s = 42.0 s cut (pad 0.35 s between lines inside a shot):

| t (global) | Shot | Line id | Exact text | File |
|---|---|---|---|---|
| 0.40–3.76 | s01 | `nar_ch2` | Chapter Two. The Celestial Intervention. | `assets/audio/voice/nar_ch2.mp3` |
| 6.40–11.06 | s02 | `nar_kidnap` | Heaven, it turns out, has opinions. And Yettis. With wings. | `assets/audio/voice/nar_kidnap.mp3` |
| 12.40–13.77 | s03 | `choir_serious` | Papi, be serious. | `assets/audio/voice/choir_serious.mp3` |
| 18.40–23.01 | s04 | `interventionist_intro` | Bob. We all love you. That's why we're here. | `assets/audio/voice/interventionist_intro.mp3` |
| 24.40–25.77 | s05 | `yetti_turnback` | Turn back Papi! | `assets/audio/voice/yetti_turnback.mp3` |
| 26.10–27.97 | s05 | `lecturer_intervention` | This is an intervention. | `assets/audio/voice/lecturer_intervention.mp3` |
| 30.40–32.46 | s06 | `choirmaster_intro` | From the top! And-a-one, and-a— | `assets/audio/voice/choirmaster_intro.mp3` |
| 36.40–38.68 | s07 | `wingman_council` | The council denies this rescue. | `assets/audio/voice/wingman_council.mp3` |

Music runs full length, ducked ~8–12 dB under each VO event (intro_v3 remix pattern).

**Double-play guard after mux:** if these lines are baked into the mp4, stop re-emitting them from `Campaign.loadStage` for stage 2 (at least skip `nar_ch2` the same way stage 1 no longer re-arms `nar_intro_01/02/03`). Kidnap clips can stay as a separate post-opener sequence unless Jason asks to fold them in.

## Shot list (Grok Imagine I2V)

Each shot: generate a still from the ref, then image-to-video ~6 s with early limb/camera motion (intro_v3 bar). Prompt suffix for every shot:

> comic mobile-brawler game cutscene, painterly stylized, not photoreal, not a photo, 960x540 widescreen. Match character lock sheets. Tiny white feather angel wings and glowing gold ring halo on every Yetti exactly as the sprite. No real people. No watermark. No on-screen title text.

### s01_ascend — 0–6 s — VO `nar_ch2`
- **Action:** Bob strides up floating marble stairs into a bank of pink-gold clouds; eggplant gun on his back; camera low tracking upward.
- **Ref still to start from:** `/workspace/bdb-intro2/refs/stage2_intro_still.jpg` (Bob from behind on cloud terrace) + Bob lock `/workspace/bdb-intro2/refs/bob_idle_01.png` / `bob_sheet_v3.jpg`
- **I2V prompt:** `Bald muscular Bob in black tee and blue jeans climbs floating white marble stairs into glowing pink and gold clouds, purple eggplant blaster strapped on his back, low tracking camera pushing up with him, warm god-rays, celestial cloud heaven ahead, comic game cutscene motion, early stride and arm swing.`

### s02_reveal — 6–12 s — VO `nar_kidnap`
- **Action:** Whip-pan reveal of the cloud city: Corinthian columns, golden harps, waterfalls into cloud sea, distant angel statues; Bob small in foreground.
- **Ref:** `/workspace/bdb-intro2/refs/stage2_current_t5.jpg`, `/workspace/bdb-intro2/refs/chapter2-clouds.jpg`, `/workspace/bdb-intro2/refs/s2-far.jpg`
- **I2V prompt:** `Sweeping reveal of a celestial marble city floating in pastel pink lavender gold clouds, white Corinthian columns, giant golden harps, waterfalls pouring into the cloud sea, colossal stone angel statues on peaks, bald Bob tiny in the foreground with eggplant gun, dynamic whip-pan then slow push, painterly comic cutscene.`

### s03_choir — 12–18 s — VO `choir_serious`
- **Action:** Three Choir Yettis on a cloud balcony, tiny wings + gold halos, arms crossed / singing; golden music notes; smug.
- **Ref:** `/workspace/bdb-intro2/refs/yetti1_idle_01.png`, `/workspace/bdb-intro2/refs/yetti_sheet_v3.jpg`, `/workspace/bdb-intro2/refs/stage2_current_t5.jpg` (Yetti pose)
- **I2V prompt:** `Three bulky white-fur Yettis with TINY white feather angel wings and glowing gold ring halos stand on a marble cloud balcony, arms crossed, smug grins, golden music notes floating, soft choir sway, camera slow push-in, match yetti sprite proportions exactly, comic game cutscene.`

### s04_interventionist — 18–24 s — VO `interventionist_intro`
- **Action:** Larger Lecturer/Interventionist Yetti steps forward from the choir, opens arms in a fake-caring intervention pose; Bob plants feet opposite.
- **Ref:** `/workspace/bdb-intro2/refs/yetti1_idle_01.png`, `/workspace/bdb-intro2/refs/bob_idle_01.png`, `/workspace/bdb-intro2/refs/kidnap1_t2.jpg` (scale/confrontation)
- **I2V prompt:** `A larger white-fur Yetti with tiny angel wings and glowing gold halo steps forward with open arms like a fake intervention counselor, Bob bald in black tee faces him holding purple eggplant blaster, cloud marble plaza, handheld crash zoom onto the Yetti, comic funny tone.`

### s05_block — 24–30 s — VO `yetti_turnback` then `lecturer_intervention`
- **Action:** Two Yettis block the lane; one points back; Bob skids; halo glints.
- **Ref:** `/workspace/bdb-intro2/refs/kidnap1_t2.jpg`, `/workspace/bdb-intro2/refs/yetti1_idle_01.png`, `/workspace/bdb-intro2/refs/s03_swoop.jpg`
- **I2V prompt:** `Two smug white-fur Yettis with tiny white wings and glowing gold halos block a marble cloud lane, one jabbing a claw back the way Bob came, Bob skidding to a stop with eggplant blaster raised, speed lines, whip pan, comic action cutscene, keep wings tiny.`

### s06_choirmaster — 30–36 s — VO `choirmaster_intro`
- **Action:** Choirmaster Yetti center stage conducts; three glowing gold halo-rings sweep down the lane bands toward camera.
- **Ref:** `/workspace/bdb-intro2/refs/yetti_sheet_v3.jpg`, `/workspace/bdb-intro2/refs/chapter2-clouds.jpg`, `/workspace/bdb-intro2/refs/s2-mid2.jpg`
- **I2V prompt:** `Conductor Yetti with tiny angel wings and bright gold halo raises arms on a cloud stage, three glowing gold halo rings roll toward camera through marble columns, Bob dashes between lane bands in the distance, side tracking shot, comic boss-intro energy.`

### s07_council — 36–42 s — VO `wingman_council`
- **Action:** Wingman/Council Yetti on a high dais points down denying the rescue; Bob turns toward glowing Moonlit Keep on the horizon and runs; hard title beat optional as end frame (no burned "CHAPTER 2" text in-shot — game already banners).
- **Ref:** `/workspace/bdb-intro2/refs/stage2_intro_still.jpg`, `/workspace/bdb-intro2/refs/s07_go.jpg`, `/workspace/bdb-intro2/refs/intro_v3_s07.jpg`
- **I2V prompt:** `Council Wingman Yetti with tiny white wings and glowing gold halo on a high marble dais pointing down in judgment, bald Bob below turns and sprints toward a glowing moonlit keep on the cloud horizon eggplant blaster in hand, camera push and rise, comic determined ending beat.`

## How to wire the finished mp4 (no code rename required)

1. Drop the final file at **`assets/cutscenes/stage2_intro.mp4`** (same id `STAGE_CLIPS.stage2` already uses).
2. Extract poster:  
   `ffmpeg -y -i assets/cutscenes/stage2_intro.mp4 -frames:v 1 -update 1 assets/cutscenes/stage2_intro.jpg`  
   then `cp assets/cutscenes/stage2_intro.jpg assets/cutscenes/stage2_intro_poster.jpg`  
   (tests require jpg ≡ poster bytes).
3. **Code change (only if VO is baked):** in `src/campaign.js` `loadStage`, when `stage === 2`, do not `emit('voice','nar_ch2')` (and do not re-arm any other lines muxed above). Mirror the stage-1 intro diet comment. If the new mp4 is picture+music only, leave `nar_ch2` emit as-is.
4. No change to `STAGE_CLIPS`, `title-flow.js`, or clip id. Optional: extend `introRevision` / a `STAGE2_REV` query like `INTRO_REV` so GitHub Pages cache-busts the new file.
5. Confirm `ffprobe` duration ×1000 < `STORY_MAX_MS` (90000) — covered by `tests/cutscene-cap.test.mjs`.
6. Preview: `https://raw.githack.com/jfeldman9-rgb/bdb-rwb/<hash>/index.html?stage=2&cutscenes=1` (avoid `demo=1`, which disables cutscenes).

## Ref index on disk

All under `/workspace/bdb-intro2/refs/`:

- `stage2_intro_still.jpg`, `stage2_intro_poster.jpg`, `stage2_current_t{0,5,10}.jpg` — current Ken Burns source
- `chapter2-clouds.jpg`, `s2-far.jpg`, `s2-mid2.jpg` — stage 2 bg plates
- `yetti1_idle_01.png`, `yetti_sheet_v3.jpg`, `bob_idle_01.png`, `bob_sheet_v3.jpg` — character locks
- `kidnap1_t2.jpg`, `kidnap2_t2.jpg` — winged Yetti confrontation
- `intro_v3_s0{1..7}.jpg`, `s01_meet.jpg`, `s03_swoop.jpg`, `s06_chase.jpg`, `s07_go.jpg` — style matches from chapter 1
