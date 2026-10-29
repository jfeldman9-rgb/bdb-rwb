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

const { GameScene, trackForStageStart } = await import('../src/game-scene.js');
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

test('stage music waits when a cutscene is already queued', () => {
  assert.equal(trackForStageStart(2, [{ type: 'cutscene', data: 'kidnap' }]), null);
  assert.equal(trackForStageStart(2, [{ type: 'voice', data: 'nar_ch2' }]), 'stage2');
  assert.equal(trackForStageStart(1, []), 'stage1');
  assert.equal(trackForStageStart(3, [{ type: 'cutscene', data: 'stage3' }]), 'stage3');
  assert.equal(trackForStageStart(1, [{ type: 'cutscene', data: 'stage1' }]), 'stage1');
  assert.equal(trackForStageStart(4, [{ type: 'cutscene', data: 'stage4' }, { type: 'cutscene', data: 'kidnap' }]), null);
});

test('boss music waits when the same batch opens a cutscene', async () => {
  const { bossTrackForBatch } = await import('../src/game-scene.js');
  const { musicState, playTrack } = await import('../src/audio.js');
  const batch = [{ type: 'boss' }, { type: 'cutscene', data: 'rescue_pre_boss' }];
  assert.equal(bossTrackForBatch(3, batch), null);
  assert.equal(bossTrackForBatch(3, [{ type: 'boss' }]), 'boss3');
  playTrack('stage1');
  const scene = Object.create(GameScene.prototype);
  scene.stageNo = 3;
  scene.world = { events: batch.slice(), paused: false, bossActive: true };
  scene.pauseReasons = new Set();
  scene.particles = [];
  let wantedAtClip = null;
  scene.game = {
    isPaused: false, pendingDestroy: false, inp: { clear() {} },
    pause() { this.isPaused = true; }, resume() { this.isPaused = false; },
    story: { play() { wantedAtClip = musicState().wanted; } },
  };
  scene.handleEvents();
  assert.equal(wantedAtClip, 'stage1');
});

test('superseding a held clip still plays the lines it was holding', async () => {
  const { createStoryPlayer } = await import('../src/cutscene-hooks.js');
  const root = {
    performance: { now: () => 0 },
    addEventListener() {}, removeEventListener() {},
    setInterval: () => 1, clearInterval() {},
    matchMedia: () => ({ matches: false }),
    navigator: { getGamepads: () => [] },
    document: {
      createElement: () => ({
        style: {}, muted: false, volume: 1, currentTime: 0, paused: false, ended: false,
        setAttribute() {}, removeAttribute() {}, addEventListener() {}, removeEventListener() {},
        play() { return Promise.resolve(); }, pause() {}, load() {}, appendChild() {}, remove() {},
      }),
      body: { appendChild() {} },
      addEventListener() {}, removeEventListener() {}, hidden: false,
    },
  };
  const game = {
    isPaused: false, pendingDestroy: false,
    pause() { this.isPaused = true; }, resume() { this.isPaused = false; },
  };
  const story = createStoryPlayer(new URLSearchParams('cutscenes=1'), root, null, game);
  const scene = Object.create(GameScene.prototype);
  scene.world = { paused: false, bossActive: true, stageNo: 3 };
  scene.pauseReasons = new Set();
  scene.game = { story, inp: { clear() {} }, isPaused: false, pause() { this.isPaused = true; }, resume() { this.isPaused = false; } };
  let played = null;
  scene.startHeldClip('kidnap', (held) => { played = held.slice(); });
  scene.voiceHold = ['wingman_council'];
  scene.startHeldClip('rescue_pre_boss', () => {});
  assert.equal(played, null, 'abort does not speak the held line into the audio stop');
  assert.deepEqual(scene.voiceHold, ['wingman_council']);
  assert.equal(scene.holdingVoice, true);
  story.destroy();
});

test('choir ring, notes, buff pulse, and shield cracks draw', async () => {
  const { Yetti } = await import('../src/yettis.js');
  const ops = [];
  const g = {
    clear() {}, lineStyle() {}, beginPath() { ops.push('beginPath'); },
    arc() { ops.push('arc'); }, strokePath() { ops.push('strokePath'); },
    fillStyle() {}, fillEllipse() { ops.push('fillEllipse'); }, fillRect() { ops.push('fillRect'); },
    strokeEllipse() { ops.push('strokeEllipse'); }, lineBetween() { ops.push('lineBetween'); },
    strokeRoundedRect() {}, strokeCircle() {}, fillRoundedRect() {}, fillTriangle() {},
  };
  const choir = new Yetti('choir', 100, 630);
  const walker = new Yetti('walker', 180, 630);
  walker.choirBuff = 1.28;
  const guard = new Yetti('guard', 400, 630);
  guard.shieldHits = 2;
  const scene = Object.create(GameScene.prototype);
  scene.g = g;
  scene.world = { dad: null, elapsed: 1, enemies: [choir, walker, guard], projectiles: [], hostile: [], pickups: [], bob: { state: 'idle' }, bounds: { l: 0, r: 1280 } };
  scene.dadLabel = { setVisible() {} };
  scene.anims = { exists: () => true };
  scene.particles = [];
  scene.effects(0);
  assert.ok(ops.includes('arc'));
  assert.ok(ops.includes('strokePath'));
  assert.ok(ops.filter(op => op === 'fillEllipse').length >= 3);
  assert.ok(ops.includes('strokeEllipse'));
  assert.ok(ops.filter(op => op === 'lineBetween').length >= 2);
});
