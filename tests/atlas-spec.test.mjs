import test from 'node:test';import assert from 'node:assert/strict';import {readdir,readFile,access}from'node:fs/promises';
const json=async p=>JSON.parse(await readFile(p,'utf8'));
const hold=fps=>Math.max(1,Math.round(1000/fps));
test('v2 Bob art: canvas, baseline, FPS.md frame counts and holds',async()=>{
 const m=await json('assets/chars/bob.anims.json');
 assert.deepEqual(m.canvas,[720,600]);assert.equal(m.baseline,570);assert.equal(m.placeholder,false);
 assert.ok(m.scale>0&&m.scale<=1,'packed below full-res for iPhone');
 const expect={idle:[12,12],walk:[12,18],shoot:[8,16],hurt:[5,14],knockdown:[7,14],getup:[7,14]};
 for(const [name,[count,fps]]of Object.entries(expect)){
  const a=m.anims.find(x=>x.name===`bob_${name}`);assert.ok(a,`missing bob_${name}`);
  assert.equal(a.frames.length,count);assert.equal(a.holds[0],hold(fps));
 }
 // shoot is 8 hand-drawn v3 frames (00..07): every one distinct, no HOLD reuse
 const shoot=m.anims.find(a=>a.name==='bob_shoot');assert.equal(new Set(shoot.frames).size,8);assert.equal(shoot.fps,16);
 assert.deepEqual(shoot.frames,Array.from({length:8},(_,i)=>`bob_shoot_0${i}`));
 // hurt/knockdown HOLDs still dedupe
 assert.ok(m.dedupe.unique<m.dedupe.logical);
});
test('yetti_walker attack is the 8 hand-drawn yetti1 v3 frames at 16 fps; guard keeps its 7-frame yetti2 attack',async()=>{
 const w=await json('assets/chars/yetti_walker.anims.json'),a=w.anims.find(x=>x.name==='yetti_walker_attack');
 assert.equal(a.frames.length,8);assert.equal(new Set(a.frames).size,8);assert.equal(a.fps,16);assert.equal(a.holds[0],hold(16));
 assert.deepEqual(a.frames,Array.from({length:8},(_,i)=>`yetti_walker_attack_0${i}`));
 const g=await json('assets/chars/yetti_guard.anims.json');assert.equal(g.anims.find(x=>x.name==='yetti_guard_attack').frames.length,7);
});
test('Dad call-in is real packed art: enter 6@12, swat 8@16, exit 6@12, frames indexed from 00',async()=>{
 const m=await json('assets/chars/dad.anims.json');assert.equal(m.placeholder,false);assert.deepEqual(m.canvas,[720,600]);
 for(const [name,count,fps]of [['enter',6,12],['swat',8,16],['exit',6,12]]){const a=m.anims.find(x=>x.name===`dad_${name}`);assert.ok(a,`missing dad_${name}`);
  assert.equal(a.frames.length,count);assert.equal(a.fps,fps);assert.equal(a.loop,false);assert.ok(a.holds.every(h=>h===hold(fps)));
  assert.deepEqual(a.frames,Array.from({length:count},(_,i)=>`dad_${name}_0${i}`));}
 assert.equal(m.anims.length,3);assert.equal(m.dedupe.unique,20);
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
test('character atlas GPU residency stays under 60 MiB RGBA for a Stage 1 kit',async()=>{
 const keys=['bob','yetti_walker','yetti_guard','yetti_hover','yetti_charger','yetti_choir','yetti_lecturer','interventionist','dad','papi_stampede'];
 let gpu=0;
 for(const key of keys){const m=await json(`assets/chars/${key}.anims.json`);
  for(const p of m.pages){const meta=(await json(`assets/chars/${p}.json`)).meta;gpu+=meta.size.w*meta.size.h*4;}
 }
 assert.ok(gpu/1024/1024<60,`stage1 GPU MiB ${gpu/1024/1024}`);
});
const KTX1=[0xab,0x4b,0x54,0x58,0x20,0x31,0x31,0xbb,0x0d,0x0a,0x1a,0x0a];
const GL={'astc.ktx':0x93b0,'etc2.ktx':0x9278};
test('every character page ships ASTC 4x4 + ETC2 KTX1 containers Phaser 4.2.1 can parse, plus the webp fallback',async()=>{
 for(const file of (await readdir('assets/chars')).filter(f=>f.endsWith('.anims.json'))){
  const m=await json(`assets/chars/${file}`);assert.ok(m.gpu,`${file} has no gpu formats`);assert.equal(m.gpu.premultiplied,true);
  assert.deepEqual(Object.keys(m.gpu).filter(k=>k!=='premultiplied'),['ASTC','ETC']);
  for(const p of m.pages){const size=(await json(`assets/chars/${p}.json`)).meta.size;await access(`assets/chars/${p}.webp`);
   for(const suf of [m.gpu.ASTC,m.gpu.ETC]){const b=await readFile(`assets/chars/${p}.${suf}`),v=new DataView(b.buffer,b.byteOffset,b.byteLength),u=i=>v.getUint32(12+i*4,true);
    assert.deepEqual([...b.subarray(0,12)],KTX1,`${p}.${suf} magic`);assert.equal(u(0),0x04030201);assert.equal(u(1),0,'glType 0 = compressed');
    assert.equal(u(4),GL[suf]);assert.equal(u(6),size.w);assert.equal(u(7),size.h);assert.equal(u(11),1);
    // Phaser flips V and cannot flip compressed uploads: pages are stored bottom-up and say so.
    const kv=u(12);assert.equal(b.subarray(68,64+kv).toString('latin1').replace(/\0+$/,''),'KTXorientation\0S=r,T=u');
    assert.equal(size.w%4,0);assert.equal(size.h%4,0);assert.equal(v.getUint32(64+kv,true),size.w*size.h,'8 bpp level 0');assert.equal(b.length,68+kv+size.w*size.h);}
  }
 }
});
test('queueCharPages asks Phaser for ASTC, then ETC2, then the webp atlas',async()=>{
 const {queueCharPages,charPageSources}=await import('../src/assets.js');const m=await json('assets/chars/dad.anims.json'),calls=[];
 const scene={cache:{json:{get:()=>m}},textures:{exists:()=>false},load:{texture:(k,s)=>calls.push(['texture',k,s]),atlas:(...a)=>calls.push(['atlas',...a])}};
 queueCharPages(scene,['dad']);assert.equal(calls.length,1);const [kind,key,src]=calls[0];assert.equal(kind,'texture');assert.equal(key,'dad-0');
 assert.deepEqual(Object.keys(src),['ASTC','ETC','IMG']);
 assert.deepEqual(src.ASTC,{type:'KTX',textureURL:'assets/chars/dad-0.astc.ktx',atlasURL:'assets/chars/dad-0.json'});
 assert.deepEqual(src.ETC,{type:'KTX',textureURL:'assets/chars/dad-0.etc2.ktx',atlasURL:'assets/chars/dad-0.json'});
 assert.deepEqual(src.IMG,{textureURL:'assets/chars/dad-0.webp',atlasURL:'assets/chars/dad-0.json'});
 const plain={...m};delete plain.gpu;assert.deepEqual(Object.keys(charPageSources(plain,'dad-0')),['IMG']);
 calls.length=0;queueCharPages({...scene,cache:{json:{get:()=>plain}}},['dad']);assert.deepEqual(calls[0],['atlas','dad-0','assets/chars/dad-0.webp','assets/chars/dad-0.json']);
});
test('Stage 1 kit on-device estimate with ASTC/ETC2 is a quarter of the RGBA webp path',async()=>{
 const keys=['bob','yetti_walker','yetti_guard','yetti_hover','yetti_charger','yetti_choir','yetti_lecturer','interventionist','dad','papi_stampede'];let rgba=0,astc=0;
 for(const key of keys){const m=await json(`assets/chars/${key}.anims.json`);for(const p of m.pages){const s=(await json(`assets/chars/${p}.json`)).meta.size;rgba+=s.w*s.h*4;const b=await readFile(`assets/chars/${p}.${m.gpu.ASTC}`);astc+=b.readUInt32LE(64+b.readUInt32LE(60));}}
 assert.equal(astc*4,rgba);assert.ok(astc/2**20<60,`stage1 ASTC MiB ${astc/2**20}`);
 const r=await json('assets/chars/_pack_report.json');assert.ok(Math.abs(r.compressed.stage1_gpu_MiB.astc-astc/2**20)<.01);
});

test('painted role Yettis ship FPS.md anims and are not placeholders',async()=>{
  const expect={
    yetti_hover:[['fly',6,12],['throw',6,16],['hurt',3,14],['knockdown',5,14]],
    yetti_charger:[['idle',6,12],['walk',8,12],['windup',4,16],['rush',6,16],['hurt',3,14],['knockdown',5,14]],
    yetti_choir:[['sing',8,12],['note',6,16],['hurt',3,14],['knockdown',5,14]],
    yetti_lecturer:[['walk',8,12],['grab',4,16],['lecture',6,16],['hurt',3,14],['knockdown',5,14]],
  };
  for(const [key,anims] of Object.entries(expect)){
    const m=await json(`assets/chars/${key}.anims.json`);
    assert.equal(m.placeholder,false,key);
    for(const [name,n,fps] of anims){
      const a=m.anims.find(x=>x.name===`${key}_${name}`);
      assert.ok(a,`${key}_${name}`);
      assert.equal(a.frames.length,n);assert.equal(a.holds[0],hold(fps));
    }
  }
});

test('painted Stage 4 Salsero and Bouncer are not placeholders', async () => {
  const expect = {
    yetti_salsero: [['idle', 6, 12], ['walk', 8, 12], ['spin', 4, 16], ['lunge', 6, 16], ['hurt', 3, 14], ['knockdown', 5, 14]],
    bouncer: [['walk', 8, 12], ['block', 2, 10], ['grab', 4, 16], ['hold', 2, 8], ['rush', 6, 16], ['stomp', 4, 14], ['roar', 4, 12], ['hurt', 3, 14], ['down', 5, 14]],
  };
  for (const [key, anims] of Object.entries(expect)) {
    const m = await json(`assets/chars/${key}.anims.json`);
    assert.equal(m.placeholder, false, key);
    assert.equal(m.baseline, 570);
    assert.equal(m.scale, 0.38);
    for (const [name, n, fps] of anims) {
      const a = m.anims.find((x) => x.name === `${key}_${name}`);
      assert.ok(a, `${key}_${name}`);
      assert.equal(a.frames.length, n, `${key}_${name}`);
      assert.equal(a.holds[0], hold(fps));
    }
  }
});

test('papi_stampede is six looping 8-frame runs and the loader uses the keyed webp', async () => {
  const m = await json('assets/chars/papi_stampede.anims.json');
  assert.equal(m.placeholder, false);
  for (let i = 1; i <= 6; i++) {
    const a = m.anims.find((x) => x.name === `papi_stampede_run${i}`);
    assert.ok(a, `run${i}`);
    assert.equal(a.frames.length, 8);
    assert.equal(a.fps, 16);
    assert.equal(a.loop, true);
    assert.equal(a.holds[0], hold(16));
  }
  const { charPageSources } = await import('../src/assets.js');
  assert.deepEqual(Object.keys(charPageSources(m, 'papi_stampede-0')), ['IMG']);
});
