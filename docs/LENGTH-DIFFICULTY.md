# BDB vs RWB — length & difficulty

Measured **2026-10-28** (America/Phoenix) on box checkouts:
- RWB: `/workspace/rwb-s8` (stages 1–3 from `src/stages.js`, enemy HP from `enemies.js` / `whitecloaks.js` / `darkfriends.js` / `myrddraal.js`)
- BDB: `/workspace/bdb-rwb` branch `bdb-scroll` tip **`ab4cc15`** (before the length/difficulty rebuild)

Clear times are **Adventure bot** (BDB `Bot` + `Campaign`) or RWB full-stage evidence JSON. “Does not trivially win” means the bot should take meaningful damage and spend RWB-like wall-clock, not that it must game-over.

## Snapshot table (before rebuild)

| Metric | RWB Stage 1 | RWB Stage 2 | RWB Stage 3 | BDB Stage 1 (before) | BDB Stage 2 (before) | BDB Stage 3 (before) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| World length (px) | 5200 | 5200 | 5200 | 5200 | 5200 | 5200 |
| Fight zones (excl. boss) | 3 | 3 | 3 | 3 | 3 | 3 |
| Boss arenas | 1 | 1 | 1 | 1 | 1 | 1 |
| Distinct mid BG plates | 2 (`mid0`,`mid1`) | 2 (`mid2a`,`mid2b`) | 2 (`mid3a`,`mid3b`) | 4 (`s1-mid0..3`) | 3 (`s2-mid0..2`, boss shares mid2) | 3 (`s3-mid0..2`, boss shares mid2) |
| Waves (non-boss) | 6 (2×3 zones) | 6 | 6 | 5 wave-lists | 5 | 3 |
| Wave enemies (count) | 14 | 14 | 14 | 12 | 14 | 10 |
| Wave enemy HP pool | 492 | 514 | 486 | 384 | 552 | 396 |
| Enemy mix | grunt 42 / spear 34 / hound 24 | zealot 46 / archer 30 / hound 24 | cutthroat 34 / zealot 46 / archer 30 / hound 24 | walker 24 / guard 48 / hover 36 / charger 48 / choir 36 | + lecturer 48 | same kit |
| Enemy damage to player | 7–16 per hit vs 100 HP | same model | same model | 1 heart / hit (Adventure 3 hearts) | same | same |
| Player HP model | Riley 100 HP, 3 lives, melee combo 5/7/12 | same | same | Bob 3 hearts Adventure (5 Story), gun 12 dmg / 0.2 s | same | same |
| Boss | Chieftain **360 HP**, **3 phases** (66%/33%), adds/charge/cart | Byar **400 HP**, **3 phases**, volleys/torch/rush | Myrddraal **440 HP**, **3 phases**, blink/split/lunge | Interventionist **216×2** (refill at phase 2 only) | Choirmaster **216×2** | Wingmen **216+216+120+120** (3 phases) |
| Bot clear time | **med ~179 s** (min 154 / max 216, n=18 evidence) | ~same layout as S1 (no pinned evidence JSON) | ~same layout as S1 (no pinned evidence JSON) | **~42 s** (boss on ~24 s) | **~52 s** | **~52 s** |
| Full campaign (S1–3) bot | ~8–10 min if each stage ≈ S1 | — | — | **~146 s (~2.4 min)**; 8 hits, 2 deaths, 7 Papi, 2 Dad | | |

### Takeaways (before)

1. **Same corridor geometry, much less fight.** BDB already uses RWB’s 5200 px / 3+boss layout, but waves are thinner, spawn as whole lists (no staggered delays), and eggplant DPS melts packs — Stage 1 clears in ~42 s vs RWB’s ~3 min.
2. **Bosses are short.** RWB bosses are one long 3-phase bar (~360–440 HP). BDB Interventionist/Choirmaster only refill once (effective 432) with weaker telegraphs; Stage 3 Wingmen are closer but still ride a short stage.
3. **BG plates already beat RWB’s mid count on Stage 1**, but Stages 2–3 share the boss plate with zone 3. Lengthening needs **one distinct mid plate per new zone**.
4. **Target after rebuild:** per-stage Adventure bot clear in **RWB Stage 1’s range (~150–220 s)**; full S1–3 campaign **≳ 7 min**; bot still clears eventually but **does not trivially win** (takes hits, limited Papi/Dad matter). Keep `CAM_LEAD ≤ 1/3`, straight-fire, phone-friendly controls.

