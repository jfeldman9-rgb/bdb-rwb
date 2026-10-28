import test from 'node:test';
import assert from 'node:assert/strict';
import { Campaign, snowClearZ } from '../src/campaign.js';
import { Bot } from '../src/bot.js';
import { Bob } from '../src/bob.js';
import { createShot } from '../src/eggplant.js';
import { ZONE_MERCY_DEATHS, refuseReason } from '../src/dad-call.js';
import { laneOf, MAX_RANGED_PER_LANE, RANGED_TYPES, Yetti } from '../src/yettis.js';
import { isBossFinisherReady } from '../src/wingman.js';
import { killImpact } from '../src/shot-feel.js';

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
  assert.match(n.message, /CHECKPOINT: EGO INTACT/);
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

test('boss mercy clears that phase so the restored swat can be used', () => {
  const w = new Campaign({ stage: 2, difficulty: 'nightmare' });
  w.startBoss(1);
  w.dadCall.phaseCalls['2:1'] = 1;
  w.dadCall.charges = 0;
  w.dadCall.calls = 1;
  w.zoneDeaths[w.bossZone] = ZONE_MERCY_DEATHS - 1;
  die(w);
  assert.equal(w.dadCall.phaseCalls['2:1'], undefined);
  assert.equal(refuseReason(w.dadCall, { hittable: true, bossPhase: '2:1' }), '');
  assert.match(w.message, /CHECKPOINT: EGO INTACT/);
  assert.match(w.message, /MERCY/);
});

