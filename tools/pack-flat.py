#!/usr/bin/env python3
"""Pack BDB sprites (v2 higher-fps) + clothed silhouette stand-ins.

- Reads /workspace/bdb-art/sprites MAIN folder (ignores _v1/ and _old/).
- Spec: FPS.md — bob idle12@12 walk12@18 shoot8@16 hurt5@14 knockdown7@14 getup7@14;
  yetti1/2 idle12@12 walk16@18 attack 8@16 (yetti1, hand-drawn v3) / 7@16 (yetti2) hurt5@14 knockdown7@14.
  dad enter6@12 swat8@16 exit6@12 (dad_callin.png slice).
  role Yettis: hover fly/throw/hurt/kd; charger idle/walk/windup/rush/hurt/kd; choir sing/note/hurt/kd; lecturer walk/grab/lecture/hurt/kd.
  Hand-drawn v3, dad, and role sheets are numbered 00..; everything else starts at 01 (third spec field).
- Dedupes identical pixel frames in the atlas; anim defs re-reference shared frames.
- Trims alpha, packs webp, downscales by DRAW_SCALE (~0.58) for iPhone GPU.
- canvas/baseline stay logical 720×600 / 570; anims.scale = DRAW_SCALE so
  fighter.js `def.scale / m.scale` keeps on-screen size.

Run from repo root: node tools/make-placeholders.mjs
Repack only some atlases (no wipe, no media copy): python3 tools/pack-flat.py --only bob,yetti_walker
Then tools/compress-ktx.py rebuilds the ASTC/ETC2 KTX pages for the repacked keys (run automatically below).
"""
from pathlib import Path
from PIL import Image, ImageDraw
import json, sys, shutil, math, subprocess, hashlib

DRAW_SCALE = 0.38  # PACK_SCALE_NOTE: 0.58 draw intent overshoots ~42MiB stage1 GPU; 0.38 lands under 20MiB with trim+dedupe
MAXW = 2048
PAD = 2

args, only = [], None
argv = iter(sys.argv[1:])
for a in argv:
  if a == '--only': only = set(next(argv).split(','))
  elif a.startswith('--only='): only = set(a[len('--only='):].split(','))
  else: args.append(a)
art = Path(args[0] if len(args) > 0 else '/workspace/bdb-art/sprites')
packet = Path(args[1] if len(args) > 1 else '/workspace/bdb-packet/src/Claudia_Handoff/game/public/game')
out = Path('assets/chars')
out.mkdir(parents=True, exist_ok=True)

# Prefer MAIN v2 frames; never _old. Fall back to _v1 only if a key is missing in root.
fps_ms = lambda fps: max(1, int(1000 / fps + 0.5))  # half-up; matches JS Math.round

