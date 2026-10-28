import test from 'node:test';
import assert from 'node:assert/strict';
import { resumeUrl, resumeGame, showStuck, installResumeCleanup } from '../src/recovery.js';

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

test('boot wires the resume cleanup', async () => {
  const { readFile } = await import('node:fs/promises');
  const main = await readFile('src/main.js', 'utf8');
  assert.match(main, /installResumeCleanup\(game,q\)/);
  const startup = await readFile('src/startup.js', 'utf8');
  assert.match(startup, /resumeGame\(root, root\.__game\)/);
});
