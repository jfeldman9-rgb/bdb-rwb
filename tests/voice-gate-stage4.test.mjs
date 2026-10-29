import test from 'node:test';
import assert from 'node:assert/strict';
import { Campaign } from '../src/campaign.js';
import { DAD_TIMING } from '../src/dad.js';
import { LINES } from '../src/voice-lines.js';
import {
  createVoiceGate, offerVoice, flushVoiceGate, rollingVoiceStats,
  isReservedVoice, isDubbedDadCall, isBossMomentVoice, nextVoiceAt,
} from '../src/voice-gate.js';

const voices = (w) => w.events.filter(e => e.type === 'voice').map(e => e.data);

function drain(w, said, stamps) {
  for (const e of w.events) {
    if (e.type === 'dad_callin') w.finishDadCallin();
    if (e.type !== 'voice') continue;
    said.push(e.data);
    if (!isDubbedDadCall(e.data)) stamps.push(+w.elapsed.toFixed(4));
  }
  w.events = [];
}

test('locked and scripted ids are reserved; dubbed dad_call is not presented', () => {
  assert.equal(isReservedVoice('dad_catchphrase'), true);
  assert.equal(isReservedVoice('papi_crowd_01'), true);
  assert.equal(isReservedVoice('papi_crowd_02'), true);
  assert.equal(isReservedVoice('bouncer_grab'), true);
  assert.equal(isReservedVoice('bouncer_phase2'), true);
  assert.equal(isReservedVoice('bouncer_defeat'), true);
  assert.equal(isReservedVoice('yetti_porkchop_01'), false);
  assert.equal(isReservedVoice('bob_papacito_01'), false);
  assert.equal(isDubbedDadCall('dad_call_01'), true);
  assert.equal(isDubbedDadCall('dad_catchphrase'), false);
  assert.equal(isBossMomentVoice('bouncer_phase3'), true);
  assert.equal(isBossMomentVoice('bouncer_grab'), false);
});

test('Stage 4 Dad call always yields the locked catchphrase; Papi always yields the crowd line', () => {
  const w = new Campaign({ stage: 4, rng: () => 1 });
  const said = [];
  const stamps = [];
  drain(w, said, stamps);
  w.voiceAt = [];
  w.spawnYetti('walker', 500, 630);
  w.papi.charges = 1;
  w.elapsed = 30;
  w.events = [];
  assert.equal(w.useDad(), true);
  drain(w, said, stamps);
  assert.ok(said.includes('dad_call_01'), 'dad_call is still emitted for the clip skip');
  assert.equal(stamps.length, said.filter(id => !isDubbedDadCall(id)).length);

  for (let i = 0; i < Math.ceil(DAD_TIMING.impact * 60) + 2; i++) {
    w.update(1 / 60, {});
    drain(w, said, stamps);
  }
  assert.ok(said.includes('dad_catchphrase'), 'catchphrase is queued, never dropped');
  assert.equal(LINES.dad_catchphrase[1], 'Son, sometimes you just need to use the fly swatter to keep the women away!');

  w.dad = null;
  w.dadCall.on = false;
  w.papiTime = 0;
  w.papiPending = null;
  w.spawnYetti('walker', 640, 630);
  w.papi.charges = 1;
  w.events = [];
  assert.equal(w.usePapi(), true);
  drain(w, said, stamps);
  for (let i = 0; i < 20 * 60; i++) {
    w.update(1 / 60, {});
    drain(w, said, stamps);
    if (said.some(id => id.startsWith('papi_crowd_'))) break;
  }
  assert.ok(said.some(id => id.startsWith('papi_crowd_')), 'crowd line is queued, never dropped');
  assert.equal(LINES.papi_crowd_01[1], 'We love you Papacito! Pick me!');
  assert.equal(rollingVoiceStats(stamps).ok, true);
});

test('Stage 4 gate defers locked lines instead of dropping them when the 8s window is closed', () => {
  const w = new Campaign({ stage: 4 });
  w.elapsed = 20;
  w.voiceAt = [];
  resetAndFill(w, [20, 28, 36]);
  w.events = [];
  w.emit('voice', 'dad_catchphrase');
  w.emit('voice', 'papi_crowd_01');
  w.emit('voice', 'yetti_porkchop_01');
  assert.deepEqual(voices(w), []);
  assert.deepEqual(w.voiceGate.queue, ['dad_catchphrase', 'papi_crowd_01']);

  const said = [];
  const stamps = [20, 28, 36];
  for (let t = 36.5; t <= 100; t += 0.5) {
    w.elapsed = t;
    w.events = [];
    w.flushVoice();
    for (const e of w.events) if (e.type === 'voice') {
      said.push(e.data);
      stamps.push(t);
    }
  }
  assert.deepEqual(said, ['dad_catchphrase', 'papi_crowd_01']);
  assert.equal(rollingVoiceStats(stamps).ok, true);
});

function resetAndFill(w, stamps) {
  w.voiceGate.stamps = stamps.slice();
  w.voiceGate.queue = [];
}

