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
audio.registerLines({
  nar_victory: ['Narrator', 'And Bob? Bob was, briefly, a man of good judgment.'],
  claudia_leave: ['Claudia', "Let's leave before they reform."],
});
audio.setVoiceFiles(['nar_victory', 'claudia_leave'], ['nar_victory', 'claudia_leave']);
audio.setVoicePolicy(audio.narrationYields);

const flush = () => new Promise((res) => setImmediate(res));

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
  audio.stopSceneAudio();
  audio.setVoicePolicy(null);
  globalThis.window = savedWindow;
  globalThis.fetch = savedFetch;
});