REAL = {
  'bob': ('bob', {
    'idle': (12, 12), 'walk': (12, 18), 'shoot': (8, 16, 0),
    'hurt': (5, 14), 'knockdown': (7, 14), 'getup': (7, 14),
  }),
  'yetti_walker': ('yetti1', {
    'idle': (12, 12), 'walk': (16, 18), 'attack': (8, 16, 0),
    'hurt': (5, 14), 'knockdown': (7, 14),
  }),
  'yetti_guard': ('yetti2', {
    'idle': (12, 12), 'walk': (16, 18), 'attack': (7, 16),
    'hurt': (5, 14), 'knockdown': (7, 14),
  }),
  # Dad call-in (dad_callin.png slice, Oct 28): jog in, overhead BDB swat (impact on swat_06), jog out.
  'dad': ('dad', {'enter': (6, 12, 0), 'swat': (8, 16, 0), 'exit': (6, 12, 0)}),
  # Painted role Yettis (Oct 28 Game Art): yetti_<role>_<anim>_NN.png, feet y=560 (hover fly/throw y=495).
  'yetti_hover': ('yetti_hover', {
    'fly': (6, 12, 0), 'throw': (6, 16, 0), 'hurt': (3, 14, 0), 'knockdown': (5, 14, 0),
  }),
  'yetti_charger': ('yetti_charger', {
    'idle': (6, 12, 0), 'walk': (8, 12, 0), 'windup': (4, 16, 0), 'rush': (6, 16, 0),
    'hurt': (3, 14, 0), 'knockdown': (5, 14, 0),
  }),
  'yetti_choir': ('yetti_choir', {
    'sing': (8, 12, 0), 'note': (6, 16, 0), 'hurt': (3, 14, 0), 'knockdown': (5, 14, 0),
  }),
  'yetti_lecturer': ('yetti_lecturer', {
    'walk': (8, 12, 0), 'grab': (4, 16, 0), 'lecture': (6, 16, 0), 'hurt': (3, 14, 0), 'knockdown': (5, 14, 0),
  }),
  # Papacito stampede (Oct 28 feedback): 6 clothed adult runners, 8 frames @16fps.
  'papi_stampede': ('papi_stampede', {f'run{i}': (8, 16, 0) for i in range(1, 7)}),
  # Painted Stage 4 (Oct 28 Game Art): yetti_salsero + bouncer, 720x600 feet y≈560, 00-based.
  'yetti_salsero': ('yetti_salsero', {
    'idle': (6, 12, 0), 'walk': (8, 12, 0), 'spin': (4, 16, 0), 'lunge': (6, 16, 0),
    'hurt': (3, 14, 0), 'knockdown': (5, 14, 0),
  }),
  'bouncer': ('bouncer', {
    'walk': (8, 12, 0), 'block': (2, 10, 0), 'grab': (4, 16, 0), 'hold': (2, 8, 0),
    'rush': (6, 16, 0), 'stomp': (4, 14, 0), 'roar': (4, 12, 0), 'hurt': (3, 14, 0), 'down': (5, 14, 0),
  }),
  # Painted Stage 5–7 (Oct 29 Game Art): 720x600 feet y=560, 00-based. SPEC fps idle 8 / walk 10 / attacks 12.
  'yetti_tagger': ('yetti_tagger', {
    'idle': (4, 8, 0), 'walk': (6, 10, 0), 'shake': (4, 12, 0), 'throw': (4, 12, 0),
    'hurt': (2, 12, 0), 'knockdown': (4, 12, 0),
  }),
  'yetti_minero': ('yetti_minero', {
    'idle': (4, 8, 0), 'walk': (6, 10, 0), 'lamp': (3, 12, 0), 'slam': (5, 12, 0),
    'hurt': (2, 12, 0), 'knockdown': (4, 12, 0),
  }),
  'yetti_bailiff': ('yetti_bailiff', {
    'walk': (6, 10, 0), 'block': (2, 8, 0), 'raise': (3, 12, 0), 'grab': (4, 12, 0),
    'hold': (2, 8, 0), 'hurt': (2, 12, 0), 'knockdown': (4, 12, 0),
  }),
  'dj': ('dj', {
    'idle': (4, 8, 0), 'walk': (6, 10, 0), 'cast': (4, 12, 0), 'drop': (5, 12, 0),
    'hurt': (2, 12, 0), 'down': (4, 12, 0),
  }),
  'celestina': ('celestina', {
    'idle': (4, 8, 0), 'walk': (6, 10, 0), 'flutter': (3, 12, 0), 'toss': (4, 12, 0),
    'blink': (3, 12, 0), 'hurt': (2, 12, 0), 'down': (4, 12, 0),
  }),
  'archyetti': ('archyetti', {
    'idle': (4, 8, 0), 'walk': (6, 10, 0), 'slam': (5, 12, 0), 'verdict': (3, 12, 0),
    'roar': (3, 12, 0), 'hurt': (2, 12, 0), 'down': (5, 12, 0),
  }),
}
STANDINS = {
  'claudia': {'idle-caged': (4, 10), 'freed': (4, 12), 'portrait': (1, 1)},
  'wingman': {'hover': (6, 12), 'ring': (4, 14), 'telegraph': (2, 10), 'dive': (3, 14), 'land': (3, 12), 'hurt': (2, 14), 'split': (4, 12)},
  'papi_runners': {f'run{i}': (8, 16) for i in range(1, 5)},
  'interventionist': {'walk': (6, 12), 'grab': (3, 12), 'hold': (2, 8), 'hurt': (2, 14), 'down': (3, 12), 'slam': (4, 14)},
  'choirmaster': {'sing': (6, 10), 'hurt': (2, 14), 'down': (3, 12), 'ring': (4, 14)},
}

# spin/grab tells last longer than one 16fps pass; loop so the last frame does not freeze.
LOOP = {'idle', 'walk', 'fly', 'sing', 'hover', 'run', 'idle-caged', 'rush', 'lecture', 'spin',
        'hold', 'block', 'flutter', 'shake', 'lamp', 'cast', 'toss', 'blink', 'verdict'} | {f'run{i}' for i in range(1, 7)}


