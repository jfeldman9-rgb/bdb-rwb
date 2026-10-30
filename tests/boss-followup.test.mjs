import test from 'node:test';
import assert from 'node:assert/strict';
import { Campaign, snowClearZ } from '../src/campaign.js';
import { ArchYetti } from '../src/archyetti.js';
import { Yetti, TYPES, choirMultiplier, laneY } from '../src/yettis.js';

function playDrop(hz, { jump = true, lane = 1, dir = -1 } = {}) {
  const world = new Campaign({ stage: 5, rng: () => 1 });
  world.startBoss(3);
  const dj = world.enemies[0];
  world.bob.x = dj.x + dir * 120;
  world.bob.y = dj.y = laneY(lane);
  dj.cooldown = 0;
  const origin = world.bob.x, dt = 1 / hz, waves = [];
  let jumped = false, peak = 0, maxInv = 0, completed = false;
  const snowball = world.snowball.bind(world);
  world.snowball = (...args) => {
    snowball(...args);
    waves.push(world.hostile.at(-1));
  };
  for (let i = 0; i < hz * 8; i++) {
    // Wait through the visible countdown, then jump as the drop releases.
    // At 120px, the first wave reaches Bob after he clears snowClearZ.
    const pressJump = jump && !jumped && dj.state === 'drop' && dj.timer <= dt;
    if (pressJump) jumped = true;
    world.update(dt, { jump: pressJump });
    peak = Math.max(peak, world.bob.z);
    maxInv = Math.max(maxInv, world.bob.inv);
    if (dj.dropPulses === 3) {
      // Isolate one complete attack; no second drop while its waves exit.
      dj.cooldown = 99;
      if (!world.hostile.length && world.bob.z === 0) { completed = true; break; }
    }
  }
  assert.equal(completed, true, 'all three pulses have crossed Bob and left the arena');
  assert.equal(waves.length, 18, 'three pulses still fire six shockwaves each');
  const incoming = waves.filter(p => p.dir === dir && p.y === laneY(lane));
  assert.equal(incoming.length, 3);
  assert.equal(world.stats.shots, 0, 'the test does not kill or interrupt the DJ');
  return { world, jumped, peak, maxInv, origin, dt, incoming };
}

for (const hz of [30, 60, 120]) {
  test(`one timed jump clears the full three-pulse DJ drop at ${hz} Hz`, () => {
    for (const lane of [0, 1, 2]) for (const dir of [-1, 1]) {
      const { world, jumped, peak, maxInv, origin, dt, incoming } = playDrop(hz, { lane, dir });
      assert.equal(jumped, true);
      assert.ok(peak > snowClearZ('adventure', dt), 'real Bob jump physics cleared the hazard');
      assert.equal(world.stats.hits, 0, `lane ${lane}, direction ${dir}`);
      assert.ok(incoming.every(p => (p.x - origin) * dir > 30), 'every incoming pulse swept across Bob');
      assert.equal(world.bob.hp, world.bob.maxHp);
      assert.equal(maxInv, 0, 'no dash or damage i-frames mask a pulse');
      assert.equal(world.bob.x, origin, 'Bob only jumps; he does not retreat past the attack');
    }
    assert.ok(playDrop(hz, { jump: false }).world.stats.hits > 0, 'grounded control is actually hit');
  });
}

test('DJ follows Bob between lanes even when adds occupy the destination; the Choirmaster stays still', () => {
  for (const type of ['dj', 'choirmaster']) {
    const world = new Campaign({ stage: 5 });
    const boss = new Yetti(type, 800, laneY(2));
    world.bob.x = 470; world.bob.y = laneY(0);
    boss.cooldown = 99;
    const adds = [new Yetti('guard', 700, laneY(0)), new Yetti('hover', 900, laneY(0))];
    world.enemies = [boss, ...adds];
    for (let i = 0; i < 4 * 60; i++) boss.update(1 / 60, world);
    assert.equal(boss.y, laneY(type === 'dj' ? 0 : 2));
    assert.equal(boss._laneGoal, undefined, 'adds cannot assign a boss a spreading lane');
  }
  assert.equal(TYPES.choirmaster.hp, 1140);
  const choir = new Yetti('choirmaster', 800, laneY(1));
  const dj = new Yetti('dj', 900, laneY(1));
  assert.equal(choirMultiplier(dj, [dj, choir]), 1.28);
});

