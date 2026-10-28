import test from 'node:test';
import assert from 'node:assert/strict';
import { Campaign } from '../src/campaign.js';
import { runVoiceRate } from '../tools/voice-rate.mjs';
import { dadCallDubbed } from '../src/dad-call-cutscene.js';

test('stage 1 opening is nar_ch1 and bdb_open, with no intro repeat', () => {
  const w = new Campaign({ rng: () => 1 });
  const said = w.events.filter((e) => e.type === 'voice').map((e) => e.data);
  w.events = [];
  for (let i = 0; i < 6 * 60; i++) {
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
  assert.equal(ids.nar_intro_01 || 0, 0);
  assert.equal(ids.nar_intro_02 || 0, 0);
  assert.equal(ids.nar_intro_03 || 0, 0);
  assert.equal(ids.nar_kidnap || 0, 0);
});

test('Dad call voice is skipped over a D clip and still emitted when cutscenes are off', () => {
  const w = new Campaign({ stage: 2 });
  w.spawnYetti('walker', 500, 630);
  w.events = [];
  assert.equal(w.useDad(), true);
  const order = w.events.map((e) => (e.type === 'voice' ? `voice:${e.data}` : e.type));
  const call = order.indexOf('dad_callin');
  const line = order.findIndex((item) => item.startsWith('voice:dad_call_'));
  assert.ok(call >= 0 && call < line, order.join(','));
  assert.equal(dadCallDubbed('dad_call_01', { dad: true }), true);
  assert.equal(dadCallDubbed('dad_call_02', null), false);
  assert.equal(dadCallDubbed('dad_catchphrase', { dad: true }), false);
  assert.equal(dadCallDubbed('bdb_open', { dad: true }), false);
});
