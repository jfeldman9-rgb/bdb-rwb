import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { STAGE_CLIPS, OPTIONAL_CLIPS } from '../src/cutscene.js';
import { createStoryPlayer } from '../src/cutscene-hooks.js';
import { Campaign } from '../src/campaign.js';
import { beginChapter, stageIntroAlreadyPlayed } from '../src/title-flow.js';

globalThis.Phaser = { Scene: class {} };
globalThis.window = globalThis;
globalThis.matchMedia = () => ({ matches: false });
globalThis.document = { getElementById: () => null };
const { GameScene } = await import('../src/game-scene.js');

function emitter() {
  const listeners = new Map();
  return {
    addEventListener(type, fn) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(fn); },
    removeEventListener(type, fn) { listeners.get(type)?.delete(fn); },
    emit(type, event = {}) { for (const fn of [...(listeners.get(type) || [])]) fn(event); },
    listenerCount() { return [...listeners.values()].reduce((n, set) => n + set.size, 0); },
  };
}

function harness() {
  let now = 0, created = 0;
  const timers = new Set();
  const video = {
    ...emitter(), style: {}, currentTime: 0, paused: false, ended: false,
    setAttribute() {}, removeAttribute(k) { delete this[k]; },
    play() { return Promise.resolve(); }, pause() {}, load() {},
  };
  const root = {
    ...emitter(), performance: { now: () => now }, navigator: { getGamepads: () => [] },
    setInterval(fn) { timers.add(fn); return fn; }, clearInterval(fn) { timers.delete(fn); },
    matchMedia: () => ({ matches: false }),
    document: {
      ...emitter(), hidden: false, body: { appendChild() {} },
      createElement(tag) {
        if (tag === 'video') { created++; return video; }
        return { ...emitter(), style: {}, setAttribute() {}, appendChild() {}, remove() {} };
      },
    },
  };
  const game = { isPaused: false, pause() { this.isPaused = true; }, resume() { this.isPaused = false; } };
  const story = createStoryPlayer(new URLSearchParams('cutscenes=1'), root, null, game);
  return { root, video, game, story, timers, get created() { return created; },
    tick(ms) { now += ms; for (const fn of [...timers]) fn(); },
  };
}

test('stage intro keys are additive and each poster alias matches its poster bytes', () => {
  assert.deepEqual(STAGE_CLIPS, {
    intro: ['intro_v3'], intro_v2: ['intro_v2'],
    stage1: ['stage1_intro'], stage2: ['stage2_intro'], stage3: ['stage3_intro'], stage4: ['stage4_intro'],
    stage5: ['stage5_intro'], stage6: ['stage6_intro'], stage7: ['stage7_intro'],
    kidnap: ['kidnap_1', 'kidnap_2'], rescue_pre_boss: ['rescue_1'], victory: ['rescue_2'],
    final_victory: ['final_victory'],
  });
  for (const id of ['stage1_intro', 'stage2_intro', 'stage3_intro', 'stage4_intro', 'stage5_intro', 'stage6_intro', 'stage7_intro', 'final_victory']) {
    const jpg = `assets/cutscenes/${id}.jpg`;
    const poster = `assets/cutscenes/${id}_poster.jpg`;
    if (!existsSync(jpg) && OPTIONAL_CLIPS.has(id)) continue;
    assert.deepEqual(readFileSync(jpg), readFileSync(poster));
  }
});

test('direct and campaign stage loads request each opener before kidnap and narration', () => {
  const w = new Campaign();
  for (const stage of [1, 2, 3, 4, 5, 6, 7]) {
    w.events = [];
    w.loadStage(stage);
    const opening = w.events.filter(e => e.type === 'cutscene').map(e => e.data);
    assert.deepEqual(opening, [2, 4].includes(stage) ? [`stage${stage}`, 'kidnap'] : [`stage${stage}`]);
    assert.ok(w.events.some(e => e.type === 'cutscene'));
    if (stage === 2) {
      assert.equal(w.voiceGate.queue.includes('nar_ch2'), false, 'stage2_intro already bakes nar_ch2');
    } else {
      assert.ok(w.voiceGate.queue.includes(`nar_ch${stage}`), 'narration waits for the global budget after the opener');
    }
  }
});

