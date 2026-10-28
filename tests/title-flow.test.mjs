import test from 'node:test';
import assert from 'node:assert/strict';
import { beginChapter, chapterIntroKey } from '../src/title-flow.js';
import { createStoryPlayer } from '../src/cutscene-hooks.js';

test('chapter 1 plays the intro; later chapters skip the 61s opening', () => {
  assert.equal(chapterIntroKey(1, new URLSearchParams('')), 'intro');
  assert.equal(chapterIntroKey(1, new URLSearchParams('intro=v2')), 'intro_v2');
  assert.equal(chapterIntroKey(2, new URLSearchParams('intro=v2')), null);
  assert.equal(chapterIntroKey(3, new URLSearchParams('')), null);

  const played = [];
  let started = 0;
  assert.equal(beginChapter({
    stage: 2, query: new URLSearchParams(''),
    play: (key) => played.push(key), start: () => { started++; },
  }), null);
  assert.deepEqual(played, []);
  assert.equal(started, 1);

  started = 0;
  const key = beginChapter({
    stage: 1, query: new URLSearchParams(''),
    play: (clip, done) => { played.push(clip); done(); }, start: () => { started++; },
  });
  assert.equal(key, 'intro');
  assert.deepEqual(played, ['intro']);
  assert.equal(started, 1);
});

function fakeVideo() {
  return {
    style: {}, muted: false, volume: 1, currentTime: 0, paused: false, ended: false,
    setAttribute() {}, removeAttribute() {},
    addEventListener() {}, removeEventListener() {},
    play() { return Promise.resolve(); }, pause() {}, load() {},
  };
}
function fakeEl() {
  const listeners = {};
  return {
    style: {}, textContent: '',
    setAttribute() {}, appendChild() {}, remove() {},
    addEventListener(type, fn) { (listeners[type] ??= []).push(fn); },
    removeEventListener() {},
  };
}
function fakeRoot() {
  let now = 0;
  const listeners = {};
  return {
    setNow: (t) => { now = t; },
    performance: { now: () => now },
    addEventListener(type, fn) { (listeners[type] ??= []).push(fn); },
    removeEventListener() {},
    emit(type, e) { for (const fn of listeners[type] || []) fn(e); },
    setInterval: () => 1, clearInterval() {},
    matchMedia: () => ({ matches: false }),
    navigator: { getGamepads: () => [] },
    document: {
      createElement: (tag) => (tag === 'video' ? fakeVideo() : fakeEl()),
      body: { appendChild() {} },
      addEventListener() {}, removeEventListener() {}, hidden: false,
    },
  };
}
function fakeGame() {
  let paused = false;
  return {
    get isPaused() { return paused; },
    pause() { paused = true; },
    resume() { paused = false; },
  };
}

test('the intro parks Phaser and resumes it when the clip ends', () => {
  const root = fakeRoot();
  const game = fakeGame();
  const story = createStoryPlayer(new URLSearchParams('cutscenes=1'), root, null, game);
  let how = null;
  story.play('intro', (h) => { how = h; });
  assert.equal(game.isPaused, true, 'Phaser is paused behind the intro');
  root.setNow(5000);
  root.emit('keydown', { code: 'Escape', preventDefault() {} });
  assert.equal(how, 'skip');
  assert.equal(game.isPaused, false, 'the loop resumes when the intro ends');
  story.destroy();
});

test('a clip that was already paused does not resume the game early', () => {
  const root = fakeRoot();
  let paused = true;
  const game = {
    get isPaused() { return paused; },
    pause() { paused = true; },
    resume() { paused = false; },
  };
  const story = createStoryPlayer(new URLSearchParams('cutscenes=1'), root, null, game);
  let ended = false;
  story.play('kidnap', () => { ended = true; });
  assert.equal(game.isPaused, true);
  root.setNow(5000);
  root.emit('keydown', { code: 'Enter', preventDefault() {} });
  assert.equal(ended, true);
  assert.equal(game.isPaused, true, 'the outer pause owner still holds the loop');
  story.destroy();
});
