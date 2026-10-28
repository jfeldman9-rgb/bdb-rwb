import test from 'node:test';
import assert from 'node:assert/strict';

const noop = () => {};
globalThis.Phaser = { Scene: class {} };
globalThis.window = globalThis;
globalThis.document = {
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener: noop,
  removeEventListener: noop,
  body: { classList: { add: noop, remove: noop } },
};
globalThis.matchMedia = () => ({ matches: false, addEventListener: noop, removeEventListener: noop });
globalThis.addEventListener = noop;
globalThis.removeEventListener = noop;

const { GameScene } = await import('../src/game-scene.js');
const { pauseForClip } = await import('../src/cutscene-hooks.js');

test('a stage change leaves the kidnap cutscene for the new scene to pause', () => {
  const events = [{ type: 'cutscene', data: 'kidnap' }, { type: 'voice', data: 'nar_kidnap' }];
  const world = {
    stageNo: 2, events, paused: false, victory: false, camX: 0, locked: false, papiTime: 0, dad: null,
    bob: { x: 0, y: 630, z: 0, facing: 1, state: 'idle', alive: true },
    enemies: [],
  };
  let restarted = null;
  const scene = Object.create(GameScene.prototype);
  scene.switching = false;
  scene.stageNo = 1;
  scene.world = world;
  scene.accumulator = 0;
  scene.pauseReasons = new Set();
  scene.finished = false;
  scene.game = {
    inp: { update() {}, take() { return false; }, snapshot() { return {}; }, clear() {} },
    story: { play(key) { scene.played = key; } },
  };
  scene.scene = { restart(data) { restarted = data; } };
  scene.hud = { say() {}, update() {} };
  const boot = { hidden: true };
  const prevGet = document.getElementById;
  document.getElementById = (id) => (id === 'boot' ? boot : null);
  try { scene.update(0, 0); }
  finally { document.getElementById = prevGet; }
  assert.equal(restarted?.world, world);
  assert.equal(boot.hidden, false);
  assert.deepEqual(world.events.map(e => e.type), ['cutscene', 'voice']);
  assert.equal(scene.pauseReasons.has('cutscene'), false);

  scene.stageNo = 2;
  scene.switching = false;
  scene.handleEvents();
  assert.equal(scene.played, 'kidnap');
  assert.equal(scene.pauseReasons.has('cutscene'), true);
  assert.equal(world.paused, true);
  assert.equal(world.events.length, 0);
});

test('a held clip lets the story player own the Phaser pause', () => {
  let pauses = 0;
  const scene = Object.create(GameScene.prototype);
  scene.world = { paused: false, bossActive: false, stageNo: 2 };
  scene.pauseReasons = new Set();
  scene.game = {
    isPaused: false,
    pendingDestroy: false,
    inp: { clear() {} },
    pause() { pauses++; this.isPaused = true; },
    resume() { this.isPaused = false; },
    story: {
      play(key, done) {
        const unpause = pauseForClip(scene.game);
        scene.played = key;
        scene.finish = () => { unpause(); done(); };
      },
    },
  };
  scene.startHeldClip('kidnap', () => { scene.released = true; });
  assert.equal(pauses, 1, 'startHeldClip does not pause before the story player');
  assert.equal(scene.game.isPaused, true);
  scene.finish();
  assert.equal(scene.released, true);
  assert.equal(scene.game.isPaused, false, 'the story player resumes the pause it took');
  assert.equal(scene.pauseReasons.has('cutscene'), false);
});