## After rebuild

Measured **2026-10-28** on `bdb-scroll` (length/difficulty pass, Claude Opus 5.5 `claude-opus-5-5`). Bot = unmodified `Bot` + `Campaign` (no cheats, same controls as before), `node tools/bot-sim.mjs adventure <hz>`. Per-stage numbers are a fresh run from that stage's start; campaign is one S1→S3 run.

| Metric | BDB S1 after | BDB S2 after | BDB S3 after | Notes |
| --- | --- | --- | --- | --- |
| World length | 7760 px | 7760 px | 7760 px | 5×1280 arenas + 80 px walk-up + 1280 boss arena (was 5200) |
| Zones + boss | 5 + boss | 5 + boss | 5 + boss | RWB: 3 + boss. 3 waves per zone — 15 waves/stage (RWB 6) |
| Mid plates | 6 (`s1-mid0..5`) | 6 (`s2-mid0..5`) | 6 (`s3-mid0..5`) | One per zone + boss; `mid3..5` (8 new) derived locally from existing art by `tools/derive-plates.py` |
| Wave enemies / HP pool | 53 / 4182 | 55 / 4735 | 56 / 5000 | RWB S1 14 / 492. RWB-style `[type, side, delay]` staggered entries, flank spawns; `hpScale` 2.2 per stage; Yetti pace ×1.0 / ×1.1 / ×1.15 |
| Enemy mix | walker 22, charger 9, guard 8, hover 6, choir 4, lecturer 4 | walker 12, hover 11, lecturer 9, charger 9, guard 8, choir 6 | lecturer 10, hover 10, guard 10, charger 10, walker 9, choir 7 | Every later zone mixes ≥ 3 roles (test-enforced) |
| Boss HP / phases | Interventionist **1200**, 3 phases (66 % / 33 %) | Choirmaster **1140**, 3 phases | Wingmen **360 + 360 + 200×2**, 3 phases | One long bar like RWB; roar beat (untouchable) at each gate, adds per phase, P3 Interventionist charges + two-way slam |
| Boss fight (bot, 60 Hz) | 33.8 s | 52.0 s | 49.3 s | was ~15–25 s |
| Bot clear (Adventure) | **153.6 / 159.3 / 156.1 s** | **186.8 / 193.7 / 190.9 s** | **211.3 / 209.4 / 219.8 s** | 30 / 60 / 120 Hz. Target RWB S1 154–216 s ✔ |
| Bot hits / deaths (solo stage, 60 Hz) | 4 / 0 | 8 / 1 | 14 / 3 | Before: S1 4/1, S2 0/0, S3 2/0 |
| Full campaign | **553.7 / 564.5 / 551.6 s (~9.2 min)** | | | 30 / 60 / 120 Hz; 25–28 hits, 3 deaths, 13–14 Papi, 3 Dad (cap), ~190 KOs. Before: 146 s, 8 hits, 2 deaths, 7 Papi, 2 Dad |
| `npm test` | **105 / 105 pass** | | | was 97; new floors: S1 bot ≥ 140 s, campaign ≥ 420 s, every stage 140–240 s, ≥ 12 hits |

### What changed (mechanics)

1. **Poise.** A held eggplant stream used to stun (0.14 s) and push back (12 px) on *every* shot, so 5 shots/s stun-locked any Yetti and walked it backwards. Now a Yetti flinches at most every 0.45 s (guard/charger/lecturer 0.9 s); point-blank bonks still always stagger. Packs actually close in.
2. **Staggered, flanking waves.** Wave entries are `[type, 'L'|'R', delay]`; `L` steps in at Bob's back. A wave stays open while stragglers are pending; an empty arena pulls the next straggler in after 0.5 s (no dead air).
3. **Lose a life, keep progress.** Zone deaths resume at the wave reached (was wave 1) and a mini-boss keeps the damage dealt (was a refill to the phase top). The sim is deterministic, so without this a bot retry replays the identical losing fight forever (seen: 150-death Interventionist loop at phase III).
4. **Power economy.** Free shake trios only in S1 zone 2 (Papi lesson); guards and the boss phase II trio are the other sources. Papi ≈ 1.5 uses/min (was ≈ 2.9/min); Dad is still 3 calls per campaign.
5. **Chapter pace** ramps Yetti speed/tells/projectiles (×1.1 S2, ×1.15 S3), capped at 1.25 total so Nightmare doesn't compound.

