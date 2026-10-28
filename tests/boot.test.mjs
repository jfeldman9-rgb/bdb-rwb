import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir,readFile,access } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const noop=()=>{};
globalThis.Phaser={Scene:class{}};
globalThis.window=globalThis;
globalThis.location={search:'',href:'http://localhost/',origin:'http://localhost'};
globalThis.document={getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[],addEventListener:noop,removeEventListener:noop,body:{classList:{add:noop,remove:noop}}};
globalThis.addEventListener=noop;globalThis.removeEventListener=noop;globalThis.matchMedia=()=>({matches:false});

test('every source module imports under a DOM stub; all local dependencies exist',async()=>{
 for(const file of (await readdir('src')).filter(f=>f.endsWith('.js'))){
  const source=await readFile(`src/${file}`,'utf8');
  for(const [,ref]of source.matchAll(/(?:from\s*|import\s*\()\s*['"](\.\/[^'"]+)['"]/g))await access(path.resolve('src',ref));
  await import(`../src/${file}`);
 }
});
test('no excluded engine content or modules in gameplay imports',async()=>{
 for(const file of (await readdir('src')).filter(f=>f.endsWith('.js'))){
  const source=await readFile(`src/${file}`,'utf8');
  for(const [,ref]of source.matchAll(/(?:from\s*|import\s*\()\s*['"]([^'"]+)['"]/g)){
   assert.doesNotMatch(ref,/(?:loial|rand-call|balefire|riley3|twix|stage[4-8]|stage[23](?!-def))/i,`${file}: ${ref}`);
  }
 }
});
test('title, HUD, story and voice registry contain only BDB player-facing text',async()=>{
 for(const file of ['index.html','src/hud.js','src/story.js','src/voice-lines.js','src/audio.js','src/main.js'])assert.doesNotMatch(await readFile(file,'utf8'),/Riley|Loial|Twix|Trolloc|Moiraine|Winternight|balefire|elon-console/i,file);
});
test('git remotes stay private (none, or only origin→jfeldman9-rgb/bdb-rwb)',()=>{
 const out=execFileSync('git',['remote','-v'],{encoding:'utf8'}).trim();
 if(!out) return;
 const lines=out.split(/\n/).filter(Boolean);
 assert.ok(lines.every(l=>/^origin\thttps:\/\/github\.com\/jfeldman9-rgb\/bdb-rwb\.git \((fetch|push)\)$/.test(l)),out);
});
