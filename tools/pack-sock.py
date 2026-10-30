#!/usr/bin/env python3
"""Pack Game Art sock projectile into assets/fx/sock-0.{webp,json} + sock.anims.json.

Source default: /workspace/bdb-art/projectiles/sock/sock_{spin,puff}_NN.png (128x128 RGBA).
spin 00..07 @16fps loop; puff 00..04 @16fps one-shot.
Unlike pack-flat.py (720x600 character sheets), projectile frames stay native size.

Usage: python3 tools/pack-sock.py [art_dir] [out_dir]
"""
from pathlib import Path
from PIL import Image
import json, sys

art = Path(sys.argv[1] if len(sys.argv) > 1 else '/workspace/bdb-art/projectiles/sock')
out = Path(sys.argv[2] if len(sys.argv) > 2 else 'assets/fx')
out.mkdir(parents=True, exist_ok=True)
for old in list(out.glob('sock-*')) + list(out.glob('sock.anims.json')):
  old.unlink()

SPIN = [art / f'sock_spin_{i:02d}.png' for i in range(8)]
PUFF = [art / f'sock_puff_{i:02d}.png' for i in range(5)]
missing = [str(p) for p in SPIN + PUFF if not p.is_file()]
if missing:
  sys.exit('missing frames: ' + ', '.join(missing))

PAD, MAXW = 2, 1024

def prepare(im):
  im = im.convert('RGBA')
  box = im.getchannel('A').getbbox() or (0, 0, 1, 1)
  return im.crop(box), box, im.size

frames_meta, anims = [], []

def add_anim(name, paths, fps, loop):
  hold = max(1, int(1000 / fps + 0.5))
  a = {'name': name, 'frames': [], 'pages': [], 'holds': [], 'loop': loop, 'fps': fps}
  for p in paths:
    crop, box, src = prepare(Image.open(p))
    frames_meta.append((p.stem, crop, dict(x=box[0], y=box[1], w=crop.width, h=crop.height), dict(w=src[0], h=src[1])))
    a['frames'].append(len(frames_meta) - 1)
    a['holds'].append(hold)
  anims.append(a)

add_anim('sock_spin', SPIN, 16, True)
add_anim('sock_puff', PUFF, 16, False)

place, x, y, rowh, W, H = [], 0, 0, 0, 0, 0
for _name, crop, _sss, _src in frames_meta:
  w, h = crop.size
  if x + w + PAD > MAXW:
    x = 0
    y += rowh + PAD
    rowh = 0
  place.append((0, x, y))
  x += w + PAD
  rowh = max(rowh, h)
  W = max(W, x)
  H = max(H, y + h)
W, H = -(-W // 4) * 4, -(-H // 4) * 4
atlas = Image.new('RGBA', (W, H))
entries = {}
for (name, crop, sss, src), (_pg, px, py) in zip(frames_meta, place):
  atlas.paste(crop, (px, py))
  entries[name] = {
    'frame': dict(x=px, y=py, w=crop.width, h=crop.height),
    'rotated': False, 'trimmed': True,
    'spriteSourceSize': sss, 'sourceSize': src,
  }
page = 'sock-0'
atlas.save(out / f'{page}.webp', quality=90, method=6)
(out / f'{page}.json').write_text(json.dumps({
  'frames': entries,
  'meta': {'image': f'{page}.webp', 'size': {'w': W, 'h': H}, 'scale': 1},
}))
for a in anims:
  idxs = a['frames']
  a['frames'] = [frames_meta[i][0] for i in idxs]
  a['pages'] = [0 for _ in idxs]
meta = {
  'canvas': [128, 128], 'baseline': 64, 'scale': 1,
  'pages': [page], 'anims': anims, 'placeholder': False, 'source': str(art),
}
(out / 'sock.anims.json').write_text(json.dumps(meta, indent=2))
print(f'sock: frames={len(frames_meta)} page={W}x{H} webp={(out / f"{page}.webp").stat().st_size}')
