import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.Phaser = { Scene: class {} };
globalThis.window = globalThis;
globalThis.document = {
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener() {},
  removeEventListener() {},
  body: { classList: { add() {}, remove() {}, contains: () => false } },
};
globalThis.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });

const { GameScene, roleAnim, trackForStageStart, isSilentOpenerClip } = await import('../src/game-scene.js');
const { Campaign } = await import('../src/campaign.js');
const { Yetti, laneY } = await import('../src/yettis.js');
const { registerVoiceLines } = await import('../src/voice-lines.js');
const { duckStageBed, playTrack, musicState } = await import('../src/audio.js');
const { createStartupGuard } = await import('../src/startup.js');
const { q } = await import('../src/config.js');
const { maxStage } = await import('../src/stages.js');
registerVoiceLines();

test('restarting from the Stage 3 cage into Stage 4 discards destroyed Claudia views before final victory', () => {
  const scene = Object.create(GameScene.prototype);
  scene.game = {};
  scene.claudia = { play() { throw new Error('destroyed Stage 3 sprite'); } };
  scene.claudiaCage = { destroy() { throw new Error('destroyed Stage 3 cage'); } };
  scene.init({ world: { stageNo: 4 } });
  assert.equal(scene.claudia, null);
  assert.equal(scene.claudiaCage, null);
  assert.doesNotThrow(() => scene.freeClaudia());
});

test('init() resets rescueBeat and invalidates stale held-clip callbacks across Stage 3 -> Stage 4 -> new run -> Stage 3', () => {
  const scene = Object.create(GameScene.prototype);
  const played = [];
  let pendingDone = null;
  scene.game = {
    runSeq: 0,
    inp: { clear() {} },
    story: { play(key, done) { played.push(key); pendingDone = done; } },
  };
  scene.init({ world: { stageNo: 3, paused: false, bossActive: false, victory: false, def: { next: 4 }, events: [{ type: 'clear', data: 3 }] } });
  assert.equal(scene.rescueBeat, false);
  scene.handleEvents();
  assert.equal(scene.rescueBeat, true);
  assert.deepEqual(played, ['victory']);

  // Transition into Stage 4 before the previous clip settles, then fire the stale callback.
  const staleDone = pendingDone;
  scene.init({ world: { stageNo: 4, paused: false, bossActive: false, victory: false, events: [] } });
  assert.equal(scene.rescueBeat, false);
  staleDone?.();
  assert.equal(scene.holdingVoice, false);
  assert.equal(scene.pauseReasons.has('cutscene'), false);

  // Start a second run and clear Stage 3 again on the same reused GameScene instance.
  scene.init({ world: { stageNo: 3, paused: false, bossActive: false, victory: false, def: { next: 4 }, events: [{ type: 'clear', data: 3 }] } });
  scene.handleEvents();
  assert.equal(scene.rescueBeat, true);
  assert.deepEqual(played, ['victory', 'victory'], 'every Stage 3 clear plays the rescue on a reused scene');
  pendingDone?.();
});

test('GameScene presents campaign-approved lines immediately and does not own a second gate', () => {
  const scene = Object.create(GameScene.prototype);
  const spoken = [];
  scene.game = { runSeq: 0, inp: { update() {}, take: () => false, snapshot: () => ({}), clear() {} }, story: { play(_k, done) { done(); } } };
  scene.init({ world: new Campaign({ stage: 4 }) });
  scene.world.events = [];
  scene.hud = { say(_who, line) { spoken.push(line); }, update() {} };

  assert.equal(scene.voiceGate, undefined);
  assert.equal(scene.voiceClock, undefined);
  scene.world.events.push({ type: 'voice', data: 'dad_catchphrase' });
  scene.world.events.push({ type: 'voice', data: 'papi_crowd_01' });
  scene.handleEvents();
  assert.deepEqual(spoken, [
    'Son, sometimes you just need to use the fly swatter to keep the women away!',
    'We love you Papacito! Pick me!',
  ]);
});