### Browser check

`tools/browser-smoke.mjs` (headless Chrome 156, SwiftShader, private debug port) played the `?demo=1` Adventure campaign through **victory** on the new content; live Phaser state at Stage 3 showed 6 plate runs with `s3-mid4` / `s3-mid5` / `s3-mid2` on top at the zone 4 / zone 5 / boss cameras and Claudia's cage in the new boss arena. The script's later touch-stick check (`held.x > before.x + 30`) is flaky under SwiftShader frame pacing: Bob moved 35 px here vs 32 px on `ab4cc15`, so not a regression.

### Known gaps

- **Nightmare** is not bot-clearable (S2/S3 zone 5 wave 2 snowball wall). It already wasn't at `ab4cc15` (S2 boss: 81 bot deaths), so this is not a regression, but Nightmare has not been tuned for the longer stages.
- **Story** clears in ~415 s with 0 bot deaths (S1 125 s), below the RWB band by design (5 hearts, 1.6× damage).
- New plates are mirrored/zoomed/regraded derivatives, not new paintings; `s1-mid5` keeps the readable (unmirrored) MOTEL sign.

## In-progress steer (same pass)

Game Art dropped hand-drawn **8-frame** `bob_shoot_00..07` and `yetti1_attack_00..07` at **16 fps** under `/workspace/bdb-art/sprites` (see `FPS.md`; 146 frames total). **Repack and ship** those into `assets/chars` before closing this pass. Fist clip on `yetti1_attack_05` is known — leave it. Details: `docs/ART-UPDATE-STEER.md` and `/tmp/bdb-length-claude-addendum.md`.

**Status: done** (art repack commit on `bdb-scroll`). `bob_shoot` and `yetti_walker_attack` are now the 8 hand-drawn v3 frames (`00..07`) at 16 fps, packed by `python3 tools/pack-flat.py --only bob,yetti_walker`, which rebuilds just those two atlases. Other Bob/walker anims are unchanged apart from WebP re-encode noise. `yetti_guard` keeps its 7-frame `yetti2_attack` (not redrawn). The `attack_05` fist clip is left as delivered.

## Stages 4–7

### Pass A — Stage 4 (2026-10-28)

Measured on `cursor/bdb-level4`, starting at `5beda6f` (docs-only over `8c06396`). Baseline `npm test`: **239 passed, 0 failed**. Baseline and final bot JSON cover Adventure, Story, and Nightmare at all three rates: `logs/baseline-8c06396-<difficulty>-<hz>.json` and `logs/pass-a-final-<difficulty>-<hz>.json`. Fresh stages have an 1800-second cap; full campaigns have a 3000-second cap. No bot controls, shared combat values, camera, Dad, or Papacito rules were retuned.

| Difficulty | Hz | S4 fresh (s) | Hits | Deaths | Papi / Dad | S4 continuation (s) | Full campaign (s) | Clear |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| Adventure | 30 | 175.0 | 8 | 1 | 3 / 3 | 185.2 | 765.5 | Both |
| Adventure | 60 | 176.8 | 7 | 0 | 3 / 3 | 177.8 | 753.8 | Both |
| Adventure | 120 | 175.2 | 7 | 1 | 3 / 3 | 171.5 | 747.0 | Both |
| Story | 30 | 152.7 | 3 | 0 | 2 / 3 | 158.9 | 660.5 | Both |
| Story | 60 | 162.3 | 8 | 1 | 3 / 3 | 161.2 | 675.9 | Both |
| Story | 120 | 157.6 | 6 | 1 | 3 / 3 | 157.4 | 660.1 | Both |
| Nightmare | 30 | 247.8 | 22 | 5 | 3 / 3 | 285.6 | 1103.4 | Both |
| Nightmare | 60 | 259.6 | 25 | 7 | 3 / 3 | 302.1 | 1161.3 | Both |
| Nightmare | 120 | 238.8 | 21 | 5 | 3 / 3 | 243.3 | 1102.3 | Both |

