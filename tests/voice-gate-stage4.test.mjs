import test from 'node:test';
import assert from 'node:assert/strict';
import { STAGE_CLIPS, INTRO_REV } from '../src/cutscene.js';
import { Campaign } from '../src/campaign.js';
import { LINES } from '../src/voice-lines.js';
import { createVoiceGate, offerVoice, flushVoiceGate, rollingVoiceStats,
  isReservedVoice, isBossMomentVoice, nextVoiceAt, isEndingVoice, expireOptionalVoice } from '../src/voice-gate.js';
import { runVoiceRate } from '../tools/voice-rate.mjs';

const voices = w => w.events.filter(e => e.type === 'voice').map(e => e.data);
const locked = [
  ['Son, sometimes you just need to use the fly swatter to keep the women away!', ['dad_catchphrase']],
  ['I brought the eggplant.', ['bdb_open']],
  ['Die, Yetti, die!', ['bdb_produce']],
  ['Pork Chop Sandwiches!', ['yetti_porkchop_01', 'yetti_porkchop_02']],
  ['Stay away from the Colombians room.', ['yetti_colombian_room_01', 'yetti_colombian_room_02']],
  ['Bob why is your car purple?', ['yetti_purple_car_01', 'yetti_purple_car_02']],
  ["Hold on Claudia! Papacito is coming! It's eggplant time!", []],
  ['We love you Papacito! Pick me!', ['papi_crowd_01', 'papi_crowd_02']],
];

test('all eight locked lines map every standalone voice variant to reserved; intro-only quote stays movie-owned', () => {
  for (const [text, ids] of locked) {
    assert.deepEqual(Object.keys(LINES).filter(id => LINES[id][1] === text), ids, text);
    for (const id of ids) assert.equal(isReservedVoice(id), true, `${text}: ${id}`);
  }
  // The seventh quote has no standalone voice ID: it is embedded in the full intro.
  assert.deepEqual(STAGE_CLIPS.intro, ['intro_v3']);
  assert.equal(INTRO_REV, 'b67d6176');
  for (const id of ['bouncer_grab', 'bouncer_phase2', 'bouncer_defeat', 'dad_call_01']) assert.ok(isReservedVoice(id));
  assert.equal(isReservedVoice('bob_papacito_01'), false);
  assert.equal(isBossMomentVoice('bouncer_phase3'), true);
  assert.equal(isBossMomentVoice('bouncer_grab'), false);
});

test('every locked voice variant survives a saturated gate and is eventually emitted verbatim', () => {
  const gate = createVoiceGate();
  gate.stamps = [0, 8, 16];
  const ids = locked.flatMap(([, ids]) => ids);
  const said = [], stamps = [0, 8, 16];
  for (const id of ids) offerVoice(gate, id, 17, () => assert.fail('closed window'));
  assert.deepEqual(gate.queue, ids);
  for (let t = 18; t < 400; t++) flushVoiceGate(gate, t, id => { said.push(id); stamps.push(t); });
  assert.deepEqual(said, ids);
  assert.equal(gate.queue.length, 0);
  assert.equal(rollingVoiceStats(stamps).ok, true);
});

for (const stage of [1, 2, 3, 4]) test(`Stage ${stage} uses the same cap, including fallback Dad speech`, () => {
  const w = new Campaign({ stage, rng: () => 1 });
  w.events = []; w.voiceAt = [];
  w.emit('voice', 'dad_call_01');
  w.emit('voice', 'dad_catchphrase');
  w.emit('voice', 'papi_crowd_01');
  assert.deepEqual(voices(w), []);
  assert.deepEqual(w.voiceGate.queue, ['dad_call_01', 'dad_catchphrase', 'papi_crowd_01']);
  const stamps = [0], said = [];
  for (let t = 1; t <= 61; t++) {
    w.elapsed = t; w.events = []; w.flushVoice();
    for (const id of voices(w)) { said.push(id); stamps.push(t); }
  }
  assert.deepEqual(said, ['dad_call_01', 'dad_catchphrase', 'papi_crowd_01']);
  assert.equal(w.gatesVoice(), true);
  assert.equal(rollingVoiceStats(stamps).ok, true);
});

test('chapter changes preserve the global stamps and pending locked lines', () => {
  const w = new Campaign({ rng: () => 1 });
  w.elapsed = 1; w.events = [];
  w.emit('voice', 'dad_catchphrase');
  for (const stage of [2, 3, 4]) w.loadStage(stage);
  assert.deepEqual(w.voiceGate.stamps, [0]);
  assert.ok(w.voiceGate.queue.includes('dad_catchphrase'));
  assert.ok(w.voiceGate.queue.includes('bdb_open'), 'scheduled locked opening survives a transition');
  assert.deepEqual(voices(w), []);
});

test('stage clear transfers locked bark offers before victory stops the combat scheduler', () => {
  const w = new Campaign({ stage: 4 }); w.elapsed = 17; w.voiceAt = []; w.events = [];
  w.voiceGate.stamps = [0, 8, 16];
  w.barks.held.yetti = { group: 'yetti', id: 'yetti_purple_car_01' };
  w.barks.offers.push({ group: 'produce', id: 'bdb_produce' });
  w.finishStage(); w.update(2.5);
  assert.equal(w.victory, true);
  assert.ok(w.voiceGate.queue.includes('yetti_purple_car_01'));
  assert.ok(w.voiceGate.queue.includes('bdb_produce'));
  assert.equal(Object.keys(w.barks.held).length, 0);
  assert.equal(w.barks.offers.length, 0);
});

