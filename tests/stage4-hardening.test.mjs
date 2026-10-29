import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Campaign } from '../src/campaign.js';
import { Yetti, TYPES, BOSS_ADDS, choirMultiplier, laneY, laneOf, telegraphPlan } from '../src/yettis.js';
import { createShot, stepShot } from '../src/eggplant.js';
import { CAM_LEAD } from '../src/config.js';
import { STAGE_CLIPS, INTRO_V2 } from '../src/cutscene.js';
import { LINES } from '../src/voice-lines.js';
import { createVoiceGate, offerVoice, flushVoiceGate, rollingVoiceStats } from '../src/voice-gate.js';

test('locked rules hold: Choirmaster hp 1140, choirMultiplier 1.28, eggplant vy 0, CAM_LEAD 0.28, intro_v3 default, locked quotes, no shop', () => {
  assert.equal(TYPES.choirmaster.hp, 1140);
  const cm = new Yetti('choirmaster', 500, laneY(1));
  const near = new Yetti('walker', 780, laneY(1));
  const far = new Yetti('walker', 850, laneY(1));
  assert.equal(choirMultiplier(near, [cm, near, far]), 1.28);
  assert.equal(choirMultiplier(far, [cm, near, far]), 1);
  cm.alive = false;
  assert.equal(choirMultiplier(near, [cm, near]), 1);

  const shot = createShot({ x: 200, y: 630, z: 0, facing: 1 });
  assert.equal(shot.vy, 0);
  stepShot(shot, 1 / 60, [], () => {});
  assert.equal(shot.vy, 0);

  assert.equal(CAM_LEAD, 0.28);
  assert.deepEqual(STAGE_CLIPS.intro, ['intro_v3']);
  assert.equal(INTRO_V2.enabled(new URLSearchParams()), false);

  assert.equal(LINES.bdb_open[1], 'I brought the eggplant.');
  assert.equal(LINES.bdb_produce[1], 'Die, Yetti, die!');
  assert.equal(LINES.dad_catchphrase[1], 'Son, sometimes you just need to use the fly swatter to keep the women away!');
  assert.equal(LINES.yetti_porkchop_01[1], 'Pork Chop Sandwiches!');
  assert.equal(LINES.yetti_colombian_room_01[1], 'Stay away from the Colombians room.');
  assert.equal(LINES.yetti_purple_car_01[1], 'Bob why is your car purple?');
  assert.equal(LINES.bob_papacito_01[1], "I'm the Papacito!");
  assert.equal(LINES.papi_crowd_01[1], 'We love you Papacito! Pick me!');

  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /upgrade[-_\s]?shop/i);
});

test('boss gate roar clears mash/shield stun on both Bouncer and Interventionist at 30, 60, and 120 Hz', () => {
  for (const stage of [1, 4]) for (const hz of [30, 60, 120]) for (const phase of [2, 3]) {
    const sources = stage === 4 ? ['clipboard', 'mash'] : ['mash'];
    for (const source of sources) {
      const w = new Campaign({ stage });
      w.startBoss(phase - 1);
      const boss = w.enemies[0];
      if (source === 'clipboard') boss.breakShield();
      else {
        assert.ok(w.bob.grab(boss));
        assert.ok(w.bob.mash(6));
        assert.equal(boss.stun, 1.2);
      }
      const gateHp = Math.floor(boss.maxHp * (phase === 2 ? .66 : .33));
      w.hit(boss, boss.hp - gateHp, -1, false);
      assert.equal(boss.phase, phase);
      assert.equal(boss.state, 'roar');
      assert.equal(boss.stun, 0, `${boss.type} stale stun must not cancel gate roar`);
      if (stage === 4) assert.equal(boss.shield, true);
      else assert.equal(boss.shield, false, 'Interventionist never gains a shield');
      for (let i = 0; i < hz; i++) boss.update(1 / hz, w);
      assert.equal(boss.state, 'roar', `${boss.type} ${hz}Hz gate ${phase} keeps invulnerable beat`);
      assert.equal(boss.canBeHit, false);
      assert.equal(w.enemies.length, 1);
      for (let i = 0; i < Math.ceil(.12 * hz); i++) boss.update(1 / hz, w);
      assert.equal(boss.state, 'approach');
      assert.deepEqual(w.enemies.slice(1).map(e => e.type), BOSS_ADDS[boss.type][phase - 1]);
    }
  }
});

