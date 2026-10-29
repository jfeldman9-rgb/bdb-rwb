import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Bob } from '../src/bob.js';
import { fireGun, GUN } from '../src/eggplant.js';
import { shootTimeScale, consumeShootRestart, Fighter } from '../src/fighter.js';
import { Campaign } from '../src/campaign.js';

const bobMeta = JSON.parse(readFileSync('assets/chars/bob.anims.json', 'utf8'));

function mockView() {
  const plays = [];
  return {
    plays,
    cur: '',
    shootPulse: 0,
    play(name, ts = 1, restart = true) {
      if (!restart && this.cur === name) { this.ts = ts; return; }
      this.cur = name; this.ts = ts; plays.push({ name, ts, restart });
    },
  };
}

test('the authored shoot clip is sped to one cycle per gun interval', () => {
  const ts = shootTimeScale(bobMeta, GUN.interval);
  const shoot = bobMeta.anims.find(a => a.name === 'bob_shoot');
  const dur = shoot.holds.reduce((s, h) => s + Math.max(0, h - 1), 0) / 1000;
  assert.ok(dur > GUN.interval, 'the packed clip is longer than the cadence');
  assert.ok(Math.abs(dur / ts - GUN.interval) < 1e-9);
  assert.equal(shoot.loop, false);
});

test('two seconds of held fire is ten shots and ten visible shoot restarts', () => {
  const b = new Bob(), g = {}, view = mockView();
  let shots = 0;
  for (let i = 0; i < 120; i++) {
    const fired = fireGun(g, 1 / 60, true, b, []);
    if (fired) shots++;
    b.shootTime = Math.max(0, b.shootTime - 1 / 60);
    const anim = b.shootTime > 0 ? 'shoot' : 'idle';
    const restart = consumeShootRestart(view, b, anim);
    const ts = anim === 'shoot' ? shootTimeScale(bobMeta) : 1;
    view.play(anim, ts, restart);
  }
  assert.equal(shots, 10);
  assert.equal(view.plays.filter(p => p.name === 'shoot' && p.restart).length, 10);
});

test('tap, hold, auto-fire, move, airborne, hitstop, and repress each restart from a discharge', () => {
  const cases = [];
  const tap = new Bob(), tg = {};
  assert.ok(fireGun(tg, .2, true, tap, []));
  const v1 = mockView();
  assert.equal(consumeShootRestart(v1, tap, 'shoot'), true);
  assert.equal(consumeShootRestart(v1, tap, 'shoot'), false);
  cases.push('tap');

  const hold = new Bob(), hg = {};
  let holdShots = 0;
  for (let i = 0; i < 60; i++) if (fireGun(hg, 1 / 60, true, hold, [])) holdShots++;
  assert.equal(holdShots, 5);
  cases.push('hold');

  const w = new Campaign();
  w.save.autoFire = true;
  w.bob.x = 200; w.bob.y = 630;
  const foe = { alive: true, x: 400, y: 630, z: 0, canBeHit: true, update() {}, takeHit() { return { accepted: true }; } };
  w.enemies = [foe];
  w.events = [];
  for (let i = 0; i < 60; i++) w.update(1 / 60, { x: 1 });
  assert.ok(w.stats.shots >= 1, 'auto-fire still discharges');
  cases.push('auto');

  const air = new Bob(); air.z = 120;
  const ag = {};
  assert.ok(fireGun(ag, .2, true, air, []));
  assert.equal(air.shootPulse, 1);
  cases.push('air');

  const freeze = new Campaign();
  freeze.hitStop = 0.05;
  freeze.update(1 / 60, { fire: true });
  assert.equal(freeze.stats.shots, 0);
  assert.equal(freeze.latchedFire, true);
  for (let i = 0; i < 8 && freeze.hitStop > 0; i++) freeze.update(1 / 60, {});
  freeze.update(1 / 60, {});
  assert.ok(freeze.stats.shots >= 1);
  cases.push('hitstop');

  const press = new Bob(), pg = {};
  assert.ok(fireGun(pg, .2, true, press, []));
  assert.equal(fireGun(pg, .05, false, press, []), null);
  pg.cooldown = 0;
  assert.ok(fireGun(pg, .2, true, press, []));
  const v2 = mockView();
  assert.equal(consumeShootRestart(v2, press, 'shoot'), true);
  cases.push('repress');

  assert.deepEqual(cases, ['tap', 'hold', 'auto', 'air', 'hitstop', 'repress']);
  assert.equal(typeof Fighter.prototype.play, 'function');
});

test('the shoot animation never writes damage; only fireGun does', () => {
  const src = readFileSync(new URL('../src/fighter.js', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /damage|hurtBob|takeHit/);
  const b = new Bob(), g = {};
  const e = { alive: true, x: b.x + 200, y: b.y, z: 0, hp: 24 };
  fireGun(g, .2, true, b, [e]);
  assert.equal(e.hp, 24);
});
