import { Campaign } from './campaign.js';
import { Bot } from './bot.js';
import { Fighter } from './fighter.js';
import { TYPES } from './yettis.js';
import { queueCharPages,makeCharAnims,releaseChars,residencyDelta } from './assets.js';
import { STAGE_CHARS,STAGE_TEXTURES } from './stages.js';
import { buildBackdrop } from './backdrop.js';
import { HUD } from './hud.js';
import { PapacitoFX } from './papacito-fx.js';
import { q } from './config.js';
import { say,sfx,playTrack,preloadClips,releaseClips,stopSceneAudio,setVoicePolicy,narrationYields } from './audio.js';
import { stageLines } from './voice-lines.js';
import { persistSave } from './save.js';
import { perf } from './perf.js';
import { playDadCall, abortDadCall } from './dad-call-cutscene.js';
import { pauseForClip } from './cutscene-hooks.js';
import { beginCorpse, stepCorpse } from './corpses.js';
import { syncRotatePause } from './rotate-block.js';
import { FX } from './fx.js';

/** Map Yetti sim state → atlas anim suffix (FPS.md role sheets). */
function roleAnim(m) {
  const t = m.type, s = m.state;
  if (s === 'hurt') return 'hurt';
  if (s === 'down' || s === 'dead') return 'knockdown';
  if (t === 'hover') return s === 'telegraph' ? 'throw' : 'fly';
  if (t === 'charger') {
    if (s === 'telegraph') return 'windup';
    if (s === 'rush') return 'rush';
    return s === 'approach' ? 'walk' : 'idle';
  }
  if (t === 'choir') return s === 'telegraph' ? 'note' : 'sing';
  if (t === 'lecturer') {
    if (s === 'telegraph') return 'grab';
    if (s === 'hold') return 'lecture';
    return 'walk';
  }
  if (s === 'telegraph' || s === 'rush') return 'attack';
  if (s === 'approach') return 'walk';
  return 'idle';
}


