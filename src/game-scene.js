import { Campaign } from './campaign.js';
import { Bot } from './bot.js';
import { Fighter, shootTimeScale, consumeShootRestart } from './fighter.js';
import { TYPES, laneOf, laneY, LANE_H, choirAura, telegraphPlan } from './yettis.js';
import { warningRect } from './attack-geometry.js';
import { queueCharPages,makeCharAnims,makeSockAnims,releaseChars,residencyDelta } from './assets.js';
import { STAGE_CHARS,STAGE_TEXTURES,CAGED } from './stages.js';
import { buildBackdrop } from './backdrop.js';
import { HUD } from './hud.js';
import { PapacitoFX } from './papacito-fx.js';
import { q } from './config.js';
import { gameplayWantsPause } from './input.js';
import { say,sfx,playTrack,duckStageBed,preloadClips,releaseClips,stopSceneAudio,presentStage,setGameAudioPaused } from './audio.js';
import { stageLines } from './voice-lines.js';
import { STORY } from './story.js';
import { showStuck } from './recovery.js';
import { persistSave } from './save.js';
import { perf } from './perf.js';
import { playDadCall, abortDadCall, installDadGestureBless } from './dad-call-cutscene.js';
import { beginCorpse, stepCorpse } from './corpses.js';
import { bindRotatePause } from './rotate-block.js';
import { FX } from './fx.js';
import { RECOIL_KICK, stepRecoil, hostileShape, killImpact, SOCK_DRAW_SCALE, SOCK_DRAW_Y } from './shot-feel.js';

/** Silent picture (stage opener, or Stage 4's mute kidnap) keeps the bed.
 *  A scored clip still owns the speakers. Stages 1–3 keep their historical bed stop
 *  when a non-stage clip is queued (Stage 2 kidnap already played that way). */
export function isSilentOpenerClip(key) {
  return /^(?:stage\d+|kidnap)$/.test(String(key || ''));
}
export function trackForStageStart(stageNo, events) {
  const clips = (events || []).filter(e => e.type === 'cutscene');
  if (stageNo >= 4) {
    if (clips.some(e => !isSilentOpenerClip(e.data))) return null;
  } else if (clips.some(e => !/^stage\d+$/.test(String(e.data)))) return null;
  return `stage${stageNo}`;
}

/** Boss stinger. The same drained batch may open rescue_pre_boss, which ducks music immediately. */
export function bossTrackForBatch(stageNo, events) {
  if (events?.some(e => e.type === 'cutscene')) return null;
  return `boss${stageNo}`;
}

/** Wingmen paint behind Bob and not fully solid, so a silhouette cannot cover him. */
export const WINGMAN_ALPHA = 0.78;
export function fighterDepth(model) {
  const y = model?.y || 0;
  return (model?.type === 'wingman' ? 700 : 1000) + y;
}

/** GameScene owns the fighter shadow. FX must not register that key: a second createCanvas returns null and create() throws. */
export function bootOwnedTextures(scene) {
  if (!scene.textures.exists('shadow')) {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x03050c, .5);
    g.fillEllipse(32, 32, 63, 60);
    g.generateTexture('shadow', 64, 64);
    g.destroy();
  }
  return new FX(scene);
}

