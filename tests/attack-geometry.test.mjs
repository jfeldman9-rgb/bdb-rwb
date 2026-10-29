import test from 'node:test';
import assert from 'node:assert/strict';
import { ATTACK, attackSpec, warningRect, meleeHits, rushHits, pointInAttack, attackBox } from '../src/attack-geometry.js';
import { Yetti, telegraphPlan, laneY } from '../src/yettis.js';
import { Campaign } from '../src/campaign.js';

function worldAt(bob, extra = {}) {
  const w = new Campaign({ stage: 4 });
  w.bounds = extra.bounds || { l: 400, r: 1680 };
  w.bob.x = bob.x; w.bob.y = bob.y; w.bob.z = bob.z || 0; w.bob.inv = 0;
  return w;
}

test('melee and rush share one spec for warning height and contact halfH', () => {
  assert.equal(ATTACK.melee.halfH, 35);
  assert.equal(ATTACK.melee.reach, 95);
  assert.equal(ATTACK.melee.zMax, 65);
  assert.equal(ATTACK.rush.halfH, 34);
  assert.equal(ATTACK.rush.reach, 70);
  assert.equal(ATTACK.rush.zMax, 70);
});

test('the previously unsafe 30px lane offset is inside both the warning and the hit', () => {
  const w = worldAt({ x: 700, y: laneY(1) });
  const e = new Yetti('walker', 800, laneY(1));
  e.facing = -1; e.rushDir = -1; e.attackY = laneY(1);
  e.planTelegraph(w.bob, w);
  const plan = telegraphPlan(e, w);
  const strip = warningRect(plan, w.bounds);
  const probeY = laneY(1) + 30;
  assert.ok(probeY > strip.y && probeY < strip.y + strip.h, '30px offset sits in the warning slab');
  w.bob.y = probeY; w.bob.x = 740;
  assert.equal(meleeHits(e, w.bob), true);
  assert.equal(pointInAttack(attackBox(e, w), w.bob.x, w.bob.y, w.bob.z), true);
});

test('a forward melee does not hit behind the attacker', () => {
  const w = worldAt({ x: 900, y: laneY(1) });
  const e = new Yetti('lecturer', 800, laneY(1));
  e.facing = -1; e.rushDir = -1; e.attackY = laneY(1);
  e.planTelegraph(w.bob, w);
  const plan = telegraphPlan(e, w);
  const strip = warningRect(plan, w.bounds);
  assert.ok(strip.x + strip.w <= e.x + 1e-6, 'warning stays on the facing side');
  w.bob.x = e.x + 40;
  assert.equal(meleeHits(e, w.bob), false, 'rear seat is safe');
  w.bob.x = e.x - 40;
  assert.equal(meleeHits(e, w.bob), true, 'the marked forward seat still hits');
});

for (const hz of [30, 60, 120]) test(`rush end caps and arena edges match the warning at ${hz} Hz`, () => {
  const bounds = { l: 400, r: 1680 };
  const w = worldAt({ x: 1000, y: laneY(1) }, { bounds });
  const e = new Yetti('charger', 1429, laneY(1));
  e.cooldown = 0;
  w.enemies = [e];
  e.update(1 / hz, w);
  assert.equal(e.state, 'telegraph');
  const plan = telegraphPlan(e, w);
  const strip = warningRect(plan, bounds);
  assert.equal(plan.halfH, ATTACK.rush.halfH);
  assert.equal(strip.h, ATTACK.rush.halfH * 2);
  assert.ok(strip.x >= bounds.l - 1e-6 && strip.x + strip.w <= bounds.r + 1e-6);
  const far = Math.min(plan.from, plan.to);
  const pastCap = far - ATTACK.rush.sweep - 8;
  w.bob.x = pastCap; w.bob.y = plan.y;
  assert.equal(w.bob.x < strip.x, true, 'past the advertised end cap is outside the strip');
  while (e.state === 'telegraph') e.update(1 / hz, w);
  let touched = false;
  const hp = w.bob.hp;
  while (e.state === 'rush') {
    const prev = e.x;
    e.update(1 / hz, w);
    if (rushHits(e, w.bob, prev)) touched = true;
  }
  assert.equal(touched, false, `past-cap probe is not hit at ${hz} Hz`);
  assert.equal(w.bob.hp, hp);

  const w2 = worldAt({ x: 1000, y: laneY(1) }, { bounds });
  const c = new Yetti('charger', 1429, laneY(1));
  c.cooldown = 0; w2.enemies = [c];
  c.update(1 / hz, w2);
  const plan2 = telegraphPlan(c, w2);
  w2.bob.x = plan2.to; w2.bob.y = plan2.y + 30; w2.bob.z = 0;
  const strip2 = warningRect(plan2, bounds);
  assert.ok(w2.bob.y > strip2.y && w2.bob.y < strip2.y + strip2.h);
  while (c.state !== 'recover') c.update(1 / hz, w2);
  assert.ok(w2.bob.hp < w2.bob.maxHp, `30px offset on the path is hit at ${hz} Hz`);
});

test('attackSpec is rush for Salsero, charger, and a telegraphed arena rush', () => {
  assert.equal(attackSpec({ type: 'salsero', mode: null }).kind, 'rush');
  assert.equal(attackSpec({ type: 'charger', mode: null }).kind, 'rush');
  assert.equal(attackSpec({ type: 'bouncer', mode: 'rush' }).kind, 'rush');
  assert.equal(attackSpec({ type: 'walker', mode: null }).kind, 'melee');
  assert.equal(attackSpec({ type: 'lecturer', state: 'telegraph' }).kind, 'melee');
});
