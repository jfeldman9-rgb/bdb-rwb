import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';

test('placeholder music ids reuse one media element/source and preserve playhead, gain, and lifecycle', async () => {
  const previousWindow = globalThis.window, previousAudio = globalThis.Audio;
  const elements = [], sources = [];
  const param = () => ({ value: 1, cancelScheduledValues() {}, setValueAtTime(v) { this.value = v; }, linearRampToValueAtTime(v) { this.value = v; } });
  const node = () => ({ connect() {}, disconnect() { this.disconnected = true; }, gain: param() });
  globalThis.Audio = class {
    constructor(url) { this.url = url; this.currentTime = 0; this.paused = true; this.plays = 0; this.pauses = 0; elements.push(this); }
    play() { this.plays++; this.paused = false; return Promise.resolve(); }
    pause() { this.pauses++; this.paused = true; }
    removeAttribute() { this.removed = true; }
    load() {}
  };
  globalThis.window = {
    addEventListener() {}, removeEventListener() {},
    AudioContext: class {
      constructor() { this.currentTime = 0; this.state = 'running'; this.destination = {}; }
      createGain() { return node(); }
      createDynamicsCompressor() { return { ...node(), threshold: param(), knee: param(), ratio: param(), attack: param(), release: param() }; }
      createMediaElementSource() { const src = node(); sources.push(src); return src; }
      suspend() { this.state = 'suspended'; return Promise.resolve(); }
      resume() { this.state = 'running'; return Promise.resolve(); }
      close() { this.state = 'closed'; return Promise.resolve(); }
    },
  };
  const audio = await import('../src/audio.js');
  const game = { events: new EventEmitter() };
  const life = audio.installAudioLifecycle(game);
  try {
    audio.unlock();
    audio.playTrack('title');
    elements[0].currentTime = 38;
    for (const id of Object.keys(audio.MUSIC)) {
      audio.playTrack(id);
      assert.equal(audio.musicState().current, id);
      assert.equal(audio.musicState().wanted, id);
      assert.equal(audio.musicState().gain, .65);
    }
    assert.equal(elements.length, 1);
    assert.equal(sources.length, 1);
    assert.equal(elements[0].currentTime, 38);
    assert.equal(elements[0].plays, 1);
    assert.equal(elements[0].pauses, 0);
    audio.duckStageBed(true);
    audio.playTrack('stage5');
    assert.equal(audio.musicState().gain, .65 * .35);
    audio.duckStageBed(false);
    assert.equal(audio.musicState().gain, .65);
    audio.setGameAudioPaused(true);
    assert.equal(elements[0].paused, true);
    audio.setGameAudioPaused(false);
    assert.equal(elements[0].paused, false);
    audio.playTrack('boss5', { restart: true });
    assert.equal(elements[0].currentTime, 0, 'explicit restart still works');
    audio.playTrack(null, { fade: 0 });
    assert.equal(elements[0].paused, true);
    audio.playTrack('stage6');
    assert.equal(elements.length, 1);
    life.destroy();
    assert.equal(elements[0].removed, true);
    assert.equal(sources[0].disconnected, true);
    audio.playTrack('stage7');
    assert.equal(elements.length, 2, 'teardown removes every alias of the old node');
  } finally {
    audio.playTrack(null, { fade: 0 });
    audio.installAudioLifecycle({ events: new EventEmitter() }).destroy();
    globalThis.window = previousWindow; globalThis.Audio = previousAudio;
  }
});
