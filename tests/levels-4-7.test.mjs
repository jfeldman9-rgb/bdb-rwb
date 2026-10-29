import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { STAGE1 } from '../src/stage1-def.js';
import { STAGE2 } from '../src/stage2-def.js';
import { STAGE3 } from '../src/stage3-def.js';
import { STAGE4 } from '../src/stage4-def.js';
import { STAGES, STAGE_CHARS, STAGE_VARIANTS, CAGED, maxStage } from '../src/stages.js';
import { TYPES, BOSS_ADDS, BOSS_COOL } from '../src/yettis.js';
import { STREAMS, plateKeys, plateRuns } from '../src/zone-stream.js';
import { BARK } from '../src/barks.js';
import { Campaign } from '../src/campaign.js';
import { STORY } from '../src/story.js';
import { normalizeSave } from '../src/save.js';
import { LINES, PRESENT } from '../src/voice-lines.js';
import { MUSIC } from '../src/audio.js';
import { runVoiceRate } from '../tools/voice-rate.mjs';

const sha = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const core = ['walker', 'guard', 'hover', 'charger', 'choir', 'lecturer'];
const legacyBosses = ['interventionist', 'choirmaster'];
const asset = path => new URL(`../assets/${path}`, import.meta.url);

// Captured from git show 5beda6f (8c06396 plus docs), before Pass A edits.
// STAGE3 here is the raw import, before stages.js applies its next-stage overlay.
for (const [def, hash] of [
  [STAGE1, '08845ff2e111a9b84379ce8466b117a2d956595363d678537e5a4c7c61a74181'],
  [STAGE2, '4cd82640f1bfadcadd6574275c3aed3c23b5e0cead810c15affecaab0d59902e'],
  [STAGE3, '9ed1b579c303cec47fe2519af94f11a0cf518becaeaf13e98434bc48d737c225'],
]) test(`raw Stage ${def.no} content retains its baseline hash`, () => assert.equal(sha(def), hash));

test('legacy combat data retains baseline hashes independently of new flags and animation metadata', () => {
  const types = Object.fromEntries([...core, ...legacyBosses].map(key => {
    const { hp, speed, art, tint, boss } = TYPES[key];
    return [key, { hp, speed, art, tint, ...(boss == null ? {} : { boss }) }];
  }));
  assert.equal(sha(types), '266847637268940c8bf5bda1e38b2dff4fbcf80cb33462df8989be0832468156');
  assert.equal(sha(Object.fromEntries(legacyBosses.map(key => [key, BOSS_ADDS[key]]))), 'e6a784109e6762107123a54ecefd502f0671c8073220de994d70794a11837e36');
  assert.equal(sha(Object.fromEntries(legacyBosses.map(key => [key, BOSS_COOL[key]]))), 'e7bcbd8eb4984aff9df632bbc1bacc6597f1feb73c72625df783779aa0ee0e6e');
});

test('existing boss fallback animation mappings are unchanged', () => {
  assert.deepEqual(TYPES.interventionist.anims, { telegraph: 'grab', hold: 'hold', roar: 'slam', slam: 'slam', default: 'walk' });
  assert.deepEqual(TYPES.choirmaster.anims, { roar: 'ring', default: 'sing' });
  assert.deepEqual(TYPES.wingman.anims, { split: 'split', telegraph: 'telegraph', recover: 'land', default: 'hover' });
});

test('Stage 4 extends the stage chain without changing the raw Stage 3 definition or cage residency', () => {
  assert.equal(maxStage, 4);
  assert.equal(STAGE3.next, null);
  assert.deepEqual(STAGES[3], { ...STAGE3, next: 4 });
  assert.ok(Object.isFrozen(STAGES[3]));
  assert.equal(STAGES[4], STAGE4);
  assert.equal(STAGE4.next, null);
  assert.deepEqual([...CAGED], [3]);
  assert.deepEqual(STAGE_VARIANTS, { 1: [], 2: [], 3: [], 4: ['salsero'] });
});

test('Stage 4 retains the shared five-zone geometry and its rooftop boss arena', () => {
  assert.deepEqual([STAGE4.no, STAGE4.key, STAGE4.title, STAGE4.bg, STAGE4.hpScale, STAGE4.pace],
    [4, 'rumba', 'THE AFTERPARTY RELAPSE', 's4-mid5', 2.2, 1.17]);
  const geometry = ({ at, l, r }) => ({ at, l, r });
  assert.deepEqual(STAGE4.zones.map(geometry), STAGE3.zones.map(geometry));
  assert.deepEqual(STAGE4.boss, { at: 6700, l: 6480, r: 7760, type: 'bouncer', name: 'THE BOUNCER' });
  for (const zone of STAGE4.zones) {
    assert.equal(zone.waves.length, 3);
    assert.ok(new Set(zone.waves.flat().map(entry => entry[0])).size >= 3);
  }
});

