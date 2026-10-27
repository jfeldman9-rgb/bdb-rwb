#!/usr/bin/env python3
"""Pack BDB sprites (v2 higher-fps) + clothed silhouette stand-ins.

- Reads /workspace/bdb-art/sprites MAIN folder (ignores _v1/ and _old/).
- Spec: FPS.md — bob idle12@12 walk12@18 shoot7@16 hurt5@14 knockdown7@14 getup7@14;
  yetti1/2 idle12@12 walk16@18 attack7@16 hurt5@14 knockdown7@14.
- Dedupes identical pixel frames in the atlas; anim defs re-reference shared frames.
- Trims alpha, packs webp, downscales by DRAW_SCALE (~0.58) for iPhone GPU.
- canvas/baseline stay logical 720×600 / 570; anims.scale = DRAW_SCALE so
  fighter.js `def.scale / m.scale` keeps on-screen size.

Run from repo root: node tools/make-placeholders.mjs
"""
from pathlib import Path
from PIL import Image, ImageDraw
import json, sys, shutil, math, subprocess, hashlib

DRAW_SCALE = 0.38  # PACK_SCALE_NOTE: 0.58 draw intent overshoots ~42MiB stage1 GPU; 0.38 lands under 20MiB with trim+dedupe
MAXW = 2048
PAD = 2

art = Path(sys.argv[1] if len(sys.argv) > 1 else '/workspace/bdb-art/sprites')
packet = Path(sys.argv[2] if len(sys.argv) > 2 else '/workspace/bdb-packet/src/Claudia_Handoff/game/public/game')
out = Path('assets/chars')
out.mkdir(parents=True, exist_ok=True)

# Prefer MAIN v2 frames; never _old. Fall back to _v1 only if a key is missing in root.
fps_ms = lambda fps: max(1, int(1000 / fps + 0.5))  # half-up; matches JS Math.round

REAL = {
  'bob': ('bob', {
    'idle': (12, 12), 'walk': (12, 18), 'shoot': (7, 16),
    'hurt': (5, 14), 'knockdown': (7, 14), 'getup': (7, 14),
  }),
  'yetti_walker': ('yetti1', {
    'idle': (12, 12), 'walk': (16, 18), 'attack': (7, 16),
    'hurt': (5, 14), 'knockdown': (7, 14),
  }),
  'yetti_guard': ('yetti2', {
    'idle': (12, 12), 'walk': (16, 18), 'attack': (7, 16),
    'hurt': (5, 14), 'knockdown': (7, 14),
  }),
}
STANDINS = {
  'dad': {'run': (6, 12), 'swat': (4, 14), 'cheer': (3, 12)},
  'claudia': {'idle-caged': (4, 10), 'freed': (4, 12), 'portrait': (1, 1)},
  'yetti_hover': {'fly': (6, 12), 'shoot': (3, 14), 'hurt': (2, 14), 'down': (3, 12)},
  'yetti_charger': {'walk': (6, 14), 'telegraph': (2, 10), 'rush': (4, 16), 'hurt': (2, 14), 'down': (3, 12)},
  'yetti_choir': {'sing': (6, 10), 'hurt': (2, 14), 'down': (3, 12)},
  'yetti_lecturer': {'walk': (6, 12), 'grab': (3, 12), 'hold': (2, 8), 'hurt': (2, 14), 'down': (3, 12)},
  'wingman': {'hover': (6, 12), 'ring': (4, 14), 'telegraph': (2, 10), 'dive': (3, 14), 'land': (3, 12), 'hurt': (2, 14), 'split': (4, 12)},
  'papi_runners': {f'run{i}': (8, 16) for i in range(1, 5)},
  'interventionist': {'walk': (6, 12), 'grab': (3, 12), 'hold': (2, 8), 'hurt': (2, 14), 'down': (3, 12), 'slam': (4, 14)},
  'choirmaster': {'sing': (6, 10), 'hurt': (2, 14), 'down': (3, 12), 'ring': (4, 14)},
}

LOOP = {'idle', 'walk', 'fly', 'sing', 'hover', 'run', 'idle-caged'} | {f'run{i}' for i in range(1, 5)}


