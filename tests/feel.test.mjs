import test from 'node:test';
import assert from 'node:assert/strict';
import { Campaign, hitTier } from '../src/campaign.js';
import { HITSTOP } from '../src/config.js';
import { Yetti } from '../src/yettis.js';
import { FX } from '../src/fx.js';
import { createShot } from '../src/eggplant.js';
import { Bob } from '../src/bob.js';

test('hit tiers are light, bonk, KO, and boss gate, and a jump during the freeze is kept', () => {
  assert.equal(hitTier({}), 'light');
  assert.equal(hitTier({ bonk: true }), 'medium');
  assert.equal(hitTier({ shieldBroke: true }), 'medium');
  assert.equal(hitTier({ killed: true, bonk: true }), 'heavy');
  assert.equal(hitTier({ phase: true, killed: true }), 'finisher');

  const w = new Campaign();
  w.bob.x = 400;
  w.enterZone();
  const e = w.enemies.find(x => x.alive);
  e.hp = 400;
  w.hit(e, 1, 1, false);
  assert.equal(w.hitStop, HITSTOP.light / 60);
  assert.equal(w.events.filter(ev => ev.type === 'hit').pop().data.kind, 'light');

  w.events = [];
  w.hit(e, 1, 1, true);
  assert.equal(w.hitStop, HITSTOP.medium / 60);
  assert.equal(w.events.filter(ev => ev.type === 'hit').pop().data.kind, 'medium');

  w.events = [];
  e.hp = 1;
  w.hit(e, 30, 1, false);
  assert.equal(w.events.filter(ev => ev.type === 'hit').pop().data.kind, 'heavy');
  assert.equal(w.hitStop, HITSTOP.heavy / 60);

  const boss = new Yetti('interventionist', 900, 630);
  boss.hp = Math.floor(boss.maxHp * 0.66) + 8;
  w.enemies = [boss];
  w.events = [];
  w.hit(boss, 20, 1, false);
  assert.equal(w.events.filter(ev => ev.type === 'hit').pop().data.kind, 'finisher');
  assert.equal(w.hitStop, HITSTOP.finisher / 60);

  const live = new Campaign();
  live.hitStop = HITSTOP.light / 60;
  live.update(1 / 60, { jump: true, fire: true });
  assert.ok(live.bob.jumpBuffer > 0, 'jump pressed during hit-stop is buffered');
  assert.equal(live.latchedFire, true);
  assert.equal(live.stats.shots, 0, 'the freeze itself does not fire');
  for (let i = 0; i < 8 && (live.hitStop > 0 || live.latchedFire); i++) live.update(1 / 60, {});
  assert.equal(live.hitStop, 0);
  assert.equal(live.latchedFire, false, 'latched fire is consumed once the freeze ends');
  assert.ok(live.stats.shots >= 1, 'the shot survives the freeze');
  assert.ok(live.bob.z > 0, 'the buffered jump happens after the freeze');
});

test('fire reports a muzzle and the eggplant still has no vertical aim', () => {
  const w = new Campaign();
  w.bob.facing = 1;
  w.update(0.25, { fire: true });
  const fire = w.events.find(ev => ev.type === 'fire');
  assert.ok(fire, 'expected a fire event');
  assert.equal(typeof fire.data.x, 'number');
  assert.equal(typeof fire.data.y, 'number');
  assert.equal(fire.data.dir, 1);
  assert.equal(fire.data.vy, undefined);
  const shot = createShot(new Bob());
  assert.equal(shot.vy, 0);
  assert.equal(typeof FX.prototype.muzzle, 'function');
  assert.equal(typeof FX.prototype.splat, 'function');
  assert.equal(typeof FX.prototype.impact, 'function');
});
