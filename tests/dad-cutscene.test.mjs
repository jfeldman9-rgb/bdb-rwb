import test from 'node:test';
import assert from 'node:assert/strict';
import { playDadCall, abortDadCall, installDadKeys, installDadGestureBless, blessDadFromGesture, dadPlayerBlessed, dadVideoElement, ensureDadPlayer } from '../src/dad-call-cutscene.js';

function fakeVideo(denySound) {
  const video = {
    style: {},
    setAttribute() {}, removeAttribute() {},
    addEventListener() {}, removeEventListener() {},
    play() {
      if (denySound && !video.muted) return Promise.reject(Object.assign(new Error('nope'), { name: 'NotAllowedError' }));
      return Promise.resolve();
    },
    pause() {}, load() {},
    muted: false, volume: 1, currentTime: 0, paused: false, ended: false,
  };
  return video;
}

function fakeEl() {
  const listeners = {};
  return {
    style: {}, id: '', textContent: '', listeners,
    setAttribute() {}, appendChild() {},
    addEventListener(type, fn) { (listeners[type] ??= []).push(fn); },
    removeEventListener(type, fn) { listeners[type] = (listeners[type] || []).filter((f) => f !== fn); },
    remove() {},
    emit(type, e) { for (const fn of [...(listeners[type] || [])]) fn(e); },
  };
}

function fakeRoot({ denySound = false } = {}) {
  const listeners = {};
  const video = fakeVideo(denySound);
  let now = 0;
  const root = {
    listeners,
    overlay: null,
    now: () => now,
    setNow: (t) => { now = t; },
    performance: { now: () => now },
    addEventListener(type, fn) { (listeners[type] ??= []).push(fn); },
    removeEventListener(type, fn) { listeners[type] = (listeners[type] || []).filter((f) => f !== fn); },
    emit(type, e) { for (const fn of [...(listeners[type] || [])]) fn(e); },
    setInterval: () => 1, clearInterval() {},
    matchMedia: () => ({ matches: false }),
    navigator: { getGamepads: () => [] },
    document: {
      createElement: (tag) => (tag === 'video' ? video : fakeEl()),
      body: { appendChild(el) { root.overlay = el; } },
      addEventListener() {}, removeEventListener() {}, hidden: false,
    },
    console,
  };
  return root;
}

const flush = () => new Promise((res) => setImmediate(res));

function fakeScene(root) {
  return {
    cutRoot: root,
    game: { pause() {}, resume() {}, isPaused: false },
    events: { once() {}, off() {} },
    setPauseReason() {},
    cutscene: null,
  };
}

test('keyboard skip routes to the dad cutscene and consumes the press', () => {
  const root = fakeRoot();
  const scene = fakeScene(root);
  let done = null;
  assert.equal(playDadCall(scene, (how) => { done = how; }), true);
  assert.ok(scene.cutscene?.dad);
  // Past the per-clip guard so the key skip lands.
  root.setNow(5000);
  root.emit('keydown', { code: 'Space', preventDefault() {} });
  assert.equal(done, 'skip');
  assert.equal(scene.cutscene, null);
});

test('a non-skip key does not end the dad clip', () => {
  const root = fakeRoot();
  const scene = fakeScene(root);
  let done = null;
  assert.equal(playDadCall(scene, (how) => { done = how; }), true);
  root.setNow(5000);
  root.emit('keydown', { code: 'KeyW', preventDefault() {} });
  assert.equal(done, null);
  abortDadCall(scene);
});

test('Dad owns the dub only after the movie makes playback progress', () => {
  for (const progresses of [false, true]) {
    const root = fakeRoot(), scene = fakeScene(root);
    let presentation;
    assert.equal(playDadCall(scene, (_how, result) => { presentation = result; }), true);
    const player = ensureDadPlayer(root);
    if (progresses) {
      player.video.currentTime = .5;
      root.setNow(500);
      player.tick(player.run);
    }
    root.setNow(2000);
    root.emit('keydown', { code: 'Space', preventDefault() {} });
    assert.deepEqual(presentation, { dubbed: progresses });
  }
});

test('an idle gesture blesses the dad video before the first call, and abort keeps the element', () => {
  const root = fakeRoot();
  const scene = fakeScene(root);
  const off = installDadGestureBless(root);
  assert.equal(dadPlayerBlessed(), false);
  assert.equal(blessDadFromGesture(root), true);
  assert.equal(dadPlayerBlessed(), true);
  const video = dadVideoElement();
  assert.ok(video);
  assert.equal(playDadCall(scene, () => {}), true);
  abortDadCall(scene);
  assert.equal(scene.cutscene, null);
  assert.equal(dadVideoElement(), video, 'stage shutdown must not build a fresh unblessed element');
  assert.equal(dadPlayerBlessed(), true);
  root.setNow(5000);
  root.emit('keydown', { code: 'Space', preventDefault() {} });
  off();
  assert.ok(typeof installDadKeys === 'function');
});

test('tapping a muted dad clip for sound does not skip it', async () => {
  const root = fakeRoot({ denySound: true });
  const scene = fakeScene(root);
  const off = installDadGestureBless(root);
  let done = null;
  assert.equal(playDadCall(scene, (how) => { done = how; }), true);
  await flush(); await flush();
  root.setNow(5000);
  root.emit('pointerdown', {});
  root.overlay.emit('touchend', { type: 'touchend', preventDefault() {} });
  assert.equal(done, null, 'the unmute tap must leave the clip running');
  root.overlay.emit('touchend', { type: 'touchend', preventDefault() {} });
  assert.equal(done, 'skip');
  off();
});

test('pauseForClip owns the pause only when the game is running', async () => {
  const { pauseForClip } = await import('../src/cutscene-hooks.js');
  const game = { isPaused: false, pause() { this.isPaused = true; }, resume() { this.isPaused = false; } };
  const unpause = pauseForClip(game);
  assert.equal(game.isPaused, true);
  unpause();
  assert.equal(game.isPaused, false);
  // Already paused: leave it alone and resume nothing.
  game.isPaused = true;
  const noop = pauseForClip(game);
  noop();
  assert.equal(game.isPaused, true);
  // Gone game: never throws.
  assert.doesNotThrow(() => pauseForClip(null)());
});