def silhouette(key, anim, i):
  im = Image.new('RGBA', (720, 600)); d = ImageDraw.Draw(im)
  color = {'dad': '#e7b65c', 'claudia': '#ed91bd', 'papi_runners': '#f3a75e', 'wingman': '#b3a1ed'}.get(key, '#a9cfdf')
  dx = round(math.sin(i * 1.3) * 14); x = 360 + dx
  if 'yetti' in key or key in ('wingman', 'interventionist', 'choirmaster'):
    d.ellipse((175, 180, 350, 405), fill='#dfeafa'); d.ellipse((370, 180, 545, 405), fill='#dfeafa')
    d.ellipse((x - 55, 90, x + 55, 116), outline='#ffe69c', width=9)
  d.ellipse((x - 48, 130, x + 48, 230), fill=color)
  d.rounded_rectangle((x - 62, 230, x + 62, 450), radius=25, fill=color)
  # Fully clothed adults: solid tunic/tracksuit, arms, trousers and shoes.
  d.line((x - 55, 255, x - 105, 400), fill=color, width=30)
  d.line((x + 55, 255, x + 105, 385), fill=color, width=30)
  d.line((x - 30, 420, x - 52 + dx, 552), fill=color, width=38)
  d.line((x + 30, 420, x + 50 - dx, 552), fill=color, width=38)
  d.rounded_rectangle((x - 82 + dx, 535, x - 20 + dx, 564), radius=10, fill='#24324b')
  d.rounded_rectangle((x + 20 - dx, 535, x + 85 - dx, 564), radius=10, fill='#24324b')
  if key == 'dad':
    d.line((x + 92, 385, x + 155, 210), fill='#e6e4d7', width=14)
    d.rounded_rectangle((x + 100, 100, x + 220, 220), radius=15, outline='#fff0a5', width=8)
    for off in range(120, 220, 20):
      d.line((x + off, 110, x + off, 210), fill='#fff0a5', width=2)
    d.text((x + 130, 155), 'BDB', fill='white', stroke_width=2)
  return im


def load_frame(source, anim, i):
  """Load from MAIN art root; fall back to _v1 if missing."""
  name = f'{source}_{anim}_{i:02d}.png'
  for base in (art, art / '_v1'):
    p = base / name
    if p.is_file():
      return Image.open(p).convert('RGBA')
  raise FileNotFoundError(name)


def prepare(im):
  if im.size != (720, 600):
    raise ValueError(f'expected 720x600, got {im.size}')
  box = im.getchannel('A').getbbox()
  if not box:
    box = (0, 0, 1, 1)
  crop = im.crop(box)
  if DRAW_SCALE != 1.0:
    sw = max(1, round(crop.width * DRAW_SCALE))
    sh = max(1, round(crop.height * DRAW_SCALE))
    crop = crop.resize((sw, sh), Image.Resampling.LANCZOS)
    sx0 = round(box[0] * DRAW_SCALE); sy0 = round(box[1] * DRAW_SCALE)
    src_w = round(720 * DRAW_SCALE); src_h = round(600 * DRAW_SCALE)
  else:
    sx0, sy0 = box[0], box[1]
    src_w, src_h = 720, 600
  return crop, (sx0, sy0, crop.width, crop.height), (src_w, src_h)


def pack(key, anims_spec, source=None):
  # wipe prior pages for this key
  for old in out.glob(f'{key}-*'):
    old.unlink()
  pages = []
  entries = {}
  atlas = Image.new('RGBA', (MAXW, MAXW))
  x = y = rowh = W = H = 0
  # hash -> (frame_name, page_index)
  seen = {}
  unique = 0
  logical = 0
  reused = 0
  anims = []

  def flush():
    nonlocal atlas, entries, x, y, rowh, W, H
    if not entries:
      return
    name = f'{key}-{len(pages)}'
    pages.append(name)
    atlas.crop((0, 0, W, H)).save(out / f'{name}.webp', quality=88, method=6)
    (out / f'{name}.json').write_text(json.dumps({
      'frames': entries,
      'meta': {'image': f'{name}.webp', 'size': {'w': W, 'h': H}, 'scale': DRAW_SCALE},
    }))
    atlas = Image.new('RGBA', (MAXW, MAXW))
    entries = {}
    x = y = rowh = W = H = 0

  for anim, (count, fps) in anims_spec.items():
    hold = fps_ms(fps) if fps > 0 else 1000
    a = {
      'name': f'{key}_{anim}',
      'frames': [], 'pages': [], 'holds': [],
      'loop': anim in LOOP or anim.startswith('run'),
      'fps': fps,
    }
    for i in range(1, count + 1):
      logical += 1
      logical_name = f'{key}_{anim}_{i:02d}'
      im = load_frame(source, anim, i) if source else silhouette(key, anim, i)
      crop, (sx0, sy0, cw, ch), (src_w, src_h) = prepare(im)
      digest = hashlib.sha256(crop.tobytes()).hexdigest()
      if digest in seen:
        frame_name, page_i = seen[digest]
        reused += 1
      else:
        w, h = crop.size
        if x + w + PAD > MAXW:
          x = 0; y += rowh + PAD; rowh = 0
        if y + h + PAD > MAXW:
          flush()
        atlas.paste(crop, (x, y))
        frame_name = logical_name  # first occurrence keeps its name
        entries[frame_name] = {
          'frame': dict(x=x, y=y, w=w, h=h),
          'rotated': False, 'trimmed': True,
          'spriteSourceSize': dict(x=sx0, y=sy0, w=cw, h=ch),
          'sourceSize': dict(w=src_w, h=src_h),
        }
        page_i = len(pages)  # current in-progress page index
        seen[digest] = (frame_name, page_i)
        unique += 1
        x += w + PAD; rowh = max(rowh, h); W = max(W, x); H = max(H, y + h)
      # page index for references must match the page the unique frame lives on.
      # seen stores page_i at insert time (= len(pages) before flush). After flush,
      # len(pages) increases; stored page_i stays correct.
      a['frames'].append(frame_name)
      a['pages'].append(seen[digest][1])
      a['holds'].append(hold)
    anims.append(a)
  flush()
  # fix: pages recorded at insert are correct because flush appends then resets;
  # verify all referenced pages exist
  meta = {
    'canvas': [720, 600],
    'baseline': 570,
    'scale': DRAW_SCALE,
    'pages': pages,
    'anims': anims,
    'placeholder': not bool(source),
    'source': str(art) if source else 'local coloured silhouettes',
    'dedupe': {'logical': logical, 'unique': unique, 'reused': reused},
  }
  (out / f'{key}.anims.json').write_text(json.dumps(meta, indent=2))
  print(f'{key}: logical={logical} unique={unique} reused={reused} pages={len(pages)}')


