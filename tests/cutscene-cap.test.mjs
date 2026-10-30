import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { OPTIONAL_CLIPS, STAGE_CLIPS, STORY_MAX_MS } from '../src/cutscene.js';
import { createStoryPlayer } from '../src/cutscene-hooks.js';

/** mvhd duration in seconds. One timescale for the whole file. */
function mp4Duration(file) {
  const b = readFileSync(file);
  const walk = (start, end, want) => {
    let off = start;
    while (off + 8 <= end) {
      let size = b.readUInt32BE(off);
      const type = b.toString('latin1', off + 4, off + 8);
      let header = 8;
      if (size === 1) { size = Number(b.readBigUInt64BE(off + 8)); header = 16; }
      if (size < header) break;
      const next = off + size;
      if (type === want) return { off, header };
      if (type === 'moov' || type === 'trak' || type === 'mdia') {
        const hit = walk(off + header, Math.min(next, end), want);
        if (hit) return hit;
      }
      off = next;
    }
    return null;
  };
  const mvhd = walk(0, b.length, 'mvhd');
  assert.ok(mvhd, `${file} has no mvhd`);
  const p = mvhd.off + mvhd.header;
  const version = b[p];
  if (version === 1) {
    const timescale = b.readUInt32BE(p + 20);
    const duration = Number(b.readBigUInt64BE(p + 24));
    return duration / timescale;
  }
  const timescale = b.readUInt32BE(p + 12);
  const duration = b.readUInt32BE(p + 16);
  return duration / timescale;
}

test('story cap is above every STAGE_CLIPS duration and the player uses it', () => {
  const ids = [...new Set(Object.values(STAGE_CLIPS).flat())];
  assert.ok(ids.length >= 6, 'expected the intro, kidnap, and rescue clips');
  let longest = 0, longestId = '';
  for (const id of ids) {
    if (OPTIONAL_CLIPS.has(id) && !existsSync(`assets/cutscenes/${id}.mp4`)) continue;
    const sec = mp4Duration(`assets/cutscenes/${id}.mp4`);
    assert.ok(sec > 1, `${id} duration ${sec}`);
    assert.ok(sec * 1000 < STORY_MAX_MS, `${id} is ${sec.toFixed(2)}s, cap ${STORY_MAX_MS}ms`);
    if (sec > longest) { longest = sec; longestId = id; }
  }
  assert.ok(longest > 30, `${longestId} should be the clip the old 30s cap killed`);
  const root = {
    document: { addEventListener() {}, removeEventListener() {} },
    addEventListener() {}, removeEventListener() {}, navigator: {},
    matchMedia: () => ({ matches: false }),
  };
  const story = createStoryPlayer(new URLSearchParams(''), root);
  assert.equal(story.player.maxMs, STORY_MAX_MS);
  assert.equal(story.player.capMs, STORY_MAX_MS);
  story.destroy();
});
