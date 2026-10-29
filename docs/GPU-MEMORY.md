# Character atlas GPU memory (iPhone)

Updated Oct 29 2026 on `cursor/bdb-level4`, using the painted Stage 4 atlases and loader-selected formats.
Source of truth: `assets/chars/_pack_report.json` (`tools/pack-flat.py` + `tools/compress-ktx.py`).
Estimates are level-0 texture bytes from page sizes: RGBA = w×h×4, ASTC 4×4 / ETC2 RGBA8 = w×h×1
(128-bit blocks per 4×4 texels). No mipmaps. Pack scale is `DRAW_SCALE = 0.38`.

## Stage residency (current tip)

| Path | Stage 1 kit GPU | Stage 4 kit GPU | Stage 5 kit GPU | Stage 6 kit GPU | All chars GPU | Disk (chars) |
|---|---|---|---|---|---|---|
| **IMG fallback** (webp → RGBA upload) | **33.482 MiB** | **44.520 MiB** | **38.936 MiB** | **34.899 MiB** | 49.302 MiB | 4.145 MiB webp |
| **ASTC 4×4 + keyed IMG** | **9.918 MiB** | **12.678 MiB** | **11.282 MiB** | **10.273 MiB** | 13.873 MiB | 12.327 MiB `.astc.ktx` |
| **ETC2 RGBA8 + keyed IMG** | **9.918 MiB** | **12.678 MiB** | **11.282 MiB** | **10.273 MiB** | 13.873 MiB | 12.327 MiB `.etc2.ktx` |

Budget target: **under 60 MiB** GPU residency for a Stage 1 kit. ASTC + IMG Stage 1 is ~9.9 MiB (well under).
`STAGE_CHARS` loads role atlases for every stage (shared kit); bosses swap per stage.

Painted role pages (ASTC GPU bytes): hover 0.68 MiB, charger 1.09 MiB, choir 0.88 MiB, lecturer 1.07 MiB.

Stage 4 uses the shared kit plus `yetti_salsero` and `bouncer`. The character-page
ceiling is **≤13 MiB on ASTC/ETC2 devices / ≤48 MiB RGBA**. The previous 12 MiB check
counted an unused compressed stampede page. `charPageSources()` deliberately chooses
the keyed WebP for `papi_stampede`; its KTX files still contain the pink matte. Its
actual 2,164,096 RGBA bytes replace the assumed 541,024 compressed bytes. No art or
media was re-encoded. Disk columns above count all shipped character files, including
unused stampede KTX files; they are not a per-device download estimate.

`python3 tools/compress-ktx.py --report` updates the accounting without encoding assets.
It queries the production loader's `charPageSources()` format choices. Tests independently
sum the selected page residency and compare Stage 1 and Stage 4 with the report.

Stage 4's eight painted background plates were generated through the built-in `image_gen`
tool, using `s3-mid0.webp` and `chapter1-boulevard.webp` as visual style references. The prompt
set followed the plan's valley panorama, wet paving, party strip, club door, dance floor,
bar/kitchen, chiva alley, and rooftop VIP beats. A second pass simplified photographic
microtexture into flat painterly shapes and kept the lane band clear. New PNGs alone were
resized with BILINEAR sampling and encoded as WebP **quality 80, method 6**: six 1280×720 mids,
1600×720 far, and 1280×220 floor. Total disk size is **787,122 bytes**, below S3's 808,688 bytes.
The generated sources remain in the local built-in image library; final assets live in
`assets/bg/s4-*.webp`. No derived plates or paid service were used.
