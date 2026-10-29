import test from 'node:test';
import assert from 'node:assert/strict';
import { Campaign } from '../src/campaign.js';
import { Yetti, laneY } from '../src/yettis.js';
import { createVoiceGate, offerVoice, canSpeakVoice } from '../src/voice-gate.js';
import { HUD } from '../src/hud.js';
import { FX } from '../src/fx.js';
import { setGameAudioPaused, isGameAudioPaused } from '../src/audio.js';

globalThis.Phaser = globalThis.Phaser || { Scene: class {} };
const { GameScene } = await import('../src/game-scene.js');

function fakeHudScene() {
  const text = () => ({
    setText() { return this; }, setOrigin() { return this; }, setAlign() { return this; },
    setWordWrapWidth() { return this; }, setColor() { return this; }, setScrollFactor() { return this; },
    setDepth() { return this; }, setVisible() { return this; },
  });
  return { add: { text, graphics: () => ({ setScrollFactor() { return this; }, setDepth() { return this; }, clear() {}, fillStyle() {}, lineStyle() {}, lineBetween() {}, fillRect() {}, fillRoundedRect() {}, beginPath() {}, arc() {}, strokePath() {} }) } };
}

test('campaign pause freezes elapsed, pending spawns, hitstop, grab, and the voice clock', () => {
  const w = new Campaign({ stage: 4, rng: () => 1 });
  w.bob.x = 400; w.bob.y = laneY(1);
  w.locked = true;
  w.pending = [{ type: 'walker', x: 700, y: laneY(1), t: 0.4 }];
  w.hitStop = 0.12;
  const lecturer = new Yetti('lecturer', w.bob.x + 60, laneY(1));
  w.enemies = [lecturer];
  lecturer.cooldown = 0; lecturer.update(.01, w); lecturer.update(.7, w);
  assert.equal(w.bob.state, 'grabbed');
  const grabTime = w.bob.stateTime;
  w.elapsed = 20;
  w.voiceGate.stamps = [4, 12, 20];
  w.paused = true;
  const enemies = w.enemies.length;
  for (let i = 0; i < 60; i++) w.update(1 / 60, { x: 1, fire: true });
  assert.equal(w.elapsed, 20);
  assert.equal(w.pending[0].t, 0.4);
  assert.equal(w.hitStop, 0.12);
  assert.equal(w.bob.state, 'grabbed');
  assert.equal(w.bob.stateTime, grabTime);
  assert.equal(w.enemies.length, enemies);
  assert.equal(w.stats.shots, 0);
  assert.deepEqual(w.voiceGate.stamps, [4, 12, 20]);
  assert.equal(canSpeakVoice(w.voiceGate, w.elapsed), false);
  w.paused = false;
  w.update(1 / 60, {});
  assert.ok(w.elapsed > 20);
  assert.ok(w.hitStop < 0.12, 'hitstop resumes after the last owner releases');
  for (let i = 0; i < 20 && (w.hitStop > 0 || (w.pending[0] && w.pending[0].t >= 0.4)); i++) w.update(1 / 60, {});
  assert.ok(!w.pending[0] || w.pending[0].t < 0.4 || w.enemies.length > enemies);
});

test('HUD captions and FX trauma only tick while unpaused', () => {
  const hud = new HUD(fakeHudScene());
  const texts = [];
  hud.caption = { setText(v) { texts.push(v); return this; }, setColor() { return this; } };
  hud.say('Bob', 'Die, Yetti, die!');
  assert.ok(hud.captionLeft > 2);
  const left = hud.captionLeft;
  hud.update({ paused: true, bob: { hp: 3, maxHp: 3, state: 'idle', grabMash: 0 }, papi: { shakeRemainder: 0, charges: 0 }, dadCall: { charges: 0, unlocked: false, kos: 0, since: 0 }, score: 0, difficultyKey: 'adventure', bossActive: false, def: { zones: [{}], boss: { name: '' } }, zoneIndex: 0, victory: false, messageTime: 0, message: '', enemies: [], wingmen: null, stageNo: 4 }, 1);
  assert.equal(hud.captionLeft, left);
  hud.update({ paused: false, bob: { hp: 3, maxHp: 3, state: 'idle', grabMash: 0 }, papi: { shakeRemainder: 0, charges: 0 }, dadCall: { charges: 0, unlocked: false, kos: 0, since: 0 }, score: 0, difficultyKey: 'adventure', bossActive: false, def: { zones: [{}], boss: { name: '' } }, zoneIndex: 0, victory: false, messageTime: 0, message: '', enemies: [], wingmen: null, stageNo: 4 }, 1);
  assert.ok(hud.captionLeft < left);

  const fx = Object.create(FX.prototype);
  fx.paused = false; fx.trauma = 0.8; fx._dt = 1 / 60; fx.flashT = 0.2;
  fx.hitLight = { intensity: 1 }; fx.flash = { setAlpha() {}, setVisible() {} }; fx.booms = [];
  fx.update(0.1);
  assert.ok(fx.trauma < 0.8);
  const after = fx.trauma;
  fx.setPaused(true);
  fx.update(0.1);
  assert.equal(fx.trauma, after);
  assert.equal(fx._dt, 0);
});

test('overlapping pause owners keep the sim frozen until the last one releases', () => {
  const scene = Object.create(GameScene.prototype);
  const pausedEl = [];
  scene.game = { inp: { clear() { pausedEl.push('clear'); } } };
  scene.world = { paused: false };
  scene.pauseReasons = new Set();
  scene.views = new Map();
  scene.sockViews = new Map();
  scene.sockPuffs = [];
  scene.fx = { setPaused(on) { scene.fxPaused = on; } };
  scene.anims = { pauseAll() { scene.animsPaused = true; }, resumeAll() { scene.animsPaused = false; } };
  scene.tweens = { pauseAll() { scene.tweensPaused = true; }, resumeAll() { scene.tweensPaused = false; } };
  scene.setPauseReason('manual', true);
  scene.setPauseReason('background', true);
  assert.equal(scene.world.paused, true);
  assert.equal(scene.fxPaused, true);
  assert.equal(scene.animsPaused, true);
  assert.equal(scene.tweensPaused, true);
  assert.equal(isGameAudioPaused(), true);
  scene.setPauseReason('manual', false);
  assert.equal(scene.world.paused, true, 'one owner still holds');
  scene.setPauseReason('background', false);
  assert.equal(scene.world.paused, false);
  assert.equal(scene.fxPaused, false);
  assert.equal(isGameAudioPaused(), false);
});

test('a paused voice gate does not admit a new line while the campaign clock is frozen', () => {
  const gate = createVoiceGate();
  const said = [];
  offerVoice(gate, 'nar_ch4', 0, id => said.push(id));
  offerVoice(gate, 'nar_victory', 1, id => said.push(id));
  assert.deepEqual(said, ['nar_ch4']);
  assert.deepEqual(gate.queue, ['nar_victory']);
  const w = new Campaign({ stage: 4 });
  w.voiceGate = gate; w.elapsed = 1; w.paused = true;
  w.update(8, {});
  assert.equal(w.elapsed, 1);
  assert.deepEqual(gate.queue, ['nar_victory']);
  assert.deepEqual(said, ['nar_ch4']);
  setGameAudioPaused(true);
  assert.equal(isGameAudioPaused(), true);
  setGameAudioPaused(false);
});
