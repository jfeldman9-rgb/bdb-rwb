import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Input } from '../src/input.js';
import { installPressOwnership, consumePress } from '../src/press-ownership.js';
import { installGovernor } from '../src/quality-governor.js';

function fakeRoot() {
  const listeners = [];
  return {
    listeners,
    addEventListener(type, fn, opts) { listeners.push({ type, fn, capture: opts === true || !!opts?.capture }); },
    removeEventListener() {},
    document: { getElementById: () => null, querySelectorAll: () => [], hidden: false, body: { classList: { add() {} } } },
    matchMedia: () => ({ matches: false }),
    navigator: { getGamepads: () => [] },
  };
}

test('a story skip consumes the pause press Input already recorded', () => {
  const root = fakeRoot();
  const input = new Input(root);
  installPressOwnership(input, root);
  const event = { code: 'Escape', repeat: false, target: null, eventPhase: 1, preventDefault() {}, stopImmediatePropagation() {} };
  for (const l of root.listeners) if (l.type === 'keydown' && l.capture) l.fn(event);
  event.eventPhase = 3;
  for (const l of root.listeners) if (l.type === 'keydown' && !l.capture) l.fn(event);
  assert.equal(input.peek('pause'), true);
  consumePress(input, 'pause');
  assert.equal(input.take('pause'), false);
});

test('boot installs press ownership and the governor', async () => {
  const main = await readFile('src/main.js', 'utf8');
  const hooks = await readFile('src/cutscene-hooks.js', 'utf8');
  assert.match(main, /installPressOwnership\(g\.inp\)/);
  assert.match(main, /installGovernor\(game,/);
  assert.match(hooks, /consumePress\(input, ?action\)/);
});

test('a software-renderer downgrade uses the scene fx hooks without throwing', () => {
  const st = {
    fx: {},
    bloom: true,
    lit: true,
    setBloom(on) { this.bloom = on; },
    setBackdropLit(on) { this.lit = on; },
    runId: 1,
    started: true,
    cameras: { main: { setZoom() {} } },
  };
  const game = {
    rs: 2,
    scene: { getScene: (name) => (name === 'gameplay' || name === 'hud' ? st : null) },
    scale: { resize() {} },
    renderer: { gl: { getExtension: () => ({ UNMASKED_RENDERER_WEBGL: 1 }), getParameter: () => 'llvmpipe', RENDERER: 0 } },
  };
  installGovernor(game, { q: { get: () => null }, rs0: 2, vw: 1280, vh: 720, meter: { lastSampleMs: 16 }, floor: 0, log() {} });
  assert.doesNotThrow(() => game.governor());
  assert.equal(st.fx.quality, 4);
  assert.equal(st.bloom, false);
  assert.equal(st.lit, false);
});