const bossOf = type => type === 'archyetti' ? new ArchYetti(800, laneY(1)) : new Yetti(type, 800, laneY(1));

test('accepted S5–S7 boss hits flash and idle hits flinch without cancelling attacks', () => {
  for (const type of ['dj', 'celestina', 'archyetti']) {
    for (const state of ['approach', 'wait', 'telegraph', 'rush', 'slam', 'recover', 'hold', 'drop']) {
      const boss = bossOf(type);
      boss.state = state; boss.timer = .5;
      assert.equal(boss.takeHit(12, -1).accepted, true);
      assert.equal(boss.flashT, .08, `${type} ${state}`);
      assert.equal(boss.hurtT, state === 'approach' || state === 'wait' ? .14 : 0);
      assert.equal(boss.state, state, 'a cosmetic hit cannot replace combat state');
      assert.equal(boss.timer, .5);
      assert.equal(boss.stun, 0);
    }
    const world = new Campaign({ stage: 5 });
    const boss = bossOf(type);
    world.enemies = [boss];
    boss.cooldown = 99;
    boss.takeHit(12, -1);
    boss.update(.04, world);
    assert.ok(Math.abs(boss.flashT - .04) < 1e-9);
    assert.ok(Math.abs(boss.hurtT - .10) < 1e-9);
    boss.update(.10, world);
    assert.equal(boss.flashT, 0);
    assert.ok(boss.hurtT < 1e-9);
  }
});

test('rejected boss hits do not flash and lethal, gate, and Tribunal floor flashes expire', () => {
  const world = new Campaign({ stage: 7 });
  for (const type of ['dj', 'celestina', 'archyetti']) {
    const boss = bossOf(type);
    boss.state = 'roar';
    assert.equal(boss.takeHit(12, -1).accepted, false);
    assert.equal(boss.flashT, 0);
    boss.state = 'approach';
    assert.equal(boss.takeHit(boss.maxHp * .35, -1).phase, 2);
    assert.equal(boss.flashT, .08);
    boss.update(.10, world);
    assert.equal(boss.flashT, 0);
    assert.equal(boss.state, 'roar');
  }
  const shield = new Yetti('bouncer', 800, laneY(1));
  assert.equal(shield.takeHit(12, 1).blocked, true);
  assert.equal(shield.flashT, 0);
  const dj = bossOf('dj');
  dj.takeHit(dj.maxHp, -1);
  assert.equal(dj.flashT, .08);
  dj.update(.15, world);
  assert.equal(dj.flashT, 0);
  assert.equal(dj.hurtT, 0);
  const judge = bossOf('archyetti');
  judge.phase = 3; judge.hp = 12;
  judge.takeHit(12, -1);
  assert.equal(judge.state, 'floored');
  assert.equal(judge.flashT, .08);
  judge.update(.15, world);
  assert.equal(judge.flashT, 0);
  assert.equal(judge.hurtT, 0);
  assert.equal(judge.canBeHit, false);
});

test('Bailiff grabs Bob without spending a Lecturer voice cue', () => {
  const world = new Campaign({ stage: 7 });
  const bailiff = new Yetti('bailiff', 800, laneY(1));
  world.bob.x = 740; world.bob.y = laneY(1);
  world.enemies = [bailiff];
  bailiff.cooldown = 0;
  const emitted = [];
  world.emit = (...args) => emitted.push(args);
  bailiff.update(.01, world);
  assert.equal(bailiff.state, 'telegraph');
  bailiff.update(bailiff.timer + .01, world);
  assert.equal(world.bob.grabbedBy, bailiff);
  assert.equal(bailiff.state, 'hold');
  assert.ok(!emitted.some(([type]) => type === 'voice'));
});
