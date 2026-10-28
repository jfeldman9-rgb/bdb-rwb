import test from 'node:test';
import assert from 'node:assert/strict';

const noop = () => {};
globalThis.Phaser = globalThis.Phaser || { Scene: class {} };

const { GameScene } = await import('../src/game-scene.js');
const { Campaign } = await import('../src/campaign.js');
const { CORPSE_S } = await import('../src/corpses.js');

function fakeDisplay() {
  const o = {
    x: 0, y: 0, alpha: 1, flipX: false,
    anims: { timeScale: 1 },
    setScale() { return this; }, setAlpha(a) { this.alpha = a; return this; },
    setDepth() { return this; }, setOrigin() { return this; }, setLighting() { return this; },
    setTint() { return this; }, setPosition(x, y) { this.x = x; this.y = y; return this; },
    play() { return this; }, stop() {},
    destroy() { this.dead = true; },
  };
  return o;
}

const metaFor = (key) => ({
  scale: 1, pages: ['p0'], baseline: 0, canvas: [64, 64],
  anims: [{ name: `${key}_idle`, pages: [0], frames: ['f0'] }],
});

function corpseScene(world) {
  const scene = Object.create(GameScene.prototype);
  scene.world = world;
  scene.bounds = world.bounds;
  scene.views = new Map();
  scene.dadView = null;
  scene.cameras = { main: { setScroll() {} } };
  scene.backdrop = { update() {} };
  scene.metas = new Proxy({}, { get: (t, k) => (t[k] ??= metaFor(k)) });
  scene.anims = { exists: (key) => key === 'bob_knockdown' };
  scene.add = { image: fakeDisplay, sprite: fakeDisplay };
  return scene;
}

const quiet = (fn) => {
  const warn = console.warn;
  console.warn = noop;
  try { fn(); } finally { console.warn = warn; }
};

test('a dead Yetti holds knockdown for 0.5s, fades, and is destroyed; Bob is not corpse-ified', () => {
  const world = new Campaign({ stage: 1 });
  world.bob.x = 300;
  world.enterZone();
  const scene = corpseScene(world);
  quiet(() => scene.syncViews(0));
  assert.ok(scene.views.size > 1);
  const foe = world.enemies.find((e) => e.alive);
  foe.alive = false;
  foe.hp = 0;
  quiet(() => scene.syncViews(1 / 60));
  assert.ok(scene.views.has(foe), 'corpse survives the death frame');
  const view = scene.views.get(foe);
  assert.equal(view.corpsePlayed, true);
  assert.equal(view.sprite.alpha, 1);
  const holdFrames = Math.floor((CORPSE_S - 0.18) * 60);
  for (let i = 0; i < holdFrames; i++) quiet(() => scene.syncViews(1 / 60));
  assert.ok(scene.views.has(foe), 'knockdown holds before the fade');
  quiet(() => scene.syncViews(1 / 60));
  assert.ok(view.sprite.alpha < 1, 'corpse fades at the end');
  for (let i = 0; i < 30 && scene.views.has(foe); i++) quiet(() => scene.syncViews(1 / 60));
  assert.equal(scene.views.has(foe), false, 'corpse destroyed after its time');
  assert.ok(view.sprite.dead, 'view display list released');

  world.bob.alive = false;
  world.bob.setState('dead', 1.1);
  const bobView = scene.views.get(world.bob);
  quiet(() => scene.syncViews(1 / 60));
  assert.ok(scene.views.has(world.bob), 'dead Bob stays in the live set');
  assert.equal(bobView.corpse, null, 'Bob never gets a corpse object');
  assert.equal(bobView.cur, 'bob_knockdown', 'dead Bob plays knockdown on the live path');

  world.respawn();
  quiet(() => scene.syncViews(1 / 60));
  assert.ok(!scene.views.has(world.bob) || scene.views.get(world.bob) !== bobView, 'respawn swaps the view to the new Bob');
});