test('grab before phase gate releases Bob cleanly and a subsequent mash never overwrites roar', () => {
  for (const stage of [1, 4]) for (const hz of [30, 60, 120]) for (const viaCampaign of [true, false]) {
    const w = new Campaign({ stage });
    w.startBoss(1);
    const boss = w.enemies[0];
    boss.shield = false;
    assert.equal(w.bob.grab(boss), true);
    boss.state = 'hold';
    const gateHp = Math.floor(boss.maxHp * .66);
    if (viaCampaign) {
      w.hit(boss, boss.hp - gateHp, -1, false);
      assert.equal(w.bob.grabbedBy, null, 'Campaign.hit releases Bob on phase gate');
      assert.equal(w.bob.state, 'idle');
      assert.equal(w.bob.mash(6), false);
    } else {
      assert.equal(boss.takeHit(boss.hp - gateHp, -1).phase, 2);
      assert.equal(w.bob.mash(6), true, 'direct takeHit + mash still frees Bob without cancelling roar');
    }
    assert.equal(boss.state, 'roar');
    assert.equal(boss.stun, 0);
    assert.equal(boss.canBeHit, false);
    for (let i = 0; i < hz; i++) {
      w.bob.update(1 / hz, {}, w.bounds);
      boss.update(1 / hz, w);
    }
    assert.equal(boss.state, 'roar');
    assert.equal(w.bob.grabPunish ?? null, null);
    for (let i = 0; i < Math.ceil(.12 * hz); i++) boss.update(1 / hz, w);
    assert.equal(boss.state, 'approach');
    assert.deepEqual(w.enemies.slice(1).map(e => e.type), BOSS_ADDS[boss.type][1]);
  }
});

test('Salsero closes same-lane continuous-Y dead zones (610 vs 650) without leaving its lane', () => {
  for (const hz of [30, 60, 120]) {
    const w = new Campaign({ stage: 4 });
    w.bob.x = 500; w.bob.y = 650;
    const salsero = new Yetti('salsero', 700, 610);
    salsero.cooldown = 0;
    w.enemies = [salsero];
    assert.equal(laneOf(salsero.y), laneOf(w.bob.y));
    assert.equal(Math.abs(w.bob.y - salsero.y) >= 30, true);
    let telegraphed = false;
    for (let i = 0; i < Math.ceil(1.5 * hz); i++) {
      salsero.update(1 / hz, w);
      assert.equal(laneOf(salsero.y), 1, `stays in lane 1 at ${hz}Hz`);
      if (salsero.state === 'telegraph') { telegraphed = true; break; }
    }
    assert.equal(telegraphed, true, `reaches <30px vertical band and telegraphs at ${hz}Hz`);
  }
});

test('Salsero max-range (260px) lunge crosses Bob plus overshoot and swept-hits across difficulties and step rates', () => {
  for (const difficulty of ['story', 'adventure', 'nightmare']) for (const hz of [30, 60, 120]) {
    const w = new Campaign({ stage: 4, difficulty });
    w.bob.x = 500; w.bob.y = laneY(1); w.bob.inv = 0;
    const salsero = new Yetti('salsero', 758, laneY(1)); // dx = 258, right inside reach: 260
    salsero.cooldown = 0;
    w.enemies = [salsero];
    salsero.update(1 / hz, w);
    assert.equal(salsero.state, 'telegraph', `${difficulty} ${hz}Hz starts telegraph at 258px`);
    for (let i = 0; i < Math.ceil(2.5 * hz) && salsero.state !== 'recover'; i++) {
      salsero.update(1 / hz, w);
    }
    assert.equal(salsero.state, 'recover', `${difficulty} ${hz}Hz finishes rush`);
    assert.ok(salsero.x <= 450, `${difficulty} ${hz}Hz crosses Bob (500) into overshoot: x=${salsero.x}`);
    assert.ok(w.bob.hp < w.bob.maxHp, `${difficulty} ${hz}Hz swept lunge hits grounded Bob`);
  }
});

