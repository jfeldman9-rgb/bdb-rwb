import test from 'node:test';
import assert from 'node:assert/strict';
import { resumeUrl, resumeGame, showStuck, installResumeCleanup, installFreezeGuard, installStageRecovery } from '../src/recovery.js';
import { createStartupGuard } from '../src/startup.js';

test('resume URL keeps every parameter and arms the stage autostart', () => {
  const href = resumeUrl('https://x.test/play?stage=1&demo=1#top', 2);
  const u = new URL(href);
  assert.equal(u.searchParams.get('stage'), '2');
  assert.equal(u.searchParams.get('autostart'), '1');
  assert.equal(u.searchParams.get('resume'), '1');
  assert.equal(u.searchParams.get('demo'), '1');
  assert.equal(u.hash, '#top');
});

test('resume reloads into the running stage, otherwise plain reload', () => {
  let replaced = null, reloaded = false;
  const scene = { started: true, stageNo: 2 };
  const root = {
    __game: { scene: { getScene: () => scene } },
    location: { href: 'https://x.test/?stage=2', replace: (h) => { replaced = h; }, reload: () => { reloaded = true; } },
  };
  assert.equal(resumeGame(root, root.__game), 'resume');
  assert.ok(replaced.includes('stage=2'));
  const title = { __game: { scene: { getScene: () => null } }, location: { reload: () => { reloaded = true; } } };
  assert.equal(resumeGame(title, title.__game), 'reload');
  assert.equal(reloaded, true);
});

test('stuck card explains the reload picks up at this stage', () => {
  const els = {};
  const el = (id) => (els[id] ??= { textContent: '', hidden: true, handlers: {}, addEventListener(e, fn) { this.handlers[e] = fn; } });
  const root = { document: { getElementById: el } };
  assert.equal(showStuck(root, new Error('frame froze'), null), true);
  assert.equal(els['startup-error'].hidden, false);
  assert.match(els['startup-description'].textContent, /picks up at the start of this stage/);
  assert.match(els['startup-code'].textContent, /FRAME_ERROR/);
});

test('resumed boot drops one-shot flags once its stage starts', () => {
  const q = new URLSearchParams('stage=2&autostart=1&resume=1');
  let replaced = null;
  const root = {
    location: { href: 'https://x.test/?stage=2&autostart=1&resume=1', replace: () => {} },
    history: { state: null, replaceState: (s, t, h) => { replaced = h; } },
  };
  const steppers = [];
  const gameplay = { started: false };
  const game = { events: { on: (e, fn) => steppers.push(fn), off: () => {} }, scene: { getScene: () => gameplay } };
  assert.equal(installResumeCleanup(game, q, root), true);
  gameplay.started = true;
  for (const fn of steppers) fn();
  assert.equal(q.has('autostart'), false);
  assert.equal(q.has('resume'), false);
  assert.ok(!new URL(replaced).searchParams.has('resume'));
});

function cardRoot(extra = {}) {
  const els = {};
  const el = (id) => (els[id] ??= { textContent: '', hidden: true, focus() {}, handlers: {}, addEventListener(e, fn) { (this.handlers[e] ??= []).push(fn); }, removeEventListener(e, fn) { this.handlers[e] = (this.handlers[e] || []).filter(f => f !== fn); }, click() { for (const fn of this.handlers.click || []) fn(); } });
  return { els, root: { document: { getElementById: el, body: { classList: { add() {}, remove() {} } } }, addEventListener() {}, removeEventListener() {}, ...extra } };
}

test('the reload button still resumes the stage after the title is ready', () => {
  let replaced = null;
  const { els, root } = cardRoot({
    location: { href: 'https://x.test/?stage=2', origin: 'https://x.test', replace: (h) => { replaced = h; }, reload() {} },
    __game: { scene: { getScene: () => ({ started: true, stageNo: 2 }) } },
  });
  const guard = createStartupGuard(root);
  assert.equal(guard.ready(), true);
  els['startup-retry'].click();
  assert.match(replaced, /stage=2/);
  assert.match(replaced, /resume=1/);
});

test('a missing chapter file still raises the card after the title is ready', () => {
  const { els, root } = cardRoot();
  const guard = createStartupGuard(root);
  guard.ready();
  assert.equal(guard.fail('nope'), false);
  assert.equal(guard.fail(null, 'assets'), true);
  assert.equal(els['startup-error'].hidden, false);
  assert.match(els['startup-code'].textContent, /REQUIRED_ASSET_FAILED/);
  assert.doesNotMatch(els['startup-description'].textContent, /before the title screen/);
  assert.match(els['startup-description'].textContent, /chapter/i);
});

function freezeRig() {
  let now = 0;
  const timers = [];
  const errors = [];
  const { els, root } = cardRoot({
    performance: { now: () => now },
    setInterval: (fn) => { timers.push(fn); return timers.length; },
    clearInterval() {},
    location: { origin: 'https://x.test' },
  });
  root.addEventListener = (type, fn) => { if (type === 'error') errors.push(fn); };
  const gameplay = { started: false, world: { paused: false } };
  const game = { isPaused: false, scene: { getScene: () => gameplay } };
  const guard = installFreezeGuard(game, root, { limit: 8000 });
  return { els, now: (t) => { now = t; }, timers, errors, gameplay, game, guard };
}

