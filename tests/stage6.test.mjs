import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { STAGE3 } from '../src/stage3-def.js';
import { STAGE6 } from '../src/stage6-def.js';
import { STAGE_CHARS, STAGE_VARIANTS, CAGED, maxStage } from '../src/stages.js';
import { TYPES, BOSS_ADDS, Yetti, laneY, laneOf } from '../src/yettis.js';
import { STREAMS, plateKeys, plateRuns } from '../src/zone-stream.js';
import { BARK } from '../src/barks.js';
import { Campaign } from '../src/campaign.js';
import { LINES, PRESENT } from '../src/voice-lines.js';
import { MUSIC } from '../src/audio.js';
import { OPTIONAL_CLIPS, STAGE_CLIPS, clipIdsFor } from '../src/cutscene.js';
import { rollingVoiceStats } from '../src/voice-gate.js';
import { charPageSources } from '../src/assets.js';
import { runVoiceRate } from '../tools/voice-rate.mjs';
import { isBossBragging } from '../src/wingman.js';
import { STORY } from '../src/story.js';
import { POISE } from '../src/yettis.js';

const core = ['walker', 'guard', 'hover', 'charger', 'choir', 'lecturer'];
const asset = path => new URL(`../assets/${path}`, import.meta.url);

function arena(type, x = 800, y = laneY(1)) {
  const world = new Campaign({ stage: 6 });
  world.bob.x = 500; world.bob.y = laneY(1);
  world.voiceAt = [];
  const enemy = new Yetti(type, x, y);
  world.enemies = [enemy];
  return { world, enemy };
}

test('Stage 6 is the current campaign tip with the salt-mine geometry', () => {
  assert.equal(maxStage, 6);
  assert.equal(STAGE6.next, null);
  assert.deepEqual([STAGE6.no, STAGE6.key, STAGE6.title, STAGE6.bg, STAGE6.hpScale, STAGE6.pace],
    [6, 'salt', 'THE SALT MINE AFTERHOURS', 's6-mid5', 2.2, 1.20]);
  const geometry = ({ at, l, r }) => ({ at, l, r });
  assert.deepEqual(STAGE6.zones.map(geometry), STAGE3.zones.map(geometry));
  assert.deepEqual(STAGE6.boss, { at: 6700, l: 6480, r: 7760, type: 'celestina', name: 'LA CELESTINA' });
  assert.ok(CAGED.has(6));
  for (const zone of STAGE6.zones) {
    assert.equal(zone.waves.length, 3);
    assert.ok(new Set(zone.waves.flat().map(entry => entry[0])).size >= 3);
  }
});

test('Stage 6 waves use core roles plus tagger and minero only', () => {
  const entries = STAGE6.zones.flatMap(zone => zone.waves.flat());
  const allowed = [...core, ...STAGE_VARIANTS[6]];
  const mix = Object.fromEntries(allowed.map(type => [type, entries.filter(entry => entry[0] === type).length]));
  assert.deepEqual(mix, { walker: 9, guard: 6, hover: 5, charger: 7, choir: 4, lecturer: 6, tagger: 8, minero: 11 });
  assert.equal(entries.length, 56);
  assert.ok(entries.filter(([, , delay]) => delay > 0).length >= 28);
  assert.ok(entries.filter(([, side]) => side === 'L').length >= 8);
  assert.equal(entries.reduce((hp, [type]) => hp + TYPES[type].hp, 0), 2268);
  assert.deepEqual([...new Set(entries.map(([type]) => type))].sort(), allowed.sort());
  for (const type of BOSS_ADDS.celestina.flat()) assert.ok(allowed.includes(type), type);
});

test('the Minero is a heavy lamp-then-shockwave sweeper', () => {
  assert.equal(TYPES.minero.heavy, true);
  assert.equal(TYPES.minero.hp, 48);
  assert.equal(TYPES.minero.speed, 75);
  assert.deepEqual(TYPES.minero.lamp, { tell: .8 });
  const { world, enemy } = arena('minero', 560);
  world.difficulty = { ...world.difficulty, pace: 1 };
  enemy.cooldown = 0;
  enemy.update(.01, world);
  assert.equal(enemy.state, 'telegraph');
  assert.equal(enemy.timer, .8);
  enemy.update(.79, world);
  assert.equal(world.hostile.length, 0);
  enemy.update(.02, world);
  assert.equal(world.hostile.length, 1);
  assert.equal(world.hostile[0].kind, 'shockwave');
  enemy.poise = 0;
  enemy.takeHit(4, 1, false);
  assert.equal(enemy.poise, POISE.heavy);
});

