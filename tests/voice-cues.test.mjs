import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Campaign } from '../src/campaign.js';
import { Yetti } from '../src/yettis.js';
import { Wingmen } from '../src/wingman.js';
import { DAD_TIMING } from '../src/dad.js';
import { LINES } from '../src/voice-lines.js';

const voices = (w) => w.events.filter(e => e.type === 'voice').map(e => e.data);

test('wired lines keep their locked wording', () => {
  assert.equal(LINES.bdb_open[1], 'I brought the eggplant.');
  assert.equal(LINES.bdb_produce[1], 'Die, Yetti, die!');
  assert.equal(LINES.bdb_laugh[1], 'Ha! Dead!');
  assert.equal(LINES.claudia_open[1], 'Bob. Winged Yettis locked me in Moonlit Keep.');
  assert.equal(LINES.claudia_question[1], 'Is that what I think it is?');
  assert.equal(LINES.claudia_leave[1], "Let's leave before they reform.");
  assert.equal(LINES.nar_victory[1], 'And Bob? Bob was, briefly, a man of good judgment.');
  assert.equal(LINES.nar_intro_01[1], 'This is Bob. Big Dick Bob, to his friends. And to most of his enemies.');
  assert.equal(LINES.bob_dadwait_01[1], 'Dad! Now!');
  assert.equal(LINES.bob_papiwait_01[1], 'Need the ladies!');
  assert.equal(LINES.bob_papi_01[1], 'Not now, ladies!');
  assert.equal(LINES.papi_chorus[1], 'Papi! Papi! PAPI!');
  assert.equal(LINES.papi_crowd_01[1], 'We love you Papacito! Pick me!');
  assert.equal(LINES.papi_crowd_02[1], 'We love you Papacito! Pick me!');
  assert.equal(LINES.papi_crowd_01[0], 'Crowd');
  assert.equal(LINES.papi_crowd_02[0], 'Crowd');
  assert.equal(LINES.yetti_turnback[1], 'Turn back Papi!');
  assert.equal(LINES.choir_serious[1], 'Papi, be serious.');
  assert.equal(LINES.wingman_defeat[1], "We'll… reform.");
  assert.equal(LINES.dad_call_01[1], 'Bobby! Get behind me, kid!');
  assert.equal(LINES.dad_done_01[1], 'Call ya mothah.');
  assert.equal(LINES.yetti_porkchop_01[1], 'Pork Chop Sandwiches!');
  assert.equal(LINES.yetti_porkchop_02[1], 'Pork Chop Sandwiches!');
  assert.equal(LINES.yetti_colombian_room_01[1], 'Stay away from the Colombians room.');
  assert.equal(LINES.yetti_colombian_room_02[1], 'Stay away from the Colombians room.');
  assert.equal(LINES.yetti_purple_car_01[1], 'Bob why is your car purple?');
  assert.equal(LINES.yetti_purple_car_02[1], 'Bob why is your car purple?');
  assert.equal(LINES.dad_catchphrase[1], 'Son, sometimes you just need to use the fly swatter to keep the women away!');
});

test('every locked quote is pinned in the captions and the voice manifest', async () => {
  const locked = [
    ['bdb_open', 'I brought the eggplant.'],
    ['bdb_produce', 'Die, Yetti, die!'],
    ['yetti_porkchop_01', 'Pork Chop Sandwiches!'],
    ['yetti_porkchop_02', 'Pork Chop Sandwiches!'],
    ['yetti_colombian_room_01', 'Stay away from the Colombians room.'],
    ['yetti_colombian_room_02', 'Stay away from the Colombians room.'],
    ['yetti_purple_car_01', 'Bob why is your car purple?'],
    ['yetti_purple_car_02', 'Bob why is your car purple?'],
    ['dad_catchphrase', 'Son, sometimes you just need to use the fly swatter to keep the women away!'],
  ];
  const manifest = JSON.parse(await readFile(new URL('../assets/audio/voice-manifest.json', import.meta.url), 'utf8'));
  const files = new Map(manifest.files.map(file => [file.id, file.text]));
  for (const [id, text] of locked) {
    assert.equal(LINES[id][1], text);
    assert.equal(files.get(id), text);
  }
  for (const id of ['papi_crowd_01', 'papi_crowd_02']) {
    assert.equal(LINES[id][1], 'We love you Papacito! Pick me!');
    assert.equal(files.get(id), 'We love you Papacito! Pick me!');
  }
  const papacito = "Hold on Claudia! Papacito is coming! It's eggplant time!";
  const texts = [...Object.values(LINES).map(line => line[1]), ...files.values()];
  for (const text of texts) {
    if (/hold on claudia|eggplant time|papacito is coming/i.test(text)) assert.equal(text, papacito);
  }
  assert.equal(manifest.files.some(file => file.text.includes("Colombian's")), false);
  assert.equal(manifest.files.some(file => file.text.includes('Bob, why')), false);
});

// Cue wiring includes both immediately accepted speech and durable reserved offers.
const requested = w => [...voices(w), ...w.voiceGate.queue];

test('stage opens become due on schedule and wait for the global budget', () => {
  const w = new Campaign({ rng: () => 1 }); w.events = [];
  w.update(3.9); assert.equal(requested(w).includes('bdb_open'), false);
  w.update(.2); assert.ok(w.voiceGate.queue.includes('bdb_open'));
  w.update(4); assert.ok(voices(w).includes('bdb_open'));
  assert.equal(voices(w).some(id => /^nar_intro_/.test(id)), false);
});

