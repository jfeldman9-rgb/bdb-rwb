# Character atlas GPU memory (iPhone)

Measured Oct 28 2026 on `bdb-scroll`. Source of truth: `assets/chars/_pack_report.json`
(`tools/pack-flat.py` writes the RGBA/webp part, `tools/compress-ktx.py` adds `compressed`).
Estimates are level-0 texture bytes from page sizes: RGBA = w×h×4, ASTC 4×4 / ETC2 RGBA8 = w×h×1
(128-bit blocks per 4×4 texels). No mipmaps. Pack scale is `DRAW_SCALE = 0.38` (FPS.md's 0.58 / 92 MiB
figure is the unpacked upper bound at 0.58, not what ships).

## Before / after

| Build | Stage 1 kit GPU | All chars GPU | Disk (chars) |
|---|---|---|---|
| `c33cd12` before (silhouette Dad, naive shelf pack, webp → RGBA) | 18.73 MiB | 20.14 MiB | 1.66 MiB webp |
| real Dad art, naive shelf pack (not shipped; fails < 20 MiB test) | 21.04 MiB | — | — |
| **now, IMG fallback** (real Dad, height-sorted pack, webp → RGBA) | **19.25 MiB** | 20.67 MiB | 1.82 MiB webp |
| **now, ASTC 4×4** (iPhone A8+, Apple GPUs, most Android) | **4.81 MiB** | 5.17 MiB | 5.17 MiB `.astc.ktx` (2.56 MiB gzip) |
| **now, ETC2 RGBA8** (GLES3 / WebGL2 without ASTC) | **4.81 MiB** | 5.17 MiB | 5.17 MiB `.etc2.ktx` (1.59 MiB gzip) |

Per stage (`STAGE_CHARS`): Stage 1 19.25 → 4.81, Stage 2 19.25 → 4.81, Stage 3 19.49 → 4.87 MiB (RGBA → ASTC).
A client downloads exactly one of the three formats per page; the webp + `.json` atlas stays as the IMG fallback
(desktop GPUs normally expose only S3TC/BPTC, so desktop keeps the webp path).

## Per page

| Page | Stage 1 | Size | RGBA MiB | ASTC/ETC2 MiB | webp KiB | ktx KiB | ASTC gzip KiB | ETC2 gzip KiB |
|---|---|---|---|---|---|---|---|---|
| bob-0 | ✓ | 976×912 | 3.40 | 0.85 | 354 | 869 | 402 | 277 |
| dad-0 | ✓ | 1268×376 | 1.82 | 0.45 | 185 | 466 | 242 | 157 |
| yetti_walker-0 | ✓ | 2016×728 | 5.60 | 1.40 | 537 | 1433 | 871 | 510 |
| yetti_guard-0 | ✓ | 996×1336 | 5.08 | 1.27 | 554 | 1300 | 742 | 474 |
| yetti_hover-0 | ✓ | 860×180 | 0.59 | 0.15 | 28 | 151 | 46 | 26 |
| yetti_charger-0 | ✓ | 860×180 | 0.59 | 0.15 | 28 | 151 | 46 | 26 |
| yetti_choir-0 | ✓ | 860×180 | 0.59 | 0.15 | 28 | 151 | 46 | 26 |
| yetti_lecturer-0 | ✓ | 860×180 | 0.59 | 0.15 | 28 | 151 | 46 | 26 |
| interventionist-0 | ✓ | 860×180 | 0.59 | 0.15 | 28 | 151 | 46 | 26 |
| papi_runners-0 | ✓ | 644×168 | 0.41 | 0.10 | 23 | 106 | 25 | 14 |
| choirmaster-0 |  | 860×180 | 0.59 | 0.15 | 28 | 151 | 46 | 26 |
| wingman-0 |  | 860×180 | 0.59 | 0.15 | 28 | 151 | 48 | 26 |
| claudia-0 |  | 368×168 | 0.24 | 0.06 | 14 | 60 | 17 | 9 |

## How it loads

`src/assets.js` `queueCharPages` → `scene.load.texture(page, {ASTC:{type:'KTX',…}, ETC:{type:'KTX',…}, IMG:{…webp}})`.
Phaser 4.2.1 picks the first key the renderer supports (`renderer.compression`, `IMG` is always true).
Pages are JSON-hash atlases shared by all three formats. Atlases without a `gpu` entry in `<key>.anims.json`
fall back to `load.atlas` (webp).

Container: **KTX v1**. `lib/phaser.min.js` 4.2.1 only parses KTX1 and PVR (`KTXParser`, `PVRParser`); it has
no KTX2 reader or Basis transcoder. KTX2/UASTC (Basis) masters are built in `build/ktx2/` (gitignored) and
are the source of the ETC2 pages, but they are not shipped or loaded.

Encoding details (`tools/compress-ktx.py`):
- **Premultiplied alpha.** Phaser's NORMAL blend is `ONE, ONE_MINUS_SRC_ALPHA` and `UNPACK_PREMULTIPLY_ALPHA`
  does nothing for `compressedTexImage2D`, so RGB is multiplied by A before encoding.
- **Bottom-up rows** (`KTXorientation S=r,T=u`). Phaser flips V for GL textures and `UNPACK_FLIP_Y` doesn't
  apply to compressed uploads. Top-down pages render upside down and sample neighbouring frames (seen in Chrome).
- Pages are 4×4-aligned by `pack-flat.py`, so webp and KTX have identical dimensions and frame rects.
- ASTC: `ktx create --format ASTC_4x4_UNORM_BLOCK --astc-quality thorough` (bob-0 PSNR 42.7 dB vs source).
  ETC2: UASTC master (`--uastc-quality 2`, ≈39 dB) → `ktx transcode --target etc-rgba`.

Verified in headless Chrome 156 (SwiftShader exposes ASTC + ETC): every resident page reports
`COMPRESSED_RGBA_ASTC_4x4_KHR`. With ASTC masked it reports `COMPRESSED_RGBA8_ETC2_EAC`, and with both
masked it falls back to webp. All three renders match.

## Toolchain

KTX-Software **4.4.2** (`ktx` CLI, Apache-2.0, includes astcenc + Basis encoders). No paid or cloud converters.

```sh
curl -LO https://github.com/KhronosGroup/KTX-Software/releases/download/v4.4.2/KTX-Software-4.4.2-Linux-x86_64.tar.bz2
# sha1 c6b08c817f8c8dd299deccae4f2fbb8d55e9acd2
mkdir -p ~/.local/ktx && tar -xjf KTX-Software-4.4.2-Linux-x86_64.tar.bz2 -C ~/.local/ktx   # or python tarfile if no bzip2
python3 tools/pack-flat.py --only dad        # repack; runs tools/compress-ktx.py for the same keys
python3 tools/compress-ktx.py                # or recompress every atlas
```

`compress-ktx.py` finds `ktx` via `$KTX`, `PATH`, or `~/.local/ktx/KTX-Software-*/bin/ktx` and sets
`LD_LIBRARY_PATH` to the bundled `lib/`. If it's missing, `pack-flat.py` warns and the repacked keys load webp.

## Notes / risks

- Serve `.ktx` with gzip/brotli: raw ASTC is about 2.8× the webp on the wire, gzip is about 1.4×.
- Phaser keeps the compressed ArrayBuffer as the texture source, so the JS heap holds about 4.8 MiB per stage.
  The webp path keeps a decoded image too, typically closer to the 19 MiB RGBA.
- Without mipmaps, minification is plain linear. Sprites draw at ≈1.1–1.4× the packed scale, so this is fine.
