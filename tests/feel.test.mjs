import test from 'node:test';
import assert from 'node:assert/strict';
import { Campaign, hitTier, LIGHT_STOP_GAP } from '../src/campaign.js';
import { HITSTOP, CAM_LEAD } from '../src/config.js';
import { Yetti } from '../src/yettis.js';
import { FX } from '../src/fx.js';
import { createShot } from '../src/eggplant.js';
import { Bob } from '../src/bob.js';
import { HUD, chainLabel } from '../src/hud.js';

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
  assert.equal(CAM_LEAD, 0.28);
  assert.equal(typeof FX.prototype.muzzle, 'function');
  assert.equal(typeof FX.prototype.splat, 'function');
  assert.equal(typeof FX.prototype.impact, 'function');
});

test('light non-kill hits are 0 or 1 frame and a held stream stays near wall time', () => {
  assert.equal(HITSTOP.light, 1);
  assert.equal(HITSTOP.medium, 6);
  assert.equal(HITSTOP.heavy, 9);
  assert.equal(HITSTOP.finisher, 14);

  const chip = new Campaign();
  const foe = new Yetti('walker', 700, 630);
  foe.hp = 400;
  chip.enemies = [foe];
  chip.hit(foe, 1, 1, false);
  assert.equal(chip.hitStop, HITSTOP.light / 60);
  chip.hitStop = 0;
  chip.hit(foe, 1, 1, false);
  assert.equal(chip.hitStop, 0, 'a light hit inside the gap adds no freeze');
  chip.elapsed += LIGHT_STOP_GAP;
  chip.hit(foe, 1, 1, false);
  assert.equal(chip.hitStop, HITSTOP.light / 60);

  const w = new Campaign();
  w.locked = true;
  w.pending = [];
  w.bob.x = 400;
  w.bob.y = 630;
  w.bob.facing = 1;
  const e = new Yetti('walker', 980, 630);
  e.hp = e.maxHp = 8000;
  w.enemies = [e];
  const dt = 1 / 60;
  let wall = 0;
  const t0 = w.bob.time;
  while (wall < 3 - 1e-9) {
    w.update(dt, { fire: true });
    wall += dt;
  }
  const sim = w.bob.time - t0;
  assert.equal(e.alive, true);
  assert.ok(sim / wall >= 0.95, `sim/wall ${(sim / wall).toFixed(4)} over ${wall}s`);
});

test('a KO chain shows from 3, scores x2 at 5 and x3 at 10', () => {
  const w = new Campaign();
  let score = 0;
  for (let i = 1; i <= 10; i++) {
    w.elapsed = (i - 1) * 2;
    const e = new Yetti('walker', 500, 630);
    e.hp = 1;
    w.hit(e, 30, 1, false);
    score += 300 * (i >= 10 ? 3 : i >= 5 ? 2 : 1);
    assert.equal(w.chain, i);
    assert.equal(w.score, score);
  }
  assert.equal(chainLabel(2, 0), '');
  assert.equal(chainLabel(3, 0), '3 CHAIN');
  assert.equal(chainLabel(5, 0), '5 CHAIN x2');
  assert.equal(chainLabel(10, 2.5), '10 CHAIN x3');
  assert.equal(chainLabel(10, 2.51), '');
  const before = w.score;
  w.elapsed = 18 + 2.6;
  const reset = new Yetti('walker', 500, 630);
  reset.hp = 1;
  w.hit(reset, 30, 1, false);
  assert.equal(w.chain, 1);
  assert.equal(w.score, before + 300);

  const node = () => ({
    setText() { return this; }, setOrigin() { return this; }, setAlign() { return this; },
    setWordWrapWidth() { return this; }, setColor() { return this; }, setScrollFactor() { return this; },
    setDepth() { return this; }, setVisible() { return this; },
  });
  const hud = new HUD({ add: { text: () => node(), graphics: () => ({ setScrollFactor() { return this; }, setDepth() { return this; }, clear() {}, fillStyle() {}, lineStyle() {}, lineBetween() {}, fillRect() {}, fillRoundedRect() {}, beginPath() {}, arc() {}, strokePath() {} }) } });
  let label = '';
  hud.chain = { setText(v) { label = v; return this; } };
  const world = {
    stageNo: 1, bob: { hp: 3, maxHp: 3, state: 'idle', grabMash: 0 },
    papi: { shakeRemainder: 0, charges: 0 }, dadCall: { charges: 0, unlocked: false, kos: 0, since: 0 },
    score: 0, difficultyKey: 'adventure', bossActive: false, def: { zones: [{}], boss: { name: '' } },
    zoneIndex: 0, paused: false, victory: false, messageTime: 0, message: '', enemies: [], wingmen: null, locked: false,
  };
  hud.update({ ...world, chain: 2, chainAt: 0, elapsed: 0 });
  assert.equal(label, '');
  hud.update({ ...world, chain: 4, chainAt: 1, elapsed: 2 });
  assert.equal(label, '4 CHAIN');
  hud.update({ ...world, chain: 5, chainAt: 4, elapsed: 5 });
  assert.equal(label, '5 CHAIN x2');
  hud.update({ ...world, chain: 10, chainAt: 9, elapsed: 10 });
  assert.equal(label, '10 CHAIN x3');
  hud.update({ ...world, chain: 10, chainAt: 9, elapsed: 12 });
  assert.equal(label, '');
});
