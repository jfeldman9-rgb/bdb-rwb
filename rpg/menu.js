import { chapters, Adventure, readSave, writeSave, vitality, rank } from './world.js';
import { installControls } from './controls.js';
import { registerVoiceLines } from '../src/voice-lines.js';
import { unlock, playTrack, say, sfx, stopSceneAudio, toggleMute, isMuted, setGameAudioPaused, releaseClips, residentClipIds } from '../src/audio.js';
import { createStoryPlayer } from '../src/cutscene-hooks.js';
import { blessDadFromGesture, playDadCall } from '../src/dad-call-cutscene.js';
import { chapterIntroKey } from '../src/title-flow.js';

const $=id=>document.getElementById(id);
const icon=id=>`<svg aria-hidden="true"><use href="#i-${id}"/></svg>`;
const number=n=>String(n).padStart(2,'0');
const query=new URLSearchParams(location.search);
let storage;
try{storage=window.localStorage;}catch{/* The adventure also works in memory. */}
let save=readSave(storage), selected=save.chapter;
let phase='lobby',game,view,drawRadar,frame=0,lastTime=0,lastHud=0,noticeUntil=0,captionUntil=0;
const dialog=$('rpg-dialog');
let story=createStoryPlayer(query);
registerVoiceLines();
const keys=installControls($('move-stick'),()=>phase==='playing',usePower,pause);
const dadScene={setPauseReason(reason,on){if(on){phase='clip';keys.reset();stopSceneAudio();playTrack(null,{fade:0});}}};

