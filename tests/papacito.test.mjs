import test from'node:test';import assert from'node:assert/strict';import{collectShake,canActivatePapacito,papacitoEffect,isBossFinisherReady}from'../src/papacito.js';import{applyBossDamage}from'../src/wingman.js';
test('packet: protein economy charges every third shake and caps at two',()=>{assert.deepEqual(collectShake(0,0,1,false),{shakeRemainder:1,charges:0,hearts:1});assert.deepEqual(collectShake(2,0,1,true),{shakeRemainder:0,charges:1,hearts:3});assert.deepEqual(collectShake(2,2,3,true),{shakeRemainder:0,charges:2,hearts:3});});
test('packet: phase-three boss damage floors each Wingman at one HP',()=>{assert.deepEqual(applyBossDamage(1,2,3),{hp:0,removed:2});assert.deepEqual(applyBossDamage(2,1,1),{hp:0,removed:1});assert.deepEqual(applyBossDamage(3,3,9),{hp:1,removed:2});assert.deepEqual(applyBossDamage(3,1,9),{hp:1,removed:0});});
test('packet: Papacito requires exactly two weakened live Wingmen and never wastes the last charge',()=>{const one=[{alive:true,hp:1}],ready=[...one,{alive:true,hp:1}],unready=[...one,{alive:true,hp:2}];assert.equal(isBossFinisherReady(3,one),false);assert.equal(isBossFinisherReady(3,ready),true);assert.deepEqual(canActivatePapacito(3,unready,1),{allowed:false,finisher:false,charges:1});assert.deepEqual(canActivatePapacito(3,ready,1),{allowed:true,finisher:true,charges:0});});
test('wipe KOs visible non-bosses only and awards 500 each',()=>{const enemies=[{x:200,alive:true,hp:48},{x:1500,alive:true,hp:48},{x:800,alive:true,hp:216,boss:true}];const s={charges:1};const r=papacitoEffect(s,enemies);assert.equal(r.killed.length,1);assert.equal(r.score,500);assert.equal(enemies[1].alive,true);assert.equal(enemies[2].hp,216);assert.equal(s.charges,0);});
test('every refusal is free, including boss-only phase 1 and 2 arenas',()=>{for(const c of [{paused:true},{cutscene:true},{dadActive:true},{active:true},{dead:true},{victory:true}]){const s={charges:1};assert.equal(papacitoEffect(s,[{alive:true,x:200}],c).allowed,false);assert.equal(s.charges,1);}for(const enemies of [[],[{alive:true,boss:true,hp:216,x:300}]]){const s={charges:1};assert.equal(papacitoEffect(s,enemies,{phase:2}).allowed,false);assert.equal(s.charges,1);}});
test('finisher removes both Wingmen and grants 4000 only when ready',()=>{const es=[{alive:true,boss:true,hp:1,x:100},{alive:true,boss:true,hp:2,x:600}],s={charges:1};assert.equal(papacitoEffect(s,es,{phase:3}).allowed,false);assert.equal(s.charges,1);es[1].hp=1;const r=papacitoEffect(s,es,{phase:3});assert.equal(r.finisher,true);assert.equal(r.score,4000);assert.ok(es.every(e=>!e.alive));});
test('delayed wipe staggers first and kills on the runner front',()=>{
 const enemies=[{x:200,alive:true,hp:48,stun:0,state:'approach'}];const s={charges:1};
 const r=papacitoEffect(s,enemies,{delay:.45});
 assert.equal(r.delayed,true);assert.equal(enemies[0].alive,true);assert.equal(enemies[0].state,'hurt');assert.ok(enemies[0].stun>=.45);
});
test('campaign papi shout comes first; the wipe lands with the runners',async()=>{
 const{Campaign}=await import('../src/campaign.js');
 const w=new Campaign();w.bob.x=300;w.enterZone();
 for(const e of w.enemies)e.cooldown=99;
 w.papi.charges=1;w.events=[];
 assert.equal(w.usePapi(),true);
 assert.ok(w.enemies.some(e=>e.alive),'crowd still standing at the shout');
 assert.equal(w.stats.kos,0);
 const frames=Math.ceil(0.45*60)+2;
 for(let i=0;i<frames;i++)w.update(1/60,{});
 assert.ok(w.stats.kos>0,'wipe landed after the delay');
 assert.ok(w.events.some(e=>e.type==='ko'));
});
