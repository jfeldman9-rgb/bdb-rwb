import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { narrationYields } from '../src/audio.js';
import { Campaign } from '../src/campaign.js';

test('narration keeps the next line for 2.5s and any other line yields', () => {
  assert.equal(narrationYields('bob_where_claudia_01', 'nar_ch1'), 2.5);
  assert.equal(narrationYields('bob_cory_joke_01', 'nar_kidnap'), 2.5);
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

test('the scene installs that policy before it handles the new stage events', async () => {
  const src = await readFile('src/game-scene.js', 'utf8');
  const create = src.slice(src.indexOf(' create()'), src.indexOf(' setBloom'));
  assert.ok(create.includes('setVoicePolicy(narrationYields)'));
  assert.ok(create.indexOf('setVoicePolicy(narrationYields)') < create.indexOf('this.handleEvents()'));
});
