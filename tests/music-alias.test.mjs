import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { existsSync } from 'node:fs';

test('shared-url music ids reuse one media element; distinct beds get their own', async () => {
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
    const shared = ['title', 'stage1', 'boss1', 'stage2', 'boss2', 'stage3', 'boss3', 'stage4', 'boss4'];
    for (const id of shared) {
      audio.playTrack(id);
      assert.equal(audio.musicState().current, id);
      assert.equal(audio.musicState().wanted, id);
      assert.equal(audio.musicState().gain, .65);
    }
    assert.equal(elements.length, 1, 'placeholder ids still share one element');
    assert.equal(sources.length, 1);
    assert.equal(elements[0].currentTime, 38);
    assert.equal(elements[0].plays, 1);
    assert.equal(elements[0].pauses, 0);

    audio.duckStageBed(true);
    audio.playTrack('stage5');
    assert.equal(elements.length, 2, 'stage5 bed creates its own element');
    assert.equal(audio.musicState().gain, .65 * .35);
    audio.duckStageBed(false);
    assert.equal(audio.musicState().gain, .65);

    audio.setGameAudioPaused(true);
    assert.equal(elements[1].paused, true);
    audio.setGameAudioPaused(false);
    assert.equal(elements[1].paused, false);

    audio.playTrack('boss5', { restart: true });
    assert.equal(elements.length, 3, 'boss5 has a distinct URL');
    assert.equal(elements[2].currentTime, 0, 'explicit restart still works');

    audio.playTrack(null, { fade: 0 });
    assert.equal(elements[2].paused, true);
    audio.playTrack('stage6');
    assert.equal(elements.length, 4);

    assert.ok(audio.MUSIC.yetti_anthem, 'yetti_anthem asset is registered');
    assert.equal(audio.MUSIC.yetti_anthem.url, 'assets/audio/yetti-anthem.mp3');
    assert.ok(existsSync(new URL('../assets/audio/yetti-anthem.mp3', import.meta.url)));
    // Not assigned to any stageN/bossN id.
    for (const id of Object.keys(audio.MUSIC)) {
      if (id === 'yetti_anthem') continue;
      assert.notEqual(audio.MUSIC[id].url, audio.MUSIC.yetti_anthem.url);
    }

    life.destroy();
    assert.equal(elements.at(-1).removed, true);
    assert.equal(sources.at(-1).disconnected, true);
    audio.playTrack('stage7');
    assert.ok(elements.length >= 5, 'teardown drops prior nodes; stage7 opens a fresh element');
  } finally {
    audio.playTrack(null, { fade: 0 });
    audio.installAudioLifecycle({ events: new EventEmitter() }).destroy();
    globalThis.window = previousWindow; globalThis.Audio = previousAudio;
  }
});
