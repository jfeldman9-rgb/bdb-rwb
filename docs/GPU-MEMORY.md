# Character atlas GPU memory (iPhone)

Measured Oct 28 2026 on `bdb-scroll` after painted Yetti role atlases (hover/charger/choir/lecturer).
Source of truth: `assets/chars/_pack_report.json` (`tools/pack-flat.py` + `tools/compress-ktx.py`).
Estimates are level-0 texture bytes from page sizes: RGBA = w×h×4, ASTC 4×4 / ETC2 RGBA8 = w×h×1
(128-bit blocks per 4×4 texels). No mipmaps. Pack scale is `DRAW_SCALE = 0.38`.

## Stage residency (current tip)

| Path | Stage 1 kit GPU | All chars GPU | Disk (chars) |
|---|---|---|---|
| **IMG fallback** (webp → RGBA upload) | **31.771 MiB** | 33.188 MiB | 2.97 MiB webp |
| **ASTC 4×4** (iPhone A8+, Apple GPUs, most Android) | **7.943 MiB** | 8.297 MiB | 8.298 MiB `.astc.ktx` (4.672 MiB gzip) |
| **ETC2 RGBA8** (GLES3 / WebGL2 without ASTC) | **7.943 MiB** | 8.297 MiB | 8.298 MiB `.etc2.ktx` (2.794 MiB gzip) |

Budget target: **under 60 MiB** GPU residency for a Stage 1 kit. ASTC Stage 1 is ~7.9 MiB (well under).
`STAGE_CHARS` loads role atlases for every stage (shared kit); bosses swap per stage.

Painted role pages (ASTC GPU bytes): hover 0.68 MiB, charger 1.09 MiB, choir 0.88 MiB, lecturer 1.07 MiB.
