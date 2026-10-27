import test from 'node:test';import assert from 'node:assert/strict';import {readdir,readFile,access}from'node:fs/promises';
const json=async p=>JSON.parse(await readFile(p,'utf8'));
test('original Bob art has the locked canvas, baseline and exact frame counts',async()=>{
 const m=await json('assets/chars/bob.anims.json');assert.deepEqual(m.canvas,[720,600]);assert.equal(m.baseline,570);assert.equal(m.placeholder,false);
 for(const [name,count]of Object.entries({idle:6,walk:6,shoot:4,hurt:3,knockdown:4,getup:4}))assert.equal(m.anims.find(a=>a.name===`bob_${name}`).frames.length,count);
});
test('every animation references a valid trimmed frame and atlas page',async()=>{
 for(const file of (await readdir('assets/chars')).filter(f=>f.endsWith('.anims.json'))){const m=await json(`assets/chars/${file}`);
  const pages=await Promise.all(m.pages.map(async p=>{await access(`assets/chars/${p}.webp`);return json(`assets/chars/${p}.json`);}));
  for(const a of m.anims){assert.equal(a.frames.length,a.pages.length);assert.equal(a.frames.length,a.holds.length);
   for(let i=0;i<a.frames.length;i++){const page=pages[a.pages[i]],f=page.frames[a.frames[i]];assert.ok(f,`${file}/${a.frames[i]}`);assert.deepEqual(f.sourceSize,{w:720,h:600});assert.ok(f.frame.x+f.frame.w<=page.meta.size.w);assert.ok(f.frame.y+f.frame.h<=page.meta.size.h);}
  }
 }
});
test('all §5.1 character keys have art or placeholders; both Yetti originals are packed',async()=>{
 for(const key of ['bob','dad','claudia','yetti_walker','yetti_guard','yetti_hover','yetti_charger','yetti_choir','yetti_lecturer','wingman','papi_runners','interventionist','choirmaster'])await access(`assets/chars/${key}.anims.json`);
 for(const key of ['yetti_walker','yetti_guard']){const m=await json(`assets/chars/${key}.anims.json`);assert.equal(m.placeholder,false);assert.equal(m.anims.find(a=>a.name===key+'_walk').frames.length,8);}
});
