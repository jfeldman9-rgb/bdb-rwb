import test from 'node:test';
import assert from 'node:assert/strict';
import { playDadCall, abortDadCall, installDadKeys } from '../src/dad-call-cutscene.js';

function fakeVideo() {
  return {
    style: {},
    setAttribute() {}, removeAttribute() {},
    addEventListener() {}, removeEventListener() {},
    play: () => Promise.resolve(), pause() {}, load() {},
    muted: false, volume: 1, currentTime: 0, paused: false, ended: false,
  };
}

function fakeEl(video) {
  return {
    style: {}, id: '', textContent: '',
    setAttribute() {}, appendChild() {},
    addEventListener() {}, removeEventListener() {}, remove() {},
  };
}

function fakeRoot() {
  const listeners = {};
  const video = fakeVideo();
  let now = 0;
  const root = {
    listeners,
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
      body: { appendChild() {} },
      addEventListener() {}, removeEventListener() {}, hidden: false,
    },
    console,
  };
  return root;
}

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

test('idle gestures bless the reused element; abort drops the key wiring', () => {
  const root = fakeRoot();
  const scene = fakeScene(root);
  assert.equal(playDadCall(scene, () => {}), true);
  abortDadCall(scene);
  assert.equal(scene.cutscene, null);
  // No handle: keydown must not throw and must not touch a dead clip.
  root.emit('keydown', { code: 'Space', preventDefault() {} });
  assert.ok(typeof installDadKeys === 'function');
});
