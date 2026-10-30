import test from 'node:test';
import assert from 'node:assert/strict';
import { dadMeter } from '../src/hud.js';
import { DAD, createDadCall, takeCall, noteBobKo, tickDadCall, grantZoneMercy } from '../src/dad-call.js';

test('Dad meter distinguishes recharge from the spent campaign allowance and mercy', () => {
  assert.equal(dadMeter(createDadCall(false)), 'ZONE 3');
  const st = createDadCall();
  assert.equal(dadMeter(st), 'READY');
  for (let call = 1; call <= DAD.maxCalls; call++) {
    assert.equal(takeCall(st, { hittable: true }).ok, true);
    st.on = false;
    assert.equal(dadMeter(st), call < DAD.maxCalls ? '0/10 · 45s' : 'SPENT');
    for (let ko = 0; ko < DAD.kos; ko++) noteBobKo(st);
    tickDadCall(st, DAD.recharge);
    assert.equal(dadMeter(st), call < DAD.maxCalls ? 'READY' : 'SPENT');
  }
  assert.equal(st.charges, 0, 'time and KOs cannot recharge the spent allowance');
  grantZoneMercy(st);
  assert.equal(dadMeter(st), 'READY', 'a restored mercy call remains visible');
});
