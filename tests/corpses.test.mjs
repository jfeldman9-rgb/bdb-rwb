import test from 'node:test';
import assert from 'node:assert/strict';
import { CORPSE_S, beginCorpse, stepCorpse } from '../src/corpses.js';

test('enemy corpses hold knockdown for about half a second, then fade out', () => {
  assert.ok(CORPSE_S >= 0.45 && CORPSE_S <= 0.6);
  let c = beginCorpse();
  assert.equal(c.anim, 'knockdown');
  assert.equal(c.done, false);
  assert.equal(c.alpha, 1);
  c = stepCorpse(c, 0.2);
  assert.equal(c.anim, 'knockdown');
  assert.equal(c.done, false);
  assert.equal(c.alpha, 1);
  c = stepCorpse(c, 0.2);
  assert.equal(c.done, false);
  assert.ok(c.alpha < 1 && c.alpha > 0, `fade alpha ${c.alpha}`);
  c = stepCorpse(c, 0.2);
  assert.equal(c.done, true);
  assert.equal(c.alpha, 0);
  assert.equal(c.anim, 'knockdown');
});
