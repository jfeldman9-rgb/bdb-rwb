import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { STAGE3 } from '../src/stage3-def.js';
import { STAGE7 } from '../src/stage7-def.js';
import { STAGE_CHARS, STAGE_VARIANTS, CAGED, maxStage } from '../src/stages.js';
import { TYPES, BOSS_ADDS, Yetti, laneY, laneOf, POISE } from '../src/yettis.js';
import { STREAMS, plateKeys, plateRuns } from '../src/zone-stream.js';
import { BARK } from '../src/barks.js';
import { Campaign } from '../src/campaign.js';
import { LINES, PRESENT } from '../src/voice-lines.js';
import { MUSIC } from '../src/audio.js';
import { OPTIONAL_CLIPS, STAGE_CLIPS, clipIdsFor } from '../src/cutscene.js';
import { isEndingVoice, rollingVoiceStats } from '../src/voice-gate.js';
import { charPageSources } from '../src/assets.js';
import { runVoiceRate } from '../tools/voice-rate.mjs';
import { ArchYetti, TribunalCourt } from '../src/archyetti.js';
import { applyBossDamage, isBossFinisherReady } from '../src/wingman.js';
import { callEffect } from '../src/dad-call.js';
import { STORY } from '../src/story.js';
import { papacitoEffect } from '../src/papacito.js';

const core = ['walker', 'guard', 'hover', 'charger', 'choir', 'lecturer'];
const asset = path => new URL(`../assets/${path}`, import.meta.url);

function arena(type, x = 800, y = laneY(1)) {
  const world = new Campaign({ stage: 7 });
  world.bob.x = 500; world.bob.y = laneY(1);
  world.voiceAt = [];
  const enemy = type === 'archyetti' ? new ArchYetti(x, y) : new Yetti(type, x, y);
  world.enemies = [enemy];
  return { world, enemy };
}

test('Stage 7 is the campaign finale with the tribunal geometry', () => {
  assert.equal(maxStage, 7);
  assert.equal(STAGE7.next, null);
  assert.deepEqual([STAGE7.no, STAGE7.key, STAGE7.title, STAGE7.bg, STAGE7.hpScale, STAGE7.pace],
    [7, 'tribunal', 'THE PAPACITO TRIBUNAL', 's7-mid5', 2.2, 1.22]);
  const geometry = ({ at, l, r }) => ({ at, l, r });
  assert.deepEqual(STAGE7.zones.map(geometry), STAGE3.zones.map(geometry));
  assert.deepEqual(STAGE7.boss, { at: 6700, l: 6480, r: 7760, type: 'archyetti', name: 'THE ARCH-YETTI' });
  assert.ok(CAGED.has(7));
  for (const zone of STAGE7.zones) {
    assert.equal(zone.waves.length, 3);
    assert.ok(new Set(zone.waves.flat().map(entry => entry[0])).size >= 3);
  }
});

test('Stage 7 waves use core roles plus minero and bailiff only', () => {
  const entries = STAGE7.zones.flatMap(zone => zone.waves.flat());
  const allowed = [...core, ...STAGE_VARIANTS[7]];
  const mix = Object.fromEntries(allowed.map(type => [type, entries.filter(entry => entry[0] === type).length]));
  assert.deepEqual(mix, { walker: 7, guard: 6, hover: 5, charger: 5, choir: 4, lecturer: 6, minero: 10, bailiff: 12 });
  assert.equal(entries.length, 55);
  assert.ok(entries.filter(([, , delay]) => delay > 0).length >= 28);
  assert.ok(entries.filter(([, side]) => side === 'L').length >= 8);
  assert.equal(entries.reduce((hp, [type]) => hp + TYPES[type].hp, 0), 2436);
  assert.deepEqual([...new Set(entries.map(([type]) => type))].sort(), allowed.sort());
  for (const type of BOSS_ADDS.archyetti.flat()) assert.ok(allowed.includes(type), type);
});

test('the Bailiff is a heavy shield-and-grab tank', () => {
  assert.equal(TYPES.bailiff.shield, true);
  assert.equal(TYPES.bailiff.heavy, true);
  assert.equal(TYPES.bailiff.grab, true);
  assert.equal(TYPES.bailiff.hp, 54);
  const { enemy } = arena('bailiff', 560);
  enemy.facing = 1;
  const blocked = enemy.takeHit(8, -1, false);
  assert.equal(blocked.blocked, true);
  enemy.poise = 0;
  enemy.shield = false;
  enemy.takeHit(4, 1, false);
  assert.equal(enemy.poise, POISE.heavy);
});

