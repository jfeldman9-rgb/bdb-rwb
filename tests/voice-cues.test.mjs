import test from 'node:test';
import assert from 'node:assert/strict';
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
  assert.equal(LINES.yetti_turnback[1], 'Turn back Papi!');
  assert.equal(LINES.choir_serious[1], 'Papi, be serious.');
  assert.equal(LINES.wingman_defeat[1], "We'll… reform.");
  assert.equal(LINES.dad_call_01[1], 'Bobby! Get behind me, kid!');
  assert.equal(LINES.dad_done_01[1], 'Call ya mothah.');
});

test('stage lines, bonks, KOs, hurts, Dad, and Papi each fire their registered id', () => {
  const early = new Campaign();
  early.events = [];
  early.update(3.9, {});
  assert.equal(voices(early).includes('bdb_open'), false);
  early.update(0.2, {});
  assert.ok(voices(early).includes('bdb_open'));
  early.update(4, {});
  assert.ok(voices(early).includes('nar_intro_01'));

  const w = new Campaign();
  const e = w.spawnYetti('walker', 500, 630);
  e.hp = 80;
  w.events = [];
  w.hit(e, 1, 1, true);
  assert.ok(voices(w).includes('bdb_produce'));
  w.events = [];
  w.hit(e, 1, 1, true);
  assert.equal(voices(w).includes('bdb_produce'), false);
  e.hp = 1;
  w.elapsed = 10;
  w.hit(e, 30, 1, false);
  assert.ok(voices(w).includes('bdb_laugh'));

  w.bob.inv = 0;
  w.events = [];
  w.hurtBob();
  assert.ok(voices(w).includes('bob_hurt_01'));
  w.events = [];
  w.useDad();
  assert.match(w.message, /ZONE 3/);
  assert.equal(voices(w).includes('bob_dadwait_01'), false);

  w.events = [];
  w.spawnYetti('choir', 900, 630);
  assert.ok(voices(w).includes('choir_serious'));
  const turned = new Yetti('walker', 900, 630);
  turned.facing = 1;
  w.bob.x = 200;
  w.events = [];
  turned.update(1 / 60, w);
  assert.ok(voices(w).includes('yetti_turnback'));

  const s2 = new Campaign({ stage: 2 });
  s2.spawnYetti('walker', 500, 630);
  s2.events = [];
  assert.equal(s2.useDad(), true);
  assert.ok(voices(s2).includes('dad_call_01'));
  s2.finishDadCallin();
  assert.ok(voices(s2).includes('dad_catchphrase'));
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
  assert.ok(voices(crowd).some(id => id.startsWith('bob_papacito_')));
  crowd.update(1.5, {});
  assert.ok(voices(crowd).includes('papi_chorus'));
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