test('telegraphPlan snapshots authoritative rush/lunge endpoints in both directions and clips to arena bounds', () => {
  const w = new Campaign({ stage: 4 });
  w.bounds = { l: 400, r: 1680 };
  w.bob.x = 600; w.bob.y = laneY(1);

  // Salsero lunging left includes overshoot and ignores mid-telegraph facing mutation.
  const sLeft = new Yetti('salsero', 850, laneY(1));
  sLeft.cooldown = 0;
  sLeft.update(1 / 60, w);
  assert.equal(sLeft.state, 'telegraph');
  sLeft.facing = 1; // mutate live facing during telegraph
  const planLeft = telegraphPlan(sLeft, w);
  assert.equal(planLeft.from, 850);
  assert.ok(planLeft.to <= 545, `Salsero left plan includes overshoot: ${planLeft.to}`);
  while (sLeft.state !== 'recover') sLeft.update(1 / 60, w);
  assert.ok(Math.abs(sLeft.x - planLeft.to) < 12, `rush endpoint ${sLeft.x} matches warning ${planLeft.to}`);

  // Salsero lunging right near right arena wall clips cleanly to bounds.r - 55 / bounds.r.
  w.bob.x = 1600; w.bob.y = laneY(2);
  const sRight = new Yetti('salsero', 1480, laneY(2));
  sRight.cooldown = 0;
  sRight.update(1 / 60, w);
  const planRight = telegraphPlan(sRight, w);
  assert.equal(planRight.from, 1480);
  assert.equal(planRight.to, 1625);
  assert.equal(planRight.y, laneY(2));

  // Bouncer Phase II arena rush from 750px away warns past the old hardcoded 400px strip.
  w.bob.x = 600; w.bob.y = laneY(1);
  const bouncer = new Yetti('bouncer', 1350, laneY(1));
  bouncer.phase = 2; bouncer.cooldown = 0; bouncer.rushCool = 0;
  bouncer.update(1 / 60, w);
  assert.equal(bouncer.state, 'telegraph');
  const bossPlan = telegraphPlan(bouncer, w);
  assert.ok(bossPlan.from - bossPlan.to > 500, `arena rush warning length ${bossPlan.from - bossPlan.to} > 500px`);
});

test('Salsero lane-hop and Bouncer reshield retain timer remainders across 30, 60, and 120 Hz', () => {
  const hopMarks = {};
  for (const hz of [30, 60, 120]) {
    const w = new Campaign({ stage: 4 });
    w.bob.x = 500; w.bob.y = laneY(2);
    const s = new Yetti('salsero', 950, laneY(0));
    s.cooldown = 999;
    w.enemies = [s];
    const marks = [];
    let prevHopY = null;
    for (let i = 1; i <= Math.round(5 * hz); i++) {
      // Alternate target lane after arrival so every 1.4s beat triggers a hop.
      if (s.hopY == null && s.y === laneY(1)) w.bob.y = laneY(2);
      if (s.hopY == null && s.y === laneY(2)) w.bob.y = laneY(0);
      if (s.hopY == null && s.y === laneY(0) && marks.length >= 2) w.bob.y = laneY(2);
      s.update(1 / hz, w);
      if (s.hopY != null && prevHopY == null) marks.push(+(i / hz).toFixed(2));
      prevHopY = s.hopY;
    }
    hopMarks[hz] = marks;
  }
  assert.deepEqual(hopMarks[30], [1.4, 2.8, 4.2]);
  assert.deepEqual(hopMarks[60], [1.4, 2.8, 4.2]);
  assert.deepEqual(hopMarks[120], [1.4, 2.8, 4.2]);

  for (const hz of [30, 60, 120]) {
    const w = new Campaign({ stage: 4 });
    const b = new Yetti('bouncer', 900, laneY(1));
    b.phase = 3; b.cooldown = 999; b.rushCool = 999; b.shield = false;
    w.enemies = [b];
    const marks = [];
    for (let i = 1; i <= 36 * hz; i++) {
      b.update(1 / hz, w);
      if (b.shield) { marks.push(+(i / hz).toFixed(2)); b.shield = false; }
    }
    assert.deepEqual(marks, [12, 24, 36], `reshield schedule at ${hz}Hz`);
  }
});

test('rolling voice gate enforces <=1 line per 8s and <=3 lines per 60s under heavy Stage 4 bursts', () => {
  const gate = createVoiceGate();
  const said = [];
  const stamps = [];
  const emit = (t, id) => offerVoice(gate, id, t, out => { said.push(out); stamps.push(t); });

  emit(0, 'nar_ch4');
  emit(0.5, 'yetti_porkchop_01'); // dropped (ambient while closed)
  emit(2, 'claudia_s4');          // queued (priority)
  emit(4.5, 'bob_s4');            // queued (priority)
  emit(5, 'bouncer_grab');        // dropped (ephemeral while closed)
  emit(6, 'bouncer_intro');       // queued (priority)

  for (let t = 1; t <= 70; t += 0.5) {
    flushVoiceGate(gate, t, out => { said.push(out); stamps.push(t); });
  }
  assert.deepEqual(said, ['nar_ch4', 'claudia_s4', 'bob_s4', 'bouncer_intro']);
  assert.deepEqual(stamps, [0, 8, 16, 60]);
  assert.equal(rollingVoiceStats(stamps).ok, true);
});
