import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { STAGE3 } from '../src/stage3-def.js';
import { STAGE5 } from '../src/stage5-def.js';
import { STAGE_CHARS, STAGE_VARIANTS, maxStage } from '../src/stages.js';
import { TYPES, BOSS_ADDS, RANGED_TYPES, MAX_RANGED_PER_LANE, Yetti, laneY, laneOf, rangedInLane } from '../src/yettis.js';
import { STREAMS, plateKeys, plateRuns } from '../src/zone-stream.js';
import { BARK } from '../src/barks.js';
import { Campaign } from '../src/campaign.js';
import { LINES, PRESENT } from '../src/voice-lines.js';
import { MUSIC } from '../src/audio.js';
import { OPTIONAL_CLIPS, STAGE_CLIPS, clipIdsFor } from '../src/cutscene.js';
import { rollingVoiceStats } from '../src/voice-gate.js';
import { charPageSources } from '../src/assets.js';
import { runVoiceRate } from '../tools/voice-rate.mjs';
import { hostileShape } from '../src/shot-feel.js';

const core = ['walker', 'guard', 'hover', 'charger', 'choir', 'lecturer'];
const asset = path => new URL(`../assets/${path}`, import.meta.url);

function arena(type, x = 800, y = laneY(1)) {
  const world = new Campaign({ stage: 5 });
  world.bob.x = 500; world.bob.y = laneY(1);
  world.voiceAt = [];
  const enemy = new Yetti(type, x, y);
  world.enemies = [enemy];
  return { world, enemy };
}

test('Stage 5 is the current campaign tip with the gondola geometry', () => {
  assert.ok(maxStage >= 5);
  assert.equal(STAGE5.next, 6);
  assert.deepEqual([STAGE5.no, STAGE5.key, STAGE5.title, STAGE5.bg, STAGE5.hpScale, STAGE5.pace],
    [5, 'cable', 'THE GONDOLA OF NO RETURN', 's5-mid5', 2.2, 1.18]);
  const geometry = ({ at, l, r }) => ({ at, l, r });
  assert.deepEqual(STAGE5.zones.map(geometry), STAGE3.zones.map(geometry));
  assert.deepEqual(STAGE5.boss, { at: 6700, l: 6480, r: 7760, type: 'dj', name: 'DJ HALO' });
  for (const zone of STAGE5.zones) {
    assert.equal(zone.waves.length, 3);
    assert.ok(new Set(zone.waves.flat().map(entry => entry[0])).size >= 3);
  }
});

test('Stage 5 waves use core roles plus salsero and tagger only', () => {
  const entries = STAGE5.zones.flatMap(zone => zone.waves.flat());
  const allowed = [...core, ...STAGE_VARIANTS[5]];
  const mix = Object.fromEntries(allowed.map(type => [type, entries.filter(entry => entry[0] === type).length]));
  assert.deepEqual(mix, { walker: 8, guard: 6, hover: 7, charger: 6, choir: 4, lecturer: 6, salsero: 8, tagger: 11 });
  assert.equal(entries.length, 56);
  assert.equal(entries.filter(([, , delay]) => delay > 0).length, 41);
  assert.equal(entries.filter(([, side]) => side === 'L').length, 19);
  // Plan brief was 2088 at Salsero 30; Level 4 locked Salsero at 24, so the pool is 2040.
  assert.equal(entries.reduce((hp, [type]) => hp + TYPES[type].hp, 0), 2040);
  assert.deepEqual([...new Set(entries.map(([type]) => type))].sort(), allowed.sort());
  for (const type of BOSS_ADDS.dj.flat()) assert.ok(allowed.includes(type), type);
});

test('the splat hazard hurts a grounded Bob once, a jump clears it, and it expires at ttl', () => {
  const world = new Campaign({ stage: 5 });
  world.bob.x = 600; world.bob.y = laneY(1); world.bob.z = 0;
  world.locked = true;
  world.snowball(600, laneY(1), 0, 'splat', { ttl: 1.4, w: 80 });
  const p = world.hostile[0];
  assert.equal(p.kind, 'splat');
  assert.equal(p.speed, 0);
  assert.deepEqual(hostileShape('splat'), { shape: 'splat', color: 0xff3cad });
  const grounded = z => Math.abs(world.bob.x - p.x) <= (p.w || 80) / 2 && laneOf(world.bob.y) === laneOf(p.y) && z < 65;
  assert.equal(grounded(0), true);
  assert.equal(grounded(65), false, 'a jump clears the puddle');
  const hp = world.bob.hp;
  world.update(1 / 60, {});
  assert.ok(world.bob.hp < hp, 'standing in the puddle hurts');
  assert.equal(p.hit, true);
  const after = world.bob.hp;
  world.bob.inv = 0;
  world.update(1 / 60, {});
  assert.equal(world.bob.hp, after, 'the puddle only hurts once');
  p.ttl = 0.01;
  world.update(1 / 30, {});
  assert.equal(world.hostile.includes(p), false);
});