# clean old char atlases for keys we own (keep nothing stale)
for p in list(out.glob('*')):
  if p.suffix in {'.webp', '.json'}:
    p.unlink()

for key, (source, counts) in REAL.items():
  pack(key, counts, source)
for key, counts in STANDINS.items():
  pack(key, counts)

for path in ['assets/bg', 'assets/audio/voice', 'assets/cutscenes', 'docs/shots']:
  Path(path).mkdir(parents=True, exist_ok=True)
voices = {
  'bdb-open': 'bdb_open', 'bdb-produce': 'bdb_produce', 'papacito-laugh': 'bdb_laugh',
  'claudia-open': 'claudia_open', 'claudia-question': 'claudia_question', 'claudia-leave': 'claudia_leave',
  'turn-back-papi': 'yetti_turnback', 'papi-serious': 'choir_serious',
  'intervention': 'lecturer_intervention', 'council-denies': 'wingman_council',
}
for src, dst in voices.items():
  shutil.copyfile(packet / 'voices' / f'{src}.mp3', Path('assets/audio/voice') / f'{dst}.mp3')
shutil.copyfile(packet / 'bdb-rise.mp3', 'assets/audio/bdb-rise.mp3')
for clip in ['opening', 'victory']:
  shutil.copyfile(packet / 'cutscenes' / f'{clip}.mp4', Path('assets/cutscenes') / f'{clip}.mp4')
  if shutil.which('ffmpeg'):
    subprocess.run([
      'ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', '-ss', '0.3',
      '-i', f'assets/cutscenes/{clip}.mp4', '-frames:v', '1', '-update', '1',
      f'assets/cutscenes/{clip}.jpg',
    ], check=True)
  else:
    Image.open(packet / 'console' / 'chapter1-boulevard.webp').convert('RGB').save(f'assets/cutscenes/{clip}.jpg')
for bg in ['chapter1-boulevard', 'chapter2-clouds', 'chapter3-castle', 'astra-keep']:
  Image.open(packet / 'console' / f'{bg}.webp').resize((1280, 720), Image.Resampling.LANCZOS).save(
    f'assets/bg/{bg}.webp', quality=90)

# size report
webps = list(out.glob('*.webp'))
disk = sum(p.stat().st_size for p in webps)
gpu = 0
for j in out.glob('*-*.json'):
  if j.name.endswith('.anims.json'):
    continue
  m = json.loads(j.read_text())['meta']['size']
  gpu += m['w'] * m['h'] * 4
# active-stage estimate: bob + 6 roles + interventionist + dad + papi
active_keys = {'bob', 'yetti_walker', 'yetti_guard', 'yetti_hover', 'yetti_charger',
               'yetti_choir', 'yetti_lecturer', 'interventionist', 'dad', 'papi_runners'}
active_gpu = 0
for key in active_keys:
  m = json.loads((out / f'{key}.anims.json').read_text())
  for p in m['pages']:
    sz = json.loads((out / f'{p}.json').read_text())['meta']['size']
    active_gpu += sz['w'] * sz['h'] * 4
report = {
  'draw_scale': DRAW_SCALE,
  'disk_webp_bytes': disk,
  'disk_webp_MiB': round(disk / 1024 / 1024, 3),
  'all_chars_gpu_RGBA_MiB': round(gpu / 1024 / 1024, 3),
  'stage1_resident_gpu_RGBA_MiB': round(active_gpu / 1024 / 1024, 3),
  'pages': len(webps),
}
(out / '_pack_report.json').write_text(json.dumps(report, indent=2))
print('PACK REPORT', json.dumps(report))
