import { Campaign } from './campaign.js';
import { Bot } from './bot.js';
import { Fighter } from './fighter.js';
import { TYPES } from './yettis.js';
import { queueCharPages,makeCharAnims,releaseChars,residencyDelta } from './assets.js';
import { STAGE_CHARS,STAGE_TEXTURES } from './stages.js';
import { HUD } from './hud.js';
import { PapacitoFX } from './papacito-fx.js';
import { q } from './config.js';
import { say,sfx,playTrack,preloadClips,releaseClips,stopSceneAudio } from './audio.js';
import { stageLines } from './voice-lines.js';
import { persistSave } from './save.js';
import { perf } from './perf.js';

export class GameScene extends Phaser.Scene {
 constructor(){super('gameplay');}
 init(data){this.world=data.world||new Campaign({...data,onSave:s=>persistSave(s)});this.bot=data.bot||(q.get('demo')==='1'?new Bot():null);this.stageNo=this.world.stageNo;this.started=true;this.pauseReasons=new Set();this.accumulator=0;this.views=new Map();this.particles=[];this.dadView=null;this.switching=false;this.finished=false;}
 preload(){
  const prev=this.game.residentChars||[],next=STAGE_CHARS[this.stageNo],delta=residencyDelta(prev,next);
  releaseChars(this,delta.release);queueCharPages(this,next);this.game.residentChars=next;
  for(const key of this.game.residentTextures||[])if(!STAGE_TEXTURES[this.stageNo].includes(key)&&this.textures.exists(key))this.textures.remove(key);
  const bg=this.world.def.bg;if(!this.textures.exists(bg))this.load.image(bg,`assets/bg/${bg}.webp`);
  this.game.residentTextures=STAGE_TEXTURES[this.stageNo];
  const loadError=file=>{window.__bdbStartup?.fail(`Asset ${file.key}`,'assets');document.getElementById('boot').textContent='Could not load chapter. Reload to retry.';};
  this.load.once('loaderror',loadError);this.load.once('complete',()=>this.load.off('loaderror',loadError));
 }
 create(){
  this.game.campaign=this.world;this.metas=makeCharAnims(this,STAGE_CHARS[this.stageNo]);
  this.add.image(640,360,this.world.def.bg).setDisplaySize(1280,720).setScrollFactor(0).setTint(0x9094b1);
  const floor=this.add.graphics().setScrollFactor(0);floor.fillStyle(0x111b2b,.75);floor.fillRect(0,550,1280,170);floor.lineStyle(2,0xcaa66c,.45);floor.lineBetween(0,555,1280,555);
  floor.lineStyle(1,0xc4cee4,.13);for(const y of [595,635,675])floor.lineBetween(0,y,1280,y);
  this.add.text(32,490,this.world.def.title,{fontFamily:'Arial',fontSize:18,color:'#ffe0a1',fontStyle:'bold'}).setScrollFactor(0).setAlpha(.55);
  if(!this.textures.exists('shadow')){const g=this.make.graphics({x:0,y:0},false);g.fillStyle(0x03050c,.5);g.fillEllipse(32,32,63,60);g.generateTexture('shadow',64,64);g.destroy();}
  this.dadLabel=this.add.text(0,0,'BDB',{fontFamily:'Arial',fontSize:20,fontStyle:'bold',color:'#fff0ad',stroke:'#192235',strokeThickness:4}).setDepth(19001).setVisible(false);
  this.g=this.add.graphics().setDepth(19000);this.hud=new HUD(this);this.papiFX=new PapacitoFX(this);
  if(this.stageNo===3){const m=this.metas.claudia,a=m.anims[0];this.add.sprite(4890,490,m.pages[0],a.frames[0]).setOrigin(.5,.95).setScale(.27).setTint(0xffb4d7).play(a.name);
   const cage=this.add.graphics();cage.lineStyle(5,0xabb5cb,.9);cage.strokeRect(4830,350,120,150);for(let x=4850;x<4950;x+=22)cage.lineBetween(x,350,x,500);}
  document.getElementById('boot').hidden=true;document.body.classList.add('playing');document.getElementById('title').hidden=true;
  this.game.inp.clear();preloadClips(stageLines(this.stageNo));playTrack(`stage${this.stageNo}`);
  this.events.once('shutdown',()=>{for(const v of this.views.values())v.destroy();this.views.clear();this.papiFX.destroy();this.dadView?.destroy();releaseClips(stageLines(this.stageNo));});
  this.syncViews();this.hud.update(this.world);
 }
 setPauseReason(reason,on){if(on)this.pauseReasons.add(reason);else this.pauseReasons.delete(reason);this.world.paused=this.pauseReasons.size>0;this.game.inp.clear();}
 makeView(model,key,scale,tint=0xffffff){const v=new Fighter(this,{key,prefix:key+'_',native:1,scale,anchorX:.5,hp:1,team:0,shadowW:135},model.x,model.y);v.sprite.setLighting(false).setTint(tint);return v;}
 syncViews(){
  const w=this.world;this.bounds=w.bounds;this.cameras.main.scrollX=w.camX;
  const live=new Set();
  for(const model of [w.bob,...w.enemies.filter(e=>e.alive)]){
   live.add(model);let view=this.views.get(model);const isBob=model===w.bob,key=isBob?'bob':model.type==='wingman'?'wingman':TYPES[model.type].art;
   if(!view){view=this.makeView(model,key,isBob ? .46 : model.boss ? .54 : .42,isBob?0xffffff:model.type==='wingman'?(model.role===2?0xffb1d6:0xd0beff):TYPES[model.type].tint);this.views.set(model,view);}
   Object.assign(view,{x:model.x,y:model.y,z:model.z||0,state:model.state});view.face(model.facing);
   let anim=isBob?(model.state==='dead'?'knockdown':['hurt','knockdown','getup'].includes(model.state)?model.state:model.shootTime>0?'shoot':model.state==='walk'||model.state==='dash'?'walk':'idle'):
    model.state==='hurt'?'hurt':model.state==='down'?'knockdown':model.state==='telegraph'||model.state==='rush'?'attack':model.state==='approach'?'walk':'idle';
   if(!this.anims.exists(key+'_'+anim)){const m=this.metas[key];anim=model.type==='wingman'?(model.state==='split'?'split':model.state==='telegraph'?'telegraph':model.state==='recover'?'land':'hover'):model.type==='interventionist'?(model.state==='telegraph'?'grab':'walk'):'sing';if(!this.anims.exists(key+'_'+anim))anim=m.anims[0].name.slice(key.length+1);}
   view.play(anim,1,false);view.sprite.setAlpha(isBob&&model.inv>0&&Math.floor(model.time*12)%2 ? .55 : 1);view.sync();
  }
  for(const [m,v]of this.views)if(!live.has(m)){v.destroy();this.views.delete(m);}
  if(w.dad){if(!this.dadView)this.dadView=this.makeView(w.dad,'dad',.52);Object.assign(this.dadView,{x:w.dad.x,y:w.dad.y,z:0});this.dadView.play(w.dad.state,1,false);this.dadView.sync();}
  else if(this.dadView){this.dadView.destroy();this.dadView=null;}
 }
 effects(dt){
  const w=this.world,g=this.g;g.clear();
  this.dadLabel.setVisible(!!w.dad);
  if(w.dad){const d=w.dad,swing=d.state==='swat'?Math.sin(d.age*12)*65:0,x=d.x+135+swing,y=d.y-230;g.lineStyle(12,0xd5bc82);g.lineBetween(d.x+45,d.y-100,x,y);g.lineStyle(6,0xffe3a5);g.strokeRoundedRect(x-44,y-70,88,90,12);for(let i=-25;i<=25;i+=12){g.lineStyle(1,0xffe3a5);g.lineBetween(x+i,y-64,x+i,y+14);}this.dadLabel.setPosition(x-22,y-42);}
  for(const e of w.enemies.filter(e=>e.alive)){
   if(e.type==='hover'){g.lineStyle(3,0x9de1ff,.9);g.strokeEllipse(e.x,e.y,90,20);}
   if(e.shield){g.lineStyle(6,0xffdb77,.9);g.strokeEllipse(e.x+e.facing*48,e.y-82,34,110);}
   if(e.state==='telegraph'){
    g.fillStyle(0xff5575,.28);
    if(e.type==='wingman'&&e.phase!==2){for(let i=0;i<3;i++)if(i!==e.safeBand)g.fillRect(w.bounds.l,572+i*39,1280,36);}
    else if(e.type==='wingman'){g.fillEllipse(e.attackX,e.attackY,180,60);g.lineStyle(3,0xffccad);g.strokeEllipse(e.attackX,e.attackY,180,60);}
    else{g.fillRect(Math.min(e.x,e.x+e.facing*(e.type==='charger'?400:120)),e.y-18,e.type==='charger'?400:120,36);}
   }
   if(!e.boss&&e.hp<e.maxHp){g.fillStyle(0x201b30);g.fillRect(e.x-30,e.y-215,60,5);g.fillStyle(0xb7dce7);g.fillRect(e.x-30,e.y-215,60*e.hp/e.maxHp,5);}
  }
  for(const p of w.projectiles){g.fillStyle(0x491b7d);g.fillEllipse(p.x,p.y,48,19);g.fillStyle(0xba77ed);g.fillEllipse(p.x-5*p.dir,p.y-4,26,6);g.fillStyle(0x9bcc63);g.fillTriangle(p.x+22*p.dir,p.y,p.x+32*p.dir,p.y-9,p.x+33*p.dir,p.y+4);}
  for(const p of w.hostile){g.lineStyle(4,p.kind==='snowball'?0xdaefff:0xffdf89);g.strokeEllipse(p.x,p.y-65,28,32);}
  for(const p of w.pickups){g.fillStyle(0xfff1bb);g.fillRoundedRect(p.x-12,p.y-38,24,32,5);g.fillStyle(0xcc8fde);g.fillRect(p.x-9,p.y-30,18,13);g.fillStyle(0x7bd6c7);g.fillRect(p.x-10,p.y-43,20,6);}
  for(const p of this.particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=110*dt;g.fillStyle(p.color,Math.max(0,p.life));g.fillEllipse(p.x,p.y,9,4);}
  this.particles=this.particles.filter(p=>p.life>0);
 }
 handleEvents(){for(const {type,data}of this.world.events.splice(0)){
  if(type==='voice'){say(data,(who,line)=>this.hud.say(who,line));if(data==='wingman_phase3')this.cameras.main.flash(300,225,190,255);}
  if(type==='fire')sfx.fire();if(type==='pickup')sfx.pickup();if(type==='hurt')sfx.hurt();if(type==='shield')sfx.clang();
  if(type==='boss')playTrack(`boss${this.stageNo}`);if(type==='clear')sfx.levelClear();
  if(type==='papi'){this.papiFX.start();sfx.papi();}
  if(type==='dad')sfx.dadHorn();
  if(type==='hit'||type==='ko'){sfx.hit(type==='ko');for(let i=0;i<(type==='ko'?15:5);i++)this.particles.push({x:data.x,y:data.y-100,vx:Math.random()*240-120,vy:-Math.random()*180,life:.5+Math.random()*.5,color:type==='ko'?0xffe6cb:0xc28aff});}
 }}
 update(time,delta){
  if(this.switching)return;const dt=Math.min(delta/1000,.1),inp=this.game.inp,w=this.world;inp.update(dt);
  if(inp.take('pause'))this.setPauseReason('manual',!this.pauseReasons.has('manual'));
  this.accumulator+=dt;
  while(this.accumulator>=1/60){const controls=this.bot?this.bot.update(1/60,w):w.hitStop>0||w.papiTime>0||w.dad||w.paused?{}:inp.snapshot();w.update(1/60,controls);this.accumulator-=1/60;if(w.stageNo!==this.stageNo)break;}
  this.handleEvents();
  if(w.stageNo!==this.stageNo){this.switching=true;document.getElementById('boot').hidden=false;this.scene.restart({world:w,bot:this.bot});return;}
  this.syncViews();if(!w.paused)this.papiFX.update(dt);this.effects(w.paused?0:dt);this.hud.update(w);
  perf.tick(performance.now(),{active:!w.paused&&!w.victory,inFight:w.locked&&!w.papiTime&&!w.dad,context:{stage:this.stageNo,mode:w.bossActive?'boss':'stage'}});
  if(w.victory&&!this.finished){this.finished=true;playTrack(null,{fade:.5});stopSceneAudio();this.game.story.play('victory',()=>{document.getElementById('victory').hidden=false;document.getElementById('victory-score').textContent=`${Math.floor(w.score)} points · Nightmare unlocked`;document.body.classList.remove('playing');});}
 }
}
