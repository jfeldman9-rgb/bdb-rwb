import test from 'node:test';
import assert from 'node:assert/strict';
import { Campaign } from '../src/campaign.js';
import { BOSS_ADDS, laneY, laneOf } from '../src/yettis.js';
import { STAGE5 } from '../src/stage5-def.js';
import { STAGE6 } from '../src/stage6-def.js';
import { STAGE7 } from '../src/stage7-def.js';

for (const kind of ['halo', 'shockwave', 'snowball']) {
  test(`${kind} covers lane edges without hitting the adjacent lane`, () => {
    for (const seam of [(laneY(0) + laneY(1)) / 2, (laneY(1) + laneY(2)) / 2]) {
      for (const offset of [-1, 1]) {
        const world = new Campaign({ stage: 5 });
        world.bob.y = seam + offset;
        const lane = laneOf(world.bob.y);
        world.snowball(world.bob.x - 10, laneY(lane), 1, kind);
        world.update(1 / 60);
        assert.equal(world.stats.hits, 1, `${kind} must reach y=${seam + offset}`);
        assert.equal(world.hostile.length, 0);

        const safe = new Campaign({ stage: 5 });
        safe.bob.y = seam + offset;
        const adjacent = lane + (offset < 0 ? 1 : -1);
        safe.snowball(safe.bob.x - 10, laneY(adjacent), 1, kind);
        safe.update(1 / 60);
        assert.equal(safe.stats.hits, 0, `${kind} must stay in its threatened lane`);
        assert.equal(safe.hostile.length, 1);
      }
    }
  });
}

test('paint splats retain their lane, full-width, one-hit behavior', () => {
  const world = new Campaign({ stage: 5 });
  world.bob.y = (laneY(0) + laneY(1)) / 2 - 1;
  world.snowball(world.bob.x + 39, laneY(0), 1, 'splat');
  world.update(1 / 60);
  assert.equal(world.stats.hits, 1);
  assert.equal(world.hostile[0].hit, true);
  world.bob.inv = 0;
  world.update(1 / 60);
  assert.equal(world.stats.hits, 1);
});

test('Claudia S6 is armed once across deaths, including after her first line is consumed', () => {
  const world = new Campaign({ stage: 6 });
  world.startBoss();
  assert.equal(world.celestinaLinePlayed, true);
  assert.equal(world.voiceAt.filter(v => v.id === 'claudia_s6').length, 1);
  world.respawn();
  assert.equal(world.voiceAt.filter(v => v.id === 'claudia_s6').length, 1);
  world.elapsed = 180;
  world.flushVoice();
  world.elapsed = 240;
  world.flushVoice();
  world.elapsed = 300;
  world.flushVoice();
  assert.equal(world.events.filter(e => e.type === 'voice' && e.data === 'claudia_s6').length, 1);
  assert.equal(world.voiceAt.filter(v => v.id === 'claudia_s6').length, 0);
  world.respawn();
  assert.equal(world.voiceAt.filter(v => v.id === 'claudia_s6').length, 0);
  assert.ok(!world.voiceGate.queue.includes('claudia_s6'));
});

for (const stage of [5, 6, 7]) {
  test(`stage ${stage} later-phase respawns do not request the boss intro again`, () => {
    const world = new Campaign({ stage });
    const offered = [];
    const emit = world.emit.bind(world);
    world.emit = (type, data) => { if (type === 'voice') offered.push(data); emit(type, data); };
    world.startBoss();
    const intro = `${world.def.boss.type}_intro`;
    assert.equal(offered.filter(id => id === intro).length, 1);
    world.checkpoint.phase = 2;
    world.respawn();
    world.checkpoint.phase = 3;
    world.respawn();
    assert.equal(offered.filter(id => id === intro).length, 1);
  });

  test(`stage ${stage} boss adds arrive after a beat on lanes with one dust event each`, () => {
    const world = new Campaign({ stage });
    world.startBoss(3);
    const types = BOSS_ADDS[world.def.boss.type][2];
    world.events = [];
    world.summonAdds(types);
    assert.equal(world.enemies.length, 1, 'summoning must not materialize adds immediately');
    assert.deepEqual(world.pending.map(p => [p.type, p.y, p.t]), types.map((type, i) => [type, laneY(i % 3), .6]));
    world.summonAdds(types);
    assert.equal(world.pending.length, types.length, 'queued adds count toward the existing cap');
    world.tickPending(.59);
    assert.equal(world.enemies.length, 1);
    assert.equal(world.events.filter(e => e.type === 'spawn').length, 0);
    world.tickPending(.02);
    assert.equal(world.pending.length, 0);
    const adds = world.enemies.filter(e => !e.boss);
    assert.deepEqual(adds.map(e => e.type), types);
    assert.deepEqual(adds.map(e => e.y), types.map((_, i) => laneY(i % 3)));
    assert.deepEqual(world.events.filter(e => e.type === 'spawn').map(e => e.data), adds.map(e => ({ x: e.x, y: e.y, type: e.type })));
    world.tickPending(1);
    assert.equal(world.events.filter(e => e.type === 'spawn').length, types.length);
  });
}

test('S7 closes with six enemies and its third arena has distinct rear pressure', () => {
  const finale = STAGE7.zones.at(-1).waves.at(-1);
  assert.equal(finale.length, 6);
  assert.equal(finale.filter(([type]) => type === 'bailiff').length, 2);
  assert.equal(finale.filter(([type]) => type === 'minero').length, 2);
  assert.deepEqual(finale.map(([, , delay]) => delay), [0, .8, 1.6, 2.4, 3.2, 4]);
  assert.ok(STAGE7.zones[2].waves.every(wave => wave[0][1] === 'L'));
  const sides = stage => stage.zones[2].waves.map(wave => wave.map(([, side]) => side));
  assert.notDeepEqual(sides(STAGE7), sides(STAGE5));
  assert.notDeepEqual(sides(STAGE7), sides(STAGE6));
});
