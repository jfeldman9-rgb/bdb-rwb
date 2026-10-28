import test from'node:test';import assert from'node:assert/strict';import{Bob}from'../src/bob.js';import{LANE_TOP,LANE_BOT}from'../src/config.js';
const step=(b,seconds,input={})=>{for(let i=0;i<Math.round(seconds*120);i++)b.update(1/120,input);};
test('270px/s movement normalizes diagonals and stays inside the lane',()=>{const b=new Bob({x:200,y:630});step(b,1,{x:1});assert.ok(Math.abs(b.x-470)<.001);step(b,1,{y:-1});assert.equal(b.y,LANE_TOP);step(b,1,{y:1});assert.equal(b.y,LANE_BOT);});
test('jump is independent of lane and lands safely',()=>{const b=new Bob();b.update(1/120,{jump:true});step(b,.2);assert.ok(b.z>60);assert.equal(b.y,630);step(b,1);assert.equal(b.z,0);assert.equal(b.vz,0);});
test('dash works on the ground and in air and recovers stock',()=>{for(const airborne of [false,true]){const b=new Bob();if(airborne)b.update(1/60,{jump:true});const x=b.x;b.update(1/60,{dash:true});assert.ok(b.x>x+8);assert.equal(b.dashStocks,0);assert.ok(b.inv>=.27);step(b,.7);assert.equal(b.dashStocks,1);}});
test('third hit within two seconds knocks down then gets up with immunity',()=>{const b=new Bob({difficulty:'story'});b.takeHit();assert.equal(b.state,'hurt');step(b,.6);b.takeHit();step(b,.6);b.takeHit();assert.equal(b.state,'knockdown');step(b,.7);assert.equal(b.state,'getup');step(b,.4);assert.equal(b.state,'idle');assert.ok(b.inv>1.4);});
test('old hit streak expires; a charger always knocks down',()=>{const b=new Bob({difficulty:'story'});b.takeHit();step(b,2.1);b.takeHit();assert.equal(b.state,'hurt');step(b,.6);b.takeHit({charger:true});assert.equal(b.state,'knockdown');});
test('six presses free a grab and incapacitate the Lecturer',()=>{const b=new Bob(),e={alive:true};assert.ok(b.grab(e));for(let i=0;i<5;i++)assert.equal(b.mash(),false);assert.equal(b.mash(),true);assert.equal(b.grabbedBy,null);assert.equal(e.state,'hurt');assert.ok(b.inv>=1.5);});
test('Story auto-mashes; killed grabber cannot strand Bob',()=>{const b=new Bob({difficulty:'story'}),e={alive:true};b.grab(e);step(b,1.8);assert.notEqual(b.state,'grabbed');const c=new Bob();const hp=c.hp;c.grab(e);e.alive=false;c.update(.01);assert.notEqual(c.state,'grabbed');assert.equal(c.hp,hp);assert.equal(c.grabPunish,null);});
test('a grab timeout is marked for hurtBob and does not damage Bob itself',()=>{const b=new Bob(),e={alive:true,x:900};b.x=400;b.grab(e);b.stateTime=.01;b.update(.02);assert.equal(b.grabPunish,e);assert.equal(b.hp,b.maxHp);assert.notEqual(b.state,'grabbed');});
test('a grab timeout knocks Bob away from the lecturer; a dead grabber does not',async()=>{
 const{Campaign}=await import('../src/campaign.js');
 const w=new Campaign({stage:2});const e=w.spawnYetti('lecturer',900,630);w.bob.x=400;w.bob.grab(e);w.bob.stateTime=.02;w.events=[];
 const hp=w.bob.hp;w.update(.05,{});
 assert.equal(w.bob.hp,hp-1);assert.ok(w.stats.hits>=1);assert.ok(w.events.some(ev=>ev.type==='hurt'));assert.ok(w.bob.knockV<0);
 const w2=new Campaign({stage:2});const dead=w2.spawnYetti('lecturer',200,630);dead.alive=false;w2.bob.x=400;const hp2=w2.bob.hp;w2.bob.grab(dead);w2.update(.05,{});
 assert.equal(w2.bob.hp,hp2);assert.notEqual(w2.bob.state,'grabbed');
});
test('a hit slides Bob away from the source and settles; hearts model unchanged',()=>{const b=new Bob({x:400,y:630});const hp=b.hp;b.takeHit({dir:1});assert.equal(b.hp,hp-1);assert.equal(b.knockV,200);step(b,.5);assert.ok(b.x>400,`knocked to ${b.x}`);assert.equal(b.knockV,0);const c=new Bob({x:400,y:630});c.takeHit({charger:true,dir:-1});assert.equal(c.knockV,-340);const x=c.x;step(c,.1);assert.ok(c.x<x);});
