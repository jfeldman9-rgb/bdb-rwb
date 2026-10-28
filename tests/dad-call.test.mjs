import test from'node:test';import assert from'node:assert/strict';import{DAD,createDadCall,unlockDad,noteBobKo,tickDadCall,refuseReason,takeCall,callEffect,bossFloor}from'../src/dad-call.js';import{Dad,DAD_ANIMS,DAD_TIMING}from'../src/dad.js';
test('first charge is locked until explicitly granted',()=>{const s=createDadCall(false);for(let i=0;i<20;i++)noteBobKo(s);tickDadCall(s,60);assert.equal(s.charges,0);unlockDad(s);assert.equal(s.charges,1);assert.equal(DAD.maxCalls,3);});
test('recharge requires both 10 Bob KOs and 45 seconds; max three calls',()=>{const s=createDadCall();for(let call=0;call<3;call++){assert.equal(takeCall(s,{hittable:true}).ok,true);s.on=false;for(let i=0;i<9;i++)noteBobKo(s);tickDadCall(s,45);assert.equal(s.charges,0);noteBobKo(s);tickDadCall(s,.01);assert.equal(s.charges,call<2?1:0);}assert.equal(s.calls,3);const t=createDadCall();takeCall(t,{hittable:true});t.on=false;for(let i=0;i<10;i++)noteBobKo(t);tickDadCall(t,44);assert.equal(t.charges,0);tickDadCall(t,1);assert.equal(t.charges,1);});
test('all refusal reasons spend nothing',()=>{assert.equal(refuseReason(null),'nostate');for(const [why,c,mutate]of [
 ['paused',{paused:true}],['paused',{cutscene:true}],['victory',{victory:true}],['victory',{dead:true}],['busy',{strike:true}],['busy',{},s=>s.on=true],['papi-active',{papiActive:true}],['empty',{hittable:false}],['boss-invulnerable',{bossInvuln:true}],['boss-invulnerable',{bossBeat:true}],['spent',{},s=>s.charges=0],['spent',{},s=>s.calls=3],['phase',{bossPhase:'3:2'},s=>s.phaseCalls['3:2']=1]]){const s=createDadCall();mutate?.(s);const before=JSON.stringify(s);assert.deepEqual(takeCall(s,{hittable:true,...c}),{ok:false,why});assert.equal(JSON.stringify(s),before);}});
test('regulars faint, elites lose 60 percent and shield, bosses respect phase floors',()=>{for(const type of ['walker','hover','choir']){const e={type,alive:true,hp:36,maxHp:36};assert.equal(callEffect(e).killed,true);}for(const type of ['guard','charger','lecturer']){const e={type,alive:true,hp:48,maxHp:48,shield:true};callEffect(e);assert.ok(Math.abs(e.hp-19.2)<1e-8);assert.equal(e.shield,false);assert.equal(e.stun,1.6);}for(const phase of [1,2,3]){const e={alive:true,boss:true,maxHp:216,hp:216,phase};callEffect(e);assert.ok(Math.abs(e.hp-203.04)<1e-8);e.hp=bossFloor(e)+1;callEffect(e);assert.equal(e.hp,bossFloor(e));e.hp=1;callEffect(e);assert.equal(e.hp,1);}});
test('per-phase budget is scoped to the chapter and phase',()=>{const s=createDadCall();takeCall(s,{hittable:true,bossPhase:'1:1'});s.on=false;s.charges=1;assert.equal(refuseReason(s,{hittable:true,bossPhase:'1:1'}),'phase');assert.equal(refuseReason(s,{hittable:true,bossPhase:'2:1'}),'');});
test('Dad timeline is enter 6@12 → swat 8@16 → exit 6@12; duration is the sum of the anims',()=>{
 assert.deepEqual(Object.fromEntries(Object.entries(DAD_ANIMS).map(([k,a])=>[k,[a.frames,a.fps]])),{enter:[6,12],swat:[8,16],exit:[6,12]});
 assert.ok(Math.abs(DAD_TIMING.total-(6/12+8/16+6/12))<1e-9);assert.ok(Math.abs(DAD_TIMING.impact-(6/12+6/16))<1e-9);
 const d=new Dad(0,630,300),seen=[];for(let i=0;i<120&&!d.gone;i++){d.update(1/60,()=>{});const k=d.state+d.frame;if(seen.at(-1)!==k)seen.push(k);}
 const order=[...Array.from({length:6},(_,i)=>'enter'+i),...Array.from({length:8},(_,i)=>'swat'+i),...Array.from({length:6},(_,i)=>'exit'+i)];
 assert.deepEqual(seen,order,'every frame shown once, in order, at 60 Hz');
});
for(const hz of [30,60,120])test(`Dad resolves once on the swat impact frame and is gone after exit (${hz} Hz)`,()=>{
 const d=new Dad(0,630,300);let n=0,at=null;for(let i=0;i<hz*3;i++){d.update(1/hz,()=>{n++;at={state:d.state,frame:d.frame,age:d.age};});if(d.gone)break;}
 assert.equal(n,1);assert.equal(at.state,'swat');assert.equal(at.frame,DAD_ANIMS.swat.impact);assert.ok(at.age>=DAD_TIMING.impact&&at.age<DAD_TIMING.impact+1/hz+1e-9);
 assert.equal(d.gone,true);assert.ok(d.age>=DAD_TIMING.total&&d.age<DAD_TIMING.total+1/hz+1e-9);assert.equal(d.state,'exit');assert.equal(d.frame,5);
});
test('Dad jogs in to his stand mark, swats in place, then jogs out fading',()=>{
 const d=new Dad(1000,630,1400);assert.equal(d.x,900);d.update(DAD_TIMING.enter/2,()=>{});assert.ok(d.x>900&&d.x<1400);
 d.update(DAD_TIMING.enter/2+.01,()=>{});assert.equal(d.state,'swat');assert.equal(d.x,1400);
 d.update(DAD_TIMING.swat,()=>{});assert.equal(d.state,'exit');assert.ok(d.x>1400);d.update(DAD_TIMING.exit-.02,()=>{});assert.ok(d.alpha<.2);
});
