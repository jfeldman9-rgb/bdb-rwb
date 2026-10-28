import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PapacitoFX } from '../src/papacito-fx.js';
import { PAPI_RUNNER_SPEED, PAPI_RUNNER_X0, papiHitTime } from '../src/papacito.js';

const meta = JSON.parse(readFileSync('assets/chars/papi_stampede.anims.json', 'utf8'));

function fakeScene() {
  const sprites = [];
  const cam = { scrollX: 40, scrollY: 0, calls: 0, setScroll() { cam.calls++; } };
  return {
    sprites,
    cam,
    cameras: { main: cam },
    metas: { papi_stampede: meta },
    add: {
      sprite(x, y, tex, frame) {
        const s = {
          x, y, tex, frame, scaleX: 1, depth: 0, scrollFactorX: 1, scrollFactorY: 1, dead: false,
          setOrigin() { return s; },
          setScale(v) { s.scaleX = v; return s; },
          setScrollFactor(v) { s.scrollFactorX = s.scrollFactorY = v; return s; },
          setDepth(d) { s.depth = d; return s; },
          play(arg) { s.played = arg; return s; },
          destroy() { s.dead = true; },
        };
        sprites.push(s);
        return s;
      },
    },
  };
}

test('stampede runners stay screen-space and the front matches the kill clock', () => {
  const scene = fakeScene();
  const fx = new PapacitoFX(scene);
  fx.start();
  assert.ok(scene.sprites.length >= 30, 'stampede must be a wall of at least 30 runners');
  assert.equal(scene.sprites.length, 36);
  for (const y of [575, 630, 690]) assert.equal(scene.sprites.filter((s) => s.y === y).length, 12);
  for (const s of scene.sprites) {
    assert.ok(s.scaleX >= 0.8, `runner scale ${s.scaleX} must be roughly Bob's height`);
    assert.ok(s.depth >= 18000 && s.depth < 19000, `depth ${s.depth}`);
    assert.equal(s.scrollFactorX, 0);
    assert.equal(s.scrollFactorY, 0);
    assert.match(s.played.key, /^papi_stampede_run[1-6]$/);
  }
  fx.update(0.4);
  const front = fx.runners[0].x;
  assert.equal(front, PAPI_RUNNER_X0 + 0.4 * PAPI_RUNNER_SPEED);
  assert.ok(Math.abs(papiHitTime(front) - 0.4) < 1e-9);
  for (let i = 1; i < fx.runners.length; i++) {
    const behind = front - fx.runners[i].x;
    assert.ok(behind > 0 && behind <= 620, `lag ${behind}`);
    if (i >= 3) {
      const spacing = fx.runners[i - 3].x - fx.runners[i].x;
      assert.ok(spacing >= 30 && spacing <= 80, `lane spacing ${spacing}`);
    }
  }
  fx.update(2.09);
  for (const s of scene.sprites) assert.ok(s.x > 1370, `x ${s.x}`);
  fx.update(0.02);
  assert.equal(fx.runners.length, 0);
  assert.ok(scene.sprites.every((s) => s.dead));
  assert.equal(scene.cam.scrollX, 40);
  assert.equal(scene.cam.calls, 0);
});
