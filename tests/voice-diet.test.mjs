import test from 'node:test';
import assert from 'node:assert/strict';
import { Campaign } from '../src/campaign.js';
import { runVoiceRate } from '../tools/voice-rate.mjs';
import { dadCallDubbed } from '../src/dad-call-cutscene.js';

test('stage 1 opening is nar_ch1 and bdb_open, with no intro repeat', () => {
  const w = new Campaign({ rng: () => 1 });
  const said = w.events.filter((e) => e.type === 'voice').map((e) => e.data);
  w.events = [];
  for (let i = 0; i < 8 * 60 + 1; i++) {
    w.update(1 / 60, {});
    for (const e of w.events) if (e.type === 'voice') said.push(e.data);
    w.events = [];
  }
  assert.deepEqual(said, ['nar_ch1', 'bdb_open']);
});

test('a seeded Adventure run stays under 4 ambient lines a minute', () => {
  const r = runVoiceRate({ hz: 60 });
  assert.equal(r.cleared, true);
  assert.ok(r.ambientPerMin <= 4, `ambient ${r.ambientPerMin}/min`);
  assert.ok(r.totalPerMin <= 7, `total ${r.totalPerMin}/min`);
  assert.ok(r.minAmbientGap >= 8 - 0.05, `gap ${r.minAmbientGap}`);
  const ids = r.allCounts;
  const count = (re) => Object.keys(ids).filter((k) => re.test(k)).reduce((n, k) => n + ids[k], 0);
  assert.ok(ids.bdb_open >= 1);
  assert.ok(ids.bdb_produce >= 1);
  assert.ok(count(/^yetti_porkchop_/) >= 1);
  assert.ok(count(/^yetti_colombian_room_/) >= 1);
  assert.ok(count(/^yetti_purple_car_/) >= 1);
  assert.ok(ids.dad_catchphrase >= 1);
  assert.ok(count(/^bob_where_claudia_/) >= 1);
  assert.ok(count(/^bob_cory_joke_/) >= 1);
  assert.ok(r.playerCounts.papi_chorus >= 1);
  assert.equal(r.rollingOk, true);
  assert.equal(ids.nar_intro_01 || 0, 0);
  assert.equal(ids.nar_intro_02 || 0, 0);
  assert.equal(ids.nar_intro_03 || 0, 0);
  assert.equal(ids.nar_kidnap || 0, 0);
});

test('only a confirmed Dad movie owns the dub; no-movie fallback consumes the global budget', () => {
  for (const dubbed of [false, true]) {
    const w = new Campaign({ stage: 2 });
    w.spawnYetti('walker', 500, 630);
    w.elapsed = 30; w.events = [];
    assert.equal(w.useDad(), true);
    assert.ok(w.events.some(e => e.type === 'dad_callin'));
    assert.equal(w.events.some(e => e.type === 'voice'), false, 'ownership is unresolved');
    w.finishDadCallin({ dubbed });
    assert.equal(w.events.some(e => e.data === 'dad_call_01'), !dubbed);
    assert.deepEqual(w.voiceGate.stamps, dubbed ? [0] : [0, 30]);
    w.emit('voice', 'dad_catchphrase');
    assert.equal(w.voiceGate.queue.includes('dad_catchphrase'), !dubbed);
  }
  assert.equal(dadCallDubbed('dad_call_01', { dad: true }), true);
  assert.equal(dadCallDubbed('dad_call_02', null), false);
  assert.equal(dadCallDubbed('dad_catchphrase', { dad: true }), false);
});

// Queue one held line and one same-step offer, then make the gate eligible.
function queueAmbient(w) {
  // Inject already-admitted requests: new requests are now suppressed while
  // the shared gate is busy, but old locked offers still have to survive.
  w.barks.held.where = { group: 'where', id: 'bob_where_claudia_01' };
  w.barks.offers.push({ group: 'produce', id: 'bdb_produce' });
  assert.ok(w.barks.held.where);
  assert.equal(w.barks.offers.length, 1);
}

