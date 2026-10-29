#!/usr/bin/env python3
"""Derive preview plates for new stages from existing art. Never rewrites s1–s4."""
from pathlib import Path
from PIL import Image, ImageEnhance

BG = Path(__file__).resolve().parent.parent / 'assets' / 'bg'

# key: (source, (r,g,b) gain, lift, saturation, brightness)
PLATES = {
    's5-far': ('s4-far', (0.82, 0.92, 1.18), (0, 10, 22), 1.12, 0.88),
    's5-floor': ('s4-floor', (1.12, 0.88, 0.78), (18, 8, 0), 0.92, 1.02),
    's5-mid0': ('s4-mid0', (0.88, 0.96, 1.12), (4, 8, 16), 1.08, 0.94),
    's5-mid1': ('s4-mid1', (1.05, 0.86, 1.10), (12, 0, 18), 1.18, 0.96),
    's5-mid2': ('s4-mid2', (0.92, 1.00, 1.08), (6, 10, 8), 1.04, 0.93),
    's5-mid3': ('s4-mid3', (0.86, 0.94, 1.16), (0, 6, 20), 1.10, 0.90),
    's5-mid4': ('s4-mid4', (1.10, 0.90, 0.86), (16, 4, 6), 1.12, 0.95),
    's5-mid5': ('s4-mid5', (0.90, 0.84, 1.20), (8, 0, 24), 1.16, 0.92),
}


def grade(im, gain, lift, sat, bright):
    r, g, b = im.split()
    r, g, b = (c.point(lambda v, k=k, l=l: min(255, round(v * k + l))) for c, k, l in zip((r, g, b), gain, lift))
    im = Image.merge('RGB', (r, g, b))
    im = ImageEnhance.Color(im).enhance(sat)
    return ImageEnhance.Brightness(im).enhance(bright)


def main(only=None):
    for key, (src, gain, lift, sat, bright) in PLATES.items():
        if only and not key.startswith(only):
            continue
        im = Image.open(BG / f'{src}.webp').convert('RGB')
        im = grade(im, gain, lift, sat, bright)
        im.save(BG / f'{key}.webp', 'WEBP', quality=80, method=6)
        print(key, '<-', src, im.size)


if __name__ == '__main__':
    import sys
    only = None
    if '--only' in sys.argv:
        only = sys.argv[sys.argv.index('--only') + 1]
    main(only)
