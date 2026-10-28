import test from 'node:test';
import assert from 'node:assert/strict';
import { VW, CAM_LEAD as CONFIG_LEAD } from '../src/config.js';
import {
  CAM_LEAD, cameraTarget, updateCamera, stepCamera, screenX, freeRoam,
} from '../src/camera.js';
import { Campaign } from '../src/campaign.js';
import { Bot } from '../src/bot.js';
import { plateIndexForCam, plateKeyForCam, STREAMS, plateKeys, plateRect } from '../src/zone-stream.js';
import { backdropPlan, ART_GAPS } from '../src/backdrop.js';
import { FAR_SCROLL, MID_SCROLL } from '../src/parallax.js';
import { resolveStage, STAGE_TEXTURES } from '../src/stages.js';

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

test('each stage ships 3+ mid plates; zone transitions change the plate', () => {
  assert.equal(FAR_SCROLL, 0.12);
  assert.equal(MID_SCROLL, 0.4);
  assert.ok(ART_GAPS.length >= 3);
  for (const no of [1, 2, 3]) {
    const keys = plateKeys(no);
    assert.ok(keys.filter((k) => k.includes('-mid')).length >= 3);
    assert.deepEqual(STAGE_TEXTURES[no], keys);
    const def = resolveStage(no);
    const plan = backdropPlan(def);
    assert.ok(plan.plates.length >= 3);
    assert.equal(plan.far, STREAMS[no].far);
    const seen = new Set();
    for (const z of [...def.zones, def.boss]) {
      seen.add(plateIndexForCam(z.l, def));
      seen.add(plateKeyForCam(z.l, def));
    }
    assert.ok(seen.size >= 4, `stage ${no} saw ${[...seen]}`);
  }
  assert.equal(plateIndexForCam(1000, { zones: [{ l: 0 }, { l: 1280 }, { l: 2560 }], boss: { l: 3920 } }), 1);
  assert.ok(plateRect(1, { zones: [{ l: 0 }, { l: 1280 }, { l: 2560 }], boss: { l: 3920 } }).w > 1000);
});

test('between zones camera follow keeps Bob near the left third', () => {
  const w = new Campaign({ save: { bestScore: 1 } });
  w.bob.x = 280;
  w.enterZone();
  for (const e of w.enemies) { e.alive = false; e.hp = 0; }
  w.update(1 / 60);
  for (const e of w.enemies) { e.alive = false; e.hp = 0; }
  w.update(1 / 60);
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
  for (const e of w.enemies) { e.alive = false; e.hp = 0; }
  w.update(1 / 60);
  for (const e of w.enemies) { e.alive = false; e.hp = 0; }
  const before = w.events.length;
  w.update(1 / 60);
  assert.equal(w.locked, false);
  assert.ok(w.events.slice(before).some((e) => e.type === 'go'));
  assert.equal(w.bounds.r - w.bounds.l, VW);
});

test('Adventure bot clears Stage 1 under the scrolling camera', (t) => {
  const w = new Campaign({ save: { bestScore: 1 } }), bot = new Bot();
  for (let i = 0; i < 480 * 60 && !w.stats.stages.includes(1); i++) {
    w.update(1 / 60, bot.update(1 / 60, w));
    w.events = [];
  }
  assert.deepEqual(w.stats.stages, [1]);
  assert.ok(w.camMax > 0);
  t.diagnostic(JSON.stringify({ seconds: w.elapsed, camMax: w.camMax }));
});