test('Stage 4 balanced wave tallies use exactly its permitted roles', () => {
  // Pass E ladder: swap the late Salsero for a walker and add a trailing walker;
  // Salsero HP 24 and pace 1.17 keep both fresh and spent-Dad campaign runs in band.
  // Original brief: 55 bodies, 40 staggered, 18 flank, 1992 base HP.
  const entries = STAGE4.zones.flatMap(zone => zone.waves.flat());
  const mix = Object.fromEntries([...core, ...STAGE_VARIANTS[4]].map(type => [type, entries.filter(entry => entry[0] === type).length]));
  assert.deepEqual(mix, { walker: 12, guard: 7, hover: 6, charger: 6, choir: 4, lecturer: 6, salsero: 15 });
  assert.equal(entries.length, 56);
  assert.equal(entries.filter(([, , delay]) => delay > 0).length, 41);
  assert.equal(entries.filter(([, side]) => side === 'L').length, 18);
  assert.equal(entries.reduce((hp, [type]) => hp + TYPES[type].hp, 0), 1920);
  assert.deepEqual([...new Set(entries.map(([type]) => type))].sort(), [...core, ...STAGE_VARIANTS[4]].sort());
  for (const [type, side, delay] of entries) {
    assert.ok(!TYPES[type].boss);
    assert.ok(side === 'L' || side === 'R');
    assert.ok(delay >= 0 && delay < 6);
  }
  for (const type of BOSS_ADDS.bouncer.flat()) assert.ok([...core, ...STAGE_VARIANTS[4]].includes(type), type);
});

test('all six Stage 4 plate runs and their far/floor plates exist and are manifested', () => {
  assert.equal(STREAMS[4].far, 's4-far');
  assert.equal(STREAMS[4].floor, 's4-floor');
  assert.deepEqual(plateRuns(STAGE4).map(run => run.plate), Array.from({ length: 6 }, (_, i) => `s4-mid${i}`));
  for (const key of plateKeys(4)) assert.ok(existsSync(asset(`bg/${key}.webp`)), key);
  const manifest = JSON.parse(readFileSync(asset('bg/MANIFEST.json'), 'utf8'));
  assert.deepEqual(manifest.s4, ['s4-far', ...Array.from({ length: 6 }, (_, i) => `s4-mid${i}`), 's4-floor']);
});

test('every Stage 4 resident atlas has webp, ASTC, ETC2, page metadata and animations', () => {
  assert.deepEqual(STAGE_CHARS[4], [...STAGE_CHARS[1].filter(key => key !== 'interventionist'), 'yetti_salsero', 'bouncer']);
  for (const key of STAGE_CHARS[4]) {
    for (const suffix of ['-0.webp', '-0.astc.ktx', '-0.etc2.ktx', '-0.json', '.anims.json']) {
      assert.ok(existsSync(asset(`chars/${key}${suffix}`)), `${key}${suffix}`);
    }
  }
  const report = JSON.parse(readFileSync(asset('chars/_pack_report.json'), 'utf8'));
  const pages = STAGE_CHARS[4].flatMap(key => JSON.parse(readFileSync(asset(`chars/${key}.anims.json`), 'utf8')).pages);
  let astc = 0, rgba = 0;
  for (const page of pages) {
    assert.ok(report.compressed.pages[page], `missing GPU report page ${page}`);
    astc += report.compressed.pages[page].astc_gpu;
    rgba += report.compressed.pages[page].rgba;
  }
  assert.ok(astc <= 12 * 1024 ** 2, `Stage 4 ASTC ${(astc / 1024 ** 2).toFixed(3)} MiB`);
  assert.ok(rgba <= 48 * 1024 ** 2, `Stage 4 RGBA ${(rgba / 1024 ** 2).toFixed(3)} MiB`);
});

test('BARK retains every baseline gate and cooldown value', () => {
  assert.deepEqual(BARK, { whereCd: 60, coryCd: 120, coryChance: .05, yettiCd: 20, tauntChance: .04, gap: 8, cap: 3, window: 60 });
});

