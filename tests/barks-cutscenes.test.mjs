import test from 'node:test';
import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { createBarks, barkWhere, barkCory, barkPapacito, barkYettiAttack, barkYettiWave, BARK } from '../src/barks.js';
import { STAGE_CLIPS, INTRO_V2 } from '../src/cutscene.js';
import { createDadBag, DAD_CLIPS } from '../src/dad-call-cutscene.js';
import { PRESENT, LINES } from '../src/voice-lines.js';

test('STAGE_CLIPS maps kidnap/rescue/victory and intro_v2 stays behind flag', () => {
  assert.deepEqual(STAGE_CLIPS.kidnap, ['kidnap_1', 'kidnap_2']);
  assert.deepEqual(STAGE_CLIPS.rescue_pre_boss, ['rescue_1']);
  assert.deepEqual(STAGE_CLIPS.victory, ['rescue_2']);
  assert.equal(INTRO_V2.enabled(new URLSearchParams('')), false);
  assert.equal(INTRO_V2.enabled(new URLSearchParams('intro=v2')), true);
});

test('cutscene mp4s and dad placeholder exist on disk', async () => {
  for (const id of ['kidnap_1', 'kidnap_2', 'rescue_1', 'rescue_2', 'intro_v2']) {
    await access(`assets/cutscenes/${id}.mp4`);
  }
  await access('assets/cutscenes/dad/D1.mp4');
});

test('bark cooldowns gate Where/Cory/Yetti lines', () => {
  const st = createBarks(() => 0); // always fire chance rolls
  assert.ok(barkWhere(st, 0));
  assert.equal(barkWhere(st, BARK.whereCd - 1), null);
  assert.ok(barkWhere(st, BARK.whereCd));
  assert.ok(barkPapacito(st).startsWith('bob_papacito_'));
  assert.ok(barkYettiAttack(st, 100));
  assert.equal(barkYettiAttack(st, 100 + BARK.yettiCd - 1), null);
  const c = createBarks(() => 0);
  assert.ok(barkCory(c, 0));
  assert.equal(barkCory(c, 1), null);
});

test('new bark ids are in LINES, PRESENT, and have mp3s', async () => {
  const ids = [
    'bob_papacito_01', 'bob_where_claudia_01', 'bob_cory_joke_01',
    'yetti_porkchop_01', 'yetti_colombian_room_01', 'yetti_purple_car_01',
  ];
  for (const id of ids) {
    assert.ok(LINES[id], id);
    assert.ok(PRESENT.includes(id), id);
    await access(`assets/audio/voice/${id}.mp3`);
  }
});

test('dad call bag rotates without immediate repeat when pool>1', () => {
  const bag = createDadBag({ getItem: () => null, setItem() {} }, () => 0.9, ['D1', 'D2', 'D3']);
  const a = bag.next(), b = bag.next();
  assert.notEqual(a, b);
  assert.ok(DAD_CLIPS.includes('D1'));
});
