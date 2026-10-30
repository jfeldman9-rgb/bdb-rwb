import test from 'node:test';
import assert from 'node:assert/strict';
import { Campaign } from '../src/campaign.js';
import { Yetti, TYPES, laneY } from '../src/yettis.js';

globalThis.Phaser = { Scene: class {}, TintModes: { MULTIPLY: 0, FILL: 1 } };
const { GameScene, roleAnim } = await import('../src/game-scene.js');

function view(key = 'dj') {
  return {
    def: { key },
    face() {}, sync() {}, play(anim) { this.anim = anim; },
    sprite: {
      setAlpha() {},
      setTintMode(mode) { this.mode = mode; return this; },
      setTint(color) { this.tint = color; return this; },
    },
  };
}

test('accepted boss shots flash solid white, play a short resting flinch, and restore the atlas tint', () => {
  for (const type of ['dj', 'celestina', 'archyetti']) {
    const w = new Campaign({ stage: 5 });
    const e = new Yetti(type, 800, laneY(1));
    w.enemies = [e];
    const bossView = view();
    const scene = Object.create(GameScene.prototype);
    Object.assign(scene, { world: w, views: new Map([[w.bob, view()], [e, bossView]]), cameras: { main: { setScroll() {} } }, anims: { exists: () => true } });
    assert.equal(e.takeHit(1, 1).accepted, true);
    scene.syncViews();
    assert.equal(bossView.sprite.tint, 0xffffff);
    assert.equal(bossView.sprite.mode, Phaser.TintModes.FILL, 'a white texture tint alone would not visibly flash a white-tinted boss');
    assert.equal(bossView.anim, 'hurt');
    e.update(.15, w); scene.syncViews();
    assert.equal(bossView.sprite.mode, Phaser.TintModes.MULTIPLY);
    assert.equal(bossView.sprite.tint, TYPES[type].tint);
    assert.notEqual(bossView.anim, 'hurt');
  }
});

test('a boss killed during a hit flash restores normal tint for its corpse even with the simulation stopped', () => {
  const w = new Campaign({ stage: 5 });
  const e = new Yetti('dj', 800, laneY(1));
  e.phase = 3; e.hp = 2; w.enemies = [e];
  const bossView = view();
  const scene = Object.create(GameScene.prototype);
  Object.assign(scene, { world: w, views: new Map([[w.bob, view('bob')], [e, bossView]]), cameras: { main: { setScroll() {} } }, anims: { exists: () => true } });
  e.takeHit(1, 1); scene.syncViews();
  assert.equal(bossView.sprite.mode, Phaser.TintModes.FILL);
  e.takeHit(1, 1); scene.syncViews(1 / 60);
  assert.equal(e.alive, false);
  assert.equal(bossView.anim, 'down');
  assert.equal(bossView.sprite.mode, Phaser.TintModes.MULTIPLY);
  scene.syncViews(.1);
  assert.equal(bossView.sprite.mode, Phaser.TintModes.MULTIPLY);
});

test('cosmetic boss flinches never replace telegraph, charge, roar, blink, hold, or floor animations', () => {
  for (const type of ['dj', 'celestina', 'archyetti']) {
    for (const state of ['telegraph', 'rush', 'roar', 'blink', 'hold', 'floored', 'drop', 'recover']) {
      const model = { type, boss: true, state, hurtT: .14 };
      assert.equal(roleAnim(model), roleAnim({ ...model, hurtT: 0 }), `${type} ${state}`);
    }
    for (const state of ['approach', 'wait']) assert.equal(roleAnim({ type, boss: true, state, hurtT: .14 }), 'hurt');
  }
});