def stage4_standin(key, anim, i):
  """Readable clothed preview silhouettes; never alter the legacy stand-ins."""
  im = Image.new('RGBA', (720, 600)); d = ImageDraw.Draw(im)
  bob = round(math.sin(i * 1.3) * 9)
  x = 360 + bob
  wide = 92 if key == 'bouncer' else 62
  coat = '#253452' if key == 'bouncer' else '#e24e9a'
  fur = '#b5dce7'
  d.ellipse((x - 160, 202, x - 42, 385), fill='#d9e7f2')
  d.ellipse((x + 42, 202, x + 160, 385), fill='#d9e7f2')
  d.ellipse((x - 55, 80, x + 55, 104), outline='#f7d985', width=8)
  d.ellipse((x - 55, 125, x + 55, 236), fill=fur)
  d.rounded_rectangle((x - wide, 225, x + wide, 446), radius=30, fill=coat)
  # Eyes, shirt, trousers, and shoes remain clear at gameplay scale.
  d.ellipse((x + 8, 164, x + 17, 174), fill='#24324b')
  d.ellipse((x + 31, 164, x + 40, 174), fill='#24324b')
  d.polygon([(x - 30, 229), (x + 30, 229), (x, 302)], fill='#f7e2ca')
  stride = round(math.sin(i * 1.2) * 18)
  d.line((x - 35, 421, x - 45 + stride, 540), fill='#24324b', width=43)
  d.line((x + 35, 421, x + 45 - stride, 540), fill='#24324b', width=43)
  d.rounded_rectangle((x - 80 + stride, 534, x - 10 + stride, 560), radius=9, fill='#e9cd95')
  d.rounded_rectangle((x + 10 - stride, 534, x + 80 - stride, 560), radius=9, fill='#e9cd95')
  arm_y = 245 if anim in ('roar', 'spin') else 337 + bob
  d.line((x - wide + 8, 260, x - wide - 39, arm_y), fill=fur, width=32)
  d.line((x + wide - 8, 260, x + wide + 39, arm_y), fill=fur, width=32)
  if key == 'bouncer':
    # Clipboard shield, pink-gold lanyard, and velvet rope are readable props.
    d.line((x - 23, 236, x, 307, x + 23, 236), fill='#f4a4c9', width=7)
    d.rounded_rectangle((x - 15, 299, x + 15, 328), radius=4, fill='#f3ca72')
    cx = x + 87 if anim != 'block' else x + 15
    d.rounded_rectangle((cx, 265, cx + 86, 392), radius=7, fill='#a66b42', outline='#f0ca82', width=8)
    d.rectangle((cx + 26, 257, cx + 59, 275), fill='#d9dee8')
    d.line((cx + 22, 300, cx + 67, 300), fill='#f7e5bd', width=5)
    d.line((cx + 22, 320, cx + 67, 320), fill='#f7e5bd', width=5)
    reach = 80 if anim in ('grab', 'hold') else 0
    d.arc((x - 206 - reach, 295, x - 60, 457), 5, 170, fill='#d5457d', width=18)
  else:
    d.line((x - wide, 333, x + wide, 333), fill='#ffce79', width=10)
    if anim == 'spin':
      d.arc((x - 142, 204, x + 142, 432), 200 + i * 30, 335 + i * 30, fill='#ff8ece', width=13)
  return im


def silhouette(key, anim, i):
  if key in ('yetti_salsero', 'bouncer'):
    return stage4_standin(key, anim, i)
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


def shelf(sizes, cap):
  """Height-sorted shelf pack. sizes: [(w, h)]. Returns (placements, pages) where
  placements[i] = (page, x, y) and pages = [(W, H)]."""
  order = sorted(range(len(sizes)), key=lambda i: (-sizes[i][1], -sizes[i][0]))
  place = [None] * len(sizes)
  pages = []
  x = y = rowh = W = H = 0
  for i in order:
    w, h = sizes[i]
    if x + w + PAD > cap:
      x = 0; y += rowh + PAD; rowh = 0
    if y + h + PAD > MAXW:
      pages.append((W, H)); x = y = rowh = W = H = 0
    place[i] = (len(pages), x, y)
    x += w + PAD; rowh = max(rowh, h); W = max(W, x); H = max(H, y + h)
  pages.append((W, H))
  return place, pages


