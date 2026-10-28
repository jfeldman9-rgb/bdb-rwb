import test from'node:test';import assert from'node:assert/strict';import{collectShake,canActivatePapacito,papacitoEffect,isBossFinisherReady}from'../src/papacito.js';import{applyBossDamage}from'../src/wingman.js';
test('packet: protein economy charges every third shake and caps at two',()=>{assert.deepEqual(collectShake(0,0,1,false),{shakeRemainder:1,charges:0,hearts:1});assert.deepEqual(collectShake(2,0,1,true),{shakeRemainder:0,charges:1,hearts:3});assert.deepEqual(collectShake(2,2,3,true),{shakeRemainder:0,charges:2,hearts:3});});
test('packet: phase-three boss damage floors each Wingman at one HP',()=>{assert.deepEqual(applyBossDamage(1,2,3),{hp:0,removed:2});assert.deepEqual(applyBossDamage(2,1,1),{hp:0,removed:1});assert.deepEqual(applyBossDamage(3,3,9),{hp:1,removed:2});assert.deepEqual(applyBossDamage(3,1,9),{hp:1,removed:0});});
test('Papacito finishes when every living Wingman is at 1 HP, including one survivor',()=>{const one=[{alive:true,hp:1}],ready=[...one,{alive:true,hp:1}],unready=[...one,{alive:true,hp:2}],survivor=[{alive:false,hp:0},{alive:true,hp:1}],bothDead=[{alive:false,hp:0},{alive:false,hp:0}];assert.equal(isBossFinisherReady(3,one),true);assert.equal(isBossFinisherReady(3,ready),true);assert.equal(isBossFinisherReady(3,unready),false);assert.equal(isBossFinisherReady(3,survivor),true);assert.equal(isBossFinisherReady(3,bothDead),false);assert.equal(isBossFinisherReady(2,ready),false);assert.deepEqual(canActivatePapacito(3,unready,1),{allowed:false,finisher:false,charges:1});assert.deepEqual(canActivatePapacito(3,ready,1),{allowed:true,finisher:true,charges:0});assert.deepEqual(canActivatePapacito(3,survivor,1),{allowed:true,finisher:true,charges:0});});
test('wipe KOs visible non-bosses only and awards 500 each',()=>{const enemies=[{x:200,alive:true,hp:48},{x:1500,alive:true,hp:48},{x:800,alive:true,hp:216,boss:true}];const s={charges:1};const r=papacitoEffect(s,enemies);assert.equal(r.killed.length,1);assert.equal(r.score,500);assert.equal(enemies[1].alive,true);assert.equal(enemies[2].hp,216);assert.equal(s.charges,0);});
test('every refusal is free, including boss-only phase 1 and 2 arenas',()=>{for(const c of [{paused:true},{cutscene:true},{dadActive:true},{active:true},{dead:true},{victory:true}]){const s={charges:1};assert.equal(papacitoEffect(s,[{alive:true,x:200}],c).allowed,false);assert.equal(s.charges,1);}for(const enemies of [[],[{alive:true,boss:true,hp:216,x:300}]]){const s={charges:1};assert.equal(papacitoEffect(s,enemies,{phase:2}).allowed,false);assert.equal(s.charges,1);}});
test('finisher removes both Wingmen and grants 4000 only when ready',()=>{const es=[{alive:true,boss:true,hp:1,x:100},{alive:true,boss:true,hp:2,x:600}],s={charges:1};assert.equal(papacitoEffect(s,es,{phase:3}).allowed,false);assert.equal(s.charges,1);es[1].hp=1;const r=papacitoEffect(s,es,{phase:3});assert.equal(r.finisher,true);assert.equal(r.score,4000);assert.ok(es.every(e=>!e.alive));});
test('delayed wipe staggers first and kills on the runner front',()=>{
 const enemies=[{x:200,alive:true,hp:48,stun:0,state:'approach'}];const s={charges:1};
 const r=papacitoEffect(s,enemies,{delay:.45});
 assert.equal(r.delayed,true);assert.equal(enemies[0].alive,true);assert.equal(enemies[0].state,'hurt');assert.ok(enemies[0].stun>=.45);
});
test('the runner front reaches a near yetti before a far one',async()=>{
 const{Campaign}=await import('../src/campaign.js');
 const{papiHitTime}=await import('../src/papacito.js');
 const w=new Campaign({stage:2});w.camX=0;w.enemies=[];
 const near=w.spawnYetti('walker',100,630), far=w.spawnYetti('walker',1100,630);
 w.papi.charges=1;w.events=[];w.score=0;
 assert.equal(w.usePapi(),true);
 assert.equal(near.alive,true);assert.equal(w.stats.kos,0);
 const nearAt=papiHitTime(100), farAt=papiHitTime(1100);
 assert.ok(nearAt<0.4&&farAt>1.2);
 for(let i=0;i<Math.ceil(0.4*60);i++)w.update(1/60,{});
 assert.equal(near.alive,false);assert.equal(far.alive,true);
 assert.equal(w.score,0,'score waits for the last body');
 for(let i=0;i<Math.ceil((farAt-0.4)*60)+2;i++)w.update(1/60,{});
 assert.equal(far.alive,false);assert.equal(w.score,1000);
 assert.ok(w.events.some(e=>e.type==='ko'));
});