test('every PRESENT voice has an mp3; the Stage 4 script captions without missing-file fetches', () => {
  for (const id of PRESENT) assert.ok(existsSync(asset(`audio/voice/${id}.mp3`)), id);
  const lines = {
    nar_ch4: 'Chapter Four. The Afterparty Relapse.', claudia_s4: 'Bob! Not again!', bob_s4: 'Again? Seriously?',
    bouncer_intro: "You're not on the list, Papi.", bouncer_grab: "You're not on the list.", bouncer_phase2: 'The rope comes out now.',
    bouncer_phase3: "Club's closed. Forever.", bouncer_defeat: "Fine. You're on the list.",
  };
  for (const [id, text] of Object.entries(lines)) {
    assert.equal(LINES[id]?.[1], text);
    if (!existsSync(asset(`audio/voice/${id}.mp3`))) assert.ok(!PRESENT.includes(id), `${id} must stay caption-only`);
  }
});

test('Stage 4 music IDs select supplied music or the existing free fallback', () => {
  for (const id of ['stage4', 'boss4']) {
    const supplied = `audio/music/${id}.mp3`;
    assert.equal(MUSIC[id]?.url, existsSync(asset(supplied)) ? `assets/${supplied}` : 'assets/audio/bdb-rise.mp3');
    assert.equal(MUSIC[id].stream, true);
    assert.ok(existsSync(new URL(`../${MUSIC[id].url}`, import.meta.url)));
  }
  for (const id of ['stage1', 'boss1', 'stage2', 'boss2', 'stage3', 'boss3']) assert.equal(MUSIC[id].url, 'assets/audio/bdb-rise.mp3');
});

test('Stage 4 re-kidnap runs once before narration; opening lines fire at 2 and 4.5 seconds', () => {
  const w = new Campaign({ stage: 4, rng: () => 1 });
  const cutscene = w.events.findIndex(e => e.type === 'cutscene' && e.data === 'kidnap');
  const narration = w.events.findIndex(e => e.type === 'voice' && e.data === 'nar_ch4');
  assert.ok(cutscene >= 0 && narration > cutscene);
  const timed = [];
  w.events = [];
  for (let i = 0; i < 300; i++) {
    w.update(1 / 60);
    timed.push(...w.events.filter(e => e.type === 'voice' && ['claudia_s4', 'bob_s4'].includes(e.data)).map(e => [e.data, w.elapsed]));
    w.events = [];
  }
  assert.deepEqual(timed.map(([id]) => id), ['claudia_s4', 'bob_s4']);
  assert.ok(Math.abs(timed[0][1] - 2) < .02);
  assert.ok(Math.abs(timed[1][1] - 4.5) < .02);
  w.loadStage(4);
  assert.ok(!w.events.some(e => e.type === 'cutscene' && e.data === 'kidnap'));
  assert.equal(new Campaign({ stage: 4 }).events.filter(e => e.type === 'cutscene' && e.data === 'kidnap').length, 1);
});

test('Stage 3 still unlocks Nightmare and keeps its rescue banner while continuing into Stage 4', () => {
  const w = new Campaign({ stage: 3 });
  w.finishStage();
  assert.equal(w.message, STORY.victory);
  assert.equal(w.save.beaten, true);
  assert.equal(w.save.unlockedStage, 4);
  w.update(3);
  assert.equal(w.victory, false);
  assert.equal(w.stageNo, 4);
  w.finishStage();
  assert.equal(w.message, STORY.finalVictory);
  w.update(3);
  assert.equal(w.victory, true);
});

test('beaten legacy saves unlock Stage 4 and unlockedStage stays within the current campaign', () => {
  for (const unlockedStage of [undefined, -9, 1, 3]) assert.equal(normalizeSave({ beaten: true, unlockedStage }).unlockedStage, 4);
  assert.equal(normalizeSave({ beaten: true, unlockedStage: 99 }).unlockedStage, maxStage);
  assert.equal(normalizeSave({ beaten: false, unlockedStage: 99 }).unlockedStage, maxStage);
});

test('finisher accessor keeps the Stage 3 Wingmen controller and supports a future court', () => {
  const w = new Campaign({ stage: 3 });
  assert.equal(w.finisher, null);
  w.startBoss();
  assert.equal(w.finisher, w.wingmen);
  assert.ok(w.finisher);
  const court = { phase: 3, ready: true };
  w.court = court;
  assert.equal(w.finisher, w.wingmen);
  w.wingmen = null;
  assert.equal(w.finisher, court);
  w.loadStage(4);
  assert.equal(w.finisher, null);
});

test('Stage 4 scripted beats fit the unchanged ambient and total voice-rate limits', () => {
  const report = runVoiceRate({ stage: 4, hz: 60 });
  assert.equal(report.cleared, true);
  assert.equal(report.stageTimes.length, 1);
  assert.ok(report.ambientPerMin <= 4, `ambient ${report.ambientPerMin}/min`);
  assert.ok(report.totalPerMin <= 7, `total ${report.totalPerMin}/min`);
  assert.ok(report.minAmbientGap >= 7.95, `gap ${report.minAmbientGap}`);
});
