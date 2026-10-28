import test from'node:test';import assert from'node:assert/strict';import{Campaign}from'../src/campaign.js';import{isBossFinisherReady,applyBossDamage}from'../src/wingman.js';import{callEffect}from'../src/dad-call.js';
test('phase 1→2→3 splits into two; shots and Dad cannot kill phase 3',()=>{const w=new Campaign({stage:3});w.startBoss();w.enemies[0].takeHit(999);w.wingmen.update(.01,w);assert.equal(w.wingmen.phase,2);assert.equal(w.checkpoint.phase,2);w.enemies[0].state='hover';w.enemies[0].takeHit(999);w.wingmen.update(.01,w);assert.equal(w.wingmen.phase,3);const pair=w.enemies.filter(e=>e.type==='wingman');assert.equal(pair.length,2);assert.ok(w.enemies.some(e=>!e.boss&&e.alive),'phase III calls in minions');for(const b of pair){b.state='hover';b.takeHit(999);assert.equal(b.hp,1);callEffect(b);assert.equal(b.hp,1);assert.equal(b.alive,true);}assert.ok(isBossFinisherReady(3,pair));w.papi.charges=1;assert.ok(w.usePapi());assert.ok(pair.every(e=>e.alive),'finisher waits for the runner front');for(let i=0;i<40;i++)w.update(1/60,{});assert.ok(pair.every(e=>!e.alive));});
test('finisher softlock spawns a reachable shake trio every eight seconds',()=>{const w=new Campaign({stage:3});w.startBoss(3);for(const e of w.enemies)e.hp=1;w.pickups=[];for(let i=0;i<480;i++)w.wingmen.update(1/60,w);assert.equal(w.pickups.length,3);assert.ok(w.pickups.every(p=>p.x>w.bounds.l&&p.x<w.bounds.r));for(let i=0;i<480;i++)w.wingmen.update(1/60,w);assert.equal(w.pickups.length,6);w.papi.charges=1;for(let i=0;i<480;i++)w.wingmen.update(1/60,w);assert.equal(w.pickups.length,6);});
test('boss death retry preserves the current phase checkpoint',()=>{const w=new Campaign({stage:3});w.startBoss(3);w.bob.hp=0;w.bob.alive=false;w.respawn();assert.equal(w.wingmen.phase,3);assert.equal(w.enemies.length,2);assert.equal(w.bob.hp,3);});
test('boss damage sanitizes invalid values and never increases live HP above floor',()=>{assert.deepEqual(applyBossDamage(1,NaN,12),{hp:0,removed:0});assert.deepEqual(applyBossDamage(3,5,Infinity),{hp:5,removed:0});assert.deepEqual(applyBossDamage(3,5,-99),{hp:5,removed:0});});
test('HUD draws one HP bar per Wingman and drops the street label',async()=>{
 const{bossBars}=await import('../src/hud.js');
 const pair={enemies:[{type:'wingman',boss:true,alive:true,hp:100,maxHp:200,role:1},{type:'wingman',boss:true,alive:true,hp:50,maxHp:200,role:2}]};
 assert.deepEqual(bossBars(pair),[{label:'W1',ratio:.5},{label:'W2',ratio:.25}]);
 const solo={enemies:[{type:'interventionist',boss:true,alive:true,hp:600,maxHp:1200}]};
 assert.deepEqual(bossBars(solo),[{label:'BOSS',ratio:.5}]);
 assert.deepEqual(bossBars({enemies:[]}),[]);
 const{readFile}=await import('node:fs/promises');
 const hud=await readFile('src/hud.js','utf8');
 assert.match(hud,/fillStyle\(0x101421,\.55\)/);assert.doesNotMatch(hud,/\.92\);g\.fillRect\(0,0,1280,116\)/);
 const parallax=await readFile('src/parallax.js','utf8');
 assert.doesNotMatch(parallax,/scene\.add\.text\(32, 490/);
});
