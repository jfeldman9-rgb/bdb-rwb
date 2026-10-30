# Stage 2 intro — dialogue script v2 (MiniMax / RunPod lip-sync)

**Visual master:** `/workspace/bdb-intro2/out/stage2_intro_final.mp4` (53.6 s, 960×540)  
**Per-shot clips (silent picture, 8.0 s each):** `/workspace/bdb-intro2/shots/s0N_*.mp4`  
**Do not change the picture.** New VO + MiniMax lip-sync only.  
**No audio render in this pass** (script + clip extract only).

## Final timeline (after 0.4 s crossfades)

| Shot | Final TC | Local clip | File |
|---|---|---|---|
| s01 | 0.00–8.00 | 0–8 | `shots/s01_ascend.mp4` |
| s02 | 7.60–15.60 | 0–8 | `shots/s02_reveal.mp4` |
| s03 | 15.20–23.20 | 0–8 | `shots/s03_choir.mp4` |
| s04 | 22.80–30.80 | 0–8 | `shots/s04_interventionist.mp4` |
| s05 | 30.40–38.40 | 0–8 | `shots/s05_block.mp4` |
| s06 | 38.00–46.00 | 0–8 | `shots/s06_choirmaster.mp4` |
| s07 | 45.60–53.60 | 0–8 | `shots/s07_council.mp4` |

Place each line ~0.4–0.8 s into the shot. Leave tail room for MiniMax mouth settle.

## Voice cast (same as Stage 2 game)

| Role | Voice |
|---|---|
| Narrator | IndexTTS clone of Jason (`jason-indextts`) |
| Bob | Benedict (ElevenLabs / `bdb-bob-warm-baritone`) |
| Claudia | María / Maria (not used in this cut) |
| Choir Yetti / Yetti | Yetti comic (`bdb-yetti-comic`) |
| Interventionist | Interventionist / Lecturer Yetti (stage-2 EL line voice) |
| Choirmaster | Choirmaster (stage-2 EL line voice) |
| Wingman / Council | Wingman council (`bdb-wingman-council`) |

**Locks:** Riley/Kenzie faces are never shown. Halos = glowing gold rings; wings stay tiny as drawn. Bob = bald, short dark beard, black tee, eggplant blaster.

## Script table (v2 — new lines)

| # | Final TC | Clip | On-screen speaker (mouth) | Line (verbatim) | Est. spoken | Voice | Face / lip-sync |
|---|---|---|---|---|---|---|---|
| s01 | 0.00–8.00 | `s01_ascend.mp4` | **Narrator (off-screen)** | Chapter Two. The Celestial Intervention. | ~3.4 s | IndexTTS Jason | **No** — Bob from behind only. Narration VO, no lip sync. |
| s02 | 7.60–15.60 | `s02_reveal.mp4` | **Choir Yetti** (mid-ground, arms crossed) | Hands off the Colombian, Papacito. Heaven is watching your pants. | ~3.2 s | Yetti comic | **Yes (Yetti)** — front faces clear enough for short sync. Bob back to camera → no Bob lips. |
| s03 | 15.20–23.20 | `s03_choir.mp4` | **Choir Yetti** (front trio) | Keep it in the jeans, Papi. | ~1.6 s | Yetti comic | **Yes (Yetti)** — three faces to camera, mouths readable. Prefer center Yetti. Bob back → no Bob lips. |
| s04 | 22.80–30.80 | `s04_interventionist.mp4` | **Interventionist** (center Yetti, open arms) | Bob, we all love you. That's why we're confiscating the eggplant. | ~3.5 s | Interventionist | **Yes (Interventionist)** — big center face, open mouth. Bob three-quarter back → no Bob lips. |
| s05 | 30.40–38.40 | `s05_block.mp4` | **Yetti** (pointing, left of pair) | Turn back, lover boy! | ~1.4 s | Yetti comic | **Yes (Yetti)** — pointing pair faces + open mouths. Bob from behind → no Bob lips. |
| s06 | 38.00–46.00 | `s06_choirmaster.mp4` | **Choirmaster** (center, arms up) | From the top! And-a-one, and-a— don't. | ~2.4 s | Choirmaster | **Yes (Choirmaster)** — best mouth plate in the cut. Bob may flash face while running; **do not** sync Bob here (tiny / motion). |
| s07 | 45.60–53.60 | `s07_council.mp4` | **Bob** (profile, mid-sprint) | Claudia's in the Keep. Heaven can wait. | ~2.2 s | Benedict | **Yes (Bob, profile)** — jaw visible for side lip sync. Council Yetti on stairs also face-on; leave him silent this shot so Bob owns the beat. |

### Optional alt (if MiniMax prefers Yetti on s07 instead of Bob)

| # | Speaker | Line | Est. | Voice | Face |
|---|---|---|---|---|---|
| s07-alt | Wingman (stairs) | Denied. The council has reviewed your… application. | ~2.6 s | Wingman | Yes — Yetti face-on. Bob stays silent (profile still OK as reaction). |

**Default for RunPod:** use the main table (Bob on s07). Alt only if profile sync on Bob looks weak.

## Lip-sync notes for Game Art / MiniMax

1. Feed **per-shot mp4** + **one WAV per shot** (new renders; do not reuse the baked v1 mix).
2. Sync the named on-screen speaker only. Narrator shots = audio under picture, no face warp.
3. Yetti mouths are cartoon-wide — short lines read better than long speeches.
4. Never invent Riley/Kenzie faces; none appear in these seven clips.
5. After remux, replace `assets/cutscenes/stage2_intro.mp4` the same way as v1 (poster jpg ≡ poster bytes, `STAGE2_REV` bump).

## Out of scope this pass

- No TTS / MiniMax / RunPod spend  
- No remux into `stage2_intro_final.mp4`  
- No campaign.js / PR changes  

