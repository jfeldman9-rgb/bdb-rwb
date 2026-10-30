import test from 'node:test';
import assert from 'node:assert/strict';
import { Campaign } from '../src/campaign.js';
import { Yetti, laneY, laneOf, telegraphPlan } from '../src/yettis.js';
import { ATTACK, rushHits, warningRect } from '../src/attack-geometry.js';

function arena(type, phase = 1, x = 560, lane = 1) {
  const world = new Campaign({ stage: 7 });
  world.bounds = { l: 0, r: 1280 };
  world.bob.x = 500; world.bob.y = laneY(lane); world.bob.z = 0;
  const enemy = new Yetti(type, x, laneY(lane));
  enemy.phase = phase; enemy.cooldown = 0; enemy.rushCool = 99;
  world.enemies = [enemy];
  return { world, enemy };
}

for (const [type, phase] of [['dj', 2], ['celestina', 3], ['archyetti', 2], ['archyetti', 3]]) {
  test(`${type} phase ${phase} advertises each volley's safe lane before release`, () => {
    const { world, enemy } = arena(type, phase);
    const warnings = [];
    for (let volley = 0; volley < 3; volley++) {
      world.hostile = [];
      world.bob.x = 500; world.bob.y = laneY(1);
      enemy.state = 'approach'; enemy.cooldown = 0;
      enemy.update(.01, world);
      assert.equal(enemy.state, 'telegraph');
      const safe = enemy.safeBand;
      assert.ok(Number.isInteger(safe) && safe >= 0 && safe < 3, 'first tell already has a safe lane');
      warnings.push(safe);
      // Crossing the boss or changing lanes after the tell cannot retarget it.
      world.bob.x = 620; world.bob.y = laneY(safe);
      enemy.update(enemy.timer + .01, world);
      assert.equal(enemy.safeBand, safe);
      const shots = world.hostile.filter(p => p.kind === 'halo');
      assert.equal(shots.length, 2);
      assert.equal(new Set(shots.map(p => laneOf(p.y))).size, 2);
      assert.ok(world.hostile.every(p => laneOf(p.y) !== safe), 'the safe lane also excludes the phase III gavel');
    }
    assert.ok(new Set(warnings).size >= 2, 'successive tells use the next volley, never stale lanes');
  });
}

test('Celestina and the Arch-Yetti clear safe-band warnings when committing to a rush', () => {
  for (const type of ['celestina', 'archyetti']) {
    const { world, enemy } = arena(type, 3, 1000);
    enemy.safeBand = 1; enemy.rushCool = 0;
    enemy.update(.01, world);
    assert.equal(enemy.state, 'telegraph');
    assert.equal(enemy.mode, 'rush');
    assert.equal(enemy.safeBand, null);
    assert.equal(telegraphPlan(enemy, world).kind, 'rush');
  }
});

test('Celestina advances deterministic blink seats and turns inward at both arena edges', () => {
  const sequences = [];
  for (let repeat = 0; repeat < 2; repeat++) {
    const { world, enemy } = arena('celestina');
    enemy.id = 42;
    const seats = [];
    for (const edge of [world.bounds.l + 55, world.bounds.r - 55]) {
      enemy.x = edge;
      for (let i = 0; i < 6; i++) {
        const before = enemy.x;
        enemy.repositionBlink(world);
        assert.ok(Math.abs(enemy.x - before) >= 300, `blink moved ${Math.abs(enemy.x - before)}px`);
        assert.ok(Math.abs(enemy.x - before) <= 500);
        assert.ok(enemy.x >= world.bounds.l + 55 && enemy.x <= world.bounds.r - 55);
        seats.push([enemy.x, enemy.y]);
      }
    }
    assert.equal(enemy.volley, 12, 'each blink advances the seeded sequence');
    assert.ok(new Set(seats.map(JSON.stringify)).size > 3);
    sequences.push(seats);
  }
  assert.deepEqual(sequences[0], sequences[1]);
});

for (const hz of [30, 60, 120]) {
  test(`rush contact honors both warning caps and travel ends exactly at ${hz} Hz`, () => {
    for (const type of ['salsero', 'charger', 'celestina', 'archyetti']) {
      for (const dir of [-1, 1]) {
        const { world, enemy } = arena(type, 3, 640);
        world.bob.x = enemy.x + dir * 200;
        enemy.facing = dir;
        enemy.mode = 'rush'; enemy.state = 'telegraph'; enemy.timer = .01;
        enemy.planTelegraph(world.bob, world);
        const plan = telegraphPlan(enemy, world);
        const strip = warningRect(plan, world.bounds);
        enemy.update(.01, world);
        assert.equal(enemy.state, 'rush');
        const oldX = enemy.x;
        enemy.update(1 / hz, world);
        const behind = { x: plan.from - dir, y: plan.y, z: 0 };
        assert.equal(rushHits(enemy, behind, oldX), false, `${type}: no contact behind the warning`);
        while (enemy.state === 'rush') enemy.update(1 / hz, world);
        assert.ok(Math.abs(enemy.x - plan.to) < 1e-6, `${type}: ends at marked stop ${plan.to}, got ${enemy.x}`);
        const past = { x: plan.to + dir * (ATTACK.rush.sweep + 1), y: plan.y, z: 0 };
        assert.equal(rushHits(enemy, past, enemy.x), false, `${type}: no contact past the far cap`);
        assert.ok(past.x < strip.x || past.x > strip.x + strip.w);
      }
    }
  });
}

test('a long rush frame sweeps an on-path target without tunneling', () => {
  const { world, enemy } = arena('charger', 1, 1100);
  enemy.mode = 'rush'; enemy.facing = -1; enemy.state = 'telegraph'; enemy.timer = .01;
  enemy.planTelegraph(world.bob, world);
  enemy.update(.01, world);
  const before = enemy.x;
  enemy.update(enemy.timer, world);
  const crossed = { x: (before + enemy.x) / 2, y: enemy.y, z: 0 };
  assert.equal(rushHits(enemy, crossed, before), true);
  crossed.z = ATTACK.rush.zMax;
  assert.equal(rushHits(enemy, crossed, before), false, 'jump clearance still applies to swept contact');
});
