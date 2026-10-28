import test from 'node:test';
import assert from 'node:assert/strict';
import { Campaign } from '../src/campaign.js';
import { Bot } from '../src/bot.js';
import { Bob } from '../src/bob.js';
import { createShot } from '../src/eggplant.js';
import { ZONE_MERCY_DEATHS } from '../src/dad-call.js';
import { laneOf, MAX_RANGED_PER_LANE, RANGED_TYPES } from '../src/yettis.js';

function die(w) {
  const before = w.stats.deaths;
  w.bob.inv = 0;
  w.bob.hp = 1;
  w.bob.alive = true;
  w.bob.setState('idle');
  w.hurtBob(true);
  for (let i = 0; i < 120 && w.stats.deaths === before; i++) w.update(1 / 60, {});
  assert.equal(w.stats.deaths, before + 1);
}

function laneCounts(w) {
  const counts = [0, 0, 0];
  for (const e of w.enemies) if (e.alive && RANGED_TYPES.has(e.type)) counts[laneOf(e.y)]++;
  return counts;
}

test('eggplant still fires straight with vy 0', () => {
  const shot = createShot(new Bob());
  assert.equal(shot.vy, 0);
  assert.equal(shot.vx !== 0, true);
});

test('a third ranged Yetti is parked out of a full lane', () => {
  const w = new Campaign({ stage: 2, difficulty: 'nightmare' });
  w.enemies = [];
  const spawned = ['choir', 'guard', 'hover'].map((type, i) => w.spawnYetti(type, 800 + i * 80, 630));
  assert.equal(spawned.length, 3);
  const counts = laneCounts(w);
  assert.ok(counts.every(n => n <= MAX_RANGED_PER_LANE), counts.join(','));
  assert.equal(counts.reduce((a, b) => a + b, 0), 3);
});

test('ranged Yettis spread instead of stacking three deep on Bob', () => {
  const w = new Campaign({ stage: 2, difficulty: 'nightmare' });
  w.bob.x = 200;
  w.bob.y = 630;
  w.enemies = [];
  const bodies = [572, 631, 690].map((y, i) => w.spawnYetti(['guard', 'hover', 'choir'][i], 700 + i * 40, y));
  for (const e of bodies) { e.y = 630; e.cooldown = 99; e._laneGoal = null; }
  for (let i = 0; i < 180; i++) for (const e of bodies) e.update(1 / 60, w);
  const spread = [0, 0, 0];
  for (const e of bodies) spread[laneOf(e.y)]++;
  assert.ok(spread.every(n => n <= MAX_RANGED_PER_LANE), `did not spread: ${spread.join(',')}`);
  let repiled = false;
  for (let i = 0; i < 300; i++) {
    for (const e of bodies) e.update(1 / 60, w);
    const counts = [0, 0, 0];
    for (const e of bodies) counts[laneOf(e.y)]++;
    if (counts.some(n => n > MAX_RANGED_PER_LANE)) repiled = counts.join(',');
  }
  assert.equal(repiled, false);
});

test('nightmare mercy is the third death in that zone, not adventure and not the next zone', () => {
  const n = new Campaign({ stage: 2, difficulty: 'nightmare' });
  n.dadCall.charges = 0;
  n.dadCall.calls = 3;
  n.zoneIndex = 4;
  n.checkpoint = { zone: 4, x: 5300, phase: 1 };
  for (let i = 0; i < ZONE_MERCY_DEATHS - 1; i++) die(n);
  assert.equal(n.dadCall.charges, 0);
  assert.equal(n.zoneDeaths[4], 2);
  die(n);
  assert.equal(n.zoneDeaths[4], 3);
  assert.equal(n.dadCall.charges, 1);
  assert.ok(n.dadCall.calls < 3);
  assert.match(n.message, /MERCY/);
  n.dadCall.charges = 0;
  n.dadCall.calls = 3;
  n.checkpoint = { zone: 3, x: 4000, phase: 1 };
  die(n);
  assert.equal(n.dadCall.charges, 0, 'a fresh zone has not earned mercy');

  const adventure = new Campaign({ stage: 2, difficulty: 'adventure' });
  adventure.dadCall.charges = 0;
  adventure.dadCall.calls = 3;
  adventure.checkpoint = { zone: 4, x: 5300, phase: 1 };
  for (let i = 0; i < 3; i++) die(adventure);
  assert.equal(adventure.dadCall.charges, 0);
});

function clearZone5(stage) {
  const w = new Campaign({ stage, difficulty: 'nightmare' });
  const bot = new Bot();
  const z = w.def.zones[4];
  w.zoneIndex = 4;
  w.camX = z.l;
  w.camMax = z.l;
  w.bounds = { l: z.l, r: z.r };
  w.bob.x = z.at - 30;
  w.bob.y = 630;
  w.checkpoint = { zone: 4, x: z.l + 180, phase: 1 };
  const cap = 60 * 600;
  let steps = 0;
  let overflow = null;
  for (; steps < cap && w.zoneIndex === 4 && !w.victory; steps++) {
    w.update(1 / 60, bot.update(1 / 60, w));
    for (const e of w.events) if (e.type === 'dad_callin') w.finishDadCallin();
    const counts = laneCounts(w);
    if (!overflow && counts.some(n => n > MAX_RANGED_PER_LANE)) overflow = counts.join(',');
    w.events = [];
  }
  return { zoneIndex: w.zoneIndex, deaths: w.stats.deaths, seconds: w.elapsed, steps, overflow, locked: w.locked };
}

test('nightmare bot clears stage 2 and stage 3 zone 5 without a third ranged body in a lane', () => {
  for (const stage of [2, 3]) {
    const result = clearZone5(stage);
    assert.equal(result.overflow, null, `stage ${stage} lane overlap ${result.overflow}`);
    assert.ok(result.zoneIndex > 4, `stage ${stage} zone 5 not clear in ${result.seconds}s (${result.deaths} deaths)`);
  }
});