/** Map Yetti sim state → atlas anim suffix (FPS.md role sheets and explicit TYPES[t].anims). */
export function roleAnim(m) {
  const t = m.type, s = m.state, map = TYPES[t]?.anims;
  if (map) {
    if (s === 'hurt') return map.hurt || 'hurt';
    if (s === 'down' || s === 'dead') return map.dead || (TYPES[t]?.boss ? 'down' : 'knockdown');
    if (m.shield && (s === 'wait' || s === 'recover') && map.block) return map.block;
    return map[s] || map.default;
  }
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
 init(data){
  this.lastDialogue=null;this.victoryDialogue=[];
  this._sceneToken=(this._sceneToken||0)+1;
  if(this._duckOwner){duckStageBed(false,this._duckOwner);this._duckOwner=null;}
  this.world=data.world||new Campaign({...data,onSave:s=>persistSave(s)});this.bot=data.bot||(q.get('demo')==='1'?new Bot():null);this.stageNo=this.world.stageNo;this.started=false;this.loadFailed=false;this.pauseReasons=new Set();this.accumulator=0;this.views=new Map();this.sockViews=new Map();this.sockPuffs=[];this.liveSet=new Set();this.particles=[];this.dadView=null;this.claudia=null;this.claudiaCage=null;this.switching=false;this.finished=false;this.rescueBeat=false;this.holdingVoice=false;this.voiceHold=[];this._carryVoice=null;this.runId=(this.game.runSeq=(this.game.runSeq||0)+1);this.bloomEnabled=true;this.backdropLit=true;
 }
 failChapterLoad(error){
  this.loadFailed=true;this.started=false;
  const err=error instanceof Error?error:new Error(String(error||'chapter'));
  if(!globalThis.__bdbStartup?.fail(err,'assets'))showStuck(globalThis,err,this.game);
  const boot=globalThis.document?.getElementById?.('boot');
  if(boot&&!boot.hidden)boot.textContent='Could not load chapter. Reload to retry.';
 }
 preload(){
  const loadError=file=>this.failChapterLoad(`Asset ${file?.multiFile?.key||file?.key||'chapter'}`);
  this.load.on('loaderror',loadError);this.load.once('complete',()=>this.load.off('loaderror',loadError));
  try{
   const prev=this.game.residentChars||[],next=STAGE_CHARS[this.stageNo],delta=residencyDelta(prev,next);
   if(!next?.length)throw new Error(`Missing character list for stage ${this.stageNo}`);
   releaseChars(this,delta.release);queueCharPages(this,next);this.game.residentChars=next;
   for(const key of this.game.residentTextures||[])if(!STAGE_TEXTURES[this.stageNo]?.includes(key)&&this.textures.exists(key))this.textures.remove(key);
   const keys=STAGE_TEXTURES[this.stageNo]||[];
   for(const key of keys)if(!this.textures.exists(key))this.load.image(key,`assets/bg/${key}.webp`);
   this.game.residentTextures=keys;
  }catch(error){
   this.load.off('loaderror',loadError);
   this.failChapterLoad(error);
  }
 }
 create(){
  if(globalThis.__bdbStartup?.failed||this.loadFailed)return;
  try{
   this.mountTextures();
   this.assemble();
   // Preload can sit here for seconds on a slow phone. The freeze guard waits until the stage is actually running.
   this.started=true;
  }catch(error){
   this.started=false;
   showStuck(globalThis,error instanceof Error?error:new Error(String(error)),this.game);
  }
 }
 mountTextures(){this.fx=bootOwnedTextures(this);}
 assemble(){
  for(const key of STAGE_TEXTURES[this.stageNo]||[])if(!this.textures.exists(key))throw new Error(`Missing stage texture: ${key}`);
  this.game.campaign=this.world;this.metas=makeCharAnims(this,STAGE_CHARS[this.stageNo]);makeSockAnims(this);
  this.backdrop=buildBackdrop(this,this.world.def);
  this.dadLabel=this.add.text(0,0,'BDB',{fontFamily:'Arial',fontSize:20,fontStyle:'bold',color:'#fff0ad',stroke:'#192235',strokeThickness:4}).setDepth(19001).setVisible(false);
  this.g=this.add.graphics().setDepth(19000);this.hud=new HUD(this);this.papiFX=new PapacitoFX(this);
  if(CAGED.has(this.stageNo)){const bl=this.world.def.boss.l,m=this.metas.claudia,a=m.anims[0];this.claudia=this.add.sprite(bl+970,490,m.pages[0],a.frames[0]).setOrigin(.5,.95).setScale(.27).setTint(0xffb4d7).play(a.name);
   const cage=this.add.graphics();cage.lineStyle(5,0xabb5cb,.9);cage.strokeRect(bl+910,350,120,150);for(let x=bl+930;x<bl+1030;x+=22)cage.lineBetween(x,350,x,500);this.claudiaCage=cage;}
  document.getElementById('boot').hidden=true;document.body.classList.add('playing');document.getElementById('title').hidden=true;
  this.game.inp.clear();preloadClips(stageLines(this.stageNo));
  const opening=trackForStageStart(this.stageNo,this.world.events);
  if(opening)playTrack(opening);
  this.offDadBless=installDadGestureBless(globalThis);
  this.offRotate=bindRotatePause(this);
  this.events.once('shutdown',()=>{this._sceneToken=(this._sceneToken||0)+1;if(this._duckOwner){duckStageBed(false,this._duckOwner);this._duckOwner=null;}this.offRotate?.();this.offRotate=null;this.offDadBless?.();this.offDadBless=null;abortDadCall(this);this.fx?.destroy();this.fx=null;this.backdrop?.destroy();this.backdrop=null;for(const v of this.views.values())v.destroy();this.views.clear();for(const s of this.sockViews.values())s.destroy();this.sockViews.clear();for(const s of this.sockPuffs||[])s.destroy();this.sockPuffs=[];this.papiFX.destroy();this.dadView?.destroy();releaseClips(stageLines(this.stageNo));});
  this.syncViews();presentStage(this);this.hud.update(this.world);
 }
 setBloom(on){this.bloomEnabled=!!on;}
 setBackdropLit(on){this.backdropLit=on!==false;}
 applyRecoil(dt){
  if(!(this.recoil>0))return;
  const view=this.views.get(this.world.bob);if(!view)return;
  view.x=this.world.bob.x-(this.recoilDir||1)*this.recoil*0.55;view.sync();
  this.recoil=stepRecoil(this.recoil,dt);
 }
 stepDust(dt){
  const b=this.world.bob;if(!b||!this.fx)return;
  const stepping=b.alive&&(b.state==='walk'||b.state==='dash')&&b.z<1;
  if(stepping){
   this.stepAcc=(this.stepAcc||0)+dt;const every=b.state==='dash'?0.08:0.18;
   if(this.stepAcc>=every){this.stepAcc-=every;sfx.step();this.fx.dust.emitParticleAt(b.x,b.y,b.state==='dash'?8:4);}
  }else this.stepAcc=0;
  const band=laneOf(b.y);
  if(this.prevBand!=null&&band!==this.prevBand&&b.z<8&&b.alive){this.fx.dust.emitParticleAt(b.x,b.y,7);sfx.step();}
  if((this.prevZ||0)>8&&b.z===0){sfx.land();this.fx.dust.emitParticleAt(b.x,b.y,10);}
  if((this.prevZ||0)<1&&b.z>8)sfx.jump();
  this.prevZ=b.z;this.prevBand=band;
 }
 setPauseReason(reason,on){if(on)this.pauseReasons.add(reason);else this.pauseReasons.delete(reason);this.world.paused=this.pauseReasons.size>0;this.game.inp.clear();this.syncPausePresentation();}
 syncPausePresentation(){
  const paused=!!this.world?.paused;
  const ts=paused?0:1;
  const sprites=[];
  for(const v of this.views?.values?.()||[])if(v.sprite)sprites.push(v.sprite);
  if(this.dadView?.sprite)sprites.push(this.dadView.sprite);
  if(this.claudia)sprites.push(this.claudia);
  for(const s of this.sockViews?.values?.()||[])sprites.push(s);
  for(const s of this.sockPuffs||[])sprites.push(s);
  for(const s of sprites){if(s.anims)s.anims.timeScale=ts;if(paused)s.anims?.pause?.();else s.anims?.resume?.();}
  if(paused){this.anims?.pauseAll?.();this.tweens?.pauseAll?.();}
  else{this.anims?.resumeAll?.();this.tweens?.resumeAll?.();}
  this.fx?.setPaused?.(paused);
  setGameAudioPaused(paused);
 }
 makeView(model,key,scale,tint=0xffffff){const v=new Fighter(this,{key,prefix:key+'_',native:1,scale,anchorX:.5,hp:1,team:0,shadowW:135},model.x,model.y);v.sprite.setLighting(false).setTint(tint);return v;}
 syncViews(dt=0){
  const w=this.world;this.bounds=w.bounds;this.cameras.main.setScroll(Math.round(w.camX),0);this.backdrop?.update(w.camX);
  // Membership, not model.alive: a phase change drops a Wingman from the array while he is still alive, and that view has to become a corpse.
  const live=this.liveSet||(this.liveSet=new Set());live.clear();live.add(w.bob);
  for(const e of w.enemies)if(e.alive)live.add(e);
  for(const model of live){
   let view=this.views.get(model);const isBob=model===w.bob,key=isBob?'bob':model.type==='wingman'?'wingman':TYPES[model.type].art;
   if(!view){view=this.makeView(model,key,isBob ? .46 : model.boss ? .54 : .42,isBob?0xffffff:model.type==='wingman'?(model.role===2?0xffb1d6:0xd0beff):TYPES[model.type].tint);this.views.set(model,view);}
   view.corpse=null;view.corpsePlayed=false;
   Object.assign(view,{x:model.x,y:model.y,z:model.z||0,state:model.state});view.face(model.facing);
   let anim=isBob?(model.state==='dead'?'knockdown':['hurt','knockdown','getup'].includes(model.state)?model.state:model.shootTime>0?'shoot':model.state==='walk'||model.state==='dash'?'walk':'idle'):
    roleAnim(model);
   if(!this.anims.exists(key+'_'+anim)){const m=this.metas[key],map=TYPES[model.type]?.anims;anim=map?(map[model.state]||map.default):model.state==='roar'?'ring':'sing';if(!this.anims.exists(key+'_'+anim))anim=m.anims[0].name.slice(key.length+1);}
   const restart=isBob&&consumeShootRestart(view,model,anim);
   const ts=isBob&&anim==='shoot'?shootTimeScale(this.metas?.bob):1;
   view.play(anim,ts,restart);if(w.paused&&view.sprite?.anims)view.sprite.anims.timeScale=0;
   view.sprite.setAlpha(isBob&&model.inv>0&&Math.floor(model.time*12)%2 ? .55 : 1);view.sync();
   if(model.type==='wingman'){view.sprite.setAlpha(WINGMAN_ALPHA);view.sprite.setDepth(fighterDepth(model));}
  }
  for(const [m,v] of this.views){
   if(live.has(m))continue;
   if(m===w.bob){v.destroy();this.views.delete(m);continue;}
   if(!v.corpse)v.corpse=beginCorpse(!!m.boss);
   v.corpse=stepCorpse(v.corpse,dt);
   v.state='dead';
   if(!v.corpsePlayed){const key=v.def.key,deadAnim=roleAnim({...m,state:'dead'});v.play(this.anims.exists(key+'_'+deadAnim)?deadAnim:this.anims.exists(key+'_knockdown')?'knockdown':'hurt',1,false);v.corpsePlayed=true;}
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

 /** Painted sock for guard/hover snowballs. Halo/shockwave stay procedural. */
 syncSocks(){
  const w=this.world, views=this.sockViews||(this.sockViews=new Map());
  const live=new Set();
  for(const p of w.hostile){
   if(hostileShape(p.kind).shape!=='sock')continue;
   live.add(p);
   let spr=views.get(p);
   if(!spr){
    if(!this.textures.exists('sock-0')||!this.anims.exists('sock_spin'))continue;
    spr=this.add.sprite(p.x,p.y-SOCK_DRAW_Y,'sock-0','sock_spin_00').setOrigin(.5,.5).setScale(SOCK_DRAW_SCALE).setDepth(18950);
    spr.play('sock_spin');views.set(p,spr);
   }
   spr.setPosition(p.x,p.y-SOCK_DRAW_Y);spr.setFlipX(p.dir<0);
  }
  for(const [p,spr] of [...views.entries()]){
   if(live.has(p))continue;
   this.spawnSockPuff(spr.x,spr.y);
   spr.destroy();views.delete(p);
  }
 }
 spawnSockPuff(x,y){
  if(!this.textures.exists('sock-0')||!this.anims.exists('sock_puff'))return;
  const spr=this.add.sprite(x,y,'sock-0','sock_puff_00').setOrigin(.5,.5).setScale(SOCK_DRAW_SCALE).setDepth(18960);
  (this.sockPuffs||(this.sockPuffs=[])).push(spr);
  spr.play('sock_puff');
  spr.once('animationcomplete',()=>{spr.destroy();const list=this.sockPuffs;if(!list)return;const i=list.indexOf(spr);if(i>=0)list.splice(i,1);});
 }
 effects(dt){
  const w=this.world,g=this.g;g.clear();
  // Procedural paddle only for the old silhouette stand-in; the packed swat frames carry the BDB swatter.
  const paddle=!!w.dad&&!this.anims.exists('dad_swat');this.dadLabel.setVisible(paddle);
  if(paddle){const d=w.dad,swing=d.state==='swat'?Math.sin(d.age*12)*65:0,x=d.x+135+swing,y=d.y-230;g.lineStyle(12,0xd5bc82);g.lineBetween(d.x+45,d.y-100,x,y);g.lineStyle(6,0xffe3a5);g.strokeRoundedRect(x-44,y-70,88,90,12);for(let i=-25;i<=25;i+=12){g.lineStyle(1,0xffe3a5);g.lineBetween(x+i,y-64,x+i,y+14);}this.dadLabel.setPosition(x-22,y-42);}
  for(const e of w.enemies){if(!e.alive)continue;
   const aura=choirAura(e);
   const spin=w.elapsed||0;
   if(aura){
    g.lineStyle(2,0xffd56a,.45+.2*Math.sin(spin*2));
    const steps=24;
    for(let i=0;i<steps;i+=2){g.beginPath();g.arc(e.x,e.y,aura.r,(i/steps)*Math.PI*2,((i+1)/steps)*Math.PI*2,false);g.strokePath();}
    for(let n=0;n<aura.notes;n++){const ang=spin*1.4+n*2.0943951023931953,nx=e.x+Math.cos(ang)*72,ny=e.y-168+Math.sin(ang)*16;g.fillStyle(0xfff1a8,.9);g.fillEllipse(nx,ny,8,6);g.fillRect(nx+4,ny-14,2,14);}
   }
   if(e.choirBuff>1){g.lineStyle(3,0xffd56a,.35+.35*Math.sin(spin*6));g.strokeEllipse(e.x,e.y-90,78,160);}
   if(e.type==='hover'){g.lineStyle(3,0x9de1ff,.9);g.strokeEllipse(e.x,e.y,90,20);}
   if(e.shield){const sx=e.x+e.facing*48,sy=e.y-82;g.lineStyle(6,0xffdb77,.9);g.strokeEllipse(sx,sy,34,110);const chips=e.shieldHits||0;if(chips>=1){g.lineStyle(2,0x6a4a12,.95);g.lineBetween(sx-10,sy-28,sx+8,sy+6);}if(chips>=2){g.lineBetween(sx+12,sy-22,sx-6,sy+18);}}
   if(e.state==='telegraph'){
    g.fillStyle(0xff5575,.28);
    if(e.type==='wingman'&&e.phase!==2){for(let i=0;i<3;i++)if(i!==e.safeBand)g.fillRect(w.bounds.l,laneY(i)-LANE_H/2,1280,LANE_H);}
    else if(e.type==='wingman'){g.fillEllipse(e.attackX,e.attackY,180,60);g.lineStyle(3,0xffccad);g.strokeEllipse(e.attackX,e.attackY,180,60);}
    else{
     const plan=telegraphPlan(e,w);
     if(TYPES[e.type]?.lunge){g.fillStyle(0xff69c7,.38);g.lineStyle(4,0xffa3e2,.85);g.strokeEllipse(plan.from,plan.y-75,100,145);}
     const strip=warningRect(plan,w.bounds);
     g.fillRect(strip.x,strip.y,strip.w,strip.h);
    }
   }
   if(!e.boss&&e.hp<e.maxHp){g.fillStyle(0x201b30);g.fillRect(e.x-30,e.y-215,60,5);g.fillStyle(0xb7dce7);g.fillRect(e.x-30,e.y-215,60*e.hp/e.maxHp,5);}
  }
  for(const p of w.projectiles){g.fillStyle(0x491b7d);g.fillEllipse(p.x,p.y,48,19);g.fillStyle(0xba77ed);g.fillEllipse(p.x-5*p.dir,p.y-4,26,6);g.fillStyle(0x9bcc63);g.fillTriangle(p.x+22*p.dir,p.y,p.x+32*p.dir,p.y-9,p.x+33*p.dir,p.y+4);}
  for(const p of w.hostile){const s=hostileShape(p.kind);if(s.shape==='ring'){g.lineStyle(4,s.color);g.strokeCircle(p.x,p.y-65,16);}else if(s.shape==='bar'){g.fillStyle(s.color);g.fillRect(p.x-46,p.y-70,92,8);}else if(s.shape!=='sock'||!this.textures.exists('sock-0')){g.lineStyle(4,s.color);g.strokeEllipse(p.x,p.y-SOCK_DRAW_Y,28,32);}}
  this.syncSocks();
  for(const p of w.pickups){g.fillStyle(0xfff1bb);g.fillRoundedRect(p.x-12,p.y-38,24,32,5);g.fillStyle(0xcc8fde);g.fillRect(p.x-9,p.y-30,18,13);g.fillStyle(0x7bd6c7);g.fillRect(p.x-10,p.y-43,20,6);}
  const parts=this.particles;let kept=0;
  for(let i=0;i<parts.length;i++){const p=parts[i];p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=110*dt;g.fillStyle(p.color,Math.max(0,p.life));g.fillEllipse(p.x,p.y,9,4);if(p.life>0)parts[kept++]=p;}
  parts.length=kept;
 }
 presentCaption(who,line){
  const text=`${who.toUpperCase()}  /  ${line}`;
  this.lastDialogue=text;this.hud?.say?.(who,line);
  if(this.finished){
   (this.victoryDialogue||=[]).push(text);
   this.renderVictoryDialogue();
  }
 }
 renderVictoryDialogue(){
  const line=document.getElementById('victory-line');
  if(line){line.textContent=(this.victoryDialogue||[]).join('\n');line.scrollTop=line.scrollHeight;}
 }
 speakNow(id){say(id,(who,line)=>this.presentCaption(who,line));}
 /** Campaign approves all dialogue. Presentation never stamps a second clock. */
 queueSceneVoice(id){
  if(!id)return false;
  if(id==='wingman_phase3')this.cameras?.main?.flash?.(300,225,190,255);
  this.speakNow(id);return true;
 }
 playHeld(ids){for(const id of ids||[])this.queueSceneVoice(id);}
 /** Silent stage openers (and Stage 4's mute kidnap) duck the bed. A scored clip stops it. */
 stageBedClip(key){
  const keys=Array.isArray(key)?key:[key];
  if(!keys.length)return false;
  if(keys.every(k=>/^stage\d+$/.test(k)))return true;
  return (this.stageNo||0)>=4&&keys.every(isSilentOpenerClip);
 }
 victoryClip(key){
  const keys=Array.isArray(key)?key:[key];
  return keys.includes('victory');
 }
 /** Duck music and hold any voice that arrives while the clip is up. A sync done() releases the hold before the next event. */
 startHeldClip(key,done){
  // Play first so a superseded clip can still read the lines it was holding.
  // Abort keeps those lines on the new hold. Speaking them here loses the audio
  // to the stopSceneAudio that ducks the clip which just took over.
  // A clip that finishes inside play() must not re-arm that hold and swallow the next line.
  // The story player owns pauseForClip, so destroy() can resume the loop it paused.
  const bed=this.stageBedClip(key),victory=this.victoryClip(key);
  const sceneToken=this._sceneToken??(this._sceneToken=1),clipOwner=Symbol('clip');
  let finished=false;
  this.game.story.play(key,(how)=>{
   finished=true;
   if(bed){duckStageBed(false,clipOwner);if(this._duckOwner===clipOwner)this._duckOwner=null;}
   if(sceneToken!==this._sceneToken)return;
   const held=this.voiceHold||[];this.voiceHold=[];this.holdingVoice=false;this.setPauseReason('cutscene',false);
   if(how==='abort'){this._carryVoice=(this._carryVoice||[]).concat(held);return;}
   if(!bed&&!victory)playTrack(this.world.bossActive?`boss${this.stageNo}`:`stage${this.stageNo}`,{fade:.4});
   const carry=this._carryVoice||[];this._carryVoice=null;done?.([...carry,...held]);
  });
  if(finished)return;
  const carried=this._carryVoice||[];this._carryVoice=null;
  this.voiceHold=[...carried];this.holdingVoice=true;
  if(bed){this._duckOwner=clipOwner;duckStageBed(true,clipOwner);}else playTrack(null,{fade:.4});
  stopSceneAudio();this.setPauseReason('cutscene',true);
 }
 freeClaudia(){this.claudiaCage?.destroy();this.claudiaCage=null;this.claudia?.play('claudia_freed');}
 /** Stage 3 still frees Claudia and plays the keep rescue before the campaign continues. */
 presentChapterRescue(){
  if(this.rescueBeat)return;this.rescueBeat=true;this.freeClaudia?.();
  const runId=this.runId,stageNo=this.stageNo;
  this.startHeldClip('victory',held=>{
   if(this.runId!==runId||this.stageNo!==stageNo||this.switching)return;
   this.playHeld(held);
   if(this.world?.nightmareUnlockedPending)this.world.banner?.(`${STORY.victory} · NIGHTMARE UNLOCKED`);
   if(!this.world?.victory)playTrack(`stage${this.stageNo}`,{fade:.4});
  });
 }
 presentVictory(){
  if(this.finished)return;this.finished=true;this.freeClaudia?.();
  // Keep the actual last presentation, including a defeat emitted in this batch.
  this.victoryDialogue=this.lastDialogue?[this.lastDialogue]:[];
  const show=held=>{
   this.playHeld(held);
   const panel=document.getElementById('victory'),score=document.getElementById('victory-score');
   this.renderVictoryDialogue();
   const stage=this.stageNo||this.world?.stageNo||1;
   const flipped=!!this.world?.nightmareUnlockedPending||(!this.world?.beatenAtStart&&!!this.world?.save?.beaten&&stage<=3);
   if(flipped&&this.world)this.world.nightmareUnlockedPending=false;
   if(score)score.textContent=`${Math.floor(this.world.score)} points · ${flipped?'Nightmare unlocked':`Chapter ${stage} complete`}`;
   if(panel)panel.hidden=false;document.body.classList.remove('playing');
  };
  // rescue_2 was shot for the keep. It plays on the Stage 3 clear, not again over the final panel.
  if((this.stageNo||0)>3){show([]);return;}
  this.startHeldClip('victory',show);
 }
 handleEvents(){
  const ev=this.world.events, batch=this._evBatch||(this._evBatch=[]);
  batch.length=0;
  for(let i=0;i<ev.length;i++)batch.push(ev[i]);
  ev.length=0;
  const bossTrack=bossTrackForBatch(this.stageNo,batch);
  for(let i=0;i<batch.length;i++){
  const {type,data}=batch[i];
  if(type==='voice'){if(this.holdingVoice)this.voiceHold.push(data);else this.queueSceneVoice(data);}
  if(type==='fire'){sfx.fire();if(data&&this.fx){this.fx.muzzle(data.x,data.y,data.dir||1);this.recoil=RECOIL_KICK;this.recoilDir=data.dir||1;}}
  if(type==='pickup')sfx.pickup();
  if(type==='hurt'){sfx.hurt();if(data)this.fx?.impact('medium',data.x,data.y-90,-1);}
  if(type==='shield')sfx.clang(data?.chips||1);
  if(type==='boss'&&bossTrack)playTrack(bossTrack);if(type==='clear'){sfx.levelClear();if(data===3&&this.world.def?.next)this.presentChapterRescue();}
  if(type==='go')this.hud?.flashGo?.(data?.plate);
  if(type==='papi'){this.papiFX.start();sfx.stampede();}
  if(type==='dad_callin'){if(!playDadCall(this,(_how,presentation)=>this.world.finishDadCallin(presentation)))this.world.finishDadCallin();}
  if(type==='cutscene'){
   const keys=[data];
   while(batch[i+1]?.type==='cutscene')keys.push(batch[++i].data);
   this.startHeldClip(keys.length===1?data:keys,held=>this.playHeld(held));
  }
  if(type==='victory')this.presentVictory();
  if(type==='dad')sfx.dadHorn();
  if(type==='dadhit'){const cam=this.cameras.main;cam.flash(140,255,250,235,true);this.fx?.impact('finisher',data.x,data.y-40,-1);sfx.hit(true);
   for(let i=0;i<18;i++)this.particles.push({x:data.x-85+Math.random()*60-30,y:data.y-12,vx:Math.random()*360-180,vy:-80-Math.random()*240,life:.35+Math.random()*.35,color:i%3?0xfff3b0:0xffffff});}
  if(type==='ko'&&data?.source==='papi'){this.fx?.dust.emitParticleAt(data.x,data.y,14);for(let i=0;i<6;i++)this.particles.push({x:data.x,y:data.y-90,vx:Math.random()*220-110,vy:-150-Math.random()*180,life:.45+Math.random()*.35,color:i%2?0xfff6c2:0xffffff});}
  if(type==='hit'||type==='ko'){const impact=killImpact(type,data);if(impact){sfx.hit(impact.heavy);const kind=data?.kind||(impact.heavy?'heavy':'light');if(impact.kick)this.fx?.impact(kind,data.x,data.y-90,data.dir||1);if(impact.splat)this.fx?.splat(data.x,data.y-70);for(let i=0;i<(impact.heavy?15:5);i++)this.particles.push({x:data.x,y:data.y-100,vx:Math.random()*240-120,vy:-Math.random()*180,life:.5+Math.random()*.5,color:type==='ko'?0xffe6cb:0xc28aff});}}
 }}
 update(time,delta){
  this.game.beat?.();
  if(this.switching)return;const dt=Math.min(delta/1000,.1),inp=this.game.inp,w=this.world;inp.update(dt);
  if(gameplayWantsPause(inp))this.setPauseReason('manual',!this.pauseReasons.has('manual'));
  this.accumulator+=dt;
  while(this.accumulator>=1/60){const controls=this.bot?this.bot.update(1/60,w):w.papiTime>0||w.dad||w.paused?{}:inp.snapshot();w.update(1/60,controls);this.accumulator-=1/60;if(w.stageNo!==this.stageNo)break;}
  if(w.stageNo!==this.stageNo){this.switching=true;document.getElementById('boot').hidden=false;this.scene.restart({world:w,bot:this.bot});return;}
  this.handleEvents();
  const presentDt=w.paused?0:dt;
  this.syncViews(presentDt);this.fx?.update(presentDt);if(this.fx){const shake=this.fx.shakeOffset();this.cameras.main.setScroll(Math.round(w.camX+shake[0]),Math.round(shake[1]));this.applyRecoil(presentDt);this.stepDust(presentDt);}if(!w.paused)this.papiFX.update(dt);this.effects(presentDt);this.hud.update(w,presentDt);
  const perfCtx=this._perfCtx||(this._perfCtx={stage:0,mode:''});
  perfCtx.stage=this.stageNo;perfCtx.mode=w.bossActive?'boss':'stage';
  perf.tick(performance.now(),{active:!w.paused&&!w.victory,inFight:w.locked&&!w.papiTime&&!w.dad,context:perfCtx});
  this.game.governor?.();
  if(w.victory&&!this.finished)this.presentVictory();
 }
}
