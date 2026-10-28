import test from 'node:test';
import assert from 'node:assert/strict';
import { VW, WORLD_W, CAM_LEAD as CONFIG_LEAD } from '../src/config.js';
import {
  CAM_LEAD, cameraTarget, updateCamera, stepCamera, screenX, freeRoam,
  moveBounds, lockSnaps, BOB_MAX_SCREEN, BOB_INSET,
} from '../src/camera.js';
import { Campaign } from '../src/campaign.js';
import { Bot } from '../src/bot.js';
import { plateIndexForCam, plateKeyForCam, plateAlphas, STREAMS, plateKeys, PLATE_FADE } from '../src/zone-stream.js';
import { backdropPlan, ART_GAPS } from '../src/backdrop.js';
import { FAR_SCROLL, MID_SCROLL, buildParallax, syncParallax, destroyParallax } from '../src/parallax.js';
import { resolveStage, STAGE_TEXTURES } from '../src/stages.js';

// Kill every live and pending Yetti until the current zone unlocks (zones now run 2–4 staggered waves).
function clearZone(w) {
  for (let i = 0; i < 10 && w.locked; i++) {
    for (const e of w.enemies) { e.alive = false; e.hp = 0; }
    w.pending = [];
    w.update(1 / 60);
  }
}

// Minimal Phaser stand-in: every setter chains; visible/alpha are recorded.
function fakeScene() {
  const obj = () => {
    const state = { visible: true, alpha: 1 };
    const self = new Proxy(state, { get(t, k) {
      if (k in t) return t[k];
      if (k === 'setVisible') return (v) => { t.visible = v; return self; };
      if (k === 'setAlpha') return (v) => { t.alpha = v; return self; };
      return () => self;
    } });
    return self;
  };
  return { add: { image: obj, tileSprite: obj, text: obj } };
}

test('CAM_LEAD keeps Bob in the left third of the screen', () => {
  assert.equal(CAM_LEAD, CONFIG_LEAD);
  assert.equal(CAM_LEAD, 0.28);
  assert.ok(CAM_LEAD <= 1 / 3 + 1e-9);
  const sx = screenX(900, cameraTarget(900, 1));
  assert.ok(sx <= VW / 3 + 50, `screenX ${sx}`);
  assert.ok(sx >= VW * 0.15);
});

test('updateCamera scrolls the world; Bob stays near left third when unlocked', () => {
  const state = { camX: 0, camMax: 0, bounds: { l: 0, r: VW } };
  const bobX = 2800;
  for (let i = 0; i < 180; i++) updateCamera(state, 1 / 60, { bobX, facing: 1, locked: false });
  const sx = screenX(bobX, state.camX);
  assert.ok(sx <= VW / 3 + 60, `screenX ${sx}`);
  assert.ok(state.camX > 1000);
  assert.equal(state.bounds.r - state.bounds.l, VW);
  assert.ok(freeRoam(false));
  assert.equal(freeRoam(true), false);
});

test('locked zone clamps the fight window', () => {
  const zone = { l: 1280, r: 2560 };
  const pure = stepCamera({ camX: 1280, camMax: 1280 }, 0, {
    bobX: 1600, facing: 1, locked: true, zone, snap: true,
  });
  assert.equal(pure.camX, 1280);
  assert.ok(pure.bounds.l >= zone.l && pure.bounds.r <= zone.r);
});

test('camMax never rewinds when unlocked', () => {
  const state = { camX: 800, camMax: 800, bounds: { l: 800, r: 800 + VW } };
  updateCamera(state, 0, { bobX: 200, facing: -1, locked: false, snap: true });
  assert.ok(state.camX >= 800 - 1e-6);
  assert.equal(state.camMax, 800);
});

test('each stage ships one distinct mid plate per zone and boss; zone transitions change the plate', () => {
  assert.equal(FAR_SCROLL, 0.12);
  assert.equal(MID_SCROLL, 0.4);
  assert.ok(ART_GAPS.length >= 3);
  for (const no of [1, 2, 3]) {
    const keys = plateKeys(no);
    const mids = keys.filter((k) => k.includes('-mid'));
    const def = resolveStage(no);
    assert.ok(def.zones.length >= 5, `stage ${no} has ${def.zones.length} fight zones`);
    assert.equal(STREAMS[no].zones.length, def.zones.length + 1);
    assert.equal(mids.length, def.zones.length + 1, `stage ${no}: every zone and the boss get their own plate`);
    assert.deepEqual(STAGE_TEXTURES[no], keys);
    const plan = backdropPlan(def);
    assert.equal(plan.plates.length, def.zones.length + 1);
    assert.equal(plan.far, STREAMS[no].far);
    // Each fight camera shows its own zone's plate, and every mid plate gets screen time.
    const seen = new Set();
    for (const [i, z] of [...def.zones, def.boss].entries()) {
      const cam = Math.min(z.l, WORLD_W - VW);
      assert.equal(plateKeyForCam(cam, def), STREAMS[no].zones[i].plate, `stage ${no} zone ${i}`);
      seen.add(plateKeyForCam(cam, def));
    }
    assert.deepEqual([...seen].sort(), [...mids].sort());
  }
  const toy = { no: 1, zones: [{ l: 0 }, { l: 1280 }, { l: 2560 }], boss: { l: 3920 } };
  assert.equal(plateIndexForCam(1000, toy), 0);
  assert.equal(plateIndexForCam(1280, toy), 1);
});

