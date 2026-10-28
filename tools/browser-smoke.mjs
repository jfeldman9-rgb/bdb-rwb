// Uses an already installed Chromium and Node 24's WebSocket. No npm packages.
// Start HTTP on 8765 and Chrome --headless=new --remote-debugging-port=9226 first.
import {writeFile,mkdir}from'node:fs/promises';
import assert from 'node:assert/strict';
const base='http://127.0.0.1:9226';
const tab=await(await fetch(`${base}/json/new?about:blank`,{method:'PUT'})).json();
const ws=new WebSocket(tab.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));
let seq=0;const pending=new Map(),errors=[];
ws.addEventListener('message',({data})=>{const m=JSON.parse(data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);if(m.error)p.reject(Error(JSON.stringify(m.error)));else p.resolve(m.result);}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);else if(m.method==='Network.responseReceived'&&m.params.response.status>=400)errors.push(`${m.params.response.status} ${m.params.response.url}`);});
const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function waitFor(expression,ms=30000){const end=Date.now()+ms;while(Date.now()<end){if(await evaluate(expression))return;await sleep(100);}throw Error(`Timed out: ${expression}\n${errors.join('\n')}`);}
async function shot(name){await sleep(150);const{data}=await send('Page.captureScreenshot',{format:'png'});await writeFile(`docs/shots/${name}.png`,Buffer.from(data,'base64'));}
await mkdir('docs/shots',{recursive:true});await send('Page.enable');await send('Runtime.enable');await send('Network.enable');await send('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
await send('Page.navigate',{url:'http://127.0.0.1:8765/?nocutscenes=1'});await waitFor('window.__game?.scene.isActive("title") && !document.getElementById("title").hidden');await shot('title');
console.log('Title ready',await evaluate('({canvas:!!document.querySelector("canvas"),version:Phaser.VERSION})'));
await send('Page.navigate',{url:'http://127.0.0.1:8765/?demo=1&nocutscenes=1'});await waitFor('window.__game?.scene.isActive("gameplay") && !!window.__game.scene.getScene("gameplay").hud');
await sleep(2000);await shot('stage1');
let bossShot=false,splitShot=false,status;
for(let i=0;i<600;i++){
 status=await evaluate(`(()=>{const s=window.__game.scene.getScene('gameplay');if(!s?.hud||s.switching||!s.scene.isActive())return {loading:true};for(let i=0;i<90&&!s.switching&&!s.world.victory;i++)s.update(0,1000/60);return {stage:s.world.stageNo,zone:s.world.zoneIndex,boss:s.world.bossActive,phase:s.world.wingmen?.phase,victory:s.world.victory,elapsed:s.world.elapsed,stats:s.world.stats};})()`);
 if(status.boss&&!bossShot){await shot('boss');bossShot=true;}
 if(status.stage===3&&status.phase===3&&!splitShot){await shot('wingmen');splitShot=true;}
 if(status.victory)break;
 await sleep(30);
}
if(!status?.victory)throw Error('Browser demo failed to clear: '+JSON.stringify(status));
await waitFor('!document.getElementById("victory").hidden');await shot('victory');
console.log('Campaign complete',JSON.stringify(status));
// A fresh mobile session verifies touch layout and controls with actual pointer events.
await send('Emulation.setDeviceMetricsOverride',{width:844,height:390,deviceScaleFactor:1,mobile:true});await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
await send('Storage.clearDataForOrigin',{origin:'http://127.0.0.1:8765',storageTypes:'local_storage'});
await send('Page.navigate',{url:'http://127.0.0.1:8765/?touch=1&nocutscenes=1&autostart=1'});await waitFor('window.__game?.scene.isActive("gameplay") && !!window.__game.scene.getScene("gameplay").hud');
await evaluate(`(()=>{window.__game.scene.getScene('gameplay').game.inp.enableTouch();})()`);
const points=await evaluate(`(()=>{const point=id=>{const r=document.getElementById(id).getBoundingClientRect();return{x:r.x+r.width*.8,y:r.y+r.height*.5};};return[point('stick'),point('tbFire')];})()`);
const before=await evaluate('({x:window.__game.campaign.bob.x,shots:window.__game.campaign.stats.shots})');
await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points.map((p,id)=>({...p,id,radiusX:6,radiusY:6,force:1}))});
await sleep(800);
const held=await evaluate('({x:window.__game.campaign.bob.x,shots:window.__game.campaign.stats.shots,held:window.__game.inp.down("fire"),difficulty:window.__game.campaign.difficultyKey})');
assert.ok(held.x>before.x+30);assert.ok(held.shots>before.shots);assert.equal(held.held,true);assert.equal(held.difficulty,'story');
await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await sleep(100);
assert.equal(await evaluate('window.__game.inp.down("fire")'),false);
await shot('touch-stage1');
await evaluate('document.getElementById("pause").click()');
const pausedAt=await evaluate('window.__game.campaign.elapsed');await sleep(150);assert.equal(await evaluate('window.__game.campaign.elapsed'),pausedAt);
await evaluate('document.getElementById("pause").click()');
await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
await send('Emulation.setEmulatedMedia',{features:[{name:'orientation',value:'portrait'},{name:'hover',value:'none'},{name:'pointer',value:'coarse'}]});
await sleep(100);
assert.equal(await evaluate('getComputedStyle(document.getElementById("rotate")).display'),'flex');
await send('Emulation.setDeviceMetricsOverride',{width:844,height:390,deviceScaleFactor:1,mobile:true});
await send('Emulation.setEmulatedMedia',{features:[{name:'orientation',value:'landscape'},{name:'hover',value:'none'},{name:'pointer',value:'coarse'}]});
await sleep(100);

