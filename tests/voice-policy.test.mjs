import test from 'node:test';
import assert from 'node:assert/strict';
import { narrationYields, setVoicePolicy, voiceWait, presentStage } from '../src/audio.js';
import { Campaign } from '../src/campaign.js';

test('narration keeps the next line for 2.5s and any other line yields', () => {
  assert.equal(narrationYields('bob_where_claudia_01', 'nar_ch1'), 2.5);
  assert.equal(narrationYields('bob_cory_joke_01', 'nar_kidnap'), 2.5);
  assert.equal(narrationYields('bdb_open', 'bob_where_claudia_01'), 2.5);
  assert.equal(narrationYields('claudia_open', 'bob_where_claudia_01'), 2.5);
  assert.equal(narrationYields('yetti_purple_car_01', 'bob_where_claudia_01'), 2.5);
  assert.equal(narrationYields('bob_hurt_01', ''), 0);
  assert.equal(narrationYields('papi_crowd_01', 'bob_where_claudia_01'), 'interrupt');
  assert.equal(narrationYields('papi_crowd_02', 'nar_ch1'), 'interrupt');
  for (const id of ['papi_chorus', 'bob_papiwait_01', 'bob_papi_01']) assert.equal(narrationYields(id, 'nar_ch1'), 'interrupt');
  assert.equal(narrationYields('bob_papacito_01', 'papi_crowd_01'), 2.5);
});

test('cory and yetti taunts roll about once a second, not every sim tick', () => {
  const w = new Campaign({ stage: 2 });
  w.barks.rng = () => 0;
  w.barks.coryAt = -1e9;
  w.barks.yettiAt = -1e9;
  w.events = [];
  for (let i = 0; i < 59; i++) w.update(1 / 60, {});
  const early = w.events.filter(e => e.type === 'voice' && /^(bob_cory|yetti_purple)/.test(e.data));
  assert.equal(early.length, 0);
  w.update(1 / 60, {});
  const rolled = [...w.events.filter(e => e.type === 'voice').map(e => e.data), ...w.voiceGate.queue, ...Object.values(w.barks.held).map(o => o.id)];
  assert.ok(rolled.some(id => id.startsWith('yetti_purple_car_')));
  assert.equal(w.events.some(e => /^bob_cory_joke_/.test(e.data)), false);
  assert.deepEqual(w.voiceGate.queue, [], 'ambient waits outside the durable scripted queue');
  for (let i = 0; i < 60 * 60 + 3; i++) w.update(1 / 60, {});
  const later = w.events.filter(e => e.type === 'voice').map(e => e.data);
  assert.ok(later.some(id => id.startsWith('yetti_purple_car_')));
  assert.ok(w.barks.coryAt > 0, 'Cory actually gets a legal presentation slot');
});

test('stage open installs the narration policy before the scene handles its events', () => {
  setVoicePolicy(() => 0);
  assert.equal(voiceWait('bdb_open', 'bob_where_claudia_01'), 0);
  let seen = null;
  presentStage({ handleEvents() { seen = voiceWait('bdb_open', 'bob_where_claudia_01'); } });
  assert.equal(seen, 2.5);
  setVoicePolicy(null);
});
