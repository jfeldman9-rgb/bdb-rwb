import test from 'node:test';
import assert from 'node:assert/strict';

// Fake WebAudio backend with a controllable clock and scripted line durations.
let now = 0;
let durations = [];
const started = [];
const sources = [];
const param = (v = 0) => ({
  value: v,
  setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {},
});
const fakeNode = () => ({ connect() {}, disconnect() {}, gain: param(1) });
class FakeSource {
  constructor() { this.onended = null; this.stopped = false; this.clipId = null; sources.push(this); }
  connect() {}
  disconnect() {}
  start() { started.push(this.clipId); }
  stop() {}
  end() { this.onended?.(); }
}
const savedWindow = globalThis.window;
const savedFetch = globalThis.fetch;
globalThis.window = {
  AudioContext: class {
    constructor() { this.state = 'running'; this.destination = {}; this.sampleRate = 44100; }
    get currentTime() { return now; }
    createGain() { return fakeNode(); }
    createBufferSource() { return new FakeSource(); }
    createDynamicsCompressor() {
      return { threshold: param(), knee: param(), ratio: param(), attack: param(), release: param(), connect() {} };
    }
    decodeAudioData(b, ok) { ok({ duration: durations.length ? durations.shift() : 1 }); }
    close() { return Promise.resolve(); }
  },
};
globalThis.fetch = async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) });

const audio = await import('../src/audio.js');
const LINES = {
  nar_victory: ['Narrator', 'And Bob? Bob was, briefly, a man of good judgment.'],
  claudia_leave: ['Claudia', "Let's leave before they reform."],
  nar_ch1: ['Narrator', 'Chapter One. The Boulevard of Better Judgment.'],
  nar_ch3: ['Narrator', "Chapter Three. Claudia's Moonlit Keep."],
  bob_where_claudia_01: ['Bob', 'Where is Claudia???'],
  bdb_open: ['Bob', 'I brought the eggplant.'],
  claudia_open: ['Claudia', 'Bob. Winged Yettis locked me in Moonlit Keep.'],
  line_a: ['Narrator', 'One.'],
  line_b: ['Claudia', 'Two.'],
  line_c: ['Bob', 'Three.'],
  dad_call_02: ['Dad', 'Yettis? In this economy? Get outta heah!'],
  dad_catchphrase: ['Dad', 'Son, sometimes you just need to use the fly swatter to keep the women away!'],
  papi_crowd_01: ['Crowd', 'We love you Papacito! Pick me!'],
  papi_chorus: ['Runners', 'Papi! Papi! PAPI!'],
  bob_papiwait_01: ['Bob', 'Need the ladies!'],
  bob_papi_01: ['Bob', 'Not now, ladies!'],
  bob_papacito_01: ['Bob', "I'm the Papacito!"],
};
audio.registerLines(LINES);
audio.setVoiceFiles(Object.keys(LINES), Object.keys(LINES));
audio.setVoicePolicy(audio.narrationYields);

const flush = () => new Promise((res) => setImmediate(res));
const reset = () => {
  audio.stopSceneAudio();
  audio.releaseClips(Object.keys(LINES));
  started.length = 0; sources.length = 0; now = 0; durations = [];
};

test.after(() => {
  audio.stopSceneAudio();
  audio.setVoicePolicy(null);
  globalThis.window = savedWindow;
  globalThis.fetch = savedFetch;
});

test('a line queued behind a longer narration survives until its turn', async () => {
  durations = [3.94, 1.5];
  const captions = [];
  const cap = (who, line) => captions.push(`${who}: ${line}`);
  audio.say('nar_victory', cap);
  audio.say('claudia_leave', cap);
  await flush(); await flush();
  assert.deepEqual(started, ['nar_victory'], 'long narration starts; follow-up waits');
  assert.equal(captions.length, 1);
  // Past the old fixed 2.5 s budget the follow-up must still be queued, not dropped.
  now = 3.5;
  assert.equal(audio.voiceBusy('claudia_leave'), true);
  // The narration ends naturally; the queued line plays and captions.
  sources.at(-1).end();
  await flush(); await flush();
  assert.deepEqual(started, ['nar_victory', 'claudia_leave']);
  assert.equal(captions.length, 2);
  assert.match(captions[1], /Claudia/);
  sources.at(-1).end();
  reset();
});