test('the tagger is a ranged body and counts toward the two-per-lane cap', () => {
  assert.equal(RANGED_TYPES.has('tagger'), true);
  assert.equal(TYPES.tagger.ranged, true);
  const world = new Campaign({ stage: 5 });
  const a = new Yetti('tagger', 700, laneY(1));
  const b = new Yetti('hover', 760, laneY(1));
  const c = new Yetti('tagger', 820, laneY(1));
  world.enemies = [a, b, c];
  assert.equal(rangedInLane(world.enemies, 1), 3);
  world.spawnYetti('tagger', 900, laneY(1));
  assert.ok(rangedInLane(world.enemies, laneOf(world.enemies.at(-1).y)) <= MAX_RANGED_PER_LANE);
});

test('Tagger shakes for .65/pace then drops a splat on Bob\'s marked X', () => {
  const { world, enemy } = arena('tagger', 700);
  world.difficulty = { ...world.difficulty, pace: 1 };
  enemy.cooldown = 0;
  enemy.update(.01, world);
  assert.equal(enemy.state, 'telegraph');
  assert.equal(enemy.timer, .65);
  enemy.update(.64, world);
  assert.equal(world.hostile.length, 0);
  enemy.update(.02, world);
  assert.equal(world.hostile.length, 1);
  assert.equal(world.hostile[0].kind, 'splat');
  assert.equal(world.hostile[0].x, world.bob.x);
  assert.equal(laneOf(world.hostile[0].y), laneOf(world.bob.y));
});

test('DJ Halo keeps the Choirmaster choir branch unused and plays its own phases', () => {
  assert.equal(TYPES.dj.ranged, true);
  assert.equal(TYPES.dj.hp, 1200);
  assert.equal(TYPES.choirmaster.hp, 1140);
  for (const phase of [1, 2, 3]) {
    const { world, enemy } = arena('dj');
    world.difficulty = { ...world.difficulty, pace: 1 };
    enemy.phase = phase; enemy.state = 'telegraph'; enemy.timer = 0;
    enemy.attackY = laneY(1); enemy.rushDir = -1;
    enemy.update(.01, world);
    if (phase === 1) {
      assert.equal(enemy.state, 'slam');
      assert.deepEqual(world.hostile.map(p => [p.kind, p.dir]), [['shockwave', -1], ['shockwave', 1]]);
    } else if (phase === 2) {
      assert.equal(world.hostile.length, 2);
      assert.ok(world.hostile.every(p => p.kind === 'halo'));
      const lanes = new Set(world.hostile.map(p => laneOf(p.y)));
      assert.equal(lanes.size, 2);
      assert.ok(lanes.has(1));
    } else {
      assert.equal(enemy.state, 'drop');
      assert.match(world.message, /WAIT FOR IT/);
      enemy.update(1.2, world);
      assert.ok(world.hostile.filter(p => p.kind === 'shockwave').length >= 6);
      enemy.update(0.25, world);
      enemy.update(0.25, world);
      assert.equal(enemy.state, 'recover');
    }
  }
});