test('La Celestina blinks to a deterministic seat and refuses Dad and Papi while invuln', () => {
  assert.equal(TYPES.celestina.hp, 1300);
  assert.equal(TYPES.celestina.grab, true);
  const spots = [];
  for (let i = 0; i < 2; i++) {
    const { world, enemy } = arena('celestina', 800, laneY(1));
    world.difficulty = { ...world.difficulty, pace: 1 };
    enemy.id = 42;
    enemy.phase = 1; enemy.state = 'telegraph'; enemy.timer = 0; enemy.volley = 2;
    enemy.attackY = laneY(1); enemy.rushDir = -1;
    enemy.update(.01, world);
    assert.equal(enemy.state, 'blink');
    assert.equal(enemy.canBeHit, false);
    assert.equal(isBossBragging(enemy), true);
    assert.equal(world.hostile[0].kind, 'halo');
    enemy.update(0.4, world);
    spots.push({ x: enemy.x, y: enemy.y, state: enemy.state });
  }
  assert.deepEqual(spots[0], spots[1]);
  assert.ok(Math.abs(spots[0].x - 800) >= 300);
  assert.ok(Math.abs(spots[0].x - 800) <= 500);
  const world = new Campaign({ stage: 6 });
  world.papi.charges = 3;
  const enemy = new Yetti('celestina', 800, laneY(1));
  enemy.state = 'blink'; enemy.timer = 0.4;
  world.enemies = [enemy];
  world.bob.x = 600;
  assert.equal(world.usePapi(), false);
  assert.equal(world.useDad(), false);
});

test('La Celestina phases: ring grab, bridal-train lanes, and the shaft banner', () => {
  const p2 = arena('celestina', 520);
  p2.world.difficulty = { ...p2.world.difficulty, pace: 1 };
  p2.world.bob.x = 500; p2.world.bob.y = laneY(1); p2.enemy.y = laneY(1);
  p2.enemy.phase = 2; p2.enemy.state = 'telegraph'; p2.enemy.timer = 0;
  p2.enemy.attackY = laneY(1); p2.enemy.rushDir = -1;
  p2.enemy.update(.01, p2.world);
  assert.ok(p2.enemy.state === 'hold' || p2.world.hostile.some(p => p.kind === 'halo'));

  const p3 = arena('celestina');
  p3.world.difficulty = { ...p3.world.difficulty, pace: 1 };
  p3.enemy.phase = 3; p3.enemy.state = 'telegraph'; p3.enemy.timer = 0;
  p3.enemy.attackY = laneY(1); p3.enemy.rushDir = -1;
  p3.enemy.update(.01, p3.world);
  const lanes = new Set(p3.world.hostile.filter(p => p.kind === 'halo').map(p => laneOf(p.y)));
  assert.equal(lanes.size, 2);
  assert.ok(p3.enemy.safeBand >= 0 && p3.enemy.safeBand <= 2);
  assert.equal(lanes.has(p3.enemy.safeBand), false);

  assert.equal(STORY.shaft, 'THE YETTIS GRAB CLAUDIA. UP THE SHAFT!');
  const w = new Campaign({ stage: 6 });
  w.finishStage();
  assert.equal(w.message, STORY.finalVictory);
});