test('stage 1 still says "I brought the eggplant." after the where-bark', async () => {
  durations = [3.336, 2.116, 1.2];
  const cap = () => {};
  audio.say('nar_ch1', cap);
  audio.say('bob_where_claudia_01', cap);
  await flush(); await flush();
  now = 3.336;
  sources.at(-1).end();
  await flush(); await flush();
  now = 4;
  audio.say('bdb_open', cap);
  assert.equal(audio.voiceBusy('bdb_open'), true, 'bdb_open queued behind the where-bark');
  now = 5.452;
  sources.at(-1).end();
  await flush(); await flush();
  assert.ok(started.includes('bdb_open'));
  reset();
});

test('stage 3 claudia_open outlasts the where-bark that starts after it was queued', async () => {
  durations = [2.856, 2.116, 3.864];
  const cap = () => {};
  audio.say('nar_ch3', cap);
  audio.say('bob_where_claudia_01', cap);
  await flush(); await flush();
  now = 2;
  audio.say('claudia_open', cap);
  now = 2.856;
  sources.at(-1).end();
  await flush(); await flush();
  now = 4.6;
  assert.equal(audio.voiceBusy('claudia_open'), true, 'deadline stretched past the old 4.5s expiry');
  now = 4.972;
  sources.at(-1).end();
  await flush(); await flush();
  assert.ok(started.includes('claudia_open'));
  reset();
});

test('the Dad catchphrase waits behind the call line instead of being dropped', async () => {
  durations = [3.2, 4.61];
  const cap = () => {};
  audio.say('dad_call_02', cap);
  audio.say('dad_catchphrase', cap);
  await flush(); await flush();
  assert.deepEqual(started, ['dad_call_02']);
  assert.equal(audio.voiceBusy('dad_catchphrase'), true, 'impact line stays queued while the call is sounding');
  now = 3.2;
  sources.at(-1).end();
  await flush(); await flush();
  assert.ok(started.includes('dad_catchphrase'));
  reset();
});

test('a third queued line waits out the line ahead of it', async () => {
  durations = [3.4, 3.9, 1];
  const cap = () => {};
  audio.say('line_a', cap);
  audio.say('line_b', cap, true, false, { wait: 2.5 });
  audio.say('line_c', cap, true, false, { wait: 5 });
  await flush(); await flush();
  now = 3.4;
  sources.at(-1).end();
  await flush(); await flush();
  now = 5.1;
  assert.equal(audio.voiceBusy('line_c'), true, 'third line still queued while the second is sounding');
  now = 7.3;
  sources.at(-1).end();
  await flush(); await flush();
  assert.ok(started.includes('line_c'));
  reset();
});

test('Papacito refusal, crowd and chorus actually start over a busy narration', async () => {
  for (const id of ['bob_papiwait_01', 'bob_papi_01', 'papi_crowd_01', 'papi_chorus']) {
    durations = [4, 2];
    audio.say('nar_ch1', () => {});
    await flush(); await flush();
    audio.say(id, () => {});
    await flush(); await flush();
    assert.deepEqual(started, ['nar_ch1', id]);
    reset();
  }
});

test('finisher brag and approved ambient wait behind Papacito without being dropped', async () => {
  durations = [2.43, 2.35, 2];
  audio.say('papi_crowd_01', () => {});
  audio.say('bob_papacito_01', () => {});
  await flush(); await flush();
  assert.deepEqual(started, ['papi_crowd_01']);
  assert.equal(audio.voiceBusy('bob_papacito_01'), true);
  now = 2.43; sources.at(-1).end();
  await flush(); await flush();
  assert.deepEqual(started, ['papi_crowd_01', 'bob_papacito_01']);
  audio.say('bob_where_claudia_01', () => {});
  assert.equal(audio.voiceBusy('bob_where_claudia_01'), true);
  now = 4.78; sources.at(-1).end();
  await flush(); await flush();
  assert.deepEqual(started, ['papi_crowd_01', 'bob_papacito_01', 'bob_where_claudia_01']);
  reset();
});
