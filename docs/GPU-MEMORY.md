# Character atlas GPU memory (iPhone)

Measured Oct 28 2026 on `cursor/bdb-level4` after the Stage 4 Pass A stand-in atlases.
Source of truth: `assets/chars/_pack_report.json` (`tools/pack-flat.py` + `tools/compress-ktx.py`).
Estimates are level-0 texture bytes from page sizes: RGBA = w×h×4, ASTC 4×4 / ETC2 RGBA8 = w×h×1
(128-bit blocks per 4×4 texels). No mipmaps. Pack scale is `DRAW_SCALE = 0.38`.

## Stage residency (current tip)

| Path | Stage 1 kit GPU | Stage 4 kit GPU | All chars GPU | Disk (chars) |
|---|---|---|---|---|
| **IMG fallback** (webp → RGBA upload) | **33.482 MiB** | **35.952 MiB** | 38.372 MiB | 3.206 MiB webp |
| **ASTC 4×4** (iPhone A8+, Apple GPUs, most Android) | **8.370 MiB** | **8.988 MiB** | 9.593 MiB | 9.594 MiB `.astc.ktx` (5.131 MiB gzip) |
| **ETC2 RGBA8** (GLES3 / WebGL2 without ASTC) | **8.370 MiB** | **8.988 MiB** | 9.593 MiB | 9.594 MiB `.etc2.ktx` (2.992 MiB gzip) |

Budget target: **under 60 MiB** GPU residency for a Stage 1 kit. ASTC Stage 1 is ~8.4 MiB (well under).
`STAGE_CHARS` loads role atlases for every stage (shared kit); bosses swap per stage.

Painted role pages (ASTC GPU bytes): hover 0.68 MiB, charger 1.09 MiB, choir 0.88 MiB, lecturer 1.07 MiB.

Stage 4 uses the shared kit plus `yetti_salsero` and `bouncer`, and meets its stricter
**≤12 MiB ASTC / ≤48 MiB RGBA** cap. These are local clothed silhouette stand-ins with readable
pink dance clothing, clipboard, velvet rope, and lanyard; painted source frames were not present.
Salsero has 30 logical frames / 12 unique frames (1488×184, 0.261 MiB ASTC), and the Bouncer has
38 logical frames / 18 unique frames (1436×368, 0.504 MiB ASTC). Both include WebP, ASTC, ETC2,
page JSON, and animation JSON. Only these new keys were packed:

```sh
node tools/make-placeholders.mjs --only yetti_salsero,bouncer
```

`_pack_report.json` records `compressed.stage4_keys` and `compressed.stage4_gpu_MiB`.
Report tooling now counts the resident `papi_stampede` rather than the retired `papi_runners`;
no existing atlas was re-encoded. The report also corrects the previously stale stampede WebP
disk-size entry (actual unchanged file: 126,374 bytes).

Stage 4's eight painted background plates were generated through the built-in `image_gen`
tool, using `s3-mid0.webp` and `chapter1-boulevard.webp` as visual style references. The prompt
set followed the plan's valley panorama, wet paving, party strip, club door, dance floor,
bar/kitchen, chiva alley, and rooftop VIP beats. A second pass simplified photographic
microtexture into flat painterly shapes and kept the lane band clear. New PNGs alone were
resized with BILINEAR sampling and encoded as WebP **quality 80, method 6**: six 1280×720 mids,
1600×720 far, and 1280×220 floor. Total disk size is **787,122 bytes**, below S3's 808,688 bytes.
The generated sources remain in the local built-in image library; final assets live in
`assets/bg/s4-*.webp`. No derived plates or paid service were used.
