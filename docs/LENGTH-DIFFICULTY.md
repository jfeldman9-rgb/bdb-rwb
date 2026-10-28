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