test('the Arch-Yetti floors at 1 HP and only the Papacito finisher ends the fight', () => {
  assert.equal(TYPES.archyetti.hp, 1320);
  const { world, enemy } = arena('archyetti');
  world.court = new TribunalCourt();
  world.court.boss = enemy;
  enemy.phase = 3;
  enemy.hp = 40;
  const hit = enemy.takeHit(200, 1);
  assert.equal(hit.accepted, true);
  assert.equal(enemy.hp, 1);
  assert.equal(enemy.alive, true);
  assert.equal(enemy.canBeHit, false);
  assert.equal(enemy.state, 'floored');
  assert.equal(isBossFinisherReady(3, [enemy]), true);
  assert.equal(world.finisher, world.court);
  world.court.update(0, world);
  assert.equal(world.court.ready, true);
  assert.match(world.message, /PAPACITO FINISHER READY|ARCH-YETTI|TRIBUNAL/);
  const dad = callEffect(enemy);
  assert.equal(dad, null);
  assert.equal(enemy.hp, 1);
  world.papi.charges = 1;
  const result = papacitoEffect(world.papi, world.enemies, { phase: 3, camX: world.camX });
  assert.equal(result.allowed, true);
  assert.equal(result.finisher, true);
  assert.equal(enemy.alive, false);
  world.court.update(0, world);
  assert.equal(world.court.complete, true);
});

test('a softlock trio drops after 8 s with no Papacito charge', () => {
  const { world, enemy } = arena('archyetti');
  world.court = new TribunalCourt();
  world.court.boss = enemy;
  enemy.phase = 3; enemy.hp = 1; enemy.state = 'floored';
  world.papi.charges = 0;
  world.pickups = [];
  world.court.update(7.9, world);
  assert.equal(world.pickups.length, 0);
  world.court.update(0.2, world);
  assert.equal(world.pickups.filter(p => p.kind === 'shake').length, 3);
});

test('Dad cannot kill the Arch-Yetti in phase III', () => {
  const enemy = new ArchYetti(800, laneY(1));
  enemy.phase = 3;
  enemy.hp = 20;
  const result = callEffect(enemy);
  assert.ok(result);
  assert.equal(result.killed, false);
  assert.equal(enemy.alive, true);
  assert.ok(enemy.hp >= 1);
  enemy.hp = 1; enemy.state = 'floored';
  assert.equal(callEffect(enemy), null);
});

test('Arch-Yetti P1 slams both ways and P2 paints a safe lane', () => {
  for (const phase of [1, 2, 3]) {
    const { world, enemy } = arena('archyetti');
    world.difficulty = { ...world.difficulty, pace: 1 };
    enemy.phase = phase; enemy.state = 'telegraph'; enemy.timer = 0;
    enemy.attackY = laneY(1); enemy.rushDir = -1;
    enemy.update(.01, world);
    if (phase === 1) {
      assert.deepEqual(world.hostile.map(p => p.kind).sort(), ['shockwave', 'shockwave']);
    } else {
      const lanes = new Set(world.hostile.filter(p => p.kind === 'halo').map(p => laneOf(p.y)));
      assert.equal(lanes.size, 2);
      assert.ok(enemy.safeBand >= 0 && enemy.safeBand <= 2);
      assert.equal(lanes.has(enemy.safeBand), false);
      if (phase === 3) assert.ok(world.hostile.some(p => p.kind === 'shockwave'));
    }
  }
});