test('bonks, KOs, hurts and choir cues still reach the common dialogue authority', () => {
  const w = new Campaign({ rng: () => 1 }); w.elapsed = 100; w.voiceAt = []; w.events = [];
  const e = w.spawnYetti('walker', 500, 630); e.hp = 80;
  w.hit(e, 1, 1, true); assert.ok(voices(w).includes('bdb_produce'));
  w.events = []; w.hit(e, 1, 1, true); assert.equal(requested(w).includes('bdb_produce'), false);
  w.elapsed += 60;
  for (let i = 0; i < 4; i++) w.recordKo({ recorded: false, boss: false, type: 'walker', x: 400, y: 630 }, 'bob');
  assert.ok(voices(w).includes('bdb_laugh'));
  w.elapsed += 60; w.events = []; w.bob.inv = 0; w.hurtBob();
  assert.equal(voices(w).some(id => /^bob_hurt_/.test(id)), false);
  w.bob.inv = 0; w.hurtBob(); assert.ok(voices(w).includes('bob_hurt_01'));
  w.elapsed += 60; w.events = []; w.spawnYetti('choir', 900, 630);
  assert.ok(voices(w).includes('choir_serious'));
  w.elapsed += 60; w.events = [];
  const turned = new Yetti('walker', 900, 630); turned.facing = 1; w.bob.x = 200;
  turned.update(1 / 60, w); assert.ok(voices(w).includes('yetti_turnback'));
});

test('Dad swats on impact while his fallback and locked catchphrase queue for speech', () => {
  const w = new Campaign({ stage: 2, rng: () => 1 }); w.events = [];
  w.spawnYetti('walker', 500, 630); assert.equal(w.useDad(), true);
  assert.equal(voices(w).includes('dad_call_01'), false);
  w.finishDadCallin(); assert.ok(w.voiceGate.queue.includes('dad_call_01'));
  for (let i = 0; i < Math.ceil(DAD_TIMING.impact * 60); i++) w.update(1 / 60);
  assert.ok(w.events.some(e => e.type === 'dadhit'), 'combat impact is independent of speech availability');
  assert.ok(w.voiceGate.queue.includes('dad_catchphrase'));
  w.elapsed = 8; w.flushVoice(); assert.ok(voices(w).includes('dad_call_01'));
  w.elapsed = 16; w.flushVoice(); assert.ok(voices(w).includes('dad_catchphrase'));
});

test('Papi keeps both locked crowd variants and a finisher still offers its brag', () => {
  const w = new Campaign({ stage: 2 }); w.events = [];
  for (let i = 1; i <= 2; i++) {
    w.spawnYetti('walker', 500, 630); w.papi.charges = 1; w.papiTime = 0; w.papiPending = null;
    assert.equal(w.usePapi(), true); assert.ok(requested(w).includes(`papi_crowd_0${i}`));
    assert.match(w.message, /PAPACITO STAMPEDE/);
  }
  const fin = new Campaign({ stage: 3 }); fin.wingmen = { phase: 3 }; fin.papi.charges = 1;
  fin.enemies = [{ boss: true, alive: true, hp: 1, x: 400, y: 630, type: 'wingman' }];
  const offered = [], emit = fin.emit.bind(fin);
  fin.emit = (type, id) => { if (type === 'voice') offered.push(id); emit(type, id); };
  assert.equal(fin.usePapi(), true);
  assert.ok(offered.some(id => /^bob_papacito_/.test(id)));
  assert.ok(requested(fin).includes('papi_crowd_01'));
  assert.match(fin.message, /COUNCIL ADJOURNED/);
});

test('rescue and finale cues queue across chapter changes without resetting speech', () => {
  const w = new Campaign({ stage: 3 }); w.events = []; w.startBoss();
  assert.ok(w.events.some(e => e.data === 'rescue_pre_boss'));
  assert.ok(requested(w).includes('wingman_council'));
  assert.ok(w.voiceAt.some(v => v.id === 'claudia_question'));
  w.finishStage(); w.update(3);
  assert.equal(w.stageNo, 4); assert.equal(w.victory, false);
  assert.ok(requested(w).includes('nar_ch4'));
  w.finishStage(); w.update(3);
  assert.equal(w.victory, true);
  for (const id of ['nar_victory', 'claudia_leave']) assert.ok(requested(w).includes(id));
  const said = [], men = new Wingmen(); men.phase = 3;
  const world = { enemies: [{ type: 'wingman', alive: false }, { type: 'wingman', alive: false }],
    papi: { charges: 1 }, bob: { x: 0 }, bounds: { l: 0, r: 1000 }, checkpoint: {},
    emit(type, id) { if (type === 'voice') said.push(id); }, banner() {}, dropTrio() {} };
  men.update(.1, world); men.update(.1, world); assert.deepEqual(said, ['wingman_defeat']);
});

test('flushVoice emits due lines in place', () => {
  const w = new Campaign();
  const queue = [{ id: 'bdb_open', at: 1 }, { id: 'nar_intro_01', at: 5 }];
  w.voiceAt = queue;
  w.elapsed = 0.5;
  w.events = [];
  w.flushVoice();
  assert.equal(w.voiceAt, queue);
  assert.equal(w.events.some(e => e.type === 'voice'), false);
  w.elapsed = 1;
  w.flushVoice();
  assert.equal(w.voiceAt, queue);
  assert.deepEqual(queue.map(v => v.id), ['nar_intro_01']);
  assert.ok(w.voiceGate.queue.includes('bdb_open'));
  w.elapsed = 8; w.flushVoice();
  assert.ok(w.events.some(e => e.type === 'voice' && e.data === 'bdb_open'));
});