All three fresh Adventure runs meet the **175–205 s** target; all continuation stages are inside the **140–240 s** hard band. Story clears at every rate but is above the proposed 120–150 s target. Nightmare clears in this configuration; its higher hit/death counts are reported without adding Nightmare-specific trims. Full campaign totals include chapter-clear delays.

### Golden comparison

The complete fresh-stage result objects for S1–S3 are identical to baseline in **all nine difficulty/rate combinations**, including seconds, hurts, deaths, Papi, Dad, KOs, shots, phases, and stage times. The campaign's first three stage times also match exactly (`logs/pass-a-final-golden.json`). Adventure stage times, fresh and continuation:

| Hz | S1 fresh | S2 fresh | S3 fresh | Campaign S1 / S2 / S3 |
|---|---:|---:|---:|---|
| 30 | 163.8 | 186.2 | 196.9 | 163.8 / 184.9 / 221.6 |
| 60 | 165.1 | 189.2 | 209.0 | 165.1 / 187.5 / 213.3 |
| 120 | 161.2 | 193.6 | 205.7 | 161.2 / 197.8 / 206.6 |

### Stage 4 balance and content

The first implementation of the paste-ready waves cleared fresh in about 173–176 s, but the 30 Hz continuation repeatedly died in zone 5 wave 3. The permitted ladder was tested in order: trailing straggler, variant/core substitution, Salsero HP ±6, boss HP within 1200–1320, cooldown ±0.1, then pace ±0.02. No free shake zone was added: resource starvation was not the remaining issue. Several candidates cleared combat but exceeded the total voice-rate ceiling after boss retries. Rejected candidates were discarded; `hpScale` remains 2.2.

Final tuning against the brief:

- Zone 5 wave 3: replace its salsero at +1.6 s with a walker, and add a trailing walker from the right at +5 s. The stage has **56 wave Yettis**, **41 staggered**, **18 left flanks**, and base HP **1920** (4224 before per-enemy rounding at ×2.2). Mix: walker 12, salsero 15, guard 7, hover 6, lecturer 6, charger 6, choir 4.
- Salsero base HP **24** (−6); speed, hop cadence and lunge remain as specified.
- Bouncer HP **1240** (within the 1200–1320 band). Adds and cooldowns remain exactly as proposed.
- Stage pace **1.17** (+0.02), below the shared 1.25 cap.

Review also fixed a new-boss interaction: dashing into a clipboard during a gate roar must not cancel the invulnerable roar or skip its adds. Guard behavior remains identical. The Bouncer now plays its `down` corpse animation. New combat regressions cover both gates, shield timing, lunge counters, lane hops, legacy flags, and once-only gate/KO voice events.

### Voice and assets

`runVoiceRate({stage:4,hz:60})`: **3.28 ambient/min**, **6.56 total/min**, **8.000 s** minimum ambient gap. `BARK` remains byte-identical, including its 8 s gap and 3-per-60 s cap. S4's seven new script IDs are caption-only and absent from `PRESENT`. No paid voice or music service was called. `stage4` and `boss4` use `assets/audio/bdb-rise.mp3` because the supplied music files are still absent.

All eight plates are newly painted with the built-in image tool; all six zone/boss scenes differ. They total **787,122 bytes**, below S3's 808,688 bytes. Salsero and Bouncer are **still placeholder** sprites, with all required WebP/ASTC/ETC2/JSON files. S4 residency is **8.988 MiB ASTC / 35.952 MiB RGBA**, below 12/48 MiB. See [GPU-MEMORY.md](GPU-MEMORY.md). Existing background, character, voice, and cutscene bytes remain unchanged.

### Final verification

Final `npm test` on Node 24 after narrow allowlist fixes for stage-finale assumptions: see operator follow-up on `tests/boot.test.mjs` (allow `stage4-def`) and `tests/voice-cues.test.mjs` (S3 continues to S4; final victory after S4). Evidence logs under `logs/pass-a-final-*`.
