import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.Phaser = { Scene: class {} };
globalThis.window = globalThis;
globalThis.document = { getElementById: () => null, addEventListener() {} };
globalThis.matchMedia = () => ({ matches: false, addEventListener() {} });
const { GameScene, drawEnemyWarning, paintFootprint } = await import('../src/game-scene.js');
const { Campaign } = await import('../src/campaign.js');
const { Yetti, laneY, LANE_H, telegraphPlan } = await import('../src/yettis.js');
const { warningRect } = await import('../src/attack-geometry.js');

function graphics() {
  const rects = [], outlines = [];
  return {
    rects, outlines, color: 0, alpha: 1,
    clear() {}, fillStyle(color, alpha = 1) { this.color = color; this.alpha = alpha; },
    fillRect(x, y, w, h) { rects.push({ x, y, w, h, color: this.color, alpha: this.alpha }); },
    strokeRect(x, y, w, h) { outlines.push({ x, y, w, h }); },
    lineStyle() {}, lineBetween() {}, strokeCircle() {}, fillEllipse() {}, strokeEllipse() {},
  };
}
const rectOnly = ({ x, y, w, h }) => ({ x, y, w, h });
function arena(type, phase = 1) {
  const w = new Campaign({ stage: type === 'dj' || type === 'tagger' ? 5 : type === 'celestina' ? 6 : 7 });
  w.bounds = { l: 0, r: 1280 };
  w.bob.x = 400; w.bob.y = laneY(1);
  const e = new Yetti(type, 800, laneY(1));
  e.phase = phase; e.state = 'telegraph'; e.facing = -1;
  e.planTelegraph(w.bob, w);
  return { w, e };
}

test('Tagger warning and live paint cover the full damaging footprint, away from the thrower', () => {
  const { w, e } = arena('tagger');
  e.y = laneY(1) + 24;
  e.planTelegraph(w.bob, w);
  const warning = graphics();
  drawEnemyWarning(warning, e, w);
  const p = { kind: 'splat', x: e.attackX, y: e.attackY, w: 80, hit: false };
  const expected = { x: 360, y: laneY(1) - LANE_H / 2, w: 80, h: LANE_H };
  assert.deepEqual(warning.rects.map(rectOnly), [expected]);
  assert.deepEqual(paintFootprint(p), expected);
  const live = graphics();
  const scene = { g: live, world: { enemies: [], hostile: [p], projectiles: [], pickups: [] },
    particles: [], dadLabel: { setVisible() {} }, syncSocks() {} };
  GameScene.prototype.effects.call(scene, 0);
  assert.deepEqual(live.rects.map(rectOnly), [expected]);
  assert.deepEqual(live.outlines, [expected]);
  p.hit = true;
  const spent = graphics();
  GameScene.prototype.effects.call({ ...scene, g: spent }, 0);
  assert.ok(spent.rects[0].alpha < live.rects[0].alpha, 'spent paint visibly fades');
  assert.equal(spent.outlines.length, 0, 'spent paint loses its danger outline');
});

test('paint footprint includes damaging lane edges and excludes the neighbouring lane', () => {
  for (const [dx, dy, hurts] of [[39, 28, true], [-39, -28, true], [41, 0, false], [0, 31, false]]) {
    const { w } = arena('tagger');
    w.enemies = []; w.pending = []; w.bob.inv = 0;
    w.bob.x = 400 + dx; w.bob.y = laneY(1) + dy;
    w.snowball(400, laneY(1) + 24, 0, 'splat');
    const area = paintFootprint(w.hostile[0]);
    const inside = w.bob.x >= area.x && w.bob.x <= area.x + area.w
      && w.bob.y >= area.y && w.bob.y < area.y + area.h;
    w.update(1 / 120, {});
    assert.equal(w.stats.hits > 0, hurts, `${dx}, ${dy} damage`);
    assert.equal(inside, hurts, `${dx}, ${dy} visible footprint`);
  }
});

test('new bosses show the committed unsafe lanes before the first and subsequent volleys', () => {
  for (const [type, phase] of [['dj', 2], ['celestina', 3], ['archyetti', 2], ['archyetti', 3]]) {
    const { w, e } = arena(type, phase);
    for (let volley = 0; volley < 3; volley++) {
      e.state = 'telegraph'; e.planTelegraph(w.bob, w);
      const g = graphics();
      drawEnemyWarning(g, e, w);
      const marked = g.rects.map(r => r.y + r.h / 2);
      assert.equal(marked.length, 2, `${type} volley ${volley}`);
      assert.ok(!marked.includes(laneY(e.safeBand)), 'safe lane is unmarked');
      w.hostile = []; e.timer = 0; e.update(1 / 60, w);
      for (const p of w.hostile) assert.ok(marked.includes(p.y), `${type} projectile stayed in a marked lane`);
    }
  }
});

test('Celestina and Arch-Yetti charge warnings take priority over an old safe lane', () => {
  for (const type of ['celestina', 'archyetti']) {
    const { w, e } = arena(type, 3);
    e.mode = 'rush'; e.planTelegraph(w.bob, w); e.safeBand = 1;
    const g = graphics();
    drawEnemyWarning(g, e, w);
    assert.deepEqual(g.rects.map(rectOnly), [warningRect(telegraphPlan(e, w), w.bounds)]);
  }
});

test('DJ all-lane build remains visible through the drop and clears on recovery', () => {
  const { w, e } = arena('dj', 3);
  for (const state of ['telegraph', 'drop', 'recover']) {
    e.state = state;
    const g = graphics();
    drawEnemyWarning(g, e, w);
    assert.deepEqual(g.rects.map(r => r.y + r.h / 2), state === 'recover' ? [] : [0, 1, 2].map(laneY));
  }
});

test('off-centre Minero lamp covers the actual shockwave lane', () => {
  const { w, e } = arena('minero');
  e.y = laneY(1) + 24; e.planTelegraph(w.bob, w);
  const g = graphics();
  drawEnemyWarning(g, e, w);
  const r = g.rects[0];
  assert.equal(r.y + r.h / 2, e.attackY);
  assert.ok(r.y <= e.attackY - 25 && r.y + r.h >= e.attackY + 25);
});
