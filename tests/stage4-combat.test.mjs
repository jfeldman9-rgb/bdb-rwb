import test from 'node:test';
import assert from 'node:assert/strict';
import { Yetti, TYPES, BOSS_ADDS, RANGED_TYPES, POISE, laneY, laneOf } from '../src/yettis.js';
import { Campaign } from '../src/campaign.js';
import { rollingVoiceStats } from '../src/voice-gate.js';

function arena(type, x = 800, y = laneY(1)) {
  const world = new Campaign();
  world.bob.x = 500; world.bob.y = laneY(1);
  const enemy = new Yetti(type, x, y);
  world.enemies = [enemy];
  return { world, enemy };
}

test('legacy Yetti flags preserve every shield, poise, grab and ranged role', () => {
  const expected = {
    walker: [false, false, false, false],
    guard: [true, true, false, true],
    hover: [false, false, false, true],
    charger: [false, true, false, false],
    choir: [false, false, false, true],
    lecturer: [false, true, true, false],
    interventionist: [false, false, true, false],
    choirmaster: [false, false, false, true],
  };
  for (const [type, flags] of Object.entries(expected)) {
    assert.deepEqual(['shield', 'heavy', 'grab', 'ranged'].map(flag => !!TYPES[type][flag]), flags, type);
    assert.equal(new Yetti(type, 600, laneY(1)).shield, flags[0], `${type} initial shield`);
    assert.equal(RANGED_TYPES.has(type), flags[3], `${type} ranged cap membership`);
  }
});

test('Salsero stays light and hops one lane toward Bob at 220px/s every 1.4 seconds', () => {
  for (const hz of [30, 60, 120]) {
    const { world, enemy } = arena('salsero', 900, laneY(0));
    world.bob.y = laneY(2); enemy.cooldown = 99;
    const dt = 1 / hz;
    for (let i = 0; i < Math.floor(1.4 * hz) - 1; i++) enemy.update(dt, world);
    assert.equal(enemy.y, laneY(0), `waits before first hop at ${hz}Hz`);
    let previous = enemy.y;
    for (let i = 0; i < Math.ceil(.4 * hz); i++) {
      enemy.update(dt, world);
      assert.ok(enemy.y - previous <= 220 * dt + 1e-9, `hop speed at ${hz}Hz`);
      previous = enemy.y;
    }
    assert.equal(enemy.y, laneY(1), `first hop never skips the middle lane at ${hz}Hz`);
    while (enemy.clock < 2.7) enemy.update(dt, world);
    assert.equal(enemy.y, laneY(1), `holds middle lane until next beat at ${hz}Hz`);
    while (enemy.clock < 3.2) enemy.update(dt, world);
    assert.equal(enemy.y, laneY(2), `second hop reaches Bob's lane at ${hz}Hz`);
  }
  const e = new Yetti('salsero', 600, laneY(1));
  e.takeHit(1, 1);
  assert.equal(e.poise, POISE.light);
  assert.equal(RANGED_TYPES.has('salsero'), false);
});

test('a Lecturer grab still speaks the intervention line', () => {
  const { world, enemy } = arena('lecturer', 560);
  enemy.cooldown = 0;
  enemy.update(.01, world);
  enemy.update(.7, world);
  assert.equal(enemy.state, 'hold');
  assert.equal(world.events.some(e => e.data === 'lecturer_intervention'), true);
  assert.equal(world.events.some(e => e.data === 'bouncer_grab'), false);
});

