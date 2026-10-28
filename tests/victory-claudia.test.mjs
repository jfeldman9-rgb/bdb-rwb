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
  const lineAt = html.indexOf('id="victory-line"');
  const eyebrowAt = html.indexOf('Boundaries successfully mashed.');
  assert.ok(lineAt > 0 && lineAt < eyebrowAt, 'Claudia\'s line is above the victory eyebrow');
});

test('the victory panel shows Claudia\'s line instead of burying the caption', () => {
  const line = { textContent: '' };
  const panel = { hidden: true };
  const score = { textContent: '' };
  const prev = globalThis.document.getElementById;
  globalThis.document.getElementById = (id) => id === 'victory-line' ? line : id === 'victory' ? panel : id === 'victory-score' ? score : null;
  const scene = Object.create(GameScene.prototype);
  scene.finished = false;
  scene.freed = false;
  scene.pauseReasons = new Set();
  scene.voiceHold = [];
  scene.world = { score: 42, paused: false, bossActive: false, stageNo: 3 };
  scene.game = { inp: { clear() {} }, isPaused: false, pause() {}, resume() {}, story: { play(_key, done) { done(); } } };
  scene.hud = { caption: { setText(text) { scene.caption = text; } } };
  scene.freeClaudia = () => { scene.freed = true; };
  scene.playHeld = () => { scene.caption = 'canvas'; };
  try {
    scene.presentVictory();
  } finally {
    globalThis.document.getElementById = prev;
  }
  assert.equal(scene.freed, true);
  assert.equal(line.textContent, "Let's leave before they reform.");
  assert.equal(scene.caption, '');
  assert.equal(panel.hidden, false);
});