test('respawn drops the camera high-water mark back to the checkpoint', () => {
  const w = new Campaign({ stage: 2 });
  w.checkpoint = { zone: 1, x: 400, phase: 1 };
  w.zoneIndex = 1;
  w.camX = 2000;
  w.camMax = 2000;
  w.bob.hp = 0;
  w.bob.alive = false;
  w.bob.setState('dead', 0);
  w.respawn();
  assert.ok(w.camMax < 2000);
  assert.equal(w.camMax, w.camX);
  assert.ok(w.camX < 400);
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

test('a dead Wingman stays dead when phase 3 respawns', () => {
  const w = new Campaign({ stage: 3, difficulty: 'nightmare' });
  w.startBoss(3);
  const wings = w.enemies.filter(e => e.type === 'wingman');
  wings[0].hp = 40;
  wings[1].alive = false;
  wings[1].hp = 0;
  wings[1].state = 'dead';
  w.bob.hp = 1;
  w.hurtBob(true);
  for (let i = 0; i < 120 && w.stats.deaths === 0; i++) w.update(1 / 60, {});
  const again = w.enemies.filter(e => e.type === 'wingman');
  assert.equal(w.stats.deaths, 1);
  assert.equal(again.length, 2);
  assert.equal(again[0].alive, true);
  assert.equal(again[0].hp, 40);
  assert.equal(again[1].alive, false);
  assert.equal(again[1].hp, 0);
});

test('a Wingman phase change forgets the previous phase HP', () => {
  const w = new Campaign({ stage: 3 });
  w.startBoss(1);
  w.checkpoint.wingHp = [12];
  w.checkpoint.wingDead = [false];
  w.enemies[0].hp = 0;
  w.wingmen.update(0.01, w);
  assert.equal(w.wingmen.phase, 2);
  assert.equal(w.checkpoint.wingHp, undefined);
  assert.equal(w.checkpoint.wingDead, undefined);
});

test('a Wingman keeps damage already dealt when Bob dies', () => {
  const w = new Campaign({ stage: 3, difficulty: 'nightmare' });
  w.startBoss(2);
  const wing = w.enemies.find(e => e.type === 'wingman');
  wing.hp = 40;
  w.bob.hp = 1;
  w.hurtBob(true);
  for (let i = 0; i < 120 && w.stats.deaths === 0; i++) w.update(1 / 60, {});
  const again = w.enemies.find(e => e.type === 'wingman' && e.alive);
  assert.equal(w.stats.deaths, 1);
  assert.equal(w.wingmen.phase, 2);
  assert.equal(again.hp, 40);
});

function clearStage(stage, hz = 60, capSec = 700) {
  const w = new Campaign({ stage, difficulty: 'nightmare' });
  const bot = new Bot();
  const dt = 1 / hz;
  const cap = hz * capSec;
  for (let steps = 0; steps < cap && !w.stats.stages.includes(stage); steps++) {
    w.update(dt, bot.update(dt, w));
    for (const e of w.events) if (e.type === 'dad_callin') w.finishDadCallin();
    for (const shot of w.projectiles) assert.equal(shot.vy, 0);
    w.events = [];
  }
  return { cleared: w.stats.stages.includes(stage), seconds: w.elapsed, deaths: w.stats.deaths, zone: w.zoneIndex, boss: w.bossActive, phase: w.wingmen?.phase };
}

test('nightmare bot clears every full stage at 60 Hz and at 30 Hz', () => {
  for (const hz of [60, 30]) {
    for (const stage of [1, 2, 3]) {
      const result = clearStage(stage, hz);
      assert.equal(result.cleared, true, `${hz} Hz stage ${stage} not clear in ${result.seconds.toFixed(1)}s (${result.deaths} deaths, zone ${result.zone}, boss ${result.boss}, phase ${result.phase})`);
    }
  }
});

test('mercy before Dad arrives drops a shake trio instead of a charge', () => {
  const w = new Campaign({ stage: 1, difficulty: 'nightmare' });
  assert.equal(w.dadCall.unlocked, false);
  w.zoneIndex = 1;
  w.checkpoint = { zone: 1, x: 1130, phase: 1 };
  for (let i = 0; i < ZONE_MERCY_DEATHS; i++) die(w);
  assert.equal(w.zoneDeaths[1], 3);
  assert.equal(w.dadCall.charges, 0, 'no charge before Dad arrives');
  assert.equal(w.pickups.length, 3, 'shake trio instead');
  assert.match(w.message, /CATCH YOUR BREATH/);
});

test('nightmare snowballs clear at 58, and at 50 on a 60 Hz step; adventure and story stay at 65', () => {
  assert.equal(snowClearZ('nightmare'), 58);
  assert.equal(snowClearZ('nightmare', 1 / 30), 58);
  assert.equal(snowClearZ('nightmare', 1 / 60), 50);
  assert.equal(snowClearZ('nightmare', 1 / 120), 58);
  assert.equal(snowClearZ('adventure', 1 / 60), 65);
  assert.equal(snowClearZ('story', 1 / 60), 65);
});

test('wingHp of 0 stays dead when wingDead is omitted, and one floored survivor can be finished', () => {
  const w = new Campaign({ stage: 3, difficulty: 'nightmare' });
  w.checkpoint = { zone: w.bossZone, x: w.def.boss.l + 200, phase: 3, wingHp: [40, 0] };
  w.startBoss(3);
  const wings = w.enemies.filter(e => e.type === 'wingman');
  assert.equal(wings[0].alive, true);
  assert.equal(wings[0].hp, 40);
  assert.equal(wings[1].alive, false);
  assert.equal(wings[1].hp, 0);
  wings[0].hp = 1;
  wings[0].state = 'hover';
  assert.equal(isBossFinisherReady(3, w.enemies.filter(e => e.boss)), true);
  w.papi.charges = 1;
  assert.equal(w.usePapi(), true);
});

test('Dad swats a phase-3 pair when one Wingman is floored and the other can be hit', () => {
  const w = new Campaign({ stage: 3 });
  w.startBoss(3);
  const pair = w.enemies.filter(e => e.type === 'wingman');
  pair[0].hp = 1;
  pair[0].state = 'hover';
  pair[1].hp = 200;
  pair[1].state = 'hover';
  assert.equal(w.useDad(), true);
  assert.notEqual(w.message, 'THE BOSS IS BRAGGING — WAIT FOR AN OPENING.');
  const both = new Campaign({ stage: 3 });
  both.startBoss(3);
  for (const e of both.enemies) if (e.type === 'wingman') { e.hp = 1; e.state = 'hover'; }
  const charges = both.dadCall.charges;
  assert.equal(both.useDad(), false);
  assert.equal(both.message, 'NO TARGETS IN SIGHT.');
  assert.equal(both.dadCall.charges, charges);
});

test('recordKo carries a source, and a ko with no source still splats', () => {
  const w = new Campaign();
  const e = new Yetti('walker', 400, 630);
  e.hp = 1;
  w.enemies = [e];
  w.hit(e, 50, 1, false);
  const ko = w.events.find(ev => ev.type === 'ko');
  assert.equal(ko.data.source, 'bob');
  assert.equal(killImpact('ko', ko.data), null);
  assert.equal(killImpact('ko', {}).splat, true);
  assert.equal(killImpact('ko').splat, true);
});
