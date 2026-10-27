import test from 'node:test';import assert from 'node:assert/strict';import {readdir,readFile,access}from'node:fs/promises';
const json=async p=>JSON.parse(await readFile(p,'utf8'));
const hold=fps=>Math.max(1,Math.round(1000/fps));
test('v2 Bob art: canvas, baseline, FPS.md frame counts and holds',async()=>{
 const m=await json('assets/chars/bob.anims.json');
 assert.deepEqual(m.canvas,[720,600]);assert.equal(m.baseline,570);assert.equal(m.placeholder,false);
 assert.ok(m.scale>0&&m.scale<=1,'packed below full-res for iPhone');
 const expect={idle:[12,12],walk:[12,18],shoot:[7,16],hurt:[5,14],knockdown:[7,14],getup:[7,14]};
 for(const [name,[count,fps]]of Object.entries(expect)){
  const a=m.anims.find(x=>x.name===`bob_${name}`);assert.ok(a,`missing bob_${name}`);
  assert.equal(a.frames.length,count);assert.equal(a.holds[0],hold(fps));
 }
 // shoot HOLDs dedupe: fewer unique atlas frames than logical
 assert.ok(new Set(m.anims.find(a=>a.name==='bob_shoot').frames).size<7);
 assert.ok(m.dedupe.unique<m.dedupe.logical);
});
test('every animation references a valid trimmed frame and atlas page',async()=>{
 for(const file of (await readdir('assets/chars')).filter(f=>f.endsWith('.anims.json'))){
  const m=await json(`assets/chars/${file}`);
  const pages=await Promise.all(m.pages.map(async p=>{await access(`assets/chars/${p}.webp`);return json(`assets/chars/${p}.json`);}));
  for(const a of m.anims){assert.equal(a.frames.length,a.pages.length);assert.equal(a.frames.length,a.holds.length);
   for(let i=0;i<a.frames.length;i++){const page=pages[a.pages[i]],f=page.frames[a.frames[i]];assert.ok(f,`${file}/${a.frames[i]}`);
    // sourceSize matches pack scale of the logical 720×600 canvas
    assert.equal(f.sourceSize.w,Math.round(720*m.scale));assert.equal(f.sourceSize.h,Math.round(600*m.scale));
    assert.ok(f.frame.x+f.frame.w<=page.meta.size.w);assert.ok(f.frame.y+f.frame.h<=page.meta.size.h);}
  }
 }
});
test('§5.1 keys present; Yetti originals use v2 walk=16 and are not placeholders',async()=>{
 for(const key of ['bob','dad','claudia','yetti_walker','yetti_guard','yetti_hover','yetti_charger','yetti_choir','yetti_lecturer','wingman','papi_runners','interventionist','choirmaster'])await access(`assets/chars/${key}.anims.json`);
 for(const key of ['yetti_walker','yetti_guard']){
  const m=await json(`assets/chars/${key}.anims.json`);assert.equal(m.placeholder,false);
  const walk=m.anims.find(a=>a.name===key+'_walk');assert.equal(walk.frames.length,16);assert.equal(walk.holds[0],hold(18));
 }
});
test('character atlas GPU residency stays under 20 MiB for a Stage 1 kit',async()=>{
 const keys=['bob','yetti_walker','yetti_guard','yetti_hover','yetti_charger','yetti_choir','yetti_lecturer','interventionist','dad','papi_runners'];
 let gpu=0;
 for(const key of keys){const m=await json(`assets/chars/${key}.anims.json`);
  for(const p of m.pages){const meta=(await json(`assets/chars/${p}.json`)).meta;gpu+=meta.size.w*meta.size.h*4;}
 }
 assert.ok(gpu/1024/1024<20,`stage1 GPU MiB ${gpu/1024/1024}`);
});
