import test from 'node:test';
import assert from 'node:assert/strict';
import { Campaign } from '../src/campaign.js';
import { Yetti, laneY } from '../src/yettis.js';
import { ArchYetti } from '../src/archyetti.js';
import { createShot, fireGun, stepShot } from '../src/eggplant.js';

for (const state of ['roar', 'blink', 'floored']) {
  test(`a swept shot clangs once against a ${state} boss without damage`, () => {
    for (const dir of [-1, 1]) {
      const w = new Campaign({ stage: 7 });
      w.bob.x = 600; w.bob.y = laneY(1); w.bob.facing = dir;
      const boss = state === 'floored' ? new ArchYetti(600 + dir * 200, laneY(1)) : new Yetti('celestina', 600 + dir * 200, laneY(1));
      boss.state = state;
      if (state === 'floored') { boss.phase = 3; boss.hp = 1; }
      const hp = boss.hp;
      const behind = new Yetti('walker', boss.x + dir * 80, boss.y);
      const behindHp = behind.hp;
      const shot = createShot(w.bob);
      w.events = [];
      stepShot(shot, .5, [behind, boss], (...args) => w.hit(...args));
      stepShot(shot, .1, [boss], (...args) => w.hit(...args));
      assert.equal(shot.alive, false);
      assert.equal(boss.hp, hp);
      assert.equal(behind.hp, behindHp - shot.damage, 'invulnerability feedback preserves pass-through');
      assert.deepEqual(w.events.filter(e => e.type === 'shield'), [{ type: 'shield', data: { x: boss.x, y: boss.y, chips: 1 } }]);
      assert.equal(w.events.filter(e => e.type === 'hit').length, 1, 'only the vulnerable enemy takes damage');
    }
  });
}

test('point-blank shots also clang and invulnerable bosses still require lane/body overlap', () => {
  const w = new Campaign({ stage: 6 });
  const boss = new Yetti('celestina', w.bob.x + 15, w.bob.y);
  boss.state = 'blink';
  const hp = boss.hp;
  const fired = fireGun({}, .2, true, w.bob, [boss]);
  assert.equal(fired.bonk, boss);
  w.events = [];
  w.hit(fired.bonk, fired.damage, w.bob.facing, true);
  assert.equal(boss.hp, hp);
  assert.equal(w.events.filter(e => e.type === 'shield').length, 1);
  boss.x = w.bob.x + 160;
  for (const [y, z] of [[laneY(0), 0], [w.bob.y, 400]]) {
    boss.y = y; boss.z = z;
    const shot = createShot(w.bob);
    stepShot(shot, .3, [boss], () => assert.fail('off-lane/above-body shot must miss'));
    assert.equal(shot.alive, true);
  }
});

test('a shot overlapping an invulnerable boss for several frames clangs only once', () => {
  const w = new Campaign({ stage: 5 });
  const boss = new Yetti('dj', w.bob.x + 90, w.bob.y);
  boss.state = 'roar';
  const shot = createShot(w.bob);
  w.events = [];
  for (let i = 0; i < 30; i++) stepShot(shot, 1 / 120, [boss], (...args) => w.hit(...args));
  assert.equal(w.events.length, 1);
  assert.equal(w.events[0].type, 'shield');
  assert.equal(w.hitStop, 0);
  assert.equal(boss.hp, boss.maxHp);
  assert.equal(shot.alive, true);
});
