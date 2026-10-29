import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('papi_stampede webp has no opaque hot-pink matte', () => {
  const py = spawnSync('python3', ['-c', `
from PIL import Image
im = Image.open('assets/chars/papi_stampede-0.webp').convert('RGBA')
px = im.load(); w, h = im.size
pink = 0
for y in range(h):
    for x in range(w):
        r, g, b, a = px[x, y]
        if a > 200 and g < 40 and r > 160 and 40 < b < 170 and r > b:
            pink += 1
print(pink)
`], { encoding: 'utf8' });
  assert.equal(py.status, 0, py.stderr);
  const pink = Number(py.stdout.trim());
  assert.ok(pink < 200, `hot-pink pixels ${pink}`);
});