def pack(key, anims_spec, source=None):
  # wipe prior pages for this key (webp/json/ktx)
  for old in out.glob(f'{key}-*'):
    old.unlink()
  # hash -> unique frame index
  seen = {}
  uniques = []  # (frame_name, crop, spriteSourceSize, sourceSize)
  logical = 0
  reused = 0
  anims = []
  for anim, (count, fps, *first) in anims_spec.items():
    first = first[0] if first else 1
    hold = fps_ms(fps) if fps > 0 else 1000
    a = {
      'name': f'{key}_{anim}',
      'frames': [], 'pages': [], 'holds': [],
      'loop': anim in LOOP or anim.startswith('run') or (key == 'bouncer' and anim == 'grab') or (key == 'yetti_bailiff' and anim == 'grab'),
      'fps': fps,
    }
    for i in range(first, first + count):
      logical += 1
      im = load_frame(source, anim, i) if source else silhouette(key, anim, i)
      crop, sss, (src_w, src_h) = prepare(im)
      digest = hashlib.sha256(crop.tobytes()).hexdigest()
      if digest in seen:
        reused += 1
      else:
        seen[digest] = len(uniques)  # first occurrence keeps its name
        uniques.append((f'{key}_{anim}_{i:02d}', crop, sss, (src_w, src_h)))
      a['frames'].append(seen[digest])
      a['holds'].append(hold)
    anims.append(a)

  # Pick the page width that wastes the least GPU area (stage-1 RGBA budget).
  sizes = [u[1].size for u in uniques]
  place, dims = min((shelf(sizes, cap) for cap in range(768, MAXW + 1, 128)),
                    key=lambda r: (sum(w * h for w, h in r[1]), len(r[1])))
  pages = [f'{key}-{n}' for n in range(len(dims))]
  for n, (W, H) in enumerate(dims):
    W, H = -(-W // 4) * 4, -(-H // 4) * 4  # 4×4 block aligned for ASTC/ETC2 (compress-ktx.py)
    atlas = Image.new('RGBA', (W, H))
    entries = {}
    for (name, crop, (sx0, sy0, cw, ch), (src_w, src_h)), (pg, x, y) in zip(uniques, place):
      if pg != n:
        continue
      atlas.paste(crop, (x, y))
      entries[name] = {
        'frame': dict(x=x, y=y, w=crop.width, h=crop.height),
        'rotated': False, 'trimmed': True,
        'spriteSourceSize': dict(x=sx0, y=sy0, w=cw, h=ch),
        'sourceSize': dict(w=src_w, h=src_h),
      }
    atlas.save(out / f'{pages[n]}.webp', quality=88, method=6)
    (out / f'{pages[n]}.json').write_text(json.dumps({
      'frames': entries,
      'meta': {'image': f'{pages[n]}.webp', 'size': {'w': W, 'h': H}, 'scale': DRAW_SCALE},
    }))
  for a in anims:
    idx = a['frames']
    a['frames'] = [uniques[u][0] for u in idx]
    a['pages'] = [place[u][0] for u in idx]
  unique = len(uniques)
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


if only:
  unknown = only - set(REAL) - set(STANDINS)
  if unknown:
    sys.exit(f'unknown atlas keys: {sorted(unknown)}')
else:
  # clean old char atlases for keys we own (keep nothing stale)
  for p in list(out.glob('*')):
    if p.suffix in {'.webp', '.json'}:
      p.unlink()

for key, (source, counts) in REAL.items():
  if not only or key in only:
    pack(key, counts, source)
for key, counts in STANDINS.items():
  if not only or key in only:
    pack(key, counts)

for path in ([] if only else ['assets/bg', 'assets/audio/voice', 'assets/cutscenes', 'docs/shots']):
  Path(path).mkdir(parents=True, exist_ok=True)
voices = {
  'bdb-open': 'bdb_open', 'bdb-produce': 'bdb_produce', 'papacito-laugh': 'bdb_laugh',
  'claudia-open': 'claudia_open', 'claudia-question': 'claudia_question', 'claudia-leave': 'claudia_leave',
  'turn-back-papi': 'yetti_turnback', 'papi-serious': 'choir_serious',
  'intervention': 'lecturer_intervention', 'council-denies': 'wingman_council',
}
for src, dst in ({} if only else voices).items():
  shutil.copyfile(packet / 'voices' / f'{src}.mp3', Path('assets/audio/voice') / f'{dst}.mp3')
if not only:
  shutil.copyfile(packet / 'bdb-rise.mp3', 'assets/audio/bdb-rise.mp3')
for clip in ([] if only else ['opening', 'victory']):
  shutil.copyfile(packet / 'cutscenes' / f'{clip}.mp4', Path('assets/cutscenes') / f'{clip}.mp4')
  if shutil.which('ffmpeg'):
    subprocess.run([
      'ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', '-ss', '0.3',
      '-i', f'assets/cutscenes/{clip}.mp4', '-frames:v', '1', '-update', '1',
      f'assets/cutscenes/{clip}.jpg',
    ], check=True)
  else:
    Image.open(packet / 'console' / 'chapter1-boulevard.webp').convert('RGB').save(f'assets/cutscenes/{clip}.jpg')
for bg in ([] if only else ['chapter1-boulevard', 'chapter2-clouds', 'chapter3-castle', 'astra-keep']):
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
               'yetti_choir', 'yetti_lecturer', 'interventionist', 'dad', 'papi_stampede'}
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

# GPU-compressed pages (ASTC + ETC2). pack() wiped the old .ktx files and rewrote anims.json without
# "gpu", so a failed/missing compressor leaves those keys on the webp path rather than stale KTX.
packed = [k for k in list(REAL) + list(STANDINS) if not only or k in only]
if subprocess.run([sys.executable, 'tools/compress-ktx.py', '--only', ','.join(packed)]).returncode:
  print('WARNING: KTX compression skipped; these atlases load webp only:', ','.join(packed))
