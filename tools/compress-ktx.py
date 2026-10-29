#!/usr/bin/env python3
"""GPU-compressed character atlas pages for iPhone: ASTC 4x4 + ETC2 RGBA8, WebP stays as IMG fallback.

Pipeline per page (assets/chars/<key>-N.webp, 4x4-aligned by pack-flat.py):
  1. premultiply alpha (Phaser blends ONE, ONE_MINUS_SRC_ALPHA and cannot premultiply compressed uploads)
     and store bottom-up: Phaser 4 flips V for GL textures and UNPACK_FLIP_Y does not apply to
     compressedTexImage2D, so top-down blocks render upside down and sample the wrong atlas frames.
  2. `ktx create --encode uastc`           -> KTX2/Basis UASTC master (build/ktx2/, not shipped)
  3. `ktx create --format ASTC_4x4_UNORM`  -> ASTC blocks (astcenc, thorough)
     `ktx transcode --target etc-rgba`     -> ETC2 RGBA8 blocks from the UASTC master
  4. rewrap level 0 as KTX v1 (<page>.astc.ktx / <page>.etc2.ktx): lib/phaser.min.js 4.2.1 only parses
     KTX1/PVR containers (no KTX2 / Basis transcoder in-tree).
  5. tag <key>.anims.json with "gpu" so src/assets.js queues ASTC -> ETC -> IMG.

Tool: KTX-Software `ktx` >= 4.3 (Apache-2.0). Looked up from $KTX, PATH, then ~/.local/ktx/KTX-Software-*/bin.
Usage: python3 tools/compress-ktx.py [--only bob,dad]      (run after tools/pack-flat.py)
"""
from pathlib import Path
from PIL import Image
import numpy as np
import json, os, shutil, struct, subprocess, sys, tempfile, gzip

out = Path('assets/chars')
masters = Path('build/ktx2')
STAGE1 = ['bob', 'yetti_walker', 'yetti_guard', 'yetti_hover', 'yetti_charger', 'yetti_choir',
          'yetti_lecturer', 'interventionist', 'dad', 'papi_stampede']
STAGE4 = [key for key in STAGE1 if key != 'interventionist'] + ['yetti_salsero', 'bouncer']
# vkFormat -> (GL internal format, file suffix, Phaser loader key)
FORMATS = {
  157: (0x93B0, 'astc', 'ASTC'),  # VK_FORMAT_ASTC_4x4_UNORM_BLOCK  -> COMPRESSED_RGBA_ASTC_4x4_KHR
  151: (0x9278, 'etc2', 'ETC'),   # VK_FORMAT_ETC2_R8G8B8A8_UNORM_BLOCK -> COMPRESSED_RGBA8_ETC2_EAC
}
BPP = {'astc': 1.0, 'etc2': 1.0}  # bytes per pixel (both 128-bit 4x4 blocks)


def find_ktx():
  cands = [os.environ.get('KTX'), shutil.which('ktx')]
  cands += sorted(str(p) for p in Path.home().glob('.local/ktx/KTX-Software-*/bin/ktx'))
  for c in cands:
    if c and Path(c).is_file():
      return Path(c)
  sys.exit('ktx (KTX-Software >= 4.3) not found; see docs/GPU-MEMORY.md "Toolchain"')


KTX = None
ENV = None


def ktx(*args):
  subprocess.run([str(KTX), *map(str, args)], check=True, env=ENV, stdout=subprocess.DEVNULL)


def read_ktx2_level0(path):
  b = Path(path).read_bytes()
  assert b[:12] == b'\xabKTX 20\xbb\r\n\x1a\n', path
  vk, _, w, h, _, _, _, levels, scheme = struct.unpack_from('<9I', b, 12)
  assert scheme == 0 and levels == 1, (path, scheme, levels)
  off, length, _ = struct.unpack_from('<3Q', b, 80)
  return vk, w, h, b[off:off + length]


def write_ktx1(path, gl_internal, w, h, data):
  kv = b'KTXorientation\0S=r,T=u\0'  # rows stored bottom-up (see step 1)
  kv = struct.pack('<I', len(kv)) + kv + b'\0' * (-len(kv) % 4)
  head = b'\xabKTX 11\xbb\r\n\x1a\n' + struct.pack('<13I', 0x04030201, 0, 1, 0, gl_internal, 0x1908,
                                                    w, h, 0, 0, 1, 1, len(kv))
  Path(path).write_bytes(head + kv + struct.pack('<I', len(data)) + data)


def compress_page(page, tmp):
  im = np.asarray(Image.open(out / f'{page}.webp').convert('RGBA')).astype(np.float32)
  h, w = im.shape[:2]
  assert w % 4 == 0 and h % 4 == 0, f'{page} {w}x{h} not 4x4 aligned; repack with tools/pack-flat.py'
  im[..., :3] = np.round(im[..., :3] * im[..., 3:4] / 255)
  png = tmp / f'{page}.png'
  Image.fromarray(np.flipud(im).astype(np.uint8)).save(png)
  master = masters / f'{page}.ktx2'
  ktx('create', '--format', 'R8G8B8A8_UNORM', '--assign-tf', 'linear', '--encode', 'uastc',
      '--uastc-quality', 2, '--zstd', 18, png, master)
  ktx('create', '--format', 'ASTC_4x4_UNORM_BLOCK', '--assign-tf', 'linear', '--astc-quality', 'thorough',
      png, tmp / 'astc.ktx2')
  ktx('transcode', '--target', 'etc-rgba', master, tmp / 'etc2.ktx2')
  files = {}
  for name in ('astc', 'etc2'):
    vk, kw, kh, data = read_ktx2_level0(tmp / f'{name}.ktx2')
    gl, suffix, loader = FORMATS[vk]
    assert suffix == name and (kw, kh) == (w, h) and len(data) == w * h * BPP[name], (page, name, vk, kw, kh)
    write_ktx1(out / f'{page}.{suffix}.ktx', gl, w, h, data)
    files[loader] = f'{suffix}.ktx'
  return files, (w, h)


