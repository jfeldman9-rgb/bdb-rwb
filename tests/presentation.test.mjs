import test from 'node:test';
import assert from 'node:assert/strict';
import { Campaign } from '../src/campaign.js';
import { HUD } from '../src/hud.js';
import { RECOIL_KICK, RECOIL_DECAY, stepRecoil, hostileShape, killImpact } from '../src/shot-feel.js';
import { createPerf, noteRenderer, deviceMetadata } from '../src/perf.js';
import { FX } from '../src/fx.js';

test('recoil is a kick that is gone before the next shot', () => {
  assert.ok(RECOIL_KICK > 12);
  assert.ok(stepRecoil(RECOIL_KICK, 1 / 60) > 0);
  assert.equal(stepRecoil(RECOIL_KICK, RECOIL_KICK / RECOIL_DECAY), 0);
  assert.ok(RECOIL_KICK / RECOIL_DECAY < 0.2);
});

test('a killing eggplant splats once; Papi and Dad still splat on the ko', () => {
  assert.equal(killImpact('ko', { source: 'bob' }), null);
  assert.equal(killImpact('hit', { kind: 'heavy' }).splat, true);
  assert.equal(killImpact('hit', { kind: 'heavy' }).heavy, true);
  assert.equal(killImpact('hit', { kind: 'light' }).heavy, false);
  assert.equal(killImpact('ko', { source: 'papi' }).splat, true);
  assert.equal(killImpact('ko', { source: 'dad' }).kick, false);
});

test('hostile projectiles use three different shapes', () => {
  const shapes = ['snowball', 'halo', 'shockwave'].map(k => hostileShape(k).shape);
  assert.deepEqual(shapes, ['ellipse', 'ring', 'bar']);
  assert.equal(new Set(shapes).size, 3);
});

test('a snowball shoves Bob along its travel, not away from its center', () => {
  const w = new Campaign({ stage: 2 });
  w.enemies = [];
  w.bob.x = 400;
  w.bob.y = 630;
  w.bob.inv = 0;
  w.hostile = [{ x: 430, y: 630, dir: -1, kind: 'snowball', speed: 320, alive: true }];
  w.update(0.1, {});
  assert.ok(w.stats.hits >= 1);
  assert.ok(w.bob.knockV < 0, `knock ${w.bob.knockV}`);
});

test('the renderer note keeps the perf meter', () => {
  const root = {};
  root.__perf = createPerf({ now: () => 0, dateNow: () => 't', metadata: () => deviceMetadata(root) });
  const report = root.__perf.report;
  noteRenderer('llvmpipe GPU', root);
  assert.equal(root.__perf.report, report);
  assert.equal(root.__perf.software, true);
  assert.equal(deviceMetadata(root).renderer, 'llvmpipe GPU');
  assert.equal(deviceMetadata(root).softwareRenderer, true);
});

test('fx impact no longer keeps a private hit-stop or slow-mo', async () => {
  const { readFile } = await import('node:fs/promises');
  const src = await readFile(new URL('../src/fx.js', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /\b(?:slowmo|hitstop)\b/);
  assert.doesNotMatch(FX.prototype.impact.toString(), /slowmo|hitstop/);
});

function fakeText() {
  const t = {
    setText() { return t; }, setOrigin() { return t; }, setAlign() { return t; },
    setWordWrapWidth() { return t; }, setColor() { return t; }, setScrollFactor() { return t; },
    setDepth() { return t; }, setVisible() { return t; },
  };
  return t;
}

test('touch labels are looked up once and rewritten only when they change', () => {
  let lookups = 0;
  let writes = 0;
  const btn = (label) => {
    let text = '';
    const classes = new Set();
    return {
      get textContent() { return text; },
      set textContent(v) { writes++; text = v; },
      classList: {
        toggle(name, on) { if (on) classes.add(name); else classes.delete(name); },
        contains(name) { return classes.has(name); },
      },
      label,
    };
  };
  const papi = btn('PAPI');
  const dad = btn('DAD');
  globalThis.document = { getElementById(id) { lookups++; return id === 'tbPapi' ? papi : id === 'tbDad' ? dad : null; } };
  const scene = { add: { text: () => fakeText(), graphics: () => ({ setScrollFactor() { return this; }, setDepth() { return this; }, clear() {}, fillStyle() {}, lineStyle() {}, lineBetween() {}, fillRect() {}, fillRoundedRect() {}, beginPath() {}, arc() {}, strokePath() {} }) } };
  const hud = new HUD(scene);
  const world = {
    stageNo: 1, bob: { hp: 3, maxHp: 3, state: 'idle', grabMash: 0 },
    papi: { shakeRemainder: 0, charges: 1 }, dadCall: { charges: 0, unlocked: true, kos: 0, since: 0 },
    score: 0, difficultyKey: 'adventure', bossActive: false, def: { zones: [{}, {}, {}, {}, {}], boss: { name: 'X' } },
    zoneIndex: 0, paused: false, victory: false, messageTime: 0, message: '', enemies: [], wingmen: null,
  };
  hud.update(world);
  hud.update(world);
  assert.equal(lookups, 2, 'each button is found once');
  const after = writes;
  world.papi.charges = 2;
  hud.update(world);
  assert.ok(writes > after);
  assert.match(papi.textContent, /PAPI 2/);
  delete globalThis.document;
});
