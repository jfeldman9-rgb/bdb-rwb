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

test('stage lines, bonks, KOs, hurts, Dad, and Papi each fire their registered id', () => {
  const early = new Campaign();
  early.events = [];
  early.update(3.9, {});
  assert.equal(voices(early).includes('bdb_open'), false);
  early.update(0.2, {});
  assert.ok(voices(early).includes('bdb_open'));
  early.update(20, {});
  assert.equal(voices(early).some((id) => /^nar_intro_/.test(id)), false);

  const w = new Campaign();
  const e = w.spawnYetti('walker', 500, 630);
  e.hp = 80;
  w.events = [];
  w.hit(e, 1, 1, true);
  assert.ok(voices(w).includes('bdb_produce'));
  w.events = [];
  w.hit(e, 1, 1, true);
  assert.equal(voices(w).includes('bdb_produce'), false);
  w.elapsed = 30;
  w.events = [];
  for (let i = 0; i < 4; i++) w.recordKo({ recorded: false, boss: false, type: 'walker', x: 400, y: 630 }, 'bob');
  assert.ok(voices(w).includes('bdb_laugh'));

  w.elapsed = 50;
  w.bob.inv = 0;
  w.events = [];
  w.hurtBob();
  assert.equal(voices(w).some((id) => id.startsWith('bob_hurt_')), false);
  w.bob.inv = 0;
  w.events = [];
  w.hurtBob();
  assert.ok(voices(w).includes('bob_hurt_01'));
  w.events = [];
  w.useDad();
  assert.match(w.message, /ZONE 3/);
  assert.equal(voices(w).includes('bob_dadwait_01'), false);

  w.elapsed = 70;
  w.events = [];
  w.spawnYetti('choir', 900, 630);
  assert.ok(voices(w).includes('choir_serious'));
  const turned = new Yetti('walker', 900, 630);
  turned.facing = 1;
  w.bob.x = 200;
  w.elapsed = 110;
  w.events = [];
  turned.update(1 / 60, w);
  assert.ok(voices(w).includes('yetti_turnback'));

  const s2 = new Campaign({ stage: 2 });
  s2.spawnYetti('walker', 500, 630);
  s2.events = [];
  assert.equal(s2.useDad(), true);
  assert.ok(voices(s2).includes('dad_call_01'));
  s2.finishDadCallin();
  assert.equal(voices(s2).includes('dad_catchphrase'), false, 'the line waits for the swat');
  for (let i = 0; i < Math.ceil(DAD_TIMING.impact * 60); i++) s2.update(1 / 60, {});
  const phrase = s2.events.findIndex(e => e.type === 'voice' && e.data === 'dad_catchphrase');
  const hit = s2.events.findIndex(e => e.type === 'dadhit');
  assert.ok(phrase >= 0 && hit === phrase + 1, 'catchphrase lands on the impact');
  s2.spawnYetti('walker', 500, 630);
  s2.dad = null;
  s2.dadCall.on = false;
  s2.dadCall.charges = 1;
  s2.events = [];
  assert.equal(s2.useDad(), true);
  assert.ok(voices(s2).includes('dad_call_02'));
  s2.dad = null;
  s2.dadCall.on = false;
  s2.dadCall.charges = 0;
  s2.events = [];
  assert.equal(s2.useDad(), false);
  assert.match(s2.message, /OUT OF SWATS/);
  assert.match(s2.message, /0\/1/);
  assert.ok(voices(s2).includes('bob_dadwait_01'));
  s2.finishDadCallin();
  s2.dad.age = DAD_TIMING.total;
  s2.events = [];
  s2.update(0.05, {});
  assert.equal(s2.dad, null);
  assert.ok(voices(s2).includes('dad_done_01'));

  const crowd = new Campaign({ stage: 2 });
  crowd.spawnYetti('walker', 500, 630);
  crowd.papi.charges = 0;
  crowd.events = [];
  assert.equal(crowd.usePapi(), false);
  assert.match(crowd.message, /PROTEIN/);
  assert.ok(voices(crowd).includes('bob_papiwait_01'));
  crowd.papi.charges = 1;
  crowd.events = [];
  assert.equal(crowd.usePapi(), true);
  assert.equal(voices(crowd).some(id => id.startsWith('bob_papacito_')), false);
  assert.ok(voices(crowd).includes('papi_crowd_01'));
  assert.match(crowd.message, /PAPACITO STAMPEDE/);
  crowd.papiTime = 0;
  crowd.papiPending = null;
  crowd.papi.charges = 1;
  crowd.spawnYetti('walker', 640, 630);
  crowd.events = [];
  assert.equal(crowd.usePapi(), true);
  assert.ok(voices(crowd).includes('papi_crowd_02'));
  const fin = new Campaign({ stage: 3 });
  fin.wingmen = { phase: 3 };
  fin.enemies = [{ boss: true, alive: true, hp: 1, x: 400, y: 630, type: 'wingman' }];
  fin.papi.charges = 1;
  fin.events = [];
  assert.equal(fin.usePapi(), true);
  assert.ok(voices(fin).some(id => id.startsWith('bob_papacito_')));
  assert.ok(voices(fin).some(id => id.startsWith('papi_crowd_')));
  assert.match(fin.message, /COUNCIL ADJOURNED/);
  const quiet = new Campaign({ stage: 2 });
  quiet.enemies = [];
  quiet.papi.charges = 1;
  quiet.events = [];
  assert.equal(quiet.usePapi(), false);
  assert.match(quiet.message, /CROWD/);
  assert.ok(voices(quiet).includes('bob_papi_01'));

  const s3 = new Campaign({ stage: 3 });
  s3.events = [];
  s3.startBoss();
  const order = s3.events.map(ev => `${ev.type}:${ev.data}`);
  assert.ok(order.indexOf('cutscene:rescue_pre_boss') < order.indexOf('voice:wingman_council'));
  assert.ok(s3.voiceAt.some(v => v.id === 'claudia_question'));
  s3.finishStage();
  s3.events = [];
  s3.update(3, {});
  assert.equal(s3.victory, true);
  assert.ok(voices(s3).includes('claudia_open'));
  assert.ok(voices(s3).includes('nar_victory'));
  assert.ok(voices(s3).includes('claudia_leave'));

  const said = [];
  const men = new Wingmen();
  men.phase = 3;
  const world = {
    enemies: [{ type: 'wingman', alive: false }, { type: 'wingman', alive: false }],
    papi: { charges: 1 }, bob: { x: 0 }, bounds: { l: 0, r: 1000 }, checkpoint: {},
    emit(type, data) { if (type === 'voice') said.push(data); },
    banner() {}, dropTrio() {},
  };
  men.update(0.1, world);
  men.update(0.1, world);
  assert.deepEqual(said, ['wingman_defeat']);
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
  assert.ok(w.events.some(e => e.type === 'voice' && e.data === 'bdb_open'));
});
