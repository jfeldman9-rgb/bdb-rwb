import { Bob } from './bob.js';
import { fireGun, stepShot, GUN } from './eggplant.js';
import { Yetti } from './yettis.js';
import { Wingmen } from './wingman.js';
import { collectShake, papacitoEffect } from './papacito.js';
import { DAD, createDadCall, unlockDad, noteBobKo, tickDadCall, takeCall, callEffect } from './dad-call.js';
import { Dad } from './dad.js';
import { DIFFICULTIES } from './difficulty.js';
import { resolveStage } from './stages.js';
import { normalizeSave, clearStage } from './save.js';
import { clamp, LANE_TOP, LANE_BOT, VW, WORLD_W } from './config.js';
import { updateCamera } from './camera.js';
import { plateKeyForCam } from './zone-stream.js';
import { STORY, TUTORIALS } from './story.js';

/** All gameplay lives here; Phaser and the headless bot use the same fixed steps. */
export class Campaign {
  constructor({ stage = 1, difficulty = 'adventure', save, onSave = () => {} } = {}) {
    this.difficultyKey = difficulty; this.difficulty = DIFFICULTIES[difficulty]; this.onSave = onSave;
    this.save = normalizeSave(save); this.events = []; this.elapsed = 0; this.score = 0; this.victory = false; this.paused = false;
    this.seenTutorials = new Set();
    this.stats = { shots: 0, papi: 0, dad: 0, kos: 0, deaths: 0, stages: [], phases: [] };
    this.papi = { charges: 0, shakeRemainder: 0 }; this.dadCall = createDadCall(stage > 1); this.loadStage(stage);
  }
  emit(type, data) { this.events.push({ type, data }); }
  banner(text) { this.message = text; this.messageTime = 3; this.emit('banner', text); }
  loadStage(stage) {
    this.stageNo = stage; this.def = resolveStage(stage); this.bob = new Bob({ difficulty: this.difficultyKey });
    this.zoneIndex = 0; this.waveIndex = 0; this.locked = false; this.enemies = []; this.projectiles = []; this.hostile = []; this.pickups = [];
    this.camX = 0; this.camMax = 0; this.bounds = { l: 0, r: VW }; this.bossActive = false; this.wingmen = null; this.clearTimer = 0;
    this.hitStop = 0; this.papiTime = 0; this.dad = null; this.gun = {}; this.checkpoint = { zone: 0, x: 180, phase: 1 };
    this.shieldHintShown = false; this.papiHintShown = false;
    this.banner(this.def.title); this.emit('stage',stage); this.emit('voice',`nar_ch${stage}`);
  }
  dropTrio(x, y = this.bob?.y ?? 630) { const laneY = clamp(y, LANE_TOP, LANE_BOT); for (let i=0;i<3;i++) this.pickups.push({ x: clamp(x+i*35,this.bounds.l+65,this.bounds.r-65), y: laneY, kind: 'shake' }); }
  spawnWave() {
    const zone=this.def.zones[this.zoneIndex], wave=zone.waves[this.waveIndex], gap=zone.spawnGap ?? 105;
    this.enemies = wave.map((type,i)=>new Yetti(type,zone.l+780+i*gap,630+((i%3)-1)*24));
    const teachKey = `${this.zoneIndex}:${this.waveIndex}`, teachText = TUTORIALS[this.zoneIndex]?.[this.waveIndex];
    const tutorial = this.stageNo===1 && this.save.bestScore===0 && teachText && !this.seenTutorials.has(teachKey);
    this.banner(tutorial ? teachText : `ZONE ${this.zoneIndex+1} · WAVE ${this.waveIndex+1}`);
    if(tutorial)this.seenTutorials.add(teachKey);
  }
  enterZone() {
    const zone=this.def.zones[this.zoneIndex]; this.locked=true;
    this.camX=zone.l; this.camMax=Math.max(this.camMax||0,zone.l);
    updateCamera(this,0,{bobX:this.bob.x,facing:this.bob.facing,locked:true,zone,snap:true});
    if (zone.dad) unlockDad(this.dadCall);
    if (zone.shakes) this.dropTrio(this.bob.x+40);
    this.spawnWave();
  }
  startBoss(phase = 1) {
    const z=this.def.boss; this.bossActive=true; this.locked=true;
    this.camX=z.l; this.camMax=Math.max(this.camMax||0,z.l);
    this.checkpoint={zone:3,x:z.l+200,phase}; this.bob.x=Math.max(this.bob.x,z.l+120);
    updateCamera(this,0,{bobX:this.bob.x,facing:this.bob.facing,locked:true,boss:z,snap:true});
    if (z.type==='wingman') { this.wingmen=new Wingmen(); this.enemies=this.wingmen.spawn(z.l+880,phase); }
    else { const boss=new Yetti(z.type,z.l+880,630); boss.phase=phase; this.enemies=[boss]; }
    this.banner(z.name); this.emit('boss',z.type);
    this.emit('voice',z.type==='wingman'?'wingman_council':`${z.type}_intro`);
    if (z.type==='choirmaster') this.summonWalkers();
  }
  summonWalkers() {
    const count=this.enemies.filter(e=>!e.boss&&e.alive).length;
    for (let i=count;i<3;i++) this.enemies.push(new Yetti('walker',this.bounds.l+600+i*140,585+i*45));
  }
  snowball(x,y,dir,kind='snowball') { this.hostile.push({x,y,dir,kind,speed:kind==='halo'?260:320,alive:true}); }
  hurtBob(charger=false) { if (this.bob.takeHit({charger})) this.emit('hurt',{x:this.bob.x,y:this.bob.y}); }
  recordKo(e, source = 'bob') {
    if (e.recorded) return; e.recorded=true; this.stats.kos++;
    if (source==='bob') { this.score += e.boss?2500:300; noteBobKo(this.dadCall); }
    if (e.type==='guard') this.pickups.push({x:e.x,y:e.y,kind:'shake'});
    this.emit('ko',{x:e.x,y:e.y,source});
  }
  hit(e,damage,dir,bonk) {
    const result=e.takeHit(damage,dir,bonk);
    if (result.blocked) {
      this.emit('shield',{x:e.x,y:e.y});
      if (result.shieldBroke) this.banner(STORY.shield);
      else if (this.stageNo===1 && !this.shieldHintShown) { this.shieldHintShown=true; this.banner('BLOCKED! DASH THROUGH THE GOLD SHIELD.'); }
      return;
    }
    if (result.accepted) { this.hitStop=4/60; this.emit('hit',{x:e.x,y:e.y,bonk}); }
    if (result.phase) {
      this.checkpoint.phase=result.phase; this.stats.phases.push(`${this.stageNo}:${result.phase}`);
      if (e.type==='interventionist') { this.banner('THE INTERVENTIONIST · PHASE II: HE MEANS IT NOW'); this.emit('voice','lecturer_intervention'); }
      else this.banner(`${this.def.boss.name} · PHASE II`);
      this.dropTrio(this.bob.x+40);
    }
    if (!e.alive) this.recordKo(e);
  }
  usePapi() {
    const result=papacitoEffect(this.papi,this.enemies,{phase:this.wingmen?.phase||0,camX:this.camX,paused:this.paused,
      dead:!this.bob.alive,victory:this.victory,dadActive:!!this.dad,active:this.papiTime>0});
    if (!result.allowed) {
      this.banner(result.reason==='weaken'?'WEAKEN BOTH WINGMEN FIRST':result.reason==='protein'?'NEED MORE PROTEIN.':'PAPI NEEDS A CROWD.'); return false;
    }
    this.papiTime=2.5; this.stats.papi++; this.score+=result.score;
    for(const e of result.killed)this.recordKo(e,'papi');
    this.banner(result.finisher?'PAPACITO! COUNCIL ADJOURNED.':'PAPI! PAPI!'); this.emit('papi',result.finisher); this.emit('voice','bdb_laugh'); return true;
  }
  useDad() {
    if(this.stageNo===1 && !this.dadCall.unlocked){this.banner('DAD ARRIVES IN ZONE 3.');return false;}
    const visible=this.enemies.filter(e=>e.alive&&e.x>=this.camX&&e.x<=this.camX+1280);
    const phase=this.wingmen?.phase||visible.find(e=>e.boss)?.phase;
    const result=takeCall(this.dadCall,{paused:this.paused,victory:this.victory,dead:!this.bob.alive,papiActive:this.papiTime>0,
      hittable:visible.some(e=>e.canBeHit),bossPhase:phase?`${this.stageNo}:${phase}`:null,bossInvuln:visible.some(e=>e.boss&&!e.canBeHit)});
    if(!result.ok){this.banner("DAD'S ON HIS COFFEE BREAK.");return false;}
    this.dad=new Dad(this.camX,this.bob.y); this.stats.dad++; this.bob.inv=Math.max(this.bob.inv,DAD.inv);
    this.emit('voice','dad_catchphrase'); this.emit('dad'); return true;
  }
  respawn() {
    this.stats.deaths++; const cp={...this.checkpoint};
    this.bob=new Bob({x:cp.x,difficulty:this.difficultyKey});this.bob.inv=2;
    this.enemies=[];this.projectiles=[];this.hostile=[];this.pickups=[];this.gun={};this.dad=null;this.dadCall.on=false;this.papiTime=0;this.shieldHintShown=false;
    this.zoneIndex=cp.zone;this.waveIndex=0;this.locked=false;this.bossActive=false;
    this.camX=clamp(cp.x-VW*0.28,0,WORLD_W-VW);this.camMax=Math.max(this.camMax||0,this.camX);
    updateCamera(this,0,{bobX:this.bob.x,facing:this.bob.facing,locked:false,snap:true});
    if(cp.zone===3)this.startBoss(cp.phase);
    this.banner(STORY.checkpoint);this.emit('voice','bob_respawn_01');
  }
  finishStage() {
    if(this.clearTimer)return;
    this.stats.stages.push(this.stageNo);this.save=clearStage(this.save,this.stageNo,this.score);this.onSave(this.save);
    this.clearTimer=2.5; this.hostile=[]; this.enemies.forEach(e=>{e.alive=false;});
    this.banner(this.stageNo===3?STORY.victory:'CHAPTER CLEAR · EGO STILL INTACT');this.emit('clear',this.stageNo);
  }
  update(dt,input={}) {
    if(this.paused||this.victory||!Number.isFinite(dt)||dt<=0)return;
    this.elapsed+=dt;this.messageTime=Math.max(0,this.messageTime-dt);
    if(this.clearTimer>0){this.clearTimer-=dt;if(this.clearTimer<=0){if(this.def.next)this.loadStage(this.def.next);else{this.victory=true;this.emit('victory');}}return;}
    if(this.papiTime>0){this.papiTime=Math.max(0,this.papiTime-dt);return;}
    if(this.dad){this.dad.update(dt,()=>{for(const e of this.enemies)if(e.x>=this.camX&&e.x<=this.camX+1280){const r=callEffect(e);if(r?.killed)this.recordKo(e,'dad');}});if(this.dad.gone){this.dad=null;this.dadCall.on=false;}return;}
    if(this.hitStop>0){this.hitStop=Math.max(0,this.hitStop-dt);return;}
    tickDadCall(this.dadCall,dt);
    if(this.bob.state==='grabbed' && input.presses){if(this.bob.mash(input.presses))this.banner(STORY.mash); input={};}
    this.bob.update(dt,input,this.bounds);
    if(!this.bob.alive){if(this.bob.stateTime<=0)this.respawn();return;}
    if(input.papi&&this.usePapi())return;
    if(input.dad&&this.useDad())return;
    const fightZone=this.zoneIndex<3?this.def.zones[this.zoneIndex]:null;
    const boss=this.bossActive?this.def.boss:null;
    updateCamera(this,dt,{bobX:this.bob.x,facing:this.bob.facing,locked:this.locked,zone:this.locked&&!this.bossActive?fightZone:null,boss});
    if(!this.locked){
      if(this.zoneIndex<3&&this.bob.x>=this.def.zones[this.zoneIndex].at)this.enterZone();
      else if(this.zoneIndex===3&&this.bob.x>=this.def.boss.at)this.startBoss();
    }
    if(this.bob.dashTime>0)for(const e of this.enemies)if(e.alive&&Math.abs(e.x-this.bob.x)<85&&Math.abs(e.y-this.bob.y)<GUN.band&&e.breakShield?.())this.banner(STORY.shield);
    const auto=this.save.autoFire && this.enemies.some(e=>e.alive&&(e.x-this.bob.x)*this.bob.facing>0&&Math.abs(e.y-this.bob.y)<GUN.band);
    const fired=fireGun(this.gun,dt,input.fire||auto,this.bob,this.enemies,this.difficulty.damage);
    if(fired){this.stats.shots++;this.emit('fire');if(fired.bonk)this.hit(fired.bonk,fired.damage,this.bob.facing,true);else this.projectiles.push(fired.shot);}
    for(const p of this.projectiles)stepShot(p,dt,this.enemies,(...args)=>this.hit(...args),this.camX);
    this.projectiles=this.projectiles.filter(p=>p.alive);
    for(const e of [...this.enemies])e.update(dt,this);
    for(const p of this.hostile){const oldX=p.x;p.x+=p.dir*p.speed*this.difficulty.pace*dt;
      if(this.bob.x>=Math.min(oldX,p.x)-30&&this.bob.x<=Math.max(oldX,p.x)+30&&Math.abs(this.bob.y-p.y)<25&&this.bob.z<65){this.hurtBob();p.alive=false;}
      if(p.x<this.camX-100||p.x>this.camX+1380)p.alive=false;
    }
    this.hostile=this.hostile.filter(p=>p.alive);
    for(const p of this.pickups)if(Math.abs(p.x-this.bob.x)<55&&Math.abs(p.y-this.bob.y)<48){
      const before=this.papi.charges;
      const collected=collectShake(this.papi.shakeRemainder,this.papi.charges,this.bob.hp,false);
      this.papi.charges=collected.charges;this.papi.shakeRemainder=collected.shakeRemainder;p.gone=true;this.emit('pickup');
      if(this.stageNo===1&&this.papi.charges>before&&!this.papiHintShown){this.papiHintShown=true;this.banner('PAPI READY! 3 SHAKES = 1 CHARGE. SAVE IT FOR A CROWD.');}
    }
    this.pickups=this.pickups.filter(p=>!p.gone);
    if(this.wingmen){const before=this.wingmen.phase;this.wingmen.update(dt,this);if(before!==this.wingmen.phase)this.stats.phases.push(`3:${this.wingmen.phase}`);}
    if(this.bossActive){
      if(this.wingmen?.complete || (!this.wingmen&&!this.enemies.some(e=>e.boss&&e.alive)))this.finishStage();
    } else if(this.locked&&!this.enemies.some(e=>e.alive)){
      const zone=this.def.zones[this.zoneIndex];this.waveIndex++;
      if(this.waveIndex<zone.waves.length)this.spawnWave();
      else{this.locked=false;this.zoneIndex++;this.waveIndex=0;this.checkpoint={zone:this.zoneIndex,x:zone.r-150,phase:1};this.bob.hp=this.bob.maxHp;this.banner(STORY.checkpoint);this.emit('go',{plate:plateKeyForCam(this.camX,this.def)});updateCamera(this,0,{bobX:this.bob.x,facing:this.bob.facing,locked:false,snap:true});}
    }
  }
}