test('mid plates cover the screen for their whole camera range (parallax space)', () => {
  for (const no of [1, 2, 3]) {
    const def = resolveStage(no);
    for (const p of backdropPlan(def).plates) {
      assert.ok(p.c1 > p.c0);
      for (let cam = p.c0; cam <= p.c1; cam += 16) {
        const left = p.x - cam * MID_SCROLL, right = left + p.w;
        assert.ok(left <= 0 && right >= VW, `stage ${no} run ${p.run} cam ${cam}: ${left}..${right}`);
      }
      // A tile seam sits on screen x 0 at the fight camera, so the arena shows the plate's left edge.
      const atAnchor = p.anchor * MID_SCROLL - p.x;
      assert.ok(Math.abs(atAnchor / p.tileW - Math.round(atAnchor / p.tileW)) < 1e-9);
    }
  }
});

test('plate crossfade: incoming fades in over an opaque outgoing plate', () => {
  const def = resolveStage(1);
  const layers = buildParallax(fakeScene(), def);
  const n = def.zones.length + 1;
  assert.equal(layers.mids.length, n);
  const only = (k) => Array.from({ length: n }, (_, i) => +(i === k));
  const at = (cam) => { syncParallax(layers, cam); return layers.mids.map((m) => (m.image.visible ? +m.image.alpha.toFixed(2) : 0)); };
  assert.deepEqual(at(0), only(0));
  const mid = at(1280 - PLATE_FADE / 2);
  assert.equal(mid[0], 1);
  assert.equal(mid[1], 0.5);
  assert.deepEqual(at(1280), only(1));
  for (const [i, z] of def.zones.entries()) assert.deepEqual(at(z.l), only(i), `zone ${i} camera`);
  assert.deepEqual(at(WORLD_W - VW), only(n - 1));
  let prev = -1;
  for (let cam = 0; cam <= WORLD_W - VW; cam += 40) {
    const a = plateAlphas(cam, def);
    assert.ok(a.some((v) => v >= 1), `no opaque plate at ${cam}`);
    const top = a.reduce((k, v, i) => (v > 0 ? i : k), 0);
    assert.ok(top >= prev);
    prev = top;
  }
  destroyParallax(layers);
});

test('free roam: Bob cannot walk past the left third; arenas use the full screen', () => {
  const state = { camX: 1000, bounds: { l: 1000, r: 1000 + VW }, locked: false };
  const b = moveBounds(state, 1200);
  assert.equal(b.r - BOB_INSET, 1000 + VW * BOB_MAX_SCREEN);
  // Already past the line (zone just cleared): held in place, never shoved back.
  assert.equal(moveBounds(state, 1900).r - BOB_INSET, 1900);
  assert.deepEqual(moveBounds({ ...state, locked: true }, 1200), state.bounds);
});

test('zone lock eases from the walk camera instead of jumping; far teleports snap', () => {
  const zone = { l: 1280, r: 2560 };
  assert.equal(lockSnaps(1222, zone), false);
  assert.equal(lockSnaps(0, zone), true);
  const s = { camX: 1222, camMax: 1222 };
  updateCamera(s, 0, { bobX: 1500, locked: true, zone });
  assert.equal(s.camX, 1222);
  updateCamera(s, 1 / 60, { bobX: 1500, locked: true, zone });
  assert.ok(s.camX > 1222 && s.camX < 1280);
  assert.ok(s.bounds.l >= zone.l);
  for (let i = 0; i < 120; i++) updateCamera(s, 1 / 60, { bobX: 1500, locked: true, zone });
  assert.ok(Math.abs(s.camX - 1280) < 1);
});

test('between zones camera follow keeps Bob near the left third', () => {
  const w = new Campaign({ save: { bestScore: 1 } });
  w.bob.x = 280;
  w.enterZone();
  clearZone(w);
  assert.equal(w.locked, false);
  // Hold still after walking so lerp settles, then assert left-third.
  for (let i = 0; i < 200 && !w.locked; i++) w.update(1 / 60, { x: 1 });
  if (!w.locked) {
    for (let i = 0; i < 60; i++) w.update(1 / 60, {});
    const sx = screenX(w.bob.x, w.camX);
    assert.ok(sx <= VW / 3 + 80, `sx=${sx} bob=${w.bob.x} cam=${w.camX}`);
    assert.equal(w.bounds.r - w.bounds.l, VW);
  }
});

test('zone clear emits go and restores free-roam bounds', () => {
  const w = new Campaign({ save: { bestScore: 1 } });
  w.bob.x = 280;
  w.enterZone();
  const before = w.events.length;
  clearZone(w);
  assert.equal(w.locked, false);
  assert.ok(w.events.slice(before).some((e) => e.type === 'go'));
  assert.equal(w.bounds.r - w.bounds.l, VW);
});

test('Adventure bot clears Stage 1 under the scrolling camera', (t) => {
  const w = new Campaign({ save: { bestScore: 1 } }), bot = new Bot();
  let maxRoamSx = 0;
  for (let i = 0; i < 480 * 60 && !w.stats.stages.includes(1); i++) {
    const wasLocked = w.locked, beforeX = w.bob.x;
    w.update(1 / 60, bot.update(1 / 60, w));
    w.events = [];
    // 1e-6: a Bob held in place past the line (zone just cleared) may drift by float round-off.
    if (!wasLocked && !w.locked && w.bob.x > beforeX + 1e-6) maxRoamSx = Math.max(maxRoamSx, screenX(w.bob.x, w.camX));
  }
  assert.deepEqual(w.stats.stages, [1]);
  assert.ok(w.camMax > 0);
  // Advancing in free roam never takes Bob past the left third of the screen.
  assert.ok(maxRoamSx <= VW / 3 + 1e-6, `max free-roam screen X ${maxRoamSx}`);
  t.diagnostic(JSON.stringify({ seconds: w.elapsed, camMax: w.camMax, maxRoamSx }));
});
