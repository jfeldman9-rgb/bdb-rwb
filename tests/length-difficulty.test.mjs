import test from 'node:test';
import assert from 'node:assert/strict';
import { STAGES } from '../src/stages.js';
import { TYPES } from '../src/yettis.js';
import { WORLD_W } from '../src/config.js';
import { Campaign } from '../src/campaign.js';

const entry = (e) => (typeof e === 'string' ? [e, 'R', 0] : e);
const minions = Object.keys(TYPES).filter((k) => !TYPES[k].boss);

test('every stage runs 5+ RWB-sized fight zones in order, then a boss arena at the world end', () => {
  for (const def of Object.values(STAGES)) {
    assert.ok(def.zones.length >= 5, `stage ${def.no}: ${def.zones.length} zones`);
    let prevR = 0;
    for (const z of [...def.zones, def.boss]) {
      assert.equal(z.r - z.l, 1280, `stage ${def.no} arena width`);
      assert.ok(z.l >= prevR && z.at > z.l && z.at < z.r, `stage ${def.no} zone at ${z.at}`);
      prevR = z.r;
    }
    assert.equal(def.boss.r, WORLD_W);
    assert.ok(WORLD_W >= 7700);
  }
});

test('waves are RWB-style staggered [type, side, delay] lists with a real mix of Yettis', () => {
  for (const def of Object.values(STAGES)) {
    const stageTypes = new Set();
    let count = 0, hp = 0, staggered = 0, flank = 0;
    for (const [i, z] of def.zones.entries()) {
      assert.ok(z.waves.length >= 2, `stage ${def.no} zone ${i + 1} needs 2+ waves`);
      const zoneTypes = new Set();
      for (const wave of z.waves) for (const e of wave.map(entry)) {
        const [type, side, delay] = e;
        assert.ok(minions.includes(type), type);
        assert.ok(side === 'L' || side === 'R');
        assert.ok(delay >= 0 && delay < 6);
        zoneTypes.add(type); stageTypes.add(type);
        count++; hp += TYPES[type].hp * (def.hpScale ?? 1);
        if (delay > 0) staggered++;
        if (side === 'L') flank++;
      }
      // The opening teaching zone is walkers + the first guard; every later zone mixes 3+ roles.
      if (!(def.no === 1 && i === 0)) assert.ok(zoneTypes.size >= 3, `stage ${def.no} zone ${i + 1}: ${[...zoneTypes]}`);
    }
    assert.equal(stageTypes.size, minions.length, `stage ${def.no} uses every Yetti role`);
    assert.ok(count >= 45, `stage ${def.no}: ${count} wave Yettis`);
    assert.ok(hp >= 2 * 492, `stage ${def.no}: wave HP pool ${hp} (RWB S1 492)`);
    assert.ok(staggered >= count / 2 && flank >= 8, `stage ${def.no} staggered ${staggered} flank ${flank}`);
  }
});

test('staggered stragglers walk in on their delay and hold the wave open', () => {
  const w = new Campaign({ stage: 2 });
  w.bob.x = 300; w.enterZone();
  const first = w.enemies.length, pending = w.pending.length;
  assert.ok(first >= 1 && pending >= 1);
  for (const e of w.enemies) e.cooldown = 99;
  w.update(.9, {});
  assert.equal(w.enemies.length + w.pending.length, first + pending);
  assert.ok(w.enemies.length > first, 'a delayed Yetti arrived');
  for (const e of w.enemies) { e.alive = false; e.hp = 0; }
  if (w.pending.length) { w.update(1 / 60, {}); assert.equal(w.waveIndex, 0, 'pending Yettis keep the wave open'); }
  assert.ok(w.enemies.every((e) => e.maxHp === Math.round(TYPES[e.type].hp * 2.2)), 'stage hpScale applies');
});

test('later chapters push Yetti pace on top of the chosen difficulty', () => {
  assert.equal(new Campaign({ stage: 1 }).difficulty.pace, 1);
  assert.ok(new Campaign({ stage: 3 }).difficulty.pace > new Campaign({ stage: 2 }).difficulty.pace);
  const c = new Campaign(); c.loadStage(3); assert.ok(c.difficulty.pace > 1);
});

test('dying keeps progress: zones resume at the wave reached; a mini-boss keeps its damage', () => {
  const w = new Campaign();
  w.zoneIndex = 3; w.checkpoint = { zone: 3, x: 3700, phase: 1 }; w.bob.x = w.def.zones[3].at; w.enterZone();
  for (const e of w.enemies) { e.alive = false; e.hp = 0; } w.pending = []; w.update(1 / 60, {});
  assert.equal(w.waveIndex, 1); assert.equal(w.checkpoint.wave, 1);
  w.bob.hp = 1; w.hurtBob(true); for (let i = 0; i < 90 && !w.stats.deaths; i++) w.update(1 / 60, {});
  assert.equal(w.stats.deaths, 1); assert.equal(w.waveIndex, 1); assert.equal(w.locked, false);
  for (let i = 0; i < 600 && !w.locked; i++) w.update(1 / 60, { x: 1 });
  assert.equal(w.waveIndex, 1, 'resumed on wave 2, not wave 1');

  const b = new Campaign(); b.startBoss(3);
  const boss = b.enemies[0]; boss.hp = 40;
  b.bob.hp = 1; b.hurtBob(true); for (let i = 0; i < 90 && !b.stats.deaths; i++) b.update(1 / 60, {});
  const again = b.enemies.find((e) => e.boss);
  assert.equal(again.phase, 3); assert.equal(again.hp, 40);
});

test('HUD does not hard-code three zones', async () => {
  const src = await import('node:fs').then((fs) => fs.readFileSync(new URL('../src/hud.js', import.meta.url), 'utf8'));
  assert.ok(!src.includes('/3`'), 'HUD must not hard-code three zones');
});
test('late zones stagger spawns; zone clears heal half on Nightmare, full on Story and Adventure',()=>{
  const late=new Campaign({stage:1});late.zoneIndex=3;late.waveIndex=0;late.spawnWave();
  // Wave delays [0, .6, 1.8] land off-beat in zone 4: [.7, 2.0], first spawns at once.
  assert.deepEqual(late.pending.map(p=>+p.t.toFixed(2)),[.7,2.0]);
  const early=new Campaign({stage:1});early.zoneIndex=1;early.waveIndex=0;early.spawnWave();
  assert.deepEqual(early.pending.map(p=>+p.t.toFixed(2)),[1,2.4]);
  const adv=new Campaign({difficulty:'adventure'});adv.bob.hp=1;adv.healZoneClear();assert.equal(adv.bob.hp,adv.bob.maxHp,'adventure keeps the full clear heal so the bot band holds');
  const nm=new Campaign({difficulty:'nightmare'});nm.bob.hp=1;nm.healZoneClear();assert.equal(nm.bob.hp,2);
  const story=new Campaign({difficulty:'story'});story.bob.hp=1;story.healZoneClear();assert.equal(story.bob.hp,story.bob.maxHp);
});
