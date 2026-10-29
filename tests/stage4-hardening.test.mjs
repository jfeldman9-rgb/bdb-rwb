import test from 'node:test';
import assert from 'node:assert/strict';
import { Campaign } from '../src/campaign.js';
import { BOSS_ADDS } from '../src/yettis.js';

test('Bouncer gate roar takes priority over a clipboard-break or mash stun', () => {
  for (const hz of [30, 60, 120]) for (const phase of [2, 3]) for (const source of ['clipboard', 'mash']) {
    const w = new Campaign({ stage: 4 });
    w.startBoss(phase - 1);
    const boss = w.enemies[0];
    if (source === 'clipboard') boss.breakShield();
    else {
      assert.ok(w.bob.grab(boss));
      assert.ok(w.bob.mash(6));
      assert.equal(boss.stun, 1.2);
    }
    // A shot reaches the next gate before the half-second shield stun expires.
    const gateHp = Math.floor(boss.maxHp * (phase === 2 ? .66 : .33));
    w.hit(boss, boss.hp - gateHp, -1, false);
    assert.equal(boss.phase, phase);
    assert.equal(boss.state, 'roar');
    assert.equal(boss.stun, 0, 'a stale stun must not cancel the gate roar');
    for (let i = 0; i < hz; i++) boss.update(1 / hz, w);
    assert.equal(boss.state, 'roar', `${hz}Hz gate ${phase} keeps its invulnerable beat`);
    assert.equal(boss.canBeHit, false);
    assert.equal(w.enemies.length, 1);
    for (let i = 0; i < Math.ceil(.12 * hz); i++) boss.update(1 / hz, w);
    assert.equal(boss.state, 'approach');
    assert.deepEqual(w.enemies.slice(1).map(e => e.type), BOSS_ADDS.bouncer[phase - 1]);
  }
});