test('Stage 6 plates, atlases and caption-only voice are present', () => {
  assert.equal(STREAMS[6].far, 's6-far');
  assert.equal(STREAMS[6].floor, 's6-floor');
  assert.deepEqual(plateRuns(STAGE6).map(run => run.plate), Array.from({ length: 6 }, (_, i) => `s6-mid${i}`));
  for (const key of plateKeys(6)) assert.ok(existsSync(asset(`bg/${key}.webp`)), key);
  const manifest = JSON.parse(readFileSync(asset('bg/MANIFEST.json'), 'utf8'));
  assert.deepEqual(manifest.s6, ['s6-far', ...Array.from({ length: 6 }, (_, i) => `s6-mid${i}`), 's6-floor']);
  assert.deepEqual(STAGE_CHARS[6], [...STAGE_CHARS[1].filter(key => key !== 'interventionist'), 'yetti_tagger', 'yetti_minero', 'celestina', 'claudia']);
  for (const key of STAGE_CHARS[6]) {
    for (const suffix of ['-0.webp', '-0.astc.ktx', '-0.etc2.ktx', '-0.json', '.anims.json']) {
      assert.ok(existsSync(asset(`chars/${key}${suffix}`)), `${key}${suffix}`);
    }
  }
  const lines = {
    nar_ch6: 'Chapter Six. The Salt Mine Afterhours.',
    bob_s6: 'Down we go.',
    celestina_intro: 'Ay, Bob. I found her a nice Yetti husband.',
    claudia_s6: 'I am NOT marrying a Yetti!',
    celestina_phase2: 'Something borrowed… something YOU.',
    celestina_phase3: 'Everyone! To the altar!',
    celestina_defeat: 'Fine! Marry the eggplant man!',
  };
  for (const [id, text] of Object.entries(lines)) {
    assert.equal(LINES[id]?.[1], text);
    if (!existsSync(asset(`audio/voice/${id}.mp3`))) assert.ok(!PRESENT.includes(id), `${id} must stay caption-only`);
  }
  for (const id of ['stage6', 'boss6']) {
    assert.equal(MUSIC[id]?.url, 'assets/audio/bdb-rise.mp3');
    assert.equal(MUSIC[id].stream, true);
  }
});

test('Stage 6 GPU kit stays inside the Stage 4-7 ceiling', () => {
  const report = JSON.parse(readFileSync(asset('chars/_pack_report.json'), 'utf8'));
  const totals = { ASTC: 0, ETC: 0, IMG: 0 };
  for (const key of STAGE_CHARS[6]) {
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
  for (const fmt of ['ASTC', 'ETC']) assert.ok(totals[fmt] <= 13 * 1024 ** 2, `Stage 6 ${fmt}+IMG ${(totals[fmt] / 1024 ** 2).toFixed(3)} MiB`);
  assert.ok(totals.IMG <= 48 * 1024 ** 2, `Stage 6 RGBA ${(totals.IMG / 1024 ** 2).toFixed(3)} MiB`);
});

test('Stage 6 opener and altar lines respect the locked dialogue cap', () => {
  const w = new Campaign({ stage: 6, rng: () => 1 });
  assert.ok(w.events.some(e => e.type === 'cutscene' && e.data === 'stage6'));
  const allStamps = [0];
  const timed = [];
  w.events = [];
  for (let i = 0; i < 9 * 60; i++) {
    w.update(1 / 60);
    for (const e of w.events) {
      if (e.type !== 'voice') continue;
      allStamps.push(w.elapsed);
      if (e.data === 'bob_s6') timed.push([e.data, w.elapsed]);
    }
    w.events = [];
  }
  assert.deepEqual(timed.map(([id]) => id), ['bob_s6']);
  assert.ok(Math.abs(timed[0][1] - 8) < .03, `bob_s6 at ${timed[0][1]}`);
  w.startBoss();
  assert.ok(w.voiceAt.some(v => v.id === 'claudia_s6' && Math.abs(v.at - (w.elapsed + 3.5)) < .03));
  assert.ok(OPTIONAL_CLIPS.has('stage6_intro'));
  assert.deepEqual(STAGE_CLIPS.stage6, ['stage6_intro']);
  assert.deepEqual(clipIdsFor('stage6', () => false), []);
  assert.equal(rollingVoiceStats(allStamps).ok, true);
});

test('BARK and Stage 6 voice-rate stay inside the locked dialogue cap', () => {
  assert.deepEqual(BARK, { whereCd: 60, coryCd: 120, coryChance: .05, yettiCd: 20, tauntChance: .04, gap: 8, cap: 3, window: 60 });
  const report = runVoiceRate({ stage: 6, hz: 60 });
  assert.equal(report.cleared, true);
  assert.ok(report.ambientPerMin <= 4, `ambient ${report.ambientPerMin}/min`);
  assert.ok(report.totalPerMin <= 7, `total ${report.totalPerMin}/min`);
  assert.ok(report.minVoiceGap >= 7.99, `gap ${report.minVoiceGap}`);
  assert.ok(report.maxIn60s <= 3);
  assert.equal(report.rollingOk, true);
});