test('ending lines take the earliest legal slots and optional chatter expires', () => {
  const gate = createVoiceGate();
  gate.stamps = [0, 8, 16];
  for (const id of ['bouncer_defeat', 'yetti_porkchop_01', 'bob_hurt_01', 'dad_catchphrase']) {
    offerVoice(gate, id, 17, () => assert.fail('closed'));
  }
  assert.ok(gate.queue.includes('bouncer_defeat'));
  assert.equal(gate.queue.includes('bob_hurt_01'), false, 'optional flavour never queued');
  expireOptionalVoice(gate);
  offerVoice(gate, 'nar_victory', 17, () => assert.fail('closed'));
  offerVoice(gate, 'claudia_leave', 17, () => assert.fail('closed'));
  assert.equal(isEndingVoice('nar_victory'), true);
  assert.deepEqual(gate.queue.slice(0, 2), ['nar_victory', 'claudia_leave']);
  assert.ok(gate.queue.includes('bouncer_defeat'));
  assert.ok(gate.queue.includes('yetti_porkchop_01'));
  const said = [], stamps = [0, 8, 16];
  for (let t = 18; t < 200; t++) flushVoiceGate(gate, t, id => { said.push(id); stamps.push(t); });
  assert.equal(said[0], 'nar_victory');
  assert.equal(said[1], 'claudia_leave');
  assert.ok(said.includes('bouncer_defeat'));
  assert.ok(said.includes('yetti_porkchop_01'));
  assert.equal(rollingVoiceStats(stamps).ok, true);
  const first = stamps[3];
  assert.ok(Math.abs(first - nextVoiceAt({ stamps: [0, 8, 16], queue: [], gap: 8, cap: 3, window: 60 }, 17)) < 1e-6);
});

for (const hz of [30, 60, 120]) test(`Stage 4 victory opening puts ending lines on the first legal beats at ${hz} Hz`, () => {
  const w = new Campaign({ stage: 4, rng: () => 1 });
  w.elapsed = 141.2; w.voiceAt = [];
  w.voiceGate.stamps = [125.2, 133.2, 141.2]; w.voiceGate.queue = []; w.events = [];
  for (const id of ['bouncer_phase2', 'bouncer_phase3', 'bouncer_defeat', ...locked.flatMap(([, ids]) => ids)]) w.emit('voice', id);
  assert.equal(w.voiceGate.queue[0], 'bouncer_defeat');
  w.finishStage();
  const clearAt = w.elapsed, presented = [], stamps = [125.2, 133.2, 141.2];
  let victoryAt;
  for (let i = 0; i < hz * 420 && (!w.victory || w.voiceGate.queue.length); i++) {
    w.update(1 / hz, { x: 1 });
    for (const e of w.events) {
      if (e.type === 'victory') victoryAt = w.elapsed;
      if (e.type === 'voice') { presented.push(e.data); stamps.push(w.elapsed); }
    }
    w.events = [];
  }
  assert.ok(victoryAt - clearAt <= 3, `wait ${victoryAt - clearAt}`);
  assert.ok(victoryAt < 150, 'victory does not wait on the saturated window');
  const endAt = presented.indexOf('nar_victory');
  const leaveAt = presented.indexOf('claudia_leave');
  assert.ok(endAt >= 0 && leaveAt === endAt + 1, 'ending pair is adjacent and first of the post-victory drain');
  const legal = nextVoiceAt({ stamps: [125.2, 133.2, 141.2], queue: [], gap: 8, cap: 3, window: 60 }, victoryAt);
  assert.ok(stamps[stamps.length - presented.length + endAt] - legal < 1 / hz + 1e-6);
  for (const id of ['bouncer_defeat', ...locked.flatMap(([, ids]) => ids), 'nar_victory', 'claudia_leave']) assert.ok(presented.includes(id), id);
  assert.equal(w.voiceGate.queue.length, 0);
  assert.equal(rollingVoiceStats(stamps).ok, true);
});

test('newer Bouncer phase lines supersede a stale queued phase', () => {
  const gate = createVoiceGate(), said = [];
  offerVoice(gate, 'nar_ch4', 0, id => said.push(id));
  for (const [i, id] of ['bouncer_phase2', 'bouncer_phase3', 'bouncer_defeat'].entries()) offerVoice(gate, id, i + 1, id => said.push(id));
  assert.deepEqual(gate.queue, ['bouncer_defeat']);
  flushVoiceGate(gate, 8, id => said.push(id));
  assert.deepEqual(said, ['nar_ch4', 'bouncer_defeat']);
});

test('nextVoiceAt matches the 8s gap and 3-per-60s cap', () => {
  const gate = createVoiceGate();
  for (const [t, id] of [[0, 'nar_ch4'], [8, 'claudia_s4'], [16, 'bob_s4']]) offerVoice(gate, id, t, () => {});
  assert.ok(Math.abs(nextVoiceAt(gate, 16.1) - 60) < 1e-6);
});

for (const hz of [30, 60, 120]) test(`global Adventure trace includes chapters 1–3 and the finale at ${hz} Hz`, () => {
  const r = runVoiceRate({ hz });
  assert.equal(r.cleared, true);
  assert.equal(r.rollingOk, true, JSON.stringify({ min: r.minVoiceGap, max: r.maxIn60s }));
  for (const id of ['nar_ch1', 'nar_ch2', 'nar_ch3', 'nar_ch4', 'nar_victory', 'claudia_leave', 'dad_call_01']) assert.ok(r.allCounts[id], id);
  assert.ok(r.finaleIds.includes('nar_victory'));
  assert.ok(r.finaleIds.includes('claudia_leave'));
  assert.ok(r.victoryWait <= 3, `wait ${r.victoryWait}`);
});