test('a stalled gameplay loop shows the stuck card; a pause does not', () => {
  const { els, now, timers, gameplay, game, guard } = freezeRig();
  timers[0]();
  assert.equal(els['startup-error'], undefined);
  gameplay.started = true;
  game.beat();
  now(7000);
  timers[0]();
  assert.equal(els['startup-error'], undefined);
  gameplay.world.paused = true;
  now(20000);
  timers[0]();
  assert.equal(els['startup-error'], undefined, 'a pause is not a stall');
  gameplay.world.paused = false;
  now(20000 + 8001);
  timers[0]();
  assert.equal(els['startup-error'].hidden, false);
  assert.match(els['startup-code'].textContent, /FRAME_ERROR/);
  guard.destroy();
});

test('a repeated gameplay error shows the stuck card; one error, a boot error, a foreign error, and an empty filename do not', () => {
  const { els, errors, gameplay, guard } = freezeRig();
  errors[0]({ error: new Error('boot'), filename: 'https://x.test/src/main.js' });
  assert.equal(els['startup-error'], undefined);
  gameplay.started = true;
  errors[0]({ error: new Error('boom'), filename: 'https://evil.test/x.js' });
  errors[0]({ error: new Error('script'), filename: '' });
  errors[0]({ error: new Error('script') });
  errors[0]({ error: new Error('boom'), filename: 'https://x.test/src/campaign.js' });
  assert.equal(els['startup-error'], undefined, 'one stray error while the loop can still run');
  errors[0]({ error: new Error('boom again'), filename: 'https://x.test/src/campaign.js' });
  assert.equal(els['startup-error'].hidden, false);
  assert.match(els['startup-description'].textContent, /picks up at the start of this stage/);
  guard.destroy();
});

test('a preload longer than the freeze limit does not show the stuck card', () => {
  const { els, now, timers, gameplay, game } = freezeRig();
  gameplay.started = true;
  gameplay.load = { isLoading: () => true };
  game.beat();
  now(20000);
  timers[0]();
  assert.equal(els['startup-error'], undefined, 'a slow chapter load is not a stall');
  gameplay.started = false;
  gameplay.load = { isLoading: () => false };
  now(40000);
  timers[0]();
  assert.equal(els['startup-error'], undefined, 'init/preload has not started the stage');
  gameplay.started = true;
  now(40000 + 8001);
  timers[0]();
  assert.equal(els['startup-error'].hidden, false, 'a stall after the load still raises the card');
});

test('a stage is not marked started until create finishes', async () => {
  globalThis.Phaser = globalThis.Phaser || { Scene: class {} };
  const { GameScene } = await import('../src/game-scene.js');
  const scene = Object.create(GameScene.prototype);
  scene.game = { runSeq: 0 };
  scene.init({ world: { stageNo: 2 } });
  assert.equal(scene.started, false);
  assert.match(String(GameScene.prototype.create), /this\.started=true/);
});

test('showStuck does not stack a second Reload listener', () => {
  let n = 0;
  const { els, root } = cardRoot({
    location: { href: 'https://x.test/?stage=2', origin: 'https://x.test', replace() { n++; }, reload() {} },
    __game: { scene: { getScene: () => ({ started: true, stageNo: 2 }) } },
  });
  const guard = createStartupGuard(root);
  guard.ready();
  const before = (els['startup-retry'].handlers.click || []).length;
  showStuck(root, new Error('freeze'), root.__game);
  showStuck(root, new Error('freeze'), root.__game);
  assert.equal((els['startup-retry'].handlers.click || []).length, before);
  els['startup-retry'].click();
  assert.equal(n, 1);
});

test('stage recovery clears its timer when the game is destroyed', () => {
  let cleared = 0;
  const listeners = {};
  const root = {
    document: {
      getElementById: () => ({ addEventListener() {}, removeEventListener() {}, hidden: true }),
      querySelector() { return null; },
      body: { classList: { add() {}, remove() {} } },
    },
    performance: { now: () => 0 },
    setInterval: () => 7,
    clearInterval() { cleared++; },
    addEventListener() {},
    removeEventListener() {},
    location: { origin: 'https://x.test' },
  };
  const game = {
    isPaused: false,
    scene: { getScene: () => ({ started: true, world: { paused: false } }) },
    events: { once(name, fn) { listeners[name] = fn; } },
  };
  const recovery = installStageRecovery(game, root);
  assert.equal(typeof listeners.destroy, 'function');
  listeners.destroy();
  recovery.destroy();
  assert.equal(cleared, 1);
});

test('graphics retry reopens the running stage', () => {
  let replaced = null;
  const button = { fn: null, addEventListener(e, fn) { if (e === 'click') this.fn = fn; }, removeEventListener() {} };
  const notice = { hidden: true };
  const root = {
    document: {
      getElementById: (id) => (id === 'graphics-retry' ? button : id === 'graphics-notice' ? notice : null),
      body: { classList: { add() {}, remove() {} } },
    },
    location: { href: 'https://x.test/', origin: 'https://x.test', replace: (h) => { replaced = h; }, reload() {} },
    performance: { now: () => 0 },
    setInterval: () => 1, clearInterval() {}, addEventListener() {}, removeEventListener() {},
  };
  const game = { isPaused: false, scene: { getScene: () => ({ started: true, stageNo: 3, world: { paused: false } }) } };
  const recovery = installStageRecovery(game, root);
  button.fn();
  assert.match(replaced, /stage=3/);
  recovery.destroy();
});