test('Stage 7 plates, atlases and caption-only voice are present', () => {
  assert.equal(STREAMS[7].far, 's7-far');
  assert.equal(STREAMS[7].floor, 's7-floor');
  assert.deepEqual(plateRuns(STAGE7).map(run => run.plate), Array.from({ length: 6 }, (_, i) => `s7-mid${i}`));
  for (const key of plateKeys(7)) assert.ok(existsSync(asset(`bg/${key}.webp`)), key);
  const manifest = JSON.parse(readFileSync(asset('bg/MANIFEST.json'), 'utf8'));
  assert.deepEqual(manifest.s7, ['s7-far', ...Array.from({ length: 6 }, (_, i) => `s7-mid${i}`), 's7-floor']);
  assert.deepEqual(STAGE_CHARS[7], [...STAGE_CHARS[1].filter(key => key !== 'interventionist'), 'yetti_minero', 'yetti_bailiff', 'archyetti', 'claudia']);
  for (const key of STAGE_CHARS[7]) {
    for (const suffix of ['-0.webp', '-0.astc.ktx', '-0.etc2.ktx', '-0.json', '.anims.json']) {
      assert.ok(existsSync(asset(`chars/${key}${suffix}`)), `${key}${suffix}`);
    }
  }
  const lines = {
    nar_ch7: 'Chapter Seven. The Papacito Tribunal.',
    bob_s7: "Court's in session, Yetti!",
    archyetti_intro: 'Bob. This court finds you… not a Papacito.',
    archyetti_phase2: 'The verdict is snow.',
    archyetti_phase3: 'Order! ORDER in my court!',
    archyetti_defeat: 'The court… is adjourned.',
    claudia_s7: 'Took you long enough, Papacito.',
    dad_s7: "That's my boy! Wicked big Papacito!",
  };
  for (const [id, text] of Object.entries(lines)) {
    assert.equal(LINES[id]?.[1], text);
    if (!existsSync(asset(`audio/voice/${id}.mp3`))) assert.ok(!PRESENT.includes(id), `${id} must stay caption-only`);
  }
  assert.equal(MUSIC.stage7?.url, 'assets/audio/s7-tribunal.mp3');
  assert.equal(MUSIC.boss7?.url, 'assets/audio/s7-finalboss.mp3');
  for (const id of ['stage7', 'boss7']) {
    assert.equal(MUSIC[id].stream, true);
    assert.ok(existsSync(asset(MUSIC[id].url.replace(/^assets\//, ''))));
  }
  assert.equal(isEndingVoice('claudia_s7'), true);
  assert.equal(isEndingVoice('dad_s7'), true);
  assert.equal(applyBossDamage(3, 40, 200).hp, 1);
});

test('Stage 7 GPU kit stays inside the Stage 4-7 ceiling', () => {
  const report = JSON.parse(readFileSync(asset('chars/_pack_report.json'), 'utf8'));
  const totals = { ASTC: 0, ETC: 0, IMG: 0 };
  for (const key of STAGE_CHARS[7]) {
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
  for (const fmt of ['ASTC', 'ETC']) assert.ok(totals[fmt] <= 13 * 1024 ** 2, `Stage 7 ${fmt}+IMG ${(totals[fmt] / 1024 ** 2).toFixed(3)} MiB`);
  assert.ok(totals.IMG <= 48 * 1024 ** 2, `Stage 7 RGBA ${(totals.IMG / 1024 ** 2).toFixed(3)} MiB`);
});

test('Stage 7 opener and finale lines respect the locked dialogue cap', () => {
  const w = new Campaign({ stage: 7, rng: () => 1 });
  assert.ok(w.events.some(e => e.type === 'cutscene' && e.data === 'stage7'));
  const allStamps = [0];
  const timed = [];
  w.events = [];
  for (let i = 0; i < 9 * 60; i++) {
    w.update(1 / 60);
    for (const e of w.events) {
      if (e.type !== 'voice') continue;
      allStamps.push(w.elapsed);
      if (e.data === 'bob_s7') timed.push([e.data, w.elapsed]);
    }
    w.events = [];
  }
  assert.deepEqual(timed.map(([id]) => id), ['bob_s7']);
  assert.ok(Math.abs(timed[0][1] - 8) < .03, `bob_s7 at ${timed[0][1]}`);
  w.finishStage();
  w.update(3);
  assert.equal(w.victory, true);
  assert.equal(w.message, STORY.finalVictory);
  assert.ok(OPTIONAL_CLIPS.has('stage7_intro'));
  assert.ok(OPTIONAL_CLIPS.has('final_victory'));
  assert.deepEqual(STAGE_CLIPS.stage7, ['stage7_intro']);
  assert.deepEqual(STAGE_CLIPS.final_victory, ['final_victory']);
  assert.deepEqual(clipIdsFor('stage7', () => false), []);
  assert.deepEqual(clipIdsFor('final_victory', () => false), []);
  assert.equal(rollingVoiceStats(allStamps).ok, true);
});

test('BARK and Stage 7 voice-rate stay inside the locked dialogue cap', () => {
  assert.deepEqual(BARK, { whereCd: 60, coryCd: 120, coryChance: .05, yettiCd: 20, tauntChance: .04, gap: 8, cap: 3, window: 60 });
  const report = runVoiceRate({ stage: 7, hz: 60 });
  assert.equal(report.cleared, true);
  assert.ok(report.ambientPerMin <= 4, `ambient ${report.ambientPerMin}/min`);
  assert.ok(report.totalPerMin <= 7, `total ${report.totalPerMin}/min`);
  assert.ok(report.minVoiceGap >= 7.99, `gap ${report.minVoiceGap}`);
  assert.ok(report.maxIn60s <= 3);
  assert.equal(report.rollingOk, true);
});
