import test from'node:test';import assert from'node:assert/strict';import{readFile}from'node:fs/promises';import{createShot,stepShot,fireGun,overlapsHurt,hurtRange,muzzleY,HURT}from'../src/eggplant.js';import{Bob}from'../src/bob.js';import{Yetti}from'../src/yettis.js';
test('every shot stays horizontal including when Bob is airborne or moving lanes',()=>{for(const z of [0,100,250])for(const facing of [-1,1]){const b=new Bob();b.z=z;b.facing=facing;const p=createShot(b),y=p.y;for(let i=0;i<60;i++){stepShot(p,1/60,[],()=>{});assert.equal(p.vy,0);assert.equal(p.y,y);assert.equal(p.gy,b.y);}}});
test('held FIRE produces five shots per second; release does not fire',()=>{const b=new Bob(),g={};let shots=0;for(let i=0;i<300;i++)if(fireGun(g,1/60,true,b,[]))shots++;assert.equal(shots,25);assert.equal(fireGun(g,1,false,b,[]),null);});
test('point blank bonks in the facing lane; the projectile hits the shadow lane',()=>{const b=new Bob(),e={alive:true,x:b.x+70,y:b.y,z:100};assert.equal(fireGun({},.1,true,b,[e]).bonk,e);const p=createShot(b);let hit;stepShot(p,.1,[e],t=>hit=t);assert.equal(hit,e);assert.equal(p.alive,false);});
test('swept hit collision catches fast shots and ignores other lanes',()=>{const p=createShot(new Bob());let hit;const wrong={alive:true,x:280,y:572},right={alive:true,x:400,y:630};stepShot(p,.3,[wrong,right],e=>hit=e);assert.equal(hit,right);});
test('gun has no removed targeting, temperature, or release-to-fire mechanics',async()=>{const s=await readFile('src/eggplant.js','utf8');assert.doesNotMatch(s,/aimX|aimY|selectTarget|chargeTime|chargeReady|overheat|heat|pointer/i);});
test('a combat jump still clips a grounded torso; a shot that clears the silhouette misses',()=>{
  const walker=new Yetti('walker',400,630);
  const hop=new Bob();hop.y=630;hop.z=110;hop.facing=1;
  const p=createShot(hop);let clip;stepShot(p,.3,[walker],e=>clip=e);
  assert.equal(clip,walker);assert.equal(p.vy,0);
});
test('a shot passing above a grounded body misses; the same lane still hits the torso',()=>{
  const b=new Bob();b.y=630;b.z=220;b.facing=1;
  const walker=new Yetti('walker',400,630);
  const p=createShot(b);assert.equal(p.vy,0);assert.equal(p.y,muzzleY(b));
  assert.equal(overlapsHurt(p.y,walker),false);
  let hit;stepShot(p,.3,[walker],e=>hit=e);assert.equal(hit,undefined);assert.equal(p.vy,0);assert.equal(p.y,muzzleY(b));
  const low=new Bob();low.y=630;low.z=0;low.facing=1;
  const ground=createShot(low);let body;stepShot(ground,.4,[walker],e=>body=e);
  assert.equal(body,walker);
  assert.equal(overlapsHurt(muzzleY(low),walker),true);
});
test('ground fire still intersects a Hover body; a high shot does not',()=>{
  const hover=new Yetti('hover',500,630);
  const ground=new Bob();ground.y=630;ground.z=0;ground.facing=1;
  const high=new Bob();high.y=630;high.z=260;high.facing=1;
  assert.ok(hover.z>0);
  assert.equal(overlapsHurt(muzzleY(ground),hover),true);
  assert.equal(overlapsHurt(muzzleY(high),hover),false);
  for(const facing of[-1,1]){
    const b=new Bob();b.y=630;b.z=0;b.facing=facing;b.x=facing>0?200:800;
    hover.x=b.x+facing*180;
    const p=createShot(b);let hit;stepShot(p,.4,[hover],e=>hit=e);
    assert.equal(hit,hover,`hover facing ${facing}`);assert.equal(p.vy,0);
  }
});
test('bonks use the same vertical hurt slab as shots',()=>{
  const b=new Bob();b.y=630;b.z=0;
  const hover=new Yetti('hover',b.x+70,630);
  assert.equal(fireGun({},.2,true,b,[hover]).bonk,hover);
  const air=new Bob();air.y=630;air.z=240;
  const walker=new Yetti('walker',air.x+70,630);
  const fired=fireGun({},.2,true,air,[walker]);
  assert.equal(fired.bonk,null);assert.ok(fired.shot);assert.equal(fired.shot.vy,0);
  assert.equal(hurtRange(hover).top,hover.y-hover.z-HURT.body);
});
