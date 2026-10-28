import test from 'node:test';
import assert from 'node:assert/strict';

const noop = () => {};
globalThis.Phaser = { Scene: class {} };
globalThis.window = globalThis;
globalThis.document = {
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener: noop,
  removeEventListener: noop,
  body: { classList: { add: noop, remove: noop, contains: () => false } },
};
globalThis.matchMedia = () => ({ matches: false, addEventListener: noop, removeEventListener: noop });

const { GameScene } = await import('../src/game-scene.js');
const { registerVoiceLines } = await import('../src/voice-lines.js');
registerVoiceLines();

function sceneWith(events, play) {
  const scene = Object.create(GameScene.prototype);
  scene.stageNo = 2;
  scene.finished = false;
  scene.pauseReasons = new Set();
  scene.voiceHold = [];
  scene.holdingVoice = false;
  scene.captions = [];
  scene.world = { events, bossActive: false, score: 10, paused: false };
  scene.hud = { say(who, line) { scene.captions.push(line); } };
  scene.game = { inp: { clear() {} }, story: { play } };
  return scene;
}

test('a real clip ducks and holds the voice that follows it', () => {
  let finish = null;
  const scene = sceneWith(
    [{ type: 'voice', data: 'nar_ch2' }, { type: 'cutscene', data: 'kidnap' }, { type: 'voice', data: 'nar_kidnap' }],
    (key, done) => { scene.key = key; finish = done; },
  );
  scene.handleEvents();
  assert.equal(scene.key, 'kidnap');
  assert.equal(scene.pauseReasons.has('cutscene'), true);
  assert.equal(scene.captions.length, 1, 'chapter narration starts before the clip');
  assert.equal(scene.captions.includes('Heaven, it turns out, has opinions. And Yettis. With wings.'), false);
  finish();
  assert.equal(scene.pauseReasons.has('cutscene'), false);
  assert.ok(scene.captions.includes('Heaven, it turns out, has opinions. And Yettis. With wings.'));
});

test('a skipped clip that finishes synchronously does not swallow the next line', () => {
  const scene = sceneWith(
    [{ type: 'cutscene', data: 'rescue_pre_boss' }, { type: 'voice', data: 'nar_kidnap' }],
    (key, done) => done(),
  );
  scene.handleEvents();
  assert.equal(scene.holdingVoice, false);
  assert.ok(scene.captions.includes('Heaven, it turns out, has opinions. And Yettis. With wings.'));
});
