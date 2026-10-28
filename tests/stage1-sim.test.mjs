import test from'node:test';import assert from'node:assert/strict';import{Campaign}from'../src/campaign.js';import{Bot}from'../src/bot.js';
test('Adventure bot clears all Stage 1 zones and Interventionist under eight sim minutes',t=>{let saved;const w=new Campaign({onSave:s=>saved=s}),bot=new Bot();let sawCharge=false;for(let i=0;i<480*60&&!w.stats.stages.includes(1);i++){if(w.zoneIndex<2)assert.equal(w.dadCall.unlocked,false);w.update(1/60,bot.update(1/60,w));if(w.zoneIndex===2&&w.dadCall.unlocked)sawCharge=true;w.events=[];}assert.deepEqual(w.stats.stages,[1]);assert.ok(w.elapsed<480);assert.ok(sawCharge);assert.ok(w.stats.papi>=1);assert.ok(w.stats.dad>=1);assert.equal(saved.unlockedStage,2);assert.ok(w.stats.phases.includes('1:2'));t.diagnostic(JSON.stringify({seconds:w.elapsed,...w.stats}));});
test('zone death returns to the last checkpoint with full hearts and fresh wave',()=>{const w=new Campaign();w.zoneIndex=1;w.checkpoint={zone:1,x:1130,phase:1};w.bob.hp=1;w.hurtBob(true);for(let i=0;i<70;i++)w.update(1/60);assert.equal(w.stats.deaths,1);assert.equal(w.zoneIndex,1);assert.equal(w.bob.x,1130);assert.equal(w.bob.hp,3);assert.ok(w.bob.inv>0);});

test('straight eggplant fire kills every Stage 1 zone-1 Yetti without dash or lane aim',()=>{
  const w=new Campaign({difficulty:'story'});
  // Walk into the first lock, then hold FIRE facing right with no vertical stick and no dash.
  for(let i=0;i<600&&!w.locked;i++)w.update(1/60,{x:1,y:0,fire:false});
  assert.equal(w.zoneIndex,0);assert.ok(w.locked);
  let sawGuard=false,guardDied=false;
  for(let i=0;i<60*90&&w.zoneIndex===0;i++){
    if(w.enemies.some(e=>e.type==='guard'))sawGuard=true;
    const foes=w.enemies.filter(e=>e.alive);
    const e=foes.sort((a,c)=>Math.abs(a.x-w.bob.x)-Math.abs(c.x-w.bob.x))[0];
    const input={x:0,y:0,fire:true};
    if(e){const side=Math.sign(e.x-w.bob.x)||1;if(w.bob.facing!==side)input.x=side;else if(Math.abs(e.x-w.bob.x)>300)input.x=side;}
    if(e&&(e.state==='telegraph'||e.state==='rush'))input.jump=true;
    w.update(1/60,input);
    // Check after update: the zone may advance on the same frame the guard dies.
    if(sawGuard&&!w.enemies.some(en=>en.type==='guard'&&en.alive))guardDied=true;
  }
  assert.ok(sawGuard,'expected the wave-2 guard');
  assert.ok(guardDied,'guard must die to frontal eggplants after shield chips');
  assert.ok(w.zoneIndex>=1,'zone 1 must clear');
  assert.ok(w.stats.kos>=4);
});
test('Stage 1 spawn rows stay inside the gun band from Bob\'s default lane',async()=>{
  const {GUN}=await import('../src/eggplant.js');
  const w=new Campaign();
  w.bob.x=400;w.enterZone();
  for(const e of w.enemies)assert.ok(Math.abs(e.y-630)<GUN.band,`spawn y ${e.y} out of band`);
  // Advance to wave 2 and re-check
  for(const e of w.enemies){e.alive=false;e.hp=0;}
  w.update(1/60,{});
  assert.equal(w.waveIndex,1);
  for(const e of w.enemies)assert.ok(Math.abs(e.y-630)<GUN.band,`wave2 spawn y ${e.y} out of band`);
});