test('a Bouncer defeat flushed in the victory update remains visible through the whole finale', () => {
  const els = { victory: { hidden: true }, 'victory-score': { textContent: '' }, 'victory-line': { textContent: '' } };
  const prevGet = document.getElementById;
  document.getElementById = id => els[id] || null;
  try {
    const w = new Campaign({ stage: maxStage, rng: () => 1 });
    w.elapsed = 182.7; w.voiceAt = []; w.events = [];
    w.voiceGate.stamps = [125.2, 133.2, 141.2]; w.voiceGate.queue = ['bouncer_defeat'];
    const scene = Object.create(GameScene.prototype);
    scene.game = { runSeq: 0, inp: { clear() {} } };
    scene.init({ world: w });
    scene.hud = { say() {} };
    w.finishStage(); w.update(2.5);
    assert.deepEqual(w.events.filter(e => ['voice', 'victory'].includes(e.type)).map(e => e.data || e.type), ['bouncer_defeat', 'victory']);
    scene.handleEvents();
    assert.equal(els.victory.hidden, false);
    assert.match(els['victory-line'].textContent, /BOUNCER  \/  Fine\. You're on the list\./);
    for (let i = 0; i < 70 * 60; i++) { w.update(1 / 60); scene.handleEvents(); }
    const text = els['victory-line'].textContent;
    assert.match(text, /Fine\. You're on the list\./);
    assert.match(text, /good judgment\./);
    assert.match(text, /Let's leave before they reform\./);
  } finally { document.getElementById = prevGet; }
});

test('?nocutscenes=1 presents Dad fallback through the Campaign budget', () => {
  const prev = q.get('nocutscenes'); q.set('nocutscenes', '1');
  try {
    const w = new Campaign({ stage: 2 }); w.elapsed = 30; w.events = [];
    w.spawnYetti('walker', 500, 630);
    const scene = Object.create(GameScene.prototype), captions = [];
    scene.game = { runSeq: 0, inp: { clear() {} } }; scene.init({ world: w });
    scene.hud = { say(_who, text) { captions.push(text); } };
    assert.equal(w.useDad(), true); scene.handleEvents(); scene.handleEvents();
    assert.deepEqual(w.voiceGate.stamps, [0, 30]);
    assert.deepEqual(captions, ['Bobby! Get behind me, kid!']);
    w.emit('voice', 'dad_catchphrase');
    assert.ok(w.voiceGate.queue.includes('dad_catchphrase'));
  } finally { if (prev == null) q.delete('nocutscenes'); else q.set('nocutscenes', prev); }
});

test('Stage 4 silent kidnap keeps the chapter bed; Stage 2 keeps its historical stop', () => {
  assert.equal(isSilentOpenerClip('stage4'), true);
  assert.equal(isSilentOpenerClip('kidnap'), true);
  assert.equal(isSilentOpenerClip('rescue_pre_boss'), false);
  assert.equal(trackForStageStart(4, [{ type: 'cutscene', data: 'stage4' }, { type: 'cutscene', data: 'kidnap' }]), 'stage4');
  assert.equal(trackForStageStart(2, [{ type: 'cutscene', data: 'stage2' }, { type: 'cutscene', data: 'kidnap' }]), null);
  const s4 = Object.create(GameScene.prototype);
  s4.stageNo = 4;
  assert.equal(s4.stageBedClip(['stage4', 'kidnap']), true);
  const s2 = Object.create(GameScene.prototype);
  s2.stageNo = 2;
  assert.equal(s2.stageBedClip(['stage2', 'kidnap']), false);
});

test('roleAnim selects every Bouncer animation directly before generic role fallbacks while preserving legacy roles', () => {
  const bouncerCases = [
    [{ type: 'bouncer', state: 'approach', shield: true }, 'walk'],
    [{ type: 'bouncer', state: 'wait', shield: true }, 'block'],
    [{ type: 'bouncer', state: 'wait', shield: false }, 'walk'],
    [{ type: 'bouncer', state: 'telegraph', shield: false }, 'grab'],
    [{ type: 'bouncer', state: 'hold', shield: false }, 'hold'],
    [{ type: 'bouncer', state: 'rush', shield: false }, 'rush'],
    [{ type: 'bouncer', state: 'slam', shield: false }, 'stomp'],
    [{ type: 'bouncer', state: 'roar', shield: true }, 'roar'],
    [{ type: 'bouncer', state: 'hurt', shield: false }, 'hurt'],
    [{ type: 'bouncer', state: 'dead', shield: false }, 'down'],
  ];
  for (const [model, expected] of bouncerCases) {
    assert.equal(roleAnim(model), expected, `bouncer ${model.state} shield=${model.shield}`);
  }
  assert.equal(roleAnim({ type: 'salsero', state: 'telegraph' }), 'spin');
  assert.equal(roleAnim({ type: 'salsero', state: 'rush' }), 'lunge');
  assert.equal(roleAnim({ type: 'interventionist', state: 'roar' }), 'slam');
  assert.equal(roleAnim({ type: 'choirmaster', state: 'roar' }), 'ring');
  assert.equal(roleAnim({ type: 'wingman', state: 'recover' }), 'land');
  assert.equal(roleAnim({ type: 'charger', state: 'telegraph' }), 'windup');
  assert.equal(roleAnim({ type: 'lecturer', state: 'hold' }), 'lecture');
});

test('Nightmare unlock on Stage 3 clear announces at Stage 3 and carries into Stage 4 final victory once', () => {
  const els = {
    victory: { hidden: true },
    'victory-score': { textContent: '' },
    'victory-line': { textContent: '' },
  };
  const prevGet = globalThis.document.getElementById;
  globalThis.document.getElementById = id => els[id] || null;
  try {
    const w = new Campaign({ stage: 3, save: { beaten: false, unlockedStage: 3 } });
    assert.equal(w.beatenAtStart, false);
    w.score = 1234;
    w.finishStage();
    assert.equal(w.save.beaten, true);
    assert.equal(w.nightmareUnlockedPending, true);
    assert.ok(w.events.some(e => e.type === 'unlock' && e.data === 'nightmare'));

    const scene = Object.create(GameScene.prototype);
    scene.game = { runSeq: 0, inp: { clear() {} }, story: { play(_k, done) { done([]); } } };
    scene.init({ world: w });
    scene.hud = { say() {}, caption: { setText() {} } };
    scene.handleEvents();
    assert.match(w.message, /NIGHTMARE UNLOCKED/);
    assert.equal(w.nightmareUnlockedPending, true, 'unlock stays pending until final victory acknowledges it');

    w.update(3);
    assert.equal(w.stageNo, 4);
    while (w.def.next) { w.finishStage(); w.update(3); }
    w.finishStage();
    w.update(3);
    assert.equal(w.victory, true);

    scene.init({ world: w });
    scene.hud = { say() {}, caption: { setText() {} } };
    scene.presentVictory();
    assert.equal(els.victory.hidden, false);
    assert.equal(els['victory-score'].textContent, '1234 points · Nightmare unlocked');
    assert.equal(w.nightmareUnlockedPending, false);
  } finally {
    globalThis.document.getElementById = prevGet;
  }
});

test('array-form victory clips do not resume stage or boss music in startHeldClip', () => {
  playTrack('stage1');
  for (const clipKey of ['victory', ['victory'], ['stage3', 'victory']]) {
    const scene = Object.create(GameScene.prototype);
    scene.game = {
      runSeq: 0,
      inp: { clear() {} },
      story: {
        play(_k, done) { scene._done = done; },
      },
    };
    scene.init({ world: { stageNo: 3, paused: false, bossActive: true, events: [] } });
    scene.startHeldClip(clipKey, () => {});
    assert.equal(musicState().wanted, null, `${JSON.stringify(clipKey)} stops music during clip`);
    scene._done();
    assert.equal(musicState().wanted, null, `${JSON.stringify(clipKey)} does not restart boss/stage music`);
  }
});

test('duckStageBed tracks owner tokens across delayed track start and overlapping clips', () => {
  const prevCtx = globalThis.AudioContext;
  class FakeParam {
    constructor(v = 1) { this.value = v; }
    cancelScheduledValues() {}
    setValueAtTime(v) { this.value = v; }
    linearRampToValueAtTime(v) { this.value = v; }
    exponentialRampToValueAtTime(v) { this.value = v; }
  }
  class FakeGain {
    constructor() { this.gain = new FakeParam(1); }
    connect() {}
    disconnect() {}
  }
  globalThis.Audio = class {
    constructor(url) { this.url = url; this.paused = true; this.volume = 1; }
    play() { this.paused = false; return Promise.resolve(); }
    pause() { this.paused = true; }
    removeAttribute() {}
    load() {}
  };
  globalThis.AudioContext = class {
    constructor() { this.currentTime = 0; this.state = 'running'; this.sampleRate = 44100; this.destination = {}; }
    createGain() { return new FakeGain(); }
    createDynamicsCompressor() {
      return {
        threshold: new FakeParam(), knee: new FakeParam(), ratio: new FakeParam(),
        attack: new FakeParam(), release: new FakeParam(), connect() {}, disconnect() {},
      };
    }
    createMediaElementSource() { return { connect() {}, disconnect() {} }; }
    close() { this.state = 'closed'; return Promise.resolve(); }
  };
  try {
    duckStageBed(false, null);
    const ownerA = Symbol('A'), ownerB = Symbol('B');
    // Duck before stage4 track starts: playTrack('stage4') must honor the active duck state.
    duckStageBed(true, ownerA);
    playTrack('stage4', { fade: 0 });
    const duckedGain = musicState().gain;
    assert.equal(musicState().ducked, true);
    assert.ok(Math.abs(duckedGain - 0.65 * 0.35) < 1e-6, `expected ducked gain, got ${duckedGain}`);

    // Second owner overlaps; releasing ownerA must NOT restore full gain while ownerB still holds it.
    duckStageBed(true, ownerB);
    duckStageBed(false, ownerA);
    assert.equal(musicState().ducked, true);
    assert.ok(Math.abs(musicState().gain - 0.65 * 0.35) < 1e-6);

    // Releasing ownerB restores full gain.
    duckStageBed(false, ownerB);
    assert.equal(musicState().ducked, false);
    assert.ok(Math.abs(musicState().gain - 0.65) < 1e-6);
  } finally {
    duckStageBed(false, null);
    globalThis.AudioContext = prevCtx;
    delete globalThis.Audio;
  }
});

test('missing mandatory Stage 4 metadata or chapter loaderror triggers the recovery screen cleanly', () => {
  const els = {};
  const byId = id => (els[id] ??= { textContent: '', hidden: id === 'startup-error', focus() {}, addEventListener() {}, removeEventListener() {} });
  const prevDoc = globalThis.document;
  const prevGuard = globalThis.__bdbStartup;
  const doc = { getElementById: byId, body: { classList: { add() {}, remove() {} } } };
  globalThis.document = doc;
  const root = { document: doc, addEventListener() {}, removeEventListener() {}, location: { reload() {} } };
  const guard = createStartupGuard(root);
  guard.ready(); // Simulate post-Title chapter transition into Stage 4.
  globalThis.__bdbStartup = guard;
  try {
    const scene = Object.create(GameScene.prototype);
    scene.game = { runSeq: 0, residentChars: [], residentTextures: [] };
    scene.init({ world: { stageNo: 4, events: [] } });
    scene.cache = { json: { get: () => null } }; // Missing bouncer/salsero anims.json
    scene.textures = { exists: () => false, remove() {} };
    scene.load = { on() {}, once() {}, off() {}, image() {} };
    assert.doesNotThrow(() => scene.preload());
    assert.equal(scene.loadFailed, true);
    assert.equal(els['startup-error'].hidden, false);
    assert.match(els['startup-code'].textContent, /REQUIRED_ASSET_FAILED/);
    assert.doesNotThrow(() => scene.create());
    assert.equal(scene.started, false);
  } finally {
    globalThis.document = prevDoc;
    globalThis.__bdbStartup = prevGuard;
  }
});

test('GameScene.effects draws warning strips from stored telegraphPlan instead of live facing or fixed 400px', () => {
  const rects = [];
  const scene = Object.create(GameScene.prototype);
  scene.g = {
    clear() {}, lineStyle() {}, beginPath() {}, arc() {}, strokePath() {},
    fillStyle() {}, fillEllipse() {}, strokeEllipse() {}, lineBetween() {},
    strokeRoundedRect() {}, strokeCircle() {}, fillRoundedRect() {}, fillTriangle() {},
    fillRect(x, y, w, h) { rects.push({ x, y, w, h }); },
  };
  scene.dadLabel = { setVisible() {} };
  scene.anims = { exists: () => true };
  scene.particles = [];
  const w = new Campaign({ stage: 4 });
  w.bounds = { l: 500, r: 1780 };
  w.bob.x = 650; w.bob.y = laneY(1);
  const bouncer = new Yetti('bouncer', 1450, laneY(1));
  bouncer.phase = 2; bouncer.cooldown = 0; bouncer.rushCool = 0;
  bouncer.update(1 / 60, w);
  bouncer.facing = 1; // Flip live facing; warning must still point left along rushDir.
  w.enemies = [bouncer];
  scene.world = w;
  scene.effects(0);
  assert.equal(rects.length, 1);
  assert.ok(rects[0].w > 500, `expected full arena rush warning > 500px, got ${rects[0].w}`);
  assert.equal(rects[0].x + rects[0].w, 1450);
  assert.equal(rects[0].h, 68, 'warning height is the rush contact halfH * 2');
  assert.equal(rects[0].y, laneY(1) - 34);
});
