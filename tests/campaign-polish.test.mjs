import test from 'node:test';
import assert from 'node:assert/strict';
import { Bob } from '../src/bob.js';
import { Campaign } from '../src/campaign.js';

for (const hz of [30, 60, 120]) test(`knockdown stays protected until Bob can get up at ${hz} Hz`, () => {
  const bob = new Bob();
  assert.equal(bob.takeHit({ charger: true, dir: -1 }), true);
  const hp = bob.hp;
  for (let i = 0; i < hz * 1.2 && bob.busy; i++) {
    bob.update(1 / hz);
    if (bob.busy) assert.equal(bob.takeHit(), false, `helpless ${bob.state} at ${bob.time}s`);
  }
  assert.equal(bob.state, 'idle');
  assert.equal(bob.hp, hp);
  assert.ok(bob.inv > 0, 'the existing getup grace remains');
  bob.update(2);
  assert.equal(bob.takeHit(), true, 'damage resumes once recovery protection ends');
});

for (const stage of [3, 7]) test(`stage ${stage} finisher settles before surviving adds can attack`, () => {
  const world = new Campaign({ stage });
  world.startBoss(3);
  for (const boss of world.enemies) boss.hp = 1;
  world.finisher.update(0, world);
  const add = world.spawnYetti('lecturer', world.bob.x + 50, world.bob.y);
  let attacks = 0;
  add.update = () => { attacks++; world.hurtBob(); };
  world.bob.hp = 1;
  world.papi.charges = 1;
  assert.equal(world.usePapi(), true);
  for (let i = 0; i < 180 && !world.clearTimer; i++) world.update(1 / 60);
  assert.ok(world.clearTimer > 0, 'the completed stampede clears the chapter');
  assert.equal(attacks, 0, 'adds never get a last attack after the finisher');
  assert.equal(world.bob.hp, 1);
  assert.equal(world.bob.alive, true);
  assert.equal(world.finisher.complete, true);
  assert.deepEqual(world.stats.stages, [stage]);
});

test('a finisher leaves the Arch-Yetti dead when the actor is updated again', () => {
  const world = new Campaign({ stage: 7 });
  world.startBoss(3);
  const boss = world.enemies[0];
  boss.hp = 1;
  world.papi.charges = 1;
  assert.equal(world.usePapi(), true);
  for (let i = 0; i < 150; i++) world.update(1 / 60);
  assert.equal(boss.alive, false);
  assert.equal(boss.state, 'dead');
  boss.update(1 / 60, world);
  assert.equal(boss.state, 'dead', 'a defeated judge must not become a living finisher target again');
});

test('chapter clear releases a remaining grab before the ending freezes combat', () => {
  const world = new Campaign({ stage: 7 });
  const bailiff = world.spawnYetti('bailiff', world.bob.x + 50, world.bob.y);
  assert.equal(world.bob.grab(bailiff), true);
  world.finishStage();
  assert.equal(world.bob.state, 'idle');
  assert.equal(world.bob.grabbedBy, null);
  world.update(3);
  assert.equal(world.victory, true);
  assert.equal(world.bob.state, 'idle');
});

test('an early Tribunal finisher request names the Arch-Yetti and keeps the charge', () => {
  const world = new Campaign({ stage: 7 });
  world.startBoss(3);
  world.papi.charges = 1;
  assert.equal(world.usePapi(), false);
  assert.equal(world.papi.charges, 1);
  assert.equal(world.message, 'FLOOR THE ARCH-YETTI FIRST');

  const keep = new Campaign({ stage: 3 });
  keep.startBoss(3);
  keep.papi.charges = 1;
  assert.equal(keep.usePapi(), false);
  assert.equal(keep.message, 'WEAKEN BOTH WINGMEN FIRST');
});
