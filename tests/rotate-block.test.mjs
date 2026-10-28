import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PORTRAIT_BLOCK, portraitBlocksPlay, syncRotatePause } from '../src/rotate-block.js';

test('portrait phones block play, and an unchanged orientation does not clear input', () => {
  assert.equal(PORTRAIT_BLOCK, '(orientation:portrait) and (hover:none) and (pointer:coarse)');
  const reasons = new Set();
  let clears = 0;
  const scene = {
    pauseReasons: reasons,
    setPauseReason(reason, on) {
      clears++;
      if (on) reasons.add(reason);
      else reasons.delete(reason);
    },
  };
  const media = (query) => ({ matches: query === PORTRAIT_BLOCK });
  assert.equal(portraitBlocksPlay(media), true);
  syncRotatePause(scene, media);
  assert.equal(reasons.has('rotate'), true);
  assert.equal(clears, 1);
  syncRotatePause(scene, media);
  assert.equal(clears, 1, 'holding portrait does not call setPauseReason again');
  syncRotatePause(scene, () => ({ matches: false }));
  assert.equal(reasons.has('rotate'), false);
  assert.equal(clears, 2);
  assert.equal(portraitBlocksPlay(() => { throw new Error('locked'); }), false);
});

test('index.html uses the RWB portrait block with no letterbox escape', async () => {
  const html = await readFile('index.html', 'utf8');
  assert.ok(html.includes(`@media ${PORTRAIT_BLOCK}{#rotate{display:flex}}`));
  assert.doesNotMatch(html, /body:not\(\.playing\) #rotate/);
  assert.doesNotMatch(html, /letterboxed/);
  assert.match(html, /id="rotate-start"/);
});
