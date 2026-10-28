#!/usr/bin/env python3
"""Derive the extra mid plates for the 5-zone stages from art already in assets/bg.

Local and reproducible: mirror, bottom-anchored zoom (the plate's foot sits on the lane),
and a colour grade per plate. No network, no image generation. Plates with painted signage
are never mirrored (backwards neon); they zoom off-centre to crop the sign instead.

    python3 tools/derive-plates.py
"""
from pathlib import Path
from PIL import Image, ImageEnhance, ImageOps

BG = Path(__file__).resolve().parent.parent / 'assets' / 'bg'
W, H = 1280, 720

# key: (source, mirror, zoom, (r, g, b) channel gain, lift rgb, saturation, brightness[, zoom anchor 0..1])
PLATES = {
    # Stage 1: boulevard after midnight; boss keeps the glowing-cross plaza (s1-mid3).
    's1-mid4': ('chapter1-boulevard', True, 1.0, (1.10, 0.98, 0.82), (10, 4, 0), 1.08, 1.0),
    's1-mid5': ('s1-mid2', False, 1.25, (1.08, 0.84, 1.10), (12, 0, 14), 1.15, 0.94, 0.0),
    # Stage 2: the storm front and dusk tiers; boss keeps the golden halo (s2-mid2).
    's2-mid3': ('chapter2-clouds', True, 1.0, (0.96, 1.0, 1.06), (0, 0, 6), 1.0, 1.0),
    's2-mid4': ('s2-mid0', True, 1.08, (1.08, 0.90, 0.86), (16, 4, 10), 1.12, 0.92),
    's2-mid5': ('s2-mid1', True, 1.1, (0.92, 0.84, 1.14), (8, 0, 18), 1.1, 0.9),
    # Stage 3: courtyard, keep approach, inner ward; boss keeps the throne gate (s3-mid2).
    's3-mid3': ('chapter3-castle', True, 1.0, (1.0, 0.98, 1.0), (0, 0, 0), 1.0, 1.0),
    's3-mid4': ('astra-keep', False, 1.06, (0.92, 1.0, 1.12), (0, 4, 12), 1.05, 1.12),
    's3-mid5': ('s3-mid1', True, 1.12, (1.12, 0.82, 0.98), (14, 0, 8), 1.1, 0.92),
}


def zoom_bottom(im, z, anchor=0.5):
    if z == 1.0:
        return im
    cw, ch = round(W / z), round(H / z)
    x0 = round((W - cw) * anchor)
    return im.crop((x0, H - ch, x0 + cw, H)).resize((W, H), Image.LANCZOS)


def grade(im, gain, lift, sat, bright):
    r, g, b = im.split()
    r, g, b = (c.point(lambda v, k=k, l=l: min(255, round(v * k + l))) for c, k, l in zip((r, g, b), gain, lift))
    im = Image.merge('RGB', (r, g, b))
    im = ImageEnhance.Color(im).enhance(sat)
    return ImageEnhance.Brightness(im).enhance(bright)


def main():
    for key, (src, mirror, z, gain, lift, sat, bright, *anchor) in PLATES.items():
        im = Image.open(BG / f'{src}.webp').convert('RGB').resize((W, H), Image.LANCZOS)
        if mirror:
            im = ImageOps.mirror(im)
        im = grade(zoom_bottom(im, z, *anchor), gain, lift, sat, bright)
        im.save(BG / f'{key}.webp', 'WEBP', quality=80, method=6)
        print(key, '<-', src)


if __name__ == '__main__':
    main()
