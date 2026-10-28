import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const noop = () => {};
globalThis.Phaser = globalThis.Phaser || { Scene: class {} };
globalThis.window = globalThis.window || globalThis;
globalThis.document = globalThis.document || {
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener: noop,
  removeEventListener: noop,
  body: { classList: { add: noop, remove: noop } },
};
globalThis.matchMedia = globalThis.matchMedia || (() => ({ matches: false }));

const { GameScene } = await import('../src/game-scene.js');

test('victory drops the cage, plays claudia_freed, and retires the produce line', async () => {
  const html = await readFile('index.html', 'utf8');
  const anims = JSON.parse(await readFile('assets/chars/claudia.anims.json', 'utf8'));
  assert.equal(anims.anims.some(a => a.name === 'claudia_freed'), true);
  assert.doesNotMatch(html, /Legally, it.s produce/);
  assert.match(html, /id="victory-score"/);
  let destroyed = false;
  let played = null;
  const scene = {
    claudiaCage: { destroy() { destroyed = true; } },
    claudia: { play(name) { played = name; } },
  };
  GameScene.prototype.freeClaudia.call(scene);
  assert.equal(destroyed, true);
  assert.equal(scene.claudiaCage, null);
  assert.equal(played, 'claudia_freed');
  const src = await readFile('src/game-scene.js', 'utf8');
  assert.ok(src.includes('this.freeClaudia?.()'));
});
