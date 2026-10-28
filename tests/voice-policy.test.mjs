import test from 'node:test';
import assert from 'node:assert/strict';
import { narrationYields, setVoicePolicy, voiceWait, presentStage } from '../src/audio.js';
import { Campaign } from '../src/campaign.js';

test('narration keeps the next line for 2.5s and any other line yields', () => {
  assert.equal(narrationYields('bob_where_claudia_01', 'nar_ch1'), 2.5);
  assert.equal(narrationYields('bob_cory_joke_01', 'nar_kidnap'), 2.5);
  assert.equal(narrationYields('bdb_open', 'bob_where_claudia_01'), 2.5);
  assert.equal(narrationYields('claudia_open', 'bob_where_claudia_01'), 2.5);
  assert.equal(narrationYields('yetti_purple_car_01', 'bob_where_claudia_01'), 0);
  assert.equal(narrationYields('bob_hurt_01', ''), 0);
});

test('cory and yetti taunts roll about once a second, not every sim tick', () => {
  const w = new Campaign();
  w.barks.rng = () => 0;
  w.barks.coryAt = -100;
  w.barks.yettiAt = -100;
  w.events = [];
  for (let i = 0; i < 59; i++) w.update(1 / 60, {});
  const early = w.events.filter(e => e.type === 'voice' && /^(bob_cory|yetti_purple)/.test(e.data));
  assert.equal(early.length, 0);
  w.update(1 / 60, {});
  const rolled = w.events.filter(e => e.type === 'voice').map(e => e.data);
  assert.ok(rolled.some(id => id.startsWith('bob_cory_joke_')));
  assert.ok(rolled.some(id => id.startsWith('yetti_purple_car_')));
});

test('stage open installs the narration policy before the scene handles its events', () => {
  setVoicePolicy(() => 0);
  assert.equal(voiceWait('bdb_open', 'bob_where_claudia_01'), 0);
  let seen = null;
  presentStage({ handleEvents() { seen = voiceWait('bdb_open', 'bob_where_claudia_01'); } });
  assert.equal(seen, 2.5);
  setVoicePolicy(null);
});