test('queued Bouncer phase and defeat lines play before victory, still inside the cap', () => {
  const w = new Campaign({ stage: 4 });
  w.elapsed = 141.2;
  w.voiceAt = [];
  resetAndFill(w, [125.2, 133.2, 141.2]);
  w.events = [];
  w.emit('voice', 'bouncer_phase2');
  w.emit('voice', 'bouncer_phase3');
  w.emit('voice', 'bouncer_defeat');
  assert.deepEqual(voices(w), []);
  assert.deepEqual(w.voiceGate.queue, ['bouncer_defeat']);

  w.finishStage();
  const presented = [];
  let victoryAt = null;
  for (let i = 0; i < 80 * 60 && !(w.victory && presented.some(p => p.id === 'nar_victory')); i++) {
    w.update(1 / 60, {});
    for (const e of w.events) {
      if (e.type === 'voice') presented.push({ id: e.data, t: +w.elapsed.toFixed(4) });
      if (e.type === 'victory') victoryAt = w.elapsed;
    }
    w.events = [];
  }
  const defeat = presented.find(p => p.id === 'bouncer_defeat');
  assert.ok(defeat, 'defeat is not discarded at the clear');
  assert.equal(w.victory, true);
  assert.ok(victoryAt >= defeat.t - 1e-6, 'victory waits until the queued boss line has spoken');
  assert.ok(presented.some(p => p.id === 'nar_victory'));
  assert.ok(presented.some(p => p.id === 'claudia_leave'));
  const gated = [125.2, 133.2, 141.2, defeat.t];
  assert.equal(rollingVoiceStats(gated).ok, true);
});

test('newer Bouncer phase lines supersede a stale queued phase', () => {
  const gate = createVoiceGate();
  const said = [];
  offerVoice(gate, 'nar_ch4', 0, id => said.push(id));
  offerVoice(gate, 'bouncer_phase2', 1, id => said.push(id));
  offerVoice(gate, 'bouncer_phase3', 2, id => said.push(id));
  offerVoice(gate, 'bouncer_defeat', 3, id => said.push(id));
  assert.deepEqual(gate.queue, ['bouncer_defeat']);
  flushVoiceGate(gate, 8, id => said.push(id));
  assert.deepEqual(said, ['nar_ch4', 'bouncer_defeat']);
});

test('Stages 1–3 still emit scripted lines immediately; the Stage 4 gate does not apply', () => {
  const w = new Campaign({ stage: 2 });
  w.spawnYetti('walker', 500, 630);
  w.elapsed = 12;
  w.events = [];
  assert.equal(w.useDad(), true);
  assert.ok(voices(w).includes('dad_call_01'));
  w.finishDadCallin();
  w.events = [];
  for (let i = 0; i < Math.ceil(DAD_TIMING.impact * 60); i++) w.update(1 / 60, {});
  const phrase = w.events.findIndex(e => e.type === 'voice' && e.data === 'dad_catchphrase');
  const hit = w.events.findIndex(e => e.type === 'dadhit');
  assert.ok(phrase >= 0 && hit === phrase + 1, 'catchphrase still lands on the impact in Stage 2');

  const s3 = new Campaign({ stage: 3 });
  s3.elapsed = 10;
  s3.events = [];
  s3.emit('voice', 'choir_serious');
  s3.emit('voice', 'lecturer_intervention');
  s3.emit('voice', 'dad_catchphrase');
  s3.emit('voice', 'papi_crowd_01');
  assert.deepEqual(voices(s3), ['choir_serious', 'lecturer_intervention', 'dad_catchphrase', 'papi_crowd_01']);
  assert.equal(s3.gatesVoice(), false);
});

test('one campaign clock: 30 Hz and 60 Hz present the same Stage 4 reserved stamps', () => {
  const run = (hz) => {
    const w = new Campaign({ stage: 4 });
    const stamps = [];
    w.elapsed = 0;
    w.voiceAt = [];
    w.voiceGate.stamps = [];
    w.voiceGate.queue = [];
    w.events = [];
    w.emit('voice', 'nar_ch4');
    w.emit('voice', 'dad_catchphrase');
    w.emit('voice', 'papi_crowd_01');
    w.events = [];
    const step = 1 / hz;
    for (let i = 0; i < 20 * hz; i++) {
      w.update(step, {});
      for (const e of w.events) if (e.type === 'voice') stamps.push([e.data, +w.elapsed.toFixed(4)]);
      w.events = [];
    }
    return stamps;
  };
  const at30 = run(30);
  const at60 = run(60);
  assert.deepEqual(at30.map(([id]) => id), ['dad_catchphrase', 'papi_crowd_01']);
  assert.deepEqual(at60.map(([id]) => id), ['dad_catchphrase', 'papi_crowd_01']);
  assert.ok(Math.abs(at30[0][1] - 8) < 0.04);
  assert.ok(Math.abs(at60[0][1] - 8) < 0.04);
  assert.ok(Math.abs(at30[1][1] - 16) < 0.04);
  assert.ok(Math.abs(at60[1][1] - 16) < 0.04);
  assert.equal(rollingVoiceStats(at30.map(([, t]) => t)).ok, true);
});

test('nextVoiceAt matches the 8s gap and 3-per-60s cap', () => {
  const gate = createVoiceGate();
  offerVoice(gate, 'nar_ch4', 0, () => {});
  offerVoice(gate, 'claudia_s4', 8, () => {});
  offerVoice(gate, 'bob_s4', 16, () => {});
  assert.ok(Math.abs(nextVoiceAt(gate, 16.1) - 60) < 1e-6);
});