def main():
  global KTX, ENV
  argv = sys.argv[1:]
  if '--report' in argv:
    report()
    return
  KTX = find_ktx()
  ENV = {**os.environ, 'LD_LIBRARY_PATH': f'{KTX.parent.parent / "lib"}:{os.environ.get("LD_LIBRARY_PATH", "")}'}
  only = set(argv[argv.index('--only') + 1].split(',')) if '--only' in argv else None
  masters.mkdir(parents=True, exist_ok=True)
  keys = sorted(p.name[:-len('.anims.json')] for p in out.glob('*.anims.json'))
  with tempfile.TemporaryDirectory() as t:
    for key in keys:
      if only and key not in only:
        continue
      mp = out / f'{key}.anims.json'
      m = json.loads(mp.read_text())
      gpu = None
      for page in m['pages']:
        gpu, _ = compress_page(page, Path(t))
      m['gpu'] = {**gpu, 'premultiplied': True}
      mp.write_text(json.dumps(m, indent=2))
      print(f'{key}: {len(m["pages"])} page(s) -> {", ".join(gpu.values())}')
  report()


def sizes(key):
  m = json.loads((out / f'{key}.anims.json').read_text())
  rows = []
  for p in m['pages']:
    sz = json.loads((out / f'{p}.json').read_text())['meta']['size']
    row = {'page': p, 'w': sz['w'], 'h': sz['h'], 'rgba': sz['w'] * sz['h'] * 4,
           'webp_disk': (out / f'{p}.webp').stat().st_size}
    for suf in ('astc', 'etc2'):
      f = out / f'{p}.{suf}.ktx'
      if f.is_file():
        raw = f.read_bytes()
        row[f'{suf}_gpu'] = int(sz['w'] * sz['h'] * BPP[suf])  # level 0 only, no mips
        row[f'{suf}_disk'] = len(raw)
        row[f'{suf}_gzip'] = len(gzip.compress(raw, 9))
    rows.append(row)
  return rows


def report():
  mib = lambda b: round(b / 2**20, 3)
  allk = sorted(p.name[:-len('.anims.json')] for p in out.glob('*.anims.json'))
  rows = {k: sizes(k) for k in allk}
  tot = lambda keys, f: sum(r.get(f, 0) for k in keys for r in rows[k])
  # Ask the production loader, including its IMG-only keyed stampede policy.
  sources = json.loads(subprocess.check_output(['node', '--input-type=module', '-e', """
    import { readFileSync } from 'node:fs';
    import { charPageSources } from './src/assets.js';
    const keys = JSON.parse(process.argv[1]);
    const pages = {};
    for (const key of keys) {
      const meta = JSON.parse(readFileSync(`assets/chars/${key}.anims.json`, 'utf8'));
      for (const page of meta.pages) pages[page] = Object.keys(charPageSources(meta, page));
    }
    process.stdout.write(JSON.stringify(pages));
  """, json.dumps(allk)], text=True))
  def selected(keys, fmt):
    field = {'ASTC': 'astc_gpu', 'ETC': 'etc2_gpu', 'IMG': 'rgba'}
    return sum(r[field[fmt if fmt in sources[r['page']] else 'IMG']] for k in keys for r in rows[k])
  def gpu_totals(keys):
    return {label: mib(selected(keys, fmt)) for fmt, label in [('IMG', 'rgba_webp'), ('ASTC', 'astc'), ('ETC', 'etc2')]}
  rp = out / '_pack_report.json'
  rep = json.loads(rp.read_text()) if rp.is_file() else {}
  rep['compressed'] = {
    'formats': {'ASTC': 'ASTC 4x4 UNORM (KTX1, 8 bpp)', 'ETC': 'ETC2 RGBA8 EAC (KTX1, 8 bpp)', 'IMG': 'webp RGBA'},
    'premultiplied': True,
    'stage1_keys': STAGE1,
    'stage1_gpu_MiB': gpu_totals(STAGE1),
    'stage4_keys': STAGE4,
    'stage4_gpu_MiB': gpu_totals(STAGE4) if set(STAGE4) <= set(rows) else None,
    'all_chars_gpu_MiB': gpu_totals(allk),
    'disk_MiB': {'webp': mib(tot(allk, 'webp_disk')), 'astc_ktx': mib(tot(allk, 'astc_disk')),
                 'etc2_ktx': mib(tot(allk, 'etc2_disk')), 'astc_ktx_gzip': mib(tot(allk, 'astc_gzip')),
                 'etc2_ktx_gzip': mib(tot(allk, 'etc2_gzip'))},
    'pages': {r['page']: {k: v for k, v in r.items() if k != 'page'} for k in allk for r in rows[k]},
  }
  rp.write_text(json.dumps(rep, indent=2))
  c = rep['compressed']
  print('COMPRESSED', json.dumps({k: c[k] for k in ('stage1_gpu_MiB', 'all_chars_gpu_MiB', 'disk_MiB')}))


if __name__ == '__main__':
  main()
