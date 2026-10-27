import test from 'node:test';import assert from 'node:assert/strict';
import * as packet from './fixtures/packet-rules.js';
import {collectShake,canActivatePapacito} from '../src/papacito.js';
import {applyBossDamage,isBossFinisherReady} from '../src/wingman.js';
test('all four packet function bodies remain verbatim',()=>{
 const body=fn=>fn.toString().slice(fn.toString().indexOf('{'));
 for(const fn of [collectShake,canActivatePapacito,applyBossDamage,isBossFinisherReady])assert.equal(body(fn),body(packet[fn.name]),fn.name);
});