test('Salsero tells for .55/pace then lunges through the marked spot with a bounded duration', () => {
  for (const pace of [.72, 1, 1.15, 1.25]) {
    const { world, enemy } = arena('salsero', 650);
    world.difficulty = { ...world.difficulty, pace };
    enemy.cooldown = 0;
    enemy.update(.01, world);
    assert.equal(enemy.state, 'telegraph');
    assert.equal(enemy.timer, .55 / pace);
    const x = enemy.x, y = enemy.y;
    enemy.update(.55 / pace - .001, world);
    assert.equal(enemy.state, 'telegraph');
    assert.equal(enemy.x, x); assert.equal(enemy.y, y);
    enemy.update(.002, world);
    assert.equal(enemy.state, 'rush');
    assert.ok(enemy.timer >= .3 && enemy.timer <= .5);
    const duration = enemy.timer;
    enemy.update(duration, world);
    assert.equal(enemy.state, 'recover');
    assert.ok(enemy.x < world.bob.x, `crosses the marked spot at pace ${pace}`);
  }
});

test('Salsero lunge can hit a grounded Bob while a lane step or jump avoids it', () => {
  for (const counter of ['none', 'lane', 'jump']) {
    const { world, enemy } = arena('salsero', 650);
    enemy.cooldown = 0; enemy.update(.01, world);
    if (counter === 'lane') world.bob.y = laneY(0);
    if (counter === 'jump') world.bob.z = 90;
    for (let i = 0; i < 90 && enemy.state !== 'recover'; i++) enemy.update(1 / 60, world);
    assert.equal(world.bob.hp < world.bob.maxHp, counter === 'none', counter);
    assert.equal(laneOf(enemy.y), 1, 'lunge keeps its telegraphed lane');
  }
});

test('Bouncer clipboard breaks on three front hits or a dash, then re-arms on each gate roar', () => {
  const { world, enemy } = arena('bouncer');
  for (let i = 0; i < 3; i++) assert.equal(enemy.takeHit(12, 1).blocked, true);
  assert.equal(enemy.shield, false); assert.equal(enemy.hp, enemy.maxHp);
  enemy.stun = 0;
  for (const phase of [2, 3]) {
    assert.equal(enemy.takeHit(enemy.maxHp * .35, 1).phase, phase);
    assert.equal(enemy.state, 'roar'); assert.equal(enemy.canBeHit, false);
    assert.equal(enemy.shield, true); assert.equal(enemy.shieldHits, 0);
    enemy.update(1.11, world);
    assert.equal(enemy.state, 'approach');
    assert.deepEqual(world.enemies.filter(e => !e.boss).map(e => e.type), BOSS_ADDS.bouncer[phase - 1]);
    assert.equal(enemy.breakShield(), true, 'dash breaks the re-armed clipboard');
    enemy.stun = 0;
    world.enemies = [enemy];
  }
});

test('Bouncer uses the .65 second rope-grab tell and Bob can mash free', () => {
  const { world, enemy } = arena('bouncer', 560);
  enemy.cooldown = 0; enemy.update(.01, world);
  assert.equal(enemy.state, 'telegraph'); assert.equal(enemy.timer, .65);
  enemy.update(.64, world); assert.equal(world.bob.grabbedBy, null);
  enemy.update(.02, world); assert.equal(world.bob.grabbedBy, enemy);
  assert.equal(enemy.state, 'hold');
  assert.ok(world.events.some(e => e.type === 'voice' && e.data === 'bouncer_grab'));
  assert.equal(world.events.some(e => e.data === 'lecturer_intervention'), false);
  world.bob.mash(6);
  assert.equal(world.bob.grabbedBy, null); assert.equal(enemy.state, 'hurt');
});

test('a dash cannot break Bouncer shield and cancel a gate roar or its adds', () => {
  const { world, enemy } = arena('bouncer');
  assert.equal(enemy.takeHit(enemy.maxHp * .35, -1).phase, 2);
  assert.equal(enemy.breakShield(), false);
  assert.equal(enemy.state, 'roar'); assert.equal(enemy.canBeHit, false);
  assert.equal(enemy.shield, true);
  enemy.update(.8, world);
  assert.equal(enemy.breakShield(), false);
  assert.equal(world.enemies.length, 1, 'the summon waits for the completed roar');
  enemy.update(.31, world);
  assert.deepEqual(world.enemies.filter(e => !e.boss).map(e => e.type), BOSS_ADDS.bouncer[1]);
  assert.equal(enemy.breakShield(), true, 'dash breaks the clipboard once the roar ends');
});

