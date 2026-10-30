import test from 'node:test';
import assert from 'node:assert/strict';
import { beginChapter, chapterIntroKey, stageIntroAlreadyPlayed } from '../src/title-flow.js';
import { createStoryPlayer } from '../src/cutscene-hooks.js';
import { STAGE_CLIPS } from '../src/cutscene.js';

test('a fresh chapter-1 start plays intro_v3; the short clip is the retry', () => {
  assert.equal(chapterIntroKey(1, new URLSearchParams('')), 'intro');
  assert.deepEqual(STAGE_CLIPS.intro, ['intro_v3']);
  assert.equal(chapterIntroKey(1, new URLSearchParams('intro=v2')), 'intro_v2');
  assert.equal(chapterIntroKey(1, new URLSearchParams('intro=v3')), 'intro');
  assert.equal(chapterIntroKey(1, new URLSearchParams('intro=short')), 'stage1');
  assert.equal(chapterIntroKey(1, new URLSearchParams('resume=1')), 'stage1');
  assert.equal(chapterIntroKey(2, new URLSearchParams('intro=v2')), 'stage2');
  assert.equal(chapterIntroKey(3, new URLSearchParams('')), 'stage3');
  assert.equal(chapterIntroKey(4, new URLSearchParams('')), 'stage4');
  assert.equal(chapterIntroKey(5, new URLSearchParams('')), 'stage5');
  assert.equal(chapterIntroKey(6, new URLSearchParams('')), 'stage6');
  assert.equal(chapterIntroKey(7, new URLSearchParams('')), 'stage7');
  assert.equal(stageIntroAlreadyPlayed('intro'), false);
  assert.equal(stageIntroAlreadyPlayed('intro_v2'), false);
  assert.equal(stageIntroAlreadyPlayed('stage1'), true);
  assert.equal(stageIntroAlreadyPlayed(null), false);

  const played = [];
  let started = null;
  assert.equal(beginChapter({
    stage: 1, query: new URLSearchParams(''),
    play: (key, done) => { played.push(key); done(); },
    start: (introKey) => { started = introKey; },
  }), 'intro');
  assert.deepEqual(played, ['intro']);
  assert.equal(started, 'intro');
  assert.equal(stageIntroAlreadyPlayed(started), false, 'gameplay still requests the short clip after intro_v3');

  played.length = 0;
  assert.equal(beginChapter({
    stage: 1, query: new URLSearchParams('resume=1'),
    play: (key, done) => { played.push(key); done(); },
    start: (introKey) => { started = introKey; },
  }), 'stage1');
  assert.deepEqual(played, ['stage1']);
  assert.equal(stageIntroAlreadyPlayed(started), true, 'a stage-1 retry does not stack a second short clip');

  played.length = 0;
  assert.equal(beginChapter({
    stage: 2, query: new URLSearchParams(''),
    play: (key, done) => { played.push(key); done(); }, start: () => { started = 'go'; },
  }), 'stage2');
  assert.deepEqual(played, ['stage2']);
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

test('a second clip resumes the pause the first one took', () => {
  const root = fakeRoot();
  let pauses = 0, resumes = 0, paused = false;
  const game = {
    get isPaused() { return paused; },
    pause() { paused = true; pauses++; },
    resume() { paused = false; resumes++; },
  };
  const story = createStoryPlayer(new URLSearchParams('cutscenes=1'), root, null, game);
  story.play('kidnap', () => {});
  assert.equal(pauses, 1);
  story.play('rescue_pre_boss', () => {});
  assert.equal(resumes, 1, 'the live clip releases its pause');
  assert.equal(pauses, 2);
  assert.equal(game.isPaused, true);
  story.destroy();
  assert.equal(game.isPaused, false);
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
