import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.Phaser = globalThis.Phaser || { Scene: class {} };

const { GameScene, fighterDepth, WINGMAN_ALPHA } = await import('../src/game-scene.js');

function textureScene() {
  const keys = new Set();
  const canvasCalls = [];
  const grad = { addColorStop() {} };
  const ctx = { createRadialGradient: () => grad, fillRect() {}, fillStyle: '' };
  const canvas = { getContext: () => ctx, refresh() {} };
  const textures = {
    keys,
    canvasCalls,
    exists: (key) => keys.has(key),
    createCanvas(key) {
      canvasCalls.push(key);
      if (keys.has(key)) return null;
      keys.add(key);
      return canvas;
    },
    get: () => ({ getSourceImage: () => ({ width: 1280, height: 720 }) }),
    remove() {},
  };
  const graphics = () => ({
    fillStyle() {}, fillEllipse() {}, fillTriangle() {}, fillCircle() {}, fillRect() {}, clear() {},
    generateTexture(key) {
      if (keys.has(key)) throw new Error(`duplicate texture ${key}`);
      keys.add(key);
    },
    destroy() {},
  });
  const chain = () => {
    const node = {
      setDepth() { return node; }, setBlendMode() { return node; }, setVisible() { return node; },
      setScale() { return node; }, setAlpha() { return node; }, setPosition() { return node; },
      emitParticleAt() {},
    };
    return node;
  };
  return {
    textures,
    make: { graphics },
    add: { particles: () => chain(), image: () => chain() },
    lights: { addLight: () => ({ intensity: 0, x: 0, y: 0, radius: 0 }) },
  };
}

function cardDocument() {
  const els = {};
  const make = (id) => els[id] || (els[id] = { id, hidden: true, textContent: '', handlers: {}, addEventListener(type, fn) { (this.handlers[type] ||= []).push(fn); } });
  return { els, document: { getElementById: (id) => make(id), body: { classList: { add() {}, remove() {} } } } };
}

test('GameScene.create boots the shadow before FX and rejects a duplicate texture key', () => {
  const scene = Object.create(GameScene.prototype);
  Object.assign(scene, textureScene());
  scene.game = { runSeq: 0 };
  scene.assemble = () => { scene.assembled = true; };
  scene.create();
  assert.equal(scene.started, true);
  assert.equal(scene.assembled, true);
  assert.equal(scene.textures.exists('shadow'), true);
  assert.equal(scene.textures.exists('glow'), true);
  assert.equal(scene.textures.canvasCalls.includes('shadow'), false, 'FX must not register the fighter shadow');
  assert.throws(() => scene.make.graphics().generateTexture('shadow'), /duplicate texture shadow/);
  assert.equal(scene.textures.createCanvas('glow'), null);
});

test('a throw in create after the title shows the error card', () => {
  const { els, document } = cardDocument();
  const prev = globalThis.document;
  globalThis.document = document;
  const scene = Object.create(GameScene.prototype);
  Object.assign(scene, textureScene());
  scene.game = { runSeq: 1 };
  scene.assemble = () => { throw new Error('chapter blew up'); };
  try {
    scene.create();
  } finally {
    globalThis.document = prev;
  }
  assert.equal(scene.started, false);
  assert.equal(scene.fx?.constructor?.name, 'FX', 'textures booted before the throw');
  assert.equal(els['startup-error'].hidden, false);
  assert.match(els['startup-code'].textContent, /FRAME_ERROR/);
  assert.match(els['startup-description'].textContent, /Reload game/);
});

test('a wingman draws behind Bob on every lane', () => {
  const bobLow = fighterDepth({ y: 572 });
  const bobHigh = fighterDepth({ y: 690 });
  const wingLow = fighterDepth({ type: 'wingman', y: 572 });
  const wingHigh = fighterDepth({ type: 'wingman', y: 690 });
  assert.ok(wingHigh < bobLow, 'the nearest wingman still sits behind the farthest Bob');
  assert.ok(wingLow < bobHigh);
  assert.ok(WINGMAN_ALPHA < 1 && WINGMAN_ALPHA >= 0.55);
});
