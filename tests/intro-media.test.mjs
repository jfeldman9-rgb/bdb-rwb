import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { clipMedia, INTRO_REV } from '../src/cutscene.js';
import { createStoryPlayer } from '../src/cutscene-hooks.js';

function boxes(b, start, end) {
  const out = [];
  let off = start;
  while (off + 8 <= end) {
    let size = b.readUInt32BE(off);
    const type = b.toString('latin1', off + 4, off + 8);
    let header = 8;
    if (size === 1) { size = Number(b.readBigUInt64BE(off + 8)); header = 16; }
    if (!Number.isFinite(size) || size < header) break;
    const next = off + size;
    if (next <= off || next > end + 8) break;
    out.push({ type, off, header, next: Math.min(next, end) });
    off = next;
  }
  return out;
}

function findBox(b, start, end, type) {
  return boxes(b, start, end).find((box) => box.type === type) || null;
}

function child(b, box) {
  return { start: box.off + box.header, end: box.next };
}

function mvhdSeconds(b) {
  const moov = findBox(b, 0, b.length, 'moov');
  assert.ok(moov, 'no moov');
  const span = child(b, moov);
  const mvhd = findBox(b, span.start, span.end, 'mvhd');
  assert.ok(mvhd, 'no mvhd');
  const p = mvhd.off + mvhd.header;
  const version = b[p];
  if (version === 1) return Number(b.readBigUInt64BE(p + 24)) / b.readUInt32BE(p + 20);
  return b.readUInt32BE(p + 16) / b.readUInt32BE(p + 12);
}

function videoSampleDeltas(b) {
  const moov = findBox(b, 0, b.length, 'moov');
  const span = child(b, moov);
  for (const trak of boxes(b, span.start, span.end).filter((box) => box.type === 'trak')) {
    const mdia = findBox(b, trak.off + trak.header, trak.next, 'mdia');
    if (!mdia) continue;
    const hdlr = findBox(b, mdia.off + mdia.header, mdia.next, 'hdlr');
    if (!hdlr) continue;
    const handler = b.toString('latin1', hdlr.off + hdlr.header + 8, hdlr.off + hdlr.header + 12);
    if (handler !== 'vide') continue;
    const minf = findBox(b, mdia.off + mdia.header, mdia.next, 'minf');
    const stbl = findBox(b, minf.off + minf.header, minf.next, 'stbl');
    const stts = findBox(b, stbl.off + stbl.header, stbl.next, 'stts');
    const p = stts.off + stts.header + 4;
    const entries = b.readUInt32BE(p);
    const deltas = [];
    for (let i = 0; i < entries; i++) {
      const count = b.readUInt32BE(p + 4 + i * 8);
      const delta = b.readUInt32BE(p + 8 + i * 8);
      for (let n = 0; n < count; n++) deltas.push(delta);
    }
    return deltas;
  }
  return null;
}

test('intro_v3 has no frozen Dad gap and the player cache-busts that file', () => {
  const b = readFileSync('assets/cutscenes/intro_v3.mp4');
  const seconds = mvhdSeconds(b);
  assert.ok(seconds >= 61.4 && seconds <= 61.7, `duration ${seconds}`);
  const deltas = videoSampleDeltas(b);
  assert.ok(deltas, 'no video stts');
  assert.ok(deltas.length >= 1840, `samples ${deltas.length}`);
  const sorted = [...deltas].sort((a, c) => a - c);
  const median = sorted[(sorted.length / 2) | 0];
  const worst = Math.max(...deltas);
  assert.ok(worst <= median * 2, `sample delta ${worst} vs median ${median}`);
  const media = clipMedia('intro_v3');
  assert.equal(media.src, `assets/cutscenes/intro_v3.mp4?v=${INTRO_REV}`);
  assert.equal(media.poster, `assets/cutscenes/intro_v3.jpg?v=${INTRO_REV}`);
  assert.equal(clipMedia('intro_v2').src, 'assets/cutscenes/intro_v2.mp4');
  const root = {
    document: { addEventListener() {}, removeEventListener() {} },
    addEventListener() {}, removeEventListener() {}, navigator: {},
    matchMedia: () => ({ matches: false }),
  };
  const story = createStoryPlayer(new URLSearchParams(''), root);
  assert.equal(story.player.srcOf, null);
  story.destroy();
});