const touch=await evaluate(`({touch:document.body.classList.contains('touch'),buttons:[...document.querySelectorAll('.tb')].map(e=>({id:e.id,width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height})),canvas:document.querySelector('canvas').getBoundingClientRect().toJSON()})`);console.log('Touch layout',JSON.stringify(touch));
// Exercise the actual WebGL context recovery with the same live scene.
await evaluate(`window.__bdbTestGL=window.__game.renderer.gl.getExtension('WEBGL_lose_context');window.__bdbTestGL.loseContext()`);
await waitFor('window.__game.isPaused && !document.getElementById("graphics-notice").hidden');
await evaluate('window.__bdbTestGL.restoreContext()');
await waitFor('!window.__game.isPaused && document.getElementById("graphics-notice").hidden');
// Verify the packet video can start and be skipped from the keyboard.
await send('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
await send('Emulation.setTouchEmulationEnabled',{enabled:false});
await send('Page.navigate',{url:'http://127.0.0.1:8765/?cutscenes=1'});
await waitFor('window.__game?.scene.isActive("title") && !document.getElementById("title").hidden');
await evaluate('document.getElementById("start").click()');
await waitFor('!!document.querySelector("#bdb-cutscene video")');
await sleep(600);
const video=await evaluate('({inline:document.querySelector("video").playsInline,src:document.querySelector("video").src})');
assert.equal(video.inline,true);assert.match(video.src,/opening.mp4/);
await send('Input.dispatchKeyEvent',{type:'keyDown',key:' ',code:'Space',windowsVirtualKeyCode:32});
await send('Input.dispatchKeyEvent',{type:'keyUp',key:' ',code:'Space',windowsVirtualKeyCode:32});
await waitFor('window.__game?.scene.isActive("gameplay") && !document.querySelector("#bdb-cutscene")');
const report={browser:'Chromium, SwiftShader (not hardware performance evidence)',httpStatus:(await fetch('http://127.0.0.1:8765/')).status,campaign:status,touch,checks:{simultaneousTouch:true,touchRelease:true,storyDefault:true,pauseFreezes:true,portraitRotate:true,graphicsRecovery:true,inlineOpeningVideo:true,keyboardVideoSkip:true},errors,screenshots:['title','stage1','boss','wingmen','victory','touch-stage1'].map(x=>`docs/shots/${x}.png`)};
await writeFile('docs/shots/browser-report.json',JSON.stringify(report,null,2));ws.close();if(errors.length)throw Error(errors.join('\n'));console.log('Browser smoke passed, zero runtime/HTTP errors.');