test('Campaign emits each new boss phase and defeat voice once inside the rolling window, without adding legacy boss voices', () => {
  for (const type of ['bouncer', 'interventionist', 'choirmaster']) {
    const world = new Campaign({ stage: 4 });
    // Let the opening Stage 4 narration window age out before entering the boss arena.
    world.voiceAt = [];
    world.elapsed = 120;
    const enemy = new Yetti(type, 800, laneY(1));
    world.enemies = [enemy]; world.events = [];
    const bossVoices = [], stamps = [];
    const collect = () => {
      for (const e of world.events) {
        if (e.type === 'voice') {
          stamps.push(world.elapsed);
          if (e.data.startsWith(type + '_')) bossVoices.push(e.data);
        }
      }
      world.events = [];
    };
    for (const phase of [2, 3]) {
      world.hit(enemy, enemy.maxHp * .35, -1, false);
      assert.equal(enemy.phase, phase);
      world.hit(enemy, 12, -1, false);
      assert.equal(enemy.state, 'roar', 'follow-up shots cannot re-trigger the gate');
      enemy.update(1.11, world);
      collect();
      world.elapsed += 8.5;
      world.flushVoice();
      collect();
    }
    world.hit(enemy, enemy.hp, -1, false);
    world.hit(enemy, 12, -1, false);
    world.recordKo(enemy, 'papi');
    world.recordKo(enemy, 'dad');
    collect();
    world.elapsed += 60;
    world.flushVoice();
    collect();
    assert.deepEqual(bossVoices, type === 'bouncer' ? ['bouncer_phase2', 'bouncer_phase3', 'bouncer_defeat'] : [], type);
    assert.equal(rollingVoiceStats(stamps).ok, true, `${type} rolling window`);
    if (type === 'bouncer') assert.equal(world.pickups.length, 3, 'phase II still grants exactly one shake trio');
  }
});

test('Bouncer charges distant Bob from phase II with the same red tell and cooldown as Interventionist', () => {
  for (const phase of [1, 2, 3]) {
    const { world, enemy } = arena('bouncer', 1100);
    enemy.phase = phase; enemy.cooldown = 0; enemy.rushCool = 0;
    enemy.update(1 / 60, world);
    if (phase === 1) { assert.equal(enemy.state, 'approach'); continue; }
    assert.equal(enemy.state, 'telegraph'); assert.equal(enemy.mode, 'rush');
    assert.equal(enemy.timer, .8); assert.equal(enemy.rushCool, 5);
    enemy.update(.81, world); assert.equal(enemy.state, 'rush');
  }
});

test('Bouncer phase III whiffed grab stomps in both directions and re-shields every twelve seconds', () => {
  for (const phase of [1, 2, 3]) {
    const { world, enemy } = arena('bouncer');
    enemy.phase = phase; enemy.state = 'telegraph'; enemy.timer = 0;
    enemy.attackY = enemy.y; enemy.rushDir = -1;
    enemy.update(.01, world);
    assert.equal(world.hostile.length, phase === 3 ? 2 : 0);
    if (phase === 3) {
      assert.equal(enemy.state, 'slam');
      assert.deepEqual(world.hostile.map(p => [p.kind, p.dir]), [['shockwave', -1], ['shockwave', 1]]);
      enemy.shield = false; enemy.reshieldTimer = 12;
      enemy.update(11.99, world); assert.equal(enemy.shield, false);
      enemy.update(.02, world); assert.equal(enemy.shield, true); assert.equal(enemy.shieldHits, 0);
      enemy.shield = false;
      enemy.update(11.98, world); assert.equal(enemy.shield, false);
      enemy.update(.02, world); assert.equal(enemy.shield, true);
    }
  }
});
