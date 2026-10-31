import test from 'node:test';
import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { BARK_IDS, BARK_LINES, BARK_PACKS, BOB_COMBAT, YETTI_DEATH } from '../src/bark-packs.js';
import { LINES, PRESENT } from '../src/voice-lines.js';
import { BARK, createBarks, barkIdle, YETTI_ATTACK, YETTI_TAUNT } from '../src/barks.js';

test('100 new bark ids are registered, present, and on disk', async () => {
  assert.equal(BARK_IDS.length, 100);
  assert.equal(Object.keys(BARK_LINES).length, 100);
  for (const id of BARK_IDS) {
    assert.ok(LINES[id], id);
    assert.equal(LINES[id][0], BARK_LINES[id][0]);
    assert.equal(LINES[id][1], BARK_LINES[id][1]);
    assert.ok(PRESENT.includes(id), id);
    await access(`assets/audio/voice/${id}.mp3`);
  }
});

test('category packs cover every new id once', () => {
  const seen = new Set();
  for (const [key, list] of Object.entries(BARK_PACKS)) {
    assert.ok(list.length > 0, key);
    for (const id of list) {
      assert.ok(!seen.has(id), `dup ${id}`);
      seen.add(id);
      assert.ok(id.startsWith(key.split('_')[0]), id);
    }
  }
  assert.equal(seen.size, 100);
  assert.ok(BOB_COMBAT.length >= 10);
  assert.ok(YETTI_DEATH.length >= 5);
});

test('yetti attack/taunt pools keep locked lines and add new combat/idle', () => {
  assert.ok(YETTI_ATTACK.includes('yetti_porkchop_01'));
  assert.ok(YETTI_ATTACK.some((id) => id.startsWith('yetti_0')));
  assert.ok(YETTI_TAUNT.includes('yetti_purple_car_01'));
  assert.ok(YETTI_TAUNT.some((id) => id.startsWith('yetti_0')));
});

test('barkIdle respects gap/cap via ambient gate', () => {
  const st = createBarks(() => 0);
  assert.ok(barkIdle(st, 0));
  assert.equal(barkIdle(st, 1), null);
  assert.equal(barkIdle(st, BARK.idleCd - 1), null);
  assert.ok(barkIdle(st, BARK.idleCd));
});

test('locked verbatim captions stay word-for-word', () => {
  assert.equal(LINES.bdb_open[1], 'I brought the eggplant.');
  assert.equal(LINES.bdb_produce[1], 'Die, Yetti, die!');
  assert.equal(LINES.yetti_porkchop_01[1], 'Pork Chop Sandwiches!');
  assert.equal(LINES.yetti_colombian_room_01[1], 'Stay away from the Colombians room.');
  assert.equal(LINES.yetti_purple_car_01[1], 'Bob why is your car purple?');
  assert.equal(LINES.dad_catchphrase[1], 'Son, sometimes you just need to use the fly swatter to keep the women away!');
});
