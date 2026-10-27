# Asset notes (BDB-RWB)

## Character atlases (v2 higher-fps, Oct 27 2026 America/Phoenix)

Source: `/workspace/bdb-art/sprites/` main folder. Ignore `_v1/` and `_old/`.
Spec: `FPS.md`.

| Key | Anims (count@fps) |
| --- | --- |
| bob | idle12@12, walk12@18, shoot7@16, hurt5@14, knockdown7@14, getup7@14 |
| yetti_walker (yetti1) | idle12@12, walk16@18, attack7@16, hurt5@14, knockdown7@14 |
| yetti_guard (yetti2) | same as walker |
| others | clothed silhouette stand-ins via `tools/pack-flat.py` |

Packer (`tools/pack-flat.py` / `node tools/make-placeholders.mjs`):
- Trims transparent bounds, packs webp pages, **dedupes identical HOLD frames** (anim defs re-reference shared atlas frames).
- Pack scale **0.38** (anims.json `scale`). The ~0.58 on-screen draw intent at full unique residency overshoots ~42 MiB Stage-1 GPU; 0.38 + trim + dedupe lands Stage-1 kit under 20 MiB. `fighter.js` uses `def.scale / m.scale`, so on-screen size stays correct.
- Logical canvas stays `[720,600]`, baseline `570`.
- Never copies `elon-console.webp`.

See `assets/chars/_pack_report.json` for the latest disk/GPU totals.
