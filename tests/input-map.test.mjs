import test from'node:test';import assert from'node:assert/strict';import{Input,ACTIONS,KEYS,PAD_MAP,TOUCH_MAP,titleWantsBegin,gameplayWantsPause}from'../src/input.js';
function target(){const handlers={};return{style:{},classList:{add(){},remove(){},toggle(){}},addEventListener(e,f){(handlers[e]??=[]).push(f);},removeEventListener(e,f){handlers[e]=(handlers[e]||[]).filter(x=>x!==f);},emit(e,data={}){for(const f of handlers[e]||[])f({preventDefault(){},...data});},setPointerCapture(){},getBoundingClientRect(){return{left:0,top:0,width:100};}};}
function setup(){const root=target(),els=Object.fromEntries(['stick','knob',...Object.keys(TOUCH_MAP)].map(k=>[k,target()]));root.document={...target(),body:target(),getElementById:id=>els[id]||null,querySelectorAll:()=>[]};root.matchMedia=()=>({matches:false});root.navigator={getGamepads:()=>[]};return{root,els,input:new Input(root)};}
test('keyboard, pad and touch expose exactly the five combat actions',()=>{for(const map of [KEYS,PAD_MAP,TOUCH_MAP])for(const action of ACTIONS)assert.ok(Object.values(map).includes(action),action);for(const value of Object.values(KEYS))assert.doesNotMatch(value,/aim|power|attack|assist|special|run/);});
test('buffered taps are consumed once and expire',()=>{const{input}=setup();input.press('papi');assert.equal(input.take('papi'),true);assert.equal(input.take('papi'),false);input.press('dad');input.update(.2);assert.equal(input.take('dad'),false);});
test('keyboard alias ownership keeps FIRE held until both keys release',()=>{const{root,input}=setup();root.emit('keydown',{code:'KeyJ'});root.emit('keydown',{code:'KeyZ'});root.emit('keyup',{code:'KeyJ'});assert.equal(input.down('fire'),true);root.emit('keyup',{code:'KeyZ'});assert.equal(input.down('fire'),false);});
test('simultaneous touch stick and buttons survive independent cancellations',()=>{const{input,els}=setup();els.stick.emit('pointerdown',{pointerId:1,clientX:95,clientY:50});els.tbFire.emit('pointerdown',{pointerId:2});els.tbFire.emit('pointerdown',{pointerId:3});els.tbJump.emit('pointerdown',{pointerId:4});input.update(.01);assert.ok(input.x>.8);assert.equal(input.down('fire'),true);assert.equal(input.take('jump'),true);els.tbFire.emit('pointercancel',{pointerId:2});assert.equal(input.down('fire'),true);els.tbFire.emit('pointerup',{pointerId:3});assert.equal(input.down('fire'),false);els.stick.emit('lostpointercapture',{pointerId:1});input.update(.01);assert.equal(input.x,0);});
test('blur and visibility loss release all held state',()=>{const{input,els,root}=setup();els.tbFire.emit('pointerdown',{pointerId:2});root.emit('keydown',{code:'KeyD'});root.emit('blur');input.update(.01);assert.equal(input.down('fire'),false);assert.equal(input.x,0);root.emit('keydown',{code:'KeyJ'});root.document.hidden=true;root.document.emit('visibilitychange');assert.equal(input.down('fire'),false);});
test('pad FIRE holds and disconnect clears stale buttons',()=>{const{root,input}=setup();const pad={buttons:Array.from({length:16},()=>({pressed:false})),axes:[0,0]};root.navigator.getGamepads=()=>[pad];pad.buttons[2].pressed=true;input.update(.01);assert.equal(input.snapshot().fire,true);input.update(.01);assert.equal(input.snapshot().fire,true);root.navigator.getGamepads=()=>[];input.update(.01);assert.equal(input.snapshot().fire,false);});
test('title begins on gamepad Start; gameplay pauses on Enter',()=>{
 const{root,input}=setup();
 const pad={buttons:Array.from({length:16},()=>({pressed:false})),axes:[0,0]};
 root.navigator.getGamepads=()=>[pad];
 pad.buttons[9].pressed=true;input.update(.01);
 assert.equal(PAD_MAP[9],'pause');
 assert.equal(titleWantsBegin(input),true);
 assert.equal(titleWantsBegin(input),false);
 const keys=setup();
 keys.root.emit('keydown',{code:'Enter'});
 assert.equal(KEYS.Enter,'start');
 assert.equal(gameplayWantsPause(keys.input),true);
 const other=setup();
 other.root.emit('keydown',{code:'KeyR'});
 assert.equal(gameplayWantsPause(other.input),false);
});
test('Escape and P do not start the title; gameplay still pauses',()=>{
 for(const code of ['Escape','KeyP']){
  const title=setup();
  title.root.emit('keydown',{code});
  assert.equal(titleWantsBegin(title.input),false,code);
  const play=setup();
  play.root.emit('keydown',{code});
  assert.equal(gameplayWantsPause(play.input),true,code);
 }
});
test('touch pause/mute meet 44pt with safe-area; a grab prompts a mash',async()=>{const{readFile}=await import('node:fs/promises');const html=await readFile('index.html','utf8');assert.match(html,/#top-buttons button\{[^}]*min-width:44px/);assert.match(html,/#top-buttons button\{[^}]*min-height:44px/);assert.match(html,/#top-buttons\{[^}]*safe-area-inset-right/);const{stagePrompt}=await import('../src/hud.js');assert.match(stagePrompt({bob:{state:'grabbed',grabMash:3}}),/MASH/);});
