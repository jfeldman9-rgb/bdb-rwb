import test from'node:test';import assert from'node:assert/strict';import{readFile}from'node:fs/promises';import{DEFAULT_SAVE,normalizeSave,loadSave,persistSave,clearStage,SAVE_KEY,autoFireFromSave}from'../src/save.js';import{maxStage}from'../src/stages.js';import{DIFFICULTIES,resolveDifficulty}from'../src/difficulty.js';import{chooseRenderScale,bloomOnByDefault}from'../src/config.js';
test('save handles missing, malformed, nonfinite and legacy fields',()=>{assert.deepEqual(normalizeSave(null),DEFAULT_SAVE);assert.deepEqual(normalizeSave([]),DEFAULT_SAVE);const s=normalizeSave({unlockedChapter:2.8,bestScore:Infinity,difficulty:'bogus',upgrades:{extraDash:true},proteinBank:999});assert.equal(s.unlockedStage,2);assert.equal(s.bestScore,0);assert.equal('upgrades'in s,false);assert.equal('proteinBank'in s,false);assert.equal(normalizeSave({unlockedStage:NaN}).unlockedStage,1);assert.equal(normalizeSave({unlockedStage:-5}).unlockedStage,1);assert.equal(normalizeSave({unlockedStage:99}).unlockedStage,maxStage);});
test('storage failure never breaks play and saves use the isolated key',()=>{const broken={getItem(){throw Error('blocked');},setItem(){throw Error('full');}};assert.deepEqual(loadSave(broken),DEFAULT_SAVE);assert.equal(persistSave(DEFAULT_SAVE,broken),false);let pair;assert.equal(persistSave(DEFAULT_SAVE,{setItem(...p){pair=p;}}),true);assert.equal(pair[0],SAVE_KEY);assert.equal(SAVE_KEY,'bdb-rwb-save-v1');});
test('clears unlock subsequent stages and Nightmare only after victory',()=>{let s=clearStage(DEFAULT_SAVE,1,900);assert.equal(s.unlockedStage,2);assert.equal(s.beaten,false);assert.equal(resolveDifficulty('nightmare',s.beaten),'adventure');s=clearStage(s,2,800);assert.equal(s.unlockedStage,3);assert.equal(s.bestScore,900);s=clearStage(s,3,1500);assert.equal(s.beaten,true);assert.equal(resolveDifficulty('nightmare',s.beaten),'nightmare');});
test('auto-fire defaults on for a fresh touch save, off on desktop, and stored values stick',()=>{
  assert.equal(autoFireFromSave(null,false),false);
  assert.equal(autoFireFromSave(null,true),true);
  assert.equal(normalizeSave(null).autoFire,false);
  assert.equal(normalizeSave(null,true).autoFire,true);
  assert.equal(normalizeSave({autoFire:false},true).autoFire,false);
  assert.equal(normalizeSave({autoFire:true},false).autoFire,true);
  assert.equal(normalizeSave({unlockedStage:2},true).autoFire,false,'a save that never stored the toggle keeps off');
  const mem={store:null,getItem(){return this.store;},setItem(_k,v){this.store=v;}};
  assert.equal(loadSave(mem,true).autoFire,true);
  assert.equal(loadSave(mem,false).autoFire,false);
  persistSave({...normalizeSave(null,true),autoFire:false},mem);
  assert.equal(loadSave(mem,true).autoFire,false,'turning the checkbox off survives a touch reload');
  persistSave({...loadSave(mem,true),autoFire:true},mem);
  assert.equal(loadSave(mem,false).autoFire,true,'turning the checkbox on survives a desktop reload');
});
test('the title checkbox still reads and writes auto-fire',async()=>{
  const src=await readFile('src/main.js','utf8');
  assert.match(src,/loadSave\(undefined,coarsePointer\(\)\)/);
  assert.match(src,/getElementById\('auto-fire'\)\.checked=this\.save\.autoFire/);
  assert.match(src,/autoFire:doc\.getElementById\('auto-fire'\)\.checked/);
  assert.match(await readFile('index.html','utf8'),/id="auto-fire"/);
});
test('touch defaults to Story, scales at most 1.5 and disables bloom',()=>{assert.equal(normalizeSave(null,true).difficulty,'story');assert.equal(chooseRenderScale({dpr:3,coarse:true,cssHeight:800}),1.5);assert.equal(chooseRenderScale({coarse:true,rsQuery:'2'}),1.5);assert.equal(bloomOnByDefault(new URLSearchParams(),true),false);assert.deepEqual([DIFFICULTIES.story.pace,DIFFICULTIES.story.damage,DIFFICULTIES.story.recovery,DIFFICULTIES.story.grace],[.72,1.15,2.3,.19]);});
test('shop has no UI or gameplay state',async()=>{for(const file of ['index.html','src/campaign.js','src/main.js','src/hud.js','src/save.js'])assert.doesNotMatch(await readFile(file,'utf8'),/buyUpgrade|proteinBank|extraDash|ricochet|shop/i,file);});