function persist(){
  save=game.save;
  $('save-status').textContent=writeSave(storage,save)?'Saved on this device':'Playing without local storage';
}
function menu(){
  $('begin-rpg').disabled=false;
  $('lobby').hidden=false;$('rpg-play').hidden=true;phase='lobby';
  $('unlocked').textContent=number(save.unlocked);
  $('chapters').replaceChildren(...chapters.map(def=>{
    const button=document.createElement('button'),locked=def.no>save.unlocked;
    button.type='button';button.className='chapter-card'+(selected===def.no?' selected':'');
    button.setAttribute('aria-label',`Chapter ${def.no}, ${def.short}, ${locked?'locked':'playable'}`);
    button.setAttribute('aria-pressed',String(def.no===selected));
    button.innerHTML=`<span class="chapter-bg"></span><span class="card-top"><b>CH. ${number(def.no)}</b>${icon(locked?'lock':def.no===selected?'play':'pin')}</span><span class="chapter-name">${def.short}</span>`;
    button.firstElementChild.style.backgroundImage=`url("${def.poster}")`;
    button.onclick=()=>{
      if(locked){
        present('CHAPTER '+number(def.no),def.short,`<p>Clear Chapter ${number(def.no-1)} · ${chapters[def.no-2].short} to enter ${titleCase(def.title)}.</p>`,[['Back to campaign',close]]);
      }else{selected=def.no;menu();$('chapters').children[def.no-1].focus({preventScroll:true});}
    };
    return button;
  }));
  const def=chapters[selected-1];
  document.querySelector('.hero-art').style.backgroundImage=`url("${selected===1?'rpg/media/boulevard.webp':def.poster}")`;
  document.querySelector('.location small').textContent='CHAPTER '+number(selected);
  document.querySelector('.location strong').textContent=titleCase(def.title);
  $('begin-rpg').querySelector('span').textContent=save.started&&selected===save.chapter?'Continue RPG':'Play 3D RPG';
}
function titleCase(s){return s.toLowerCase().replace(/\b\w+/g,(w,i)=>i&&['of','the'].includes(w)?w:w[0].toUpperCase()+w.slice(1)).replace("'S","'s");}
function close(){if(dialog.open)dialog.close();}
function present(kicker,title,body,buttons=[],dismissible=true){
  const content=$('dialog-content');content.innerHTML=`<div class="dialog-kicker"></div><h2></h2>${body}<div class="dialog-actions"></div>`;
  content.querySelector('.dialog-kicker').textContent=kicker;content.querySelector('h2').textContent=title;
  for(const [i,[label,action]] of buttons.entries()){
    const b=document.createElement('button');b.className=i?'secondary':'primary';b.textContent=label;
    b.onclick=()=>{close();action();};content.lastElementChild.append(b);
  }
  $('dialog-close').hidden=!dismissible;dialog.oncancel=e=>{if(!dismissible)e.preventDefault();};
  if(!dialog.open)dialog.showModal();
}
$('dialog-close').onclick=close;
const howTo=`<dl><dt>Move</dt><dd>Drag the stick, or use WASD or the arrow keys. Up moves north on the map.</dd><dt>Fight</dt><dd>Approach a guard. Bob targets the nearest enemy and fires eggplants automatically. Move out of red rings before they burst.</dd><dt>Call for backup</dt><dd>Tap Papacito (Q) for a stampede, or Call Dad (R) for the BDB fly swatter. Each power recharges in combat and while exploring.</dd></dl>`;
$('controls-menu').onclick=()=>present('PLAYER MANUAL','Controls',howTo,[['Got it',close]]);
$('guide-tab').onclick=()=>present('FIELD GUIDE','The rescue',`<p>Winged Yettis have taken Claudia. Follow Bob from the Boulevard of Better Judgment to the Papacito Tribunal across seven chapters.</p><dl><dt>Violet diamonds · Halo seals</dt><dd>Explore both districts in either order and defeat their guards to unlock the gate.</dd><dt>Green diamond · Papacito shrine</dt><dd>Take a detour to recover health, recharge your powers and earn XP.</dd><dt>Gold diamond · Chapter gate</dt><dd>Beat the chapter boss and step into the gate. Each level raises Bob’s vitality and eggplant damage.</dd></dl>`,[['Back to campaign',close]]);
$('campaign-tab').onclick=()=>{$('chapters').scrollIntoView({behavior:'smooth',block:'nearest'});};
function sound(btn){
  btn.onclick=()=>{toggleMute();syncSound();};
}
function syncSound(){
  for(const btn of document.querySelectorAll('.sound-btn')){
    btn.innerHTML=icon(isMuted()?'mute':'audio')+'<span>'+ (isMuted()?'Sound off':'Sound on')+'</span>';
    btn.setAttribute('aria-label',isMuted()?'Sound off':'Sound on');
    btn.setAttribute('aria-pressed',String(!isMuted()));
  }
}
sound(document.querySelector('.sound-btn'));syncSound();
function voice(id,interrupt=true){
  say(id,(speaker,line)=>{
    const s=$('subtitle');s.hidden=false;s.firstElementChild.textContent=speaker;s.lastElementChild.textContent=line;
    captionUntil=game.time+Math.max(2.6,line.length*.067);
  },interrupt);
}
function notice(message,duration=2.8){$('notice').textContent=message;noticeUntil=game.time+duration;}
function movie(keysToPlay){return new Promise(resolve=>story.play(keysToPlay,resolve));}
function bed(){playTrack((game.encounter===game.gate?'boss':'stage')+game.def.no);}
function run(){
  close();phase='playing';keys.reset();lastTime=0;lastHud=0;
  setGameAudioPaused(false);bed();schedule();
  if(document.hidden)pause();
}
function schedule(){if(!frame && phase==='playing')frame=requestAnimationFrame(loop);}
async function launch(n){
  if(phase==='loading')return;
  close();cancelAnimationFrame(frame);frame=0;phase='loading';keys.reset();
  unlock();story.bless();blessDadFromGesture();setGameAudioPaused(false);stopSceneAudio();playTrack(null,{fade:0});
  releaseClips(residentClipIds());
  const resume=save.started&&save.chapter===n;
  game=new Adventure(n,save);
  $('rpg-play').hidden=false;$('lobby').hidden=true;$('subtitle').hidden=true;
  notice('Entering '+game.def.short,30);hud();
  const clips=[...game.def.intro];
  if(n===1&&!resume){const first=chapterIntroKey(1,query);if(first!=='stage1')clips.unshift(first);}
  try{
    const loading=(async()=>{
      const mod=await import('./view.js');drawRadar=mod.drawRadar;
      if(!view)view=new mod.WorldView($('world-view'));
      await view.load(game);
    })();
    await Promise.all([loading,movie(clips)]);
    if(phase!=='loading')return;
    persist();run();
    notice(game.gateOpen?'Gate unlocked · Follow the gold diamond':'Violet diamonds · Break both seals',4);voice('nar_ch'+n);
  }catch(error){
    story.destroy();story=createStoryPlayer(query);
    console.error('3D chapter failed to load',error);
    phase='error';present('3D ADVENTURE','Unable to enter the chapter','<p>Check the connection and WebGL availability, then try again.</p>',[['Try again',()=>launch(n)],['Campaign menu',leave]],false);
  }
}
$('begin-rpg').onclick=()=>launch(selected);
function leave(){
  cancelAnimationFrame(frame);frame=0;keys.reset();setGameAudioPaused(false);stopSceneAudio();playTrack(null,{fade:0});
  releaseClips(residentClipIds());view?.clear();selected=save.chapter;close();menu();
}
function pause(){
  if(phase!=='playing')return;
  phase='paused';keys.reset();setGameAudioPaused(true);cancelAnimationFrame(frame);frame=0;
  present('CHAPTER '+number(game.def.no),'Adventure paused',`<p>${titleCase(game.def.title)}</p><p>${game.objective}. Seals and shrines save your progress.</p><button class="sound-btn"></button>`,[['Resume',()=>{unlock();run();}],['Campaign menu',leave]],false);
  sound(dialog.querySelector('.sound-btn'));syncSound();
}
$('rpg-pause').onclick=pause;
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
window.addEventListener('blur',pause);
$('world-view').addEventListener('webglcontextlost',e=>{
  e.preventDefault();phase='error';keys.reset();cancelAnimationFrame(frame);frame=0;setGameAudioPaused(true);story.destroy();
  present('GRAPHICS PAUSED','Reload the world','<p>Your last chapter checkpoint is saved on this device.</p>',[['Reload',()=>location.reload()]],false);
});
function usePower(kind){
  if(game.time<game[kind+'At'])return;
  if(!game.encounter||!game.enemies.length){notice('Powers are ready during an encounter');return;}
  if(kind==='dad' && playDadCall(dadScene,()=>{game.attack('dad');run();}))return;
  game.attack(kind);
}
async function bossIntro(key,lines){
  phase='clip';keys.reset();stopSceneAudio();playTrack(null,{fade:0});
  await movie(key);if(phase!=='clip')return;run();for(const id of lines)voice(id);
}
async function finish(n){
  phase='result';keys.reset();sfx.levelClear();stopSceneAudio();playTrack(null,{fade:0});
  if(n===3||n===7)await movie(n===3?'victory':'final_victory');
  if(phase!=='result')return;
  const line=n===7?'claudia_s7':n===6?'claudia_s6':n===3?'claudia_leave':null;
  if(line)voice(line);
  const next=game.def.next;
  present('CHAPTER '+number(n)+' COMPLETE',game.def.clearText,
    `<p>${next?'Next chapter · '+titleCase(chapters[next-1].title):'All seven chapters complete.'}</p><p>Level ${rank(save.xp)} · ${save.xp} XP</p>`,
    next?[['Next chapter',()=>launch(next)],['Campaign menu',leave]]:[['Campaign menu',leave]],false);
}
function events(){
  const pending=game.events.splice(0),boss=pending.find(e=>e.type==='boss');
  for(const {type,value} of pending){
    switch(type){
      case 'save':persist();break;
      case 'voice':if(!boss?.value)voice(value);break;
      case 'fire':sfx.fire();break;
      case 'hurt':sfx.hurt();break;
      case 'hit':sfx.hit(false);break;
      case 'chime':sfx.pickup();break;
      case 'notice':notice(value);break;
      case 'boss':if(!value)bed();break;
      case 'power':
        if(value==='dad'){sfx.smash();voice('dad_catchphrase');notice('Dad · BDB swatter');}
        else{sfx.papi();voice('papi_chorus');notice('Papacito stampede');}break;
      case 'complete':finish(value);break;
    }
  }
  if(boss?.value)bossIntro(boss.value,pending.filter(e=>e.type==='voice').map(e=>e.value));
}
function hud(){
  const g=game,max=vitality(g.save.xp);
  $('level').textContent=`LV ${number(rank(g.save.xp))} · ${g.save.xp} XP`;
  $('health-fill').style.width=100*g.bob.hp/max+'%';$('health-text').textContent=`${g.bob.hp} / ${max} HP`;
  $('chapter-no').textContent=`CH. ${number(g.def.no)} · ${g.def.short}`;
  $('quest').textContent=g.objective+(g.encounter===g.gate && g.enemies.length?' · '+g.enemies.reduce((a,e)=>a+e.hp,0)+' HP':'');
  for(const btn of document.querySelectorAll('[data-power]')){
    const wait=Math.max(0,Math.ceil(g[btn.dataset.power+'At']-g.time));btn.disabled=wait>0;btn.lastElementChild.textContent=wait?wait+' s':'Ready';
  }
  if(g.time>=noticeUntil)$('notice').textContent='';
  if(g.time>=captionUntil)$('subtitle').hidden=true;
  drawRadar?.($('radar'),g);
}
function loop(now){
  frame=0;if(phase!=='playing')return;
  const dt=Math.min(.08,lastTime?(now-lastTime)/1000:1/60);lastTime=now;
  const input=keys.read(),steps=Math.ceil(dt/(1/60))||1;
  for(let i=0;i<steps&&phase==='playing';i++){game.step(dt/steps,input);events();}
  view.draw(game,dt);
  if(now-lastHud>85||phase!=='playing'){hud();lastHud=now;}
  schedule();
}
menu();
