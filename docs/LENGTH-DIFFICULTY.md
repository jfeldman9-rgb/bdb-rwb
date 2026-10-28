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

_(Filled by the Claude length pass — see commit message + `/tmp/bdb-length-claude-report.md`.)_

| Metric | BDB S1 after | BDB S2 after | BDB S3 after | Notes |
| --- | --- | --- | --- | --- |
| World length | | | | |
| Zones + boss | | | | |
| Mid plates | | | | |
| Wave enemies / HP pool | | | | |
| Boss HP / phases | | | | |
| Bot clear (Adventure) | | | | |
| Full campaign | | | | |
| `npm test` | | | | |