test('Dad call-in tick cannot flush ambient before finishDadCallin creates Dad', () => {
  const w = new Campaign({ stage: 2, rng: () => 1 });
  w.spawnYetti('walker', 500, 630);
  w.events = [];
  queueAmbient(w);
  let flushes = 0;
  const flush = w.flushAmbient.bind(w);
  w.flushAmbient = () => { flushes++; flush(); };
  w.update(1 / 60, { dad: true });
  assert.ok(w.events.some((e) => e.type === 'dad_callin'));
  assert.equal(w.dad, null, 'call-in cutscene has not finished');
  assert.equal(w.dadCall.on, true);
  assert.equal(flushes, 0);
  assert.deepEqual(w.events.filter((e) => e.type === 'voice'), []);
  assert.ok(w.voiceGate.queue.includes('bdb_produce'), 'locked ambient transfers before the set-piece');
  assert.equal(Object.keys(w.barks.held).length, 0);
  assert.equal(w.barks.offers.length, 0);
  // The pending cutscene stays guarded on subsequent ticks too.
  w.update(1 / 60, {});
  assert.equal(flushes, 0);
});

for (const setPiece of ['papi', 'dad']) {
  test(`${setPiece} discards stale ambient before, during, and at the end of its window`, () => {
    const w = new Campaign({ stage: 2, rng: () => 1 });
    w.spawnYetti('walker', 500, 630);
    w.papi.charges = 1;
    queueAmbient(w);
    assert.equal(setPiece === 'papi' ? w.usePapi() : w.useDad(), true);
    assert.equal(Object.keys(w.barks.held).length, 0);
    assert.equal(w.barks.offers.length, 0);
    if (setPiece === 'dad') w.finishDadCallin();
    w.events = [];
    // KOs can offer ambient laughs while combat is frozen.
    queueAmbient(w);
    w.update(0.1, {});
    assert.equal(Object.keys(w.barks.held).length, 0);
    assert.equal(w.barks.offers.length, 0);
    queueAmbient(w);
    w.update(2.4, {});
    assert.equal(w.papiTime, 0);
    assert.equal(w.dad, null);
    w.flushAmbient();
    assert.ok(!w.events.some((e) => e.type === 'voice' && ['bob_where_claudia_01', 'bdb_produce'].includes(e.data)));
    while (w.voiceGate.queue.length) { w.elapsed += 60; w.flushVoice(); }
    w.elapsed += 60;
    assert.equal(w.ambient('produce', 'bdb_produce'), true, 'fresh combat barks still work');
  });
}

test('stage load resets deferred Yetti barks and restarts every-third-attack cadence', () => {
  const w = new Campaign({ rng: () => 1 });
  w.barks.porkDue = true;
  w.barks.tauntId = 'yetti_purple_car_01';
  w.barks.lastYetti = 'pork';
  w.barks.attackN = 5;
  queueAmbient(w);
  w.loadStage(2);
  assert.equal(w.barks.porkDue, false);
  assert.equal(w.barks.tauntId, null);
  assert.equal(w.barks.lastYetti, null);
  assert.equal(w.barks.attackN, 0);
  assert.equal(Object.keys(w.barks.held).length, 0);
  assert.equal(w.barks.offers.length, 0);
  w.events = [];
  w.yellYettiAttack();
  w.yellYettiAttack();
  assert.equal(w.events.length, 0, 'the first two telegraphs must stay quiet');
  w.yellYettiAttack();
  assert.equal(w.barks.porkDue, true, 'telegraph stays due while scripted queue is busy');
  assert.equal(w.voiceGate.queue.some(id => /^yetti_porkchop_/.test(id)), false);
  assert.ok(w.voiceGate.queue.includes('bdb_produce'), 'stage load preserves a held locked quote');
  while (w.voiceGate.queue.length) { w.elapsed += 60; w.flushVoice(); }
  w.elapsed += 60; w.yellYettiAttack();
  assert.ok(w.events.some(e => e.type === 'voice' && /^yetti_porkchop_/.test(e.data)));
});

for (let stage = 1; stage <= 7; stage++) test(`stage ${stage} fills legal slots without an ambient backlog`, () => {
  const r = runVoiceRate({ hz: 60, stage });
  assert.equal(r.cleared, true);
  assert.equal(r.rollingOk, true);
  assert.equal(r.maxIn60s, 3);
  assert.ok(r.minVoiceGap >= 8);
  assert.ok(r.queued.length <= 5, JSON.stringify(r.queued));
  // A fresh stage reaches the maximal 0/8/16, 60/68/76... schedule;
  // player callouts do not reset or postpone the budget clock.
  const end = r.stageTimes[0];
  const legalSlots = Array.from({ length: Math.ceil(end / 60) }, (_, m) => [m * 60, m * 60 + 8, m * 60 + 16])
    .flat().filter(t => t <= end + 1e-6).length;
  assert.equal(r.voiceAt.filter(t => t <= end + 1e-6).length, legalSlots);
  assert.ok(r.playerTriggered >= 3);
});
