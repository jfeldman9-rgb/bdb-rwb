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
  const eyebrowAt = html.indexOf('Case closed. Claudia chooses Bob.');
  assert.ok(lineAt > 0 && lineAt < eyebrowAt, 'Claudia\'s line is above the victory eyebrow');
});

test('the victory panel retains the presented caption, then adds Claudia when her turn arrives', () => {
  const line = { textContent: '' };
  const panel = { hidden: true };
  const score = { textContent: '' };
  const prev = globalThis.document.getElementById;
  globalThis.document.getElementById = (id) => id === 'victory-line' ? line : id === 'victory' ? panel : id === 'victory-score' ? score : null;
  const scene = Object.create(GameScene.prototype);
  scene.finished = false;
  scene.lastDialogue = 'BOUNCER  /  Fine. You\'re on the list.';
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
    assert.equal(line.textContent, 'BOUNCER  /  Fine. You\'re on the list.');
    scene.presentCaption('Claudia', "Let's leave before they reform.");
  } finally {
    globalThis.document.getElementById = prev;
  }
  assert.equal(scene.freed, true);
  assert.notEqual(scene.caption, '');
  assert.match(line.textContent, /BOUNCER/);
  assert.match(line.textContent, /CLAUDIA  \/  Let's leave before they reform\./);
  assert.equal(panel.hidden, false);
  assert.equal(score.textContent, '42 points · Chapter 3 complete');
});

test('stage 4 victory names the chapter and does not replay the keep rescue', () => {
  const line = { textContent: '' };
  const panel = { hidden: true };
  const score = { textContent: '' };
  const prev = globalThis.document.getElementById;
  globalThis.document.getElementById = (id) => id === 'victory-line' ? line : id === 'victory' ? panel : id === 'victory-score' ? score : null;
  const scene = Object.create(GameScene.prototype);
  scene.finished = false;
  scene.stageNo = 4;
  scene.freed = false;
  scene.pauseReasons = new Set();
  scene.world = { score: 90, paused: false, bossActive: false, stageNo: 4, beatenAtStart: false, save: { beaten: true } };
  scene.game = { inp: { clear() {} }, story: { play() { throw new Error('stage 4 must not replay rescue_2'); } } };
  scene.hud = { caption: { setText() {} } };
  scene.freeClaudia = () => { scene.freed = true; };
  scene.playHeld = () => {};
  try { scene.presentVictory(); }
  finally { globalThis.document.getElementById = prev; }
  assert.equal(scene.freed, true);
  assert.equal(panel.hidden, false);
  assert.equal(score.textContent, '90 points · Chapter 4 complete');
});

test('stage 7 victory plays the dedicated ending clip and names the real rescue', () => {
  const line = { textContent: '' };
  const heading = { textContent: 'CLAUDIA RESCUED.' };
  const panel = { hidden: true, querySelector(sel) { return sel === 'h2' ? heading : null; } };
  const score = { textContent: '' };
  const prev = globalThis.document.getElementById;
  globalThis.document.getElementById = (id) => id === 'victory-line' ? line : id === 'victory' ? panel : id === 'victory-score' ? score : null;
  const scene = Object.create(GameScene.prototype);
  scene.finished = false;
  scene.stageNo = 7;
  scene.freed = false;
  scene.pauseReasons = new Set();
  scene.voiceHold = [];
  scene.world = { score: 180, elapsed: 1391.5, stats: { kos: 240, deaths: 15 }, paused: false, bossActive: false, stageNo: 7, beatenAtStart: true, save: { beaten: true } };
  let played = null;
  scene.game = { inp: { clear() {} }, story: { play(key, done) { played = key; done(); } } };
  scene.hud = { caption: { setText() {} } };
  scene.freeClaudia = () => { scene.freed = true; };
  scene.playHeld = () => {};
  try { scene.presentVictory(); }
  finally { globalThis.document.getElementById = prev; }
  assert.equal(scene.freed, true);
  assert.equal(played, 'final_victory');
  assert.equal(heading.textContent, 'CLAUDIA RESCUED. FOR REAL THIS TIME.');
  assert.equal(panel.hidden, false);
  assert.equal(score.textContent, '180 points · 240 KOs · 15 deaths · 23:11 · Court adjourned');
});

test('the altar cage travels with its captive until both are off-screen', () => {
  let tween;
  const cage = { x: 0, y: 0, destroyed: false, destroy() { this.destroyed = true; } };
  const claudia = { x: 7450, y: 490 };
  const scene = { claudia, claudiaCage: cage, tweens: { add(config) { tween = config; } } };
  GameScene.prototype.liftAltarClaudia.call(scene);
  assert.equal(scene.claudiaCage, cage);
  assert.equal(cage.destroyed, false);
  assert.deepEqual(tween.targets, [claudia, cage]);
  assert.equal(tween.y, '-=720');
  assert.equal(tween.alpha, undefined, 'Claudia remains visibly captive through the ascent');
  tween.onComplete();
  assert.equal(cage.destroyed, true);
  assert.equal(scene.claudiaCage, null);
});

test('S7 clear shows freed Claudia beside Bob during the settle, before the ending clip', () => {
  const scene = Object.create(GameScene.prototype);
  let plays = 0, clip = false;
  scene.stageNo = 7;
  scene.world = { camX: 6480, bounds: { l: 6480, r: 7760 }, bob: { x: 7700, y: 631 },
    events: [{ type: 'clear', data: 7 }], def: { next: null } };
  scene.claudiaCage = { destroy() { scene.cageDestroyed = true; } };
  scene.metas = { claudia: { scale: .38 } };
  scene.claudia = {
    setPosition(x, y) { this.x = x; this.y = y; }, setScale(scale) { this.scale = scale; }, setDepth(depth) { this.depth = depth; }, setTint() {},
    play(anim) { this.anim = anim; plays++; },
  };
  scene.game = { story: { play() { clip = true; } } };
  scene.handleEvents();
  assert.equal(scene.cageDestroyed, true);
  assert.equal(scene.claudia.anim, 'claudia_freed');
  assert.ok(Math.abs(scene.claudia.x - scene.world.bob.x) <= 150);
  assert.ok(scene.claudia.x >= 6590 && scene.claudia.x <= 7650);
  assert.equal(scene.claudia.y, 619);
  assert.equal(scene.claudia.scale, .45 / .38, 'rescue size accounts for the packed atlas scale');
  assert.ok(scene.claudia.depth > 1690, 'Claudia is above all combat sprites');
  assert.equal(clip, false, 'the existing clear settle remains visible before the finale overlay');
  scene.freeClaudia();
  assert.equal(plays, 1, 'presentVictory cannot restart the already visible rescue animation');
});

test('a stage 3 clear frees Claudia and plays the keep rescue without freezing a skipped clip', () => {
  const scene = Object.create(GameScene.prototype);
  let played = null;
  scene.stageNo = 3;
  scene.pauseReasons = new Set();
  scene.voiceHold = [];
  scene.world = { stageNo: 3, score: 1, paused: false, bossActive: false, victory: false, def: { next: 4 }, events: [{ type: 'clear', data: 3 }] };
  scene.game = { inp: { clear() {} }, isPaused: false, pause() {}, resume() {}, story: { play(key, done) { played = key; done(); } } };
  scene.freeClaudia = () => { scene.freed = true; };
  scene.playHeld = () => {};
  scene.handleEvents();
  assert.equal(scene.freed, true);
  assert.equal(played, 'victory');
  assert.equal(scene.world.paused, false);
  assert.equal(scene.world.events.length, 0);
});