test('Stage 5 plates, atlases and caption-only voice are present', () => {
  assert.equal(STREAMS[5].far, 's5-far');
  assert.equal(STREAMS[5].floor, 's5-floor');
  assert.deepEqual(plateRuns(STAGE5).map(run => run.plate), Array.from({ length: 6 }, (_, i) => `s5-mid${i}`));
  for (const key of plateKeys(5)) assert.ok(existsSync(asset(`bg/${key}.webp`)), key);
  const manifest = JSON.parse(readFileSync(asset('bg/MANIFEST.json'), 'utf8'));
  assert.deepEqual(manifest.s5, ['s5-far', ...Array.from({ length: 6 }, (_, i) => `s5-mid${i}`), 's5-floor']);
  const sizes = spawnSync('python3', ['-c', `
from PIL import Image
import json
print(json.dumps({stage: {
  'far': Image.open(f'assets/bg/s{stage}-far.webp').size,
  'floor': Image.open(f'assets/bg/s{stage}-floor.webp').size,
  'mids': [Image.open(f'assets/bg/s{stage}-mid{i}.webp').size for i in range(6)],
} for stage in (3, 5, 6, 7)}))
`], { encoding: 'utf8' });
  assert.equal(sizes.status, 0, sizes.stderr);
  const plate = JSON.parse(sizes.stdout);
  assert.deepEqual(plate[3], { far: [1600, 720], floor: [1280, 220], mids: Array(6).fill([1280, 720]) });
  for (const stage of [5, 6, 7]) assert.deepEqual(plate[stage], plate[3], `s${stage} plate sizes`);
  assert.deepEqual(STAGE_CHARS[5], [...STAGE_CHARS[1].filter(key => key !== 'interventionist'), 'yetti_salsero', 'yetti_tagger', 'dj']);
  for (const key of STAGE_CHARS[5]) {
    for (const suffix of ['-0.webp', '-0.astc.ktx', '-0.etc2.ktx', '-0.json', '.anims.json']) {
      assert.ok(existsSync(asset(`chars/${key}${suffix}`)), `${key}${suffix}`);
    }
  }
  const lines = {
    nar_ch5: 'Chapter Five. The Gondola of No Return.',
    claudia_s5: 'Bob! Up here! The cable car!',
    bob_s5: 'Going up, Yettis!',
    dj_intro: 'Hands up for heaven! Not you, Bob.',
    dj_phase2: 'Let me scratch that.',
    dj_phase3: 'Wait for it… the DROP!',
    dj_defeat: 'Mic… dropped.',
  };
  for (const [id, text] of Object.entries(lines)) {
    assert.equal(LINES[id]?.[1], text);
    if (!existsSync(asset(`audio/voice/${id}.mp3`))) assert.ok(!PRESENT.includes(id), `${id} must stay caption-only`);
  }
  assert.equal(MUSIC.stage5?.url, 'assets/audio/s5-gondola.mp3');
  assert.equal(MUSIC.boss5?.url, 'assets/audio/s5-boss.mp3');
  for (const id of ['stage5', 'boss5']) {
    assert.equal(MUSIC[id].stream, true);
    assert.ok(existsSync(asset(MUSIC[id].url.replace(/^assets\//, ''))));
  }
});

test('Stage 5 GPU kit stays inside the Stage 4-7 ceiling', () => {
  const report = JSON.parse(readFileSync(asset('chars/_pack_report.json'), 'utf8'));
  const totals = { ASTC: 0, ETC: 0, IMG: 0 };
  for (const key of STAGE_CHARS[5]) {
    const meta = JSON.parse(readFileSync(asset(`chars/${key}.anims.json`), 'utf8'));
    for (const page of meta.pages) {
      const bytes = report.compressed.pages[page];
      assert.ok(bytes, `missing GPU report page ${page}`);
      const sources = charPageSources(meta, page);
      if (key === 'papi_stampede') assert.deepEqual(Object.keys(sources), ['IMG']);
      for (const supported of Object.keys(totals)) {
        const selected = supported in sources ? supported : 'IMG';
        totals[supported] += selected === 'IMG' ? bytes.rgba : selected === 'ASTC' ? bytes.astc_gpu : bytes.etc2_gpu;
      }
    }
  }
  for (const fmt of ['ASTC', 'ETC']) assert.ok(totals[fmt] <= 13 * 1024 ** 2, `Stage 5 ${fmt}+IMG ${(totals[fmt] / 1024 ** 2).toFixed(3)} MiB`);
  assert.ok(totals.IMG <= 48 * 1024 ** 2, `Stage 5 RGBA ${(totals.IMG / 1024 ** 2).toFixed(3)} MiB`);
});

test('Stage 5 opener lines fire at 8 and 16 seconds and fit the rolling window', () => {
  const w = new Campaign({ stage: 5, rng: () => 1 });
  assert.ok(w.events.some(e => e.type === 'cutscene' && e.data === 'stage5'));
  assert.ok(!w.events.some(e => e.type === 'cutscene' && e.data === 'kidnap'));
  const allStamps = [0];
  const timed = [];
  w.events = [];
  for (let i = 0; i < 17 * 60; i++) {
    w.update(1 / 60);
    for (const e of w.events) {
      if (e.type !== 'voice') continue;
      allStamps.push(w.elapsed);
      if (['claudia_s5', 'bob_s5'].includes(e.data)) timed.push([e.data, w.elapsed]);
    }
    w.events = [];
  }
  assert.deepEqual(timed.map(([id]) => id), ['claudia_s5', 'bob_s5']);
  assert.ok(Math.abs(timed[0][1] - 8) < .03, `claudia_s5 at ${timed[0][1]}`);
  assert.ok(Math.abs(timed[1][1] - 16) < .03, `bob_s5 at ${timed[1][1]}`);
  assert.equal(rollingVoiceStats(allStamps).ok, true);
});

test('missing Stage 5–7 intro clips are optional and resolve to an empty play list', () => {
  assert.deepEqual(STAGE_CLIPS.stage5, ['stage5_intro']);
  assert.ok(OPTIONAL_CLIPS.has('stage5_intro'));
  assert.deepEqual(clipIdsFor('stage5', () => false), []);
  assert.deepEqual(clipIdsFor('stage1', () => false), ['stage1_intro']);
});

test('BARK and Stage 5 voice-rate stay inside the locked dialogue cap', () => {
  assert.deepEqual(BARK, { whereCd: 60, coryCd: 120, coryChance: .05, idleCd: 45, idleChance: .06, yettiCd: 20, tauntChance: .04, gap: 8, cap: 3, window: 60 });
  const report = runVoiceRate({ stage: 5, hz: 60 });
  assert.equal(report.cleared, true);
  assert.ok(report.ambientPerMin <= 4, `ambient ${report.ambientPerMin}/min`);
  assert.ok(report.totalPerMin <= 7, `total ${report.totalPerMin}/min`);
  assert.ok(report.minVoiceGap >= 7.99, `gap ${report.minVoiceGap}`);
  assert.ok(report.maxIn60s <= 3);
  assert.equal(report.rollingOk, true);
});
