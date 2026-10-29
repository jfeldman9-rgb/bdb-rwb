import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.Phaser = { Scene: class {} };
globalThis.window = globalThis;
globalThis.document = { getElementById: () => null };
globalThis.matchMedia = () => ({ matches: false });
const { GameScene } = await import('../src/game-scene.js');

test('restarting from the Stage 3 cage into Stage 4 discards destroyed Claudia views before final victory', () => {
  const scene = Object.create(GameScene.prototype);
  scene.game = {};
  scene.claudia = { play() { throw new Error('destroyed Stage 3 sprite'); } };
  scene.claudiaCage = { destroy() { throw new Error('destroyed Stage 3 cage'); } };
  scene.init({ world: { stageNo: 4 } });
  assert.equal(scene.claudia, null);
  assert.equal(scene.claudiaCage, null);
  assert.doesNotThrow(() => scene.freeClaudia());
});