test('chapter select plays its opener once; chapter 1 follows intro_v3 with the short clip', () => {
  for (const stage of [1, 2, 3, 4, 5, 6, 7]) {
    let finish, world;
    const opener = stage === 1 ? 'intro' : `stage${stage}`;
    const key = beginChapter({ stage, query: new URLSearchParams(),
      play(clip, done) { assert.equal(clip, opener); finish = done; },
      start(introKey) { world = new Campaign({ stage, stageIntroPlayed: stageIntroAlreadyPlayed(introKey) }); },
    });
    assert.equal(world, undefined);
    assert.equal(key, opener);
    finish();
    const opening = world.events.filter(e => e.type === 'cutscene').map(e => e.data);
    assert.deepEqual(opening, stage === 1 ? ['stage1'] : [2, 4].includes(stage) ? ['kidnap'] : []);
    world.events = [];
    world.loadStage(stage);
    assert.ok(world.events.some(e => e.type === 'cutscene' && e.data === `stage${stage}`), 'a later load owns its opener again');
  }
});

test('stage 4 opener and re-kidnap share a single paused sequence and held narration', () => {
  const h = harness();
  const world = new Campaign({ stage: 4 });
  const scene = Object.create(GameScene.prototype);
  Object.assign(scene, { world, stageNo: 4, pauseReasons: new Set(), game: { ...h.game, inp: { clear() {} }, story: h.story } });
  let spoken;
  scene.playHeld = held => { spoken = held; };
  scene.handleEvents();
  assert.deepEqual(h.story.player.run.ids, ['stage4_intro', 'kidnap_1', 'kidnap_2']);
  assert.ok(scene.holdingVoice);
  assert.deepEqual(scene.voiceHold, ['nar_ch4']);
  h.video.emit('error'); // A failed stage opener still advances to the kidnap clips.
  assert.match(h.video.src, /kidnap_1.mp4$/);
  assert.ok(h.game.isPaused);
  assert.ok(world.paused);
  h.video.emit('ended');
  assert.match(h.video.src, /kidnap_2.mp4$/);
  h.video.emit('ended');
  assert.deepEqual(spoken, ['nar_ch4']);
  assert.equal(h.game.isPaused, false);
  assert.equal(world.paused, false);
  assert.equal(scene.holdingVoice, false);
  assert.equal(h.timers.size, 0);
  h.story.destroy();
});

for (const stage of [2, 3, 4]) for (const failure of ['error', 'stall', 'skip']) {
  test(`unavailable stage ${stage} opener resumes once on ${failure}`, () => {
    const h = harness();
    assert.equal(h.created, 0, 'story construction does not fetch or create media');
    let completions = 0;
    h.story.play(`stage${stage}`, () => completions++);
    assert.equal(h.game.isPaused, true);
    assert.equal(h.video.listenerCount(), 2);
    assert.equal(h.root.document.listenerCount(), 1);
    if (failure === 'error') h.video.emit('error');
    if (failure === 'stall') { h.video.currentTime = .5; h.tick(250); h.tick(3250); }
    if (failure === 'skip') { h.tick(500); h.root.emit('keydown', { code: 'Escape', preventDefault() {} }); }
    assert.equal(completions, 1);
    assert.equal(h.game.isPaused, false);
    assert.equal(h.story.player.active, false);
    assert.equal(h.timers.size, 0);
    assert.equal(h.video.src, undefined);
    assert.equal(h.video.poster, undefined);
    assert.equal(h.video.listenerCount(), 0);
    assert.equal(h.root.document.listenerCount(), 0);
    h.story.destroy();
    assert.equal(h.root.listenerCount(), 0);
  });
}

test('synchronous media refusal leaves gameplay keys unconsumed and frees every pause', () => {
  const h = harness();
  h.video.play = () => { throw new Error('unsupported media'); };
  let completions = 0, prevented = 0;
  for (let i = 0; i < 20; i++) h.story.play('stage3', () => completions++);
  h.root.emit('keydown', { code: 'Space', preventDefault() { prevented++; } });
  assert.equal(completions, 20);
  assert.equal(h.game.isPaused, false);
  assert.equal(prevented, 0, 'an inactive handle must not intercept FIRE');
  assert.equal(h.timers.size, 0);
  assert.equal(h.video.listenerCount(), 0);
  h.story.destroy();
});