export class GameScene extends Phaser.Scene {
 constructor(){super('gameplay');}
 init(data){this.world=data.world||new Campaign({...data,onSave:s=>persistSave(s)});this.bot=data.bot||(q.get('demo')==='1'?new Bot():null);this.stageNo=this.world.stageNo;this.started=true;this.pauseReasons=new Set();this.accumulator=0;this.views=new Map();this.particles=[];this.dadView=null;this.switching=false;this.finished=false;this.runId=(this.game.runSeq=(this.game.runSeq||0)+1);this.bloomEnabled=true;this.backdropLit=true;}
 preload(){
  const prev=this.game.residentChars||[],next=STAGE_CHARS[this.stageNo],delta=residencyDelta(prev,next);
  releaseChars(this,delta.release);queueCharPages(this,next);this.game.residentChars=next;
  for(const key of this.game.residentTextures||[])if(!STAGE_TEXTURES[this.stageNo].includes(key)&&this.textures.exists(key))this.textures.remove(key);
  const keys=STAGE_TEXTURES[this.stageNo]||[];
  for(const key of keys)if(!this.textures.exists(key))this.load.image(key,`assets/bg/${key}.webp`);
  this.game.residentTextures=keys;
  const loadError=file=>{window.__bdbStartup?.fail(`Asset ${file.key}`,'assets');document.getElementById('boot').textContent='Could not load chapter. Reload to retry.';};
  this.load.once('loaderror',loadError);this.load.once('complete',()=>this.load.off('loaderror',loadError));
 }
 create(){
  this.game.campaign=this.world;this.metas=makeCharAnims(this,STAGE_CHARS[this.stageNo]);
  this.backdrop=buildBackdrop(this,this.world.def);
  if(!this.textures.exists('shadow')){const g=this.make.graphics({x:0,y:0},false);g.fillStyle(0x03050c,.5);g.fillEllipse(32,32,63,60);g.generateTexture('shadow',64,64);g.destroy();}
  this.dadLabel=this.add.text(0,0,'BDB',{fontFamily:'Arial',fontSize:20,fontStyle:'bold',color:'#fff0ad',stroke:'#192235',strokeThickness:4}).setDepth(19001).setVisible(false);
  this.g=this.add.graphics().setDepth(19000);this.hud=new HUD(this);this.papiFX=new PapacitoFX(this);
  this.fx=new FX(this);
  if(this.stageNo===3){const bl=this.world.def.boss.l,m=this.metas.claudia,a=m.anims[0];this.claudia=this.add.sprite(bl+970,490,m.pages[0],a.frames[0]).setOrigin(.5,.95).setScale(.27).setTint(0xffb4d7).play(a.name);
   const cage=this.add.graphics();cage.lineStyle(5,0xabb5cb,.9);cage.strokeRect(bl+910,350,120,150);for(let x=bl+930;x<bl+1030;x+=22)cage.lineBetween(x,350,x,500);this.claudiaCage=cage;}
  document.getElementById('boot').hidden=true;document.body.classList.add('playing');document.getElementById('title').hidden=true;
  this.game.inp.clear();preloadClips(stageLines(this.stageNo));setVoicePolicy(narrationYields);playTrack(`stage${this.stageNo}`);
  this.events.once('shutdown',()=>{abortDadCall(this);this.fx?.destroy();this.fx=null;this.backdrop?.destroy();this.backdrop=null;for(const v of this.views.values())v.destroy();this.views.clear();this.papiFX.destroy();this.dadView?.destroy();releaseClips(stageLines(this.stageNo));});
  this.syncViews();this.handleEvents();this.hud.update(this.world);
 }
 setBloom(on){this.bloomEnabled=!!on;}
 setBackdropLit(on){this.backdropLit=on!==false;}
 applyRecoil(dt){
  if(!(this.recoil>0))return;
  const view=this.views.get(this.world.bob);if(!view)return;
  view.x=this.world.bob.x-(this.recoilDir||1)*this.recoil*0.55;view.sync();
  this.recoil=Math.max(0,this.recoil-90*dt);
 }
 stepDust(dt){
  const b=this.world.bob;if(!b||!this.fx)return;
  const stepping=b.alive&&(b.state==='walk'||b.state==='dash')&&b.z<1;
  if(stepping){
   this.stepAcc=(this.stepAcc||0)+dt;const every=b.state==='dash'?0.08:0.18;
   if(this.stepAcc>=every){this.stepAcc-=every;sfx.step();this.fx.dust.emitParticleAt(b.x,b.y,b.state==='dash'?8:4);}
  }else this.stepAcc=0;
  const band=Math.round((b.y-572)/59);
  if(this.prevBand!=null&&band!==this.prevBand&&b.z<8&&b.alive){this.fx.dust.emitParticleAt(b.x,b.y,7);sfx.step();}
  if((this.prevZ||0)>8&&b.z===0){sfx.land();this.fx.dust.emitParticleAt(b.x,b.y,10);}
  if((this.prevZ||0)<1&&b.z>8)sfx.jump();
  this.prevZ=b.z;this.prevBand=band;
 }
 setPauseReason(reason,on){if(on)this.pauseReasons.add(reason);else this.pauseReasons.delete(reason);this.world.paused=this.pauseReasons.size>0;this.game.inp.clear();}
 makeView(model,key,scale,tint=0xffffff){const v=new Fighter(this,{key,prefix:key+'_',native:1,scale,anchorX:.5,hp:1,team:0,shadowW:135},model.x,model.y);v.sprite.setLighting(false).setTint(tint);return v;}
 syncViews(dt=0){
  const w=this.world;this.bounds=w.bounds;this.cameras.main.setScroll(Math.round(w.camX),0);this.backdrop?.update(w.camX);
  const live=new Set();
  for(const model of [w.bob,...w.enemies.filter(e=>e.alive)]){
   live.add(model);let view=this.views.get(model);const isBob=model===w.bob,key=isBob?'bob':model.type==='wingman'?'wingman':TYPES[model.type].art;
   if(!view){view=this.makeView(model,key,isBob ? .46 : model.boss ? .54 : .42,isBob?0xffffff:model.type==='wingman'?(model.role===2?0xffb1d6:0xd0beff):TYPES[model.type].tint);this.views.set(model,view);}
   view.corpse=null;view.corpsePlayed=false;
   Object.assign(view,{x:model.x,y:model.y,z:model.z||0,state:model.state});view.face(model.facing);
   let anim=isBob?(model.state==='dead'?'knockdown':['hurt','knockdown','getup'].includes(model.state)?model.state:model.shootTime>0?'shoot':model.state==='walk'||model.state==='dash'?'walk':'idle'):
    roleAnim(model);
   if(!this.anims.exists(key+'_'+anim)){const m=this.metas[key];anim=model.type==='wingman'?(model.state==='split'?'split':model.state==='telegraph'?'telegraph':model.state==='recover'?'land':'hover'):model.type==='interventionist'?(model.state==='telegraph'?'grab':model.state==='hold'?'hold':['roar','slam'].includes(model.state)?'slam':'walk'):model.state==='roar'?'ring':'sing';if(!this.anims.exists(key+'_'+anim))anim=m.anims[0].name.slice(key.length+1);}
   view.play(anim,1,false);view.sprite.setAlpha(isBob&&model.inv>0&&Math.floor(model.time*12)%2 ? .55 : 1);view.sync();
  }
  for(const [m,v] of [...this.views]){
   if(live.has(m))continue;
   if(m===w.bob){v.destroy();this.views.delete(m);continue;}
   if(!v.corpse)v.corpse=beginCorpse();
   v.corpse=stepCorpse(v.corpse,dt);
   v.state='dead';
   if(!v.corpsePlayed){const key=v.def.key;v.play(this.anims.exists(key+'_knockdown')?'knockdown':'hurt',1,false);v.corpsePlayed=true;}
   v.sprite.setAlpha(v.corpse.alpha);v.sync();
   if(v.corpse.done){v.destroy();this.views.delete(m);}
  }
  if(w.dad){if(!this.dadView)this.dadView=this.makeView(w.dad,'dad',.52);this.showDad(w.dad);}
  else if(this.dadView){this.dadView.destroy();this.dadView=null;}
 }
 // Dad's frame comes from the sim clock (dad.js) so the impact frame lands exactly on resolve() and holds through pauses.
 showDad(d){const v=this.dadView,m=v.meta,a=m.anims.find(x=>x.name==='dad_'+d.state);Object.assign(v,{x:d.x,y:d.y,z:0});
  if(a){const i=Math.min(a.frames.length-1,d.frame|0);v.cur='dad_'+d.state;v.sprite.anims.stop();v.sprite.setTexture(m.pages[a.pages[i]],a.frames[i]);}else v.play(d.state,1,false);
  v.sprite.setAlpha(d.alpha??1);v.sync();v.shadow.setAlpha(.9*(d.alpha??1));}
 effects(dt){
  const w=this.world,g=this.g;g.clear();
  // Procedural paddle only for the old silhouette stand-in; the packed swat frames carry the BDB swatter.
  const paddle=!!w.dad&&!this.anims.exists('dad_swat');this.dadLabel.setVisible(paddle);
  if(paddle){const d=w.dad,swing=d.state==='swat'?Math.sin(d.age*12)*65:0,x=d.x+135+swing,y=d.y-230;g.lineStyle(12,0xd5bc82);g.lineBetween(d.x+45,d.y-100,x,y);g.lineStyle(6,0xffe3a5);g.strokeRoundedRect(x-44,y-70,88,90,12);for(let i=-25;i<=25;i+=12){g.lineStyle(1,0xffe3a5);g.lineBetween(x+i,y-64,x+i,y+14);}this.dadLabel.setPosition(x-22,y-42);}
  for(const e of w.enemies.filter(e=>e.alive)){
   if(e.type==='hover'){g.lineStyle(3,0x9de1ff,.9);g.strokeEllipse(e.x,e.y,90,20);}
   if(e.shield){g.lineStyle(6,0xffdb77,.9);g.strokeEllipse(e.x+e.facing*48,e.y-82,34,110);}
   if(e.state==='telegraph'){
    g.fillStyle(0xff5575,.28);
    if(e.type==='wingman'&&e.phase!==2){for(let i=0;i<3;i++)if(i!==e.safeBand)g.fillRect(w.bounds.l,572+i*39,1280,36);}
    else if(e.type==='wingman'){g.fillEllipse(e.attackX,e.attackY,180,60);g.lineStyle(3,0xffccad);g.strokeEllipse(e.attackX,e.attackY,180,60);}
    else{const reach=e.type==='charger'||e.mode==='rush'?400:120;g.fillRect(Math.min(e.x,e.x+e.facing*reach),e.y-18,reach,36);}
   }
   if(!e.boss&&e.hp<e.maxHp){g.fillStyle(0x201b30);g.fillRect(e.x-30,e.y-215,60,5);g.fillStyle(0xb7dce7);g.fillRect(e.x-30,e.y-215,60*e.hp/e.maxHp,5);}
  }
  for(const p of w.projectiles){g.fillStyle(0x491b7d);g.fillEllipse(p.x,p.y,48,19);g.fillStyle(0xba77ed);g.fillEllipse(p.x-5*p.dir,p.y-4,26,6);g.fillStyle(0x9bcc63);g.fillTriangle(p.x+22*p.dir,p.y,p.x+32*p.dir,p.y-9,p.x+33*p.dir,p.y+4);}
  for(const p of w.hostile){g.lineStyle(4,p.kind==='snowball'?0xdaefff:0xffdf89);g.strokeEllipse(p.x,p.y-65,28,32);}
  for(const p of w.pickups){g.fillStyle(0xfff1bb);g.fillRoundedRect(p.x-12,p.y-38,24,32,5);g.fillStyle(0xcc8fde);g.fillRect(p.x-9,p.y-30,18,13);g.fillStyle(0x7bd6c7);g.fillRect(p.x-10,p.y-43,20,6);}
  for(const p of this.particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=110*dt;g.fillStyle(p.color,Math.max(0,p.life));g.fillEllipse(p.x,p.y,9,4);}
  this.particles=this.particles.filter(p=>p.life>0);
 }
 playHeld(ids){(ids||[]).forEach((id,i)=>{say(id,(who,line)=>this.hud?.say(who,line),true,false,i?{wait:2.5*i}:null);if(id==='wingman_phase3')this.cameras?.main?.flash(300,225,190,255);});}
 /** Duck music and hold any voice that arrives while the clip is up. A sync done() releases the hold before the next event. */
 startHeldClip(key,done){
  this.voiceHold=[];this.holdingVoice=true;playTrack(null,{fade:.4});stopSceneAudio();this.setPauseReason('cutscene',true);
  // Full-screen video: park the Phaser loop too, like the Dad call does.
  const unpause=pauseForClip(this.game);
  this.game.story.play(key,()=>{
   this.holdingVoice=false;this.setPauseReason('cutscene',false);const held=this.voiceHold||[];this.voiceHold=[];
   unpause();
   if(key!=='victory')playTrack(this.world.bossActive?`boss${this.stageNo}`:`stage${this.stageNo}`,{fade:.4});
   done?.(held);
  });
 }
 freeClaudia(){this.claudiaCage?.destroy();this.claudiaCage=null;this.claudia?.play('claudia_freed');}
 presentVictory(){
  if(this.finished)return;this.finished=true;this.freeClaudia?.();
  this.startHeldClip('victory',held=>{
   this.playHeld(held);
   const panel=document.getElementById('victory'),score=document.getElementById('victory-score');
   if(score)score.textContent=`${Math.floor(this.world.score)} points · Nightmare unlocked`;
   if(panel)panel.hidden=false;document.body.classList.remove('playing');
  });
 }
 handleEvents(){for(const {type,data}of this.world.events.splice(0)){
  if(type==='voice'){if(this.holdingVoice)this.voiceHold.push(data);else{say(data,(who,line)=>this.hud.say(who,line));if(data==='wingman_phase3')this.cameras.main.flash(300,225,190,255);}}
  if(type==='fire'){sfx.fire();if(data&&this.fx){this.fx.muzzle(data.x,data.y,data.dir||1);this.recoil=12;this.recoilDir=data.dir||1;}}
  if(type==='pickup')sfx.pickup();
  if(type==='hurt'){sfx.hurt();if(data)this.fx?.impact('medium',data.x,data.y-90,-1);}
  if(type==='shield')sfx.clang();
  if(type==='boss')playTrack(`boss${this.stageNo}`);if(type==='clear')sfx.levelClear();
  if(type==='go')this.hud?.flashGo?.(data?.plate);
  if(type==='papi'){this.papiFX.start();sfx.papi();}
  if(type==='dad_callin'){const go=()=>this.world.finishDadCallin(); if(!playDadCall(this,go)) go();}
  if(type==='cutscene')this.startHeldClip(data,held=>this.playHeld(held));
  if(type==='victory')this.presentVictory();
  if(type==='dad')sfx.dadHorn();
  if(type==='dadhit'){const cam=this.cameras.main;cam.flash(140,255,250,235,true);this.fx?.impact('finisher',data.x,data.y-40,-1);sfx.hit(true);
   for(let i=0;i<18;i++)this.particles.push({x:data.x-85+Math.random()*60-30,y:data.y-12,vx:Math.random()*360-180,vy:-80-Math.random()*240,life:.35+Math.random()*.35,color:i%3?0xfff3b0:0xffffff});}
  if(type==='hit'||type==='ko'){sfx.hit(type==='ko');const kind=type==='ko'?'heavy':(data?.kind||'light');if(type==='hit')this.fx?.impact(kind,data.x,data.y-90,data.dir||1);this.fx?.splat(data.x,data.y-70);for(let i=0;i<(type==='ko'?15:5);i++)this.particles.push({x:data.x,y:data.y-100,vx:Math.random()*240-120,vy:-Math.random()*180,life:.5+Math.random()*.5,color:type==='ko'?0xffe6cb:0xc28aff});}
 }}
 update(time,delta){
  if(this.switching)return;const dt=Math.min(delta/1000,.1),inp=this.game.inp,w=this.world;syncRotatePause(this);inp.update(dt);
  if(inp.take('pause')||inp.take('start'))this.setPauseReason('manual',!this.pauseReasons.has('manual'));
  this.accumulator+=dt;
  while(this.accumulator>=1/60){const controls=this.bot?this.bot.update(1/60,w):w.papiTime>0||w.dad||w.paused?{}:inp.snapshot();w.update(1/60,controls);this.accumulator-=1/60;if(w.stageNo!==this.stageNo)break;}
  if(w.stageNo!==this.stageNo){this.switching=true;document.getElementById('boot').hidden=false;this.scene.restart({world:w,bot:this.bot});return;}
  this.handleEvents();
  this.syncViews(dt);this.fx?.update(dt);if(this.fx){const shake=this.fx.shakeOffset();this.cameras.main.setScroll(Math.round(w.camX+shake[0]),Math.round(shake[1]));this.applyRecoil(dt);this.stepDust(dt);}if(!w.paused)this.papiFX.update(dt);this.effects(w.paused?0:dt);this.hud.update(w);
  perf.tick(performance.now(),{active:!w.paused&&!w.victory,inFight:w.locked&&!w.papiTime&&!w.dad,context:{stage:this.stageNo,mode:w.bossActive?'boss':'stage'}});
  this.game.governor?.();
  if(w.victory&&!this.finished)this.presentVictory();
 }
}
