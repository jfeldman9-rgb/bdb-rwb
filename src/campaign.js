import { Bob } from './bob.js';
import { fireGun, stepShot, GUN } from './eggplant.js';
import { Yetti, bossPhaseHp, RANGED_TYPES, MAX_RANGED_PER_LANE, laneOf, laneY, rangedInLane, freestLane } from './yettis.js';
import { Wingmen } from './wingman.js';
import { collectShake, papacitoEffect, papiHitTime } from './papacito.js';
import { DAD, createDadCall, unlockDad, noteBobKo, tickDadCall, takeCall, callEffect, ZONE_MERCY_DEATHS, grantZoneMercy, refusalBanner } from './dad-call.js';
import { Dad } from './dad.js';
import { DIFFICULTIES } from './difficulty.js';
import { resolveStage } from './stages.js';
import { normalizeSave, clearStage } from './save.js';
import { clamp, LANE_TOP, LANE_BOT, VW, WORLD_W, HITSTOP, CAM_LEAD } from './config.js';
import { updateCamera, moveBounds, lockSnaps } from './camera.js';
import { plateKeyForCam } from './zone-stream.js';
import { STORY, TUTORIALS } from './story.js';
import { createBarks, barkWhere, barkCory, barkYettiWave, barkYettiTaunt, barkPapacito, barkYettiAttack } from './barks.js';

/** Highest Yetti pace a chapter ramp may reach (Nightmare is 1.22 on its own). */
export const PACE_CAP = 1.25;

/** Drop dead entries without allocating a replacement array. */
function keep(list, pred) {
  let n = 0;
  for (let i = 0; i < list.length; i++) if (pred(list[i])) list[n++] = list[i];
  list.length = n;
}

/** Chip, bonk, KO, boss-gate. Math.max with the current freeze so tiers never stack. */
export function hitTier({ phase = false, killed = false, bonk = false, shieldBroke = false } = {}) {
  if (phase) return 'finisher';
  if (killed) return 'heavy';
  if (bonk || shieldBroke) return 'medium';
  return 'light';
}

/** All gameplay lives here; Phaser and the headless bot use the same fixed steps. */
export class Campaign {
  constructor({ stage = 1, difficulty = 'adventure', save, onSave = () => {} } = {}) {
    this.difficultyKey = difficulty; this.difficulty = DIFFICULTIES[difficulty]; this.onSave = onSave;
    this.save = normalizeSave(save); this.events = []; this.elapsed = 0; this.score = 0; this.victory = false; this.paused = false;
    this.seenTutorials = new Set();
    this.stats = { shots: 0, papi: 0, dad: 0, kos: 0, deaths: 0, hits: 0, stages: [], phases: [], stageTimes: [] };
    this.papi = { charges: 0, shakeRemainder: 0 }; this.dadCall = createDadCall(stage > 1); this.barks = createBarks(); this.kidnapPlayed = false; this.rescuePreBossPlayed = false; this.loadStage(stage);
  }
  emit(type, data) { this.events.push({ type, data }); }
  banner(text) { this.message = text; this.messageTime = 3; this.emit('banner', text); }
  loadStage(stage) {
    this.stageNo = stage; this.def = resolveStage(stage);
    // Later chapters push Yetti pace (speed, tells, cooldowns, projectiles) on top of the chosen difficulty,
    // capped so Nightmare's own pace doesn't compound into unreadable snowball walls.
    const base = DIFFICULTIES[this.difficultyKey];
    this.difficulty = { ...base, pace: Math.max(base.pace, Math.min(PACE_CAP, base.pace * (this.def.pace ?? 1))) };
    this.bob = new Bob({ difficulty: this.difficultyKey });
    this.zoneIndex = 0; this.waveIndex = 0; this.locked = false; this.enemies = []; this.pending = []; this.projectiles = []; this.hostile = []; this.pickups = [];
    this.stageStart = this.elapsed;
    this.camX = 0; this.camMax = 0; this.bounds = { l: 0, r: VW }; this.bossActive = false; this.wingmen = null; this.clearTimer = 0;
    this.hitStop = 0; this.papiTime = 0; this.papiPending = null; this.dad = null; this.gun = {}; this.checkpoint = { zone: 0, x: 180, phase: 1 };
    this.latchedDash = this.latchedFire = this.latchedPapi = this.latchedDad = false;
    this.barkAcc = 0;
    this.shieldHintShown = false; this.papiHintShown = false; this.zoneDeaths = Object.create(null);
    this.voiceAt = [];
    this.banner(this.def.title); this.emit('stage',stage);
    // The kidnap clip stops scene audio. Chapter 2's narration has to be emitted
    // after that event so the new scene holds it instead of starting it and cutting it off.
    const openingKidnap = stage === 2 && !this.kidnapPlayed;
    if (openingKidnap) { this.kidnapPlayed = true; this.emit('cutscene', 'kidnap'); }
    this.emit('voice',`nar_ch${stage}`);
    if (stage === 1) {
      this.armVoice('bdb_open', 4);
      this.armVoice('nar_intro_01', 8);
      this.armVoice('nar_intro_02', 13);
      this.armVoice('nar_intro_03', 18);
    }
    if (stage === 3) this.armVoice('claudia_open', 2);
    if (openingKidnap) this.emit('voice', 'nar_kidnap');
    const where = barkWhere(this.barks, this.elapsed); if (where) this.emit('voice', where);
  }
  /** Zone-clear heal: Story/Adventure refill; Nightmare only closes half the gap. */
  healZoneClear() {
    if (this.difficultyKey !== 'nightmare') { this.bob.hp = this.bob.maxHp; return; }
    const missing = this.bob.maxHp - this.bob.hp;
    this.bob.hp = Math.min(this.bob.maxHp, this.bob.hp + Math.max(1, Math.ceil(missing / 2)));
  }
  dropTrio(x, y = this.bob?.y ?? 630) { const laneY = clamp(y, LANE_TOP, LANE_BOT); for (let i=0;i<3;i++) this.pickups.push({ x: clamp(x+i*35,this.bounds.l+65,this.bounds.r-65), y: laneY, kind: 'shake' }); }
  /** Boss arena index: one past the last fight zone. */
  get bossZone() { return this.def.zones.length; }
  /**
   * Wave entries are RWB-style [type, side, delay] (a bare type string means ['type','R',0]).
   * Right-side entries stand in the arena's right half; left-side ones step in at Bob's back.
   */
  spawnWave() {
    const zone=this.def.zones[this.zoneIndex], wave=zone.waves[this.waveIndex], gap=zone.spawnGap ?? 105;
    this.enemies = []; this.pending = [];
    if (this.checkpoint.zone === this.zoneIndex) this.checkpoint.wave = this.waveIndex;
    wave.forEach((entry,i)=>{
      const [type,side='R',delay=0]=typeof entry==='string'?[entry]:entry;
      const x=side==='L'?zone.l+70:Math.min(zone.r-70,zone.l+780+i*gap), y=630+((i%3)-1)*24;
      // Zone 4 breaks the metronome: a small deterministic stagger on top of
      // the authored delays so its waves never arrive on the same exact beat.
      // Immediate spawns stay immediate; only staggered stragglers drift.
      // Zone 5 keeps authored timing: the finale stays bot-clearable in band.
      const jitter=delay>0&&this.zoneIndex===3?(((this.stageNo*31+this.zoneIndex*7+this.waveIndex*3+i)%5)-2)*0.1:0;
      if(delay+jitter>0)this.pending.push({type,x,y,t:delay+jitter});else this.spawnYetti(type,x,y);
    });
    const teachKey = `${this.zoneIndex}:${this.waveIndex}`, teachText = TUTORIALS[this.zoneIndex]?.[this.waveIndex];
    const tutorial = this.stageNo===1 && this.save.bestScore===0 && teachText && !this.seenTutorials.has(teachKey);
    this.banner(tutorial ? teachText : `ZONE ${this.zoneIndex+1} · WAVE ${this.waveIndex+1}`);
    if(tutorial)this.seenTutorials.add(teachKey);
    const where = barkWhere(this.barks, this.elapsed); if (where) this.emit('voice', where);
    const yw = barkYettiWave(this.barks, this.elapsed); if (yw) this.emit('voice', yw);
  }
  enterZone() {
    const zone=this.def.zones[this.zoneIndex]; this.locked=true;
    this.camMax=Math.max(this.camMax||0,zone.l);
    updateCamera(this,0,{bobX:this.bob.x,facing:this.bob.facing,locked:true,zone,snap:lockSnaps(this.camX,zone)});
    if (zone.dad) unlockDad(this.dadCall);
    if (zone.shakes) this.dropTrio(this.bob.x+40);
    this.spawnWave();
  }
  spawnYetti(type,x,y) {
    const e=new Yetti(type,x,y,this.def.hpScale??1);
    // A third ranged body in one lane is how Nightmare zone 5 walls. Park the extra on a freer lane.
    if (RANGED_TYPES.has(type) && rangedInLane(this.enemies, laneOf(e.y), e) >= MAX_RANGED_PER_LANE) e.y = laneY(freestLane(this.enemies, e));
    this.enemies.push(e);
    if (type === 'choir') this.speak('choir_serious', 10);
    return e;
  }
  tickPending(dt) {
    if(!this.pending.length)return;
    // An empty arena pulls the next straggler in quickly instead of leaving dead air.
    if(!this.enemies.some(e=>e.alive))this.pending[0].t=Math.min(this.pending[0].t,.5);
    for(const p of this.pending)if((p.t-=dt)<=0)this.spawnYetti(p.type,p.x,p.y);
    keep(this.pending, p => p.t > 0);
  }
  startBoss(phase = 1) {
    const z=this.def.boss; this.bossActive=true; this.locked=true; this.pending=[];
    this.camMax=Math.max(this.camMax||0,z.l);
    const bossHp=this.checkpoint.zone===this.bossZone?this.checkpoint.bossHp:undefined;
    // Wingmen used to respawn at full HP, so a death undid the whole phase and Nightmare never finished.
    const wingHp=this.checkpoint.zone===this.bossZone?this.checkpoint.wingHp:undefined;
    const wingDead=this.checkpoint.zone===this.bossZone?this.checkpoint.wingDead:undefined;
    this.checkpoint={zone:this.bossZone,x:z.l+200,phase,bossHp,wingHp,wingDead}; this.bob.x=Math.max(this.bob.x,z.l+120);
    updateCamera(this,0,{bobX:this.bob.x,facing:this.bob.facing,locked:true,boss:z,snap:lockSnaps(this.camX,z)});
    if (z.type==='wingman') {
      this.wingmen=new Wingmen(); this.enemies=this.wingmen.spawn(z.l+880,phase);
      if (Array.isArray(wingHp)) {
        const bosses=this.enemies.filter(e=>e.type==='wingman');
        bosses.forEach((e,i)=>{
          if (wingHp[i]==null) return;
          // A Wingman who was already dead must not come back at the phase-3 floor of 1 HP.
          if (wingDead?.[i]) { e.hp=0; e.alive=false; e.state='dead'; return; }
          const floor=phase>=3?1:0;
          e.hp=Math.max(floor,Math.min(e.maxHp,wingHp[i]));
        });
      }
    }
    else { const boss=new Yetti(z.type,z.l+880,630); boss.phase=phase; boss.hp=Math.min(bossPhaseHp(boss.maxHp,phase),bossHp??Infinity); this.enemies=[boss]; }
    this.banner(z.name); this.emit('boss',z.type);
    const rescue = this.stageNo === 3 && !this.rescuePreBossPlayed;
    if (rescue) { this.rescuePreBossPlayed = true; this.emit('cutscene', 'rescue_pre_boss'); }
    this.emit('voice',z.type==='wingman'?'wingman_council':`${z.type}_intro`);
    if (rescue) this.armVoice('claudia_question', 3.5);
    if (z.type==='choirmaster') this.summonWalkers();
  }
  /** Top the arena's minions up to `types.length`, stepping in from alternating screen edges. */
  summonAdds(types = []) {
    const count=this.enemies.filter(e=>!e.boss&&e.alive).length;
    for (let i=count;i<types.length;i++) this.spawnYetti(types[i],i%2?this.bounds.l+70:this.bounds.r-70,clamp(600+i*30,LANE_TOP,LANE_BOT));
  }
  summonWalkers() { this.summonAdds(['walker','walker']); }
  snowball(x,y,dir,kind='snowball') { this.hostile.push({x,y,dir,kind,speed:kind==='halo'?260:320,alive:true}); }
  hurtBob(charger=false, srcX=null, dir=null) {
    const knock = dir ? Math.sign(dir) : (srcX == null ? 0 : (Math.sign(this.bob.x - srcX) || 1));
    if (this.bob.takeHit({charger, dir: knock})) { this.stats.hits++; this.emit('hurt',{x:this.bob.x,y:this.bob.y}); this.speakRot('hurt',['bob_hurt_01','bob_hurt_02','bob_hurt_03'],1.4); }
  }
  yellYettiAttack() { const id = barkYettiAttack(this.barks, this.elapsed); if (id) this.emit('voice', id); }
  recordKo(e, source = 'bob') {
    if (e.recorded) return; e.recorded=true; this.stats.kos++;
    if (source==='bob') { this.score += e.boss?2500:300; noteBobKo(this.dadCall); this.speakRot('laugh',['bdb_laugh'],3); }
    if (e.type==='guard') this.pickups.push({x:e.x,y:e.y,kind:'shake'});
    this.emit('ko',{x:e.x,y:e.y,source});
  }
  hit(e,damage,dir,bonk) {
    const result=e.takeHit(damage,dir,bonk);
    if (result.blocked) {
      this.emit('shield',{x:e.x,y:e.y});
      if (result.shieldBroke) {
        this.banner(STORY.shield);
        const kind = hitTier({ shieldBroke: true });
        this.hitStop = Math.max(this.hitStop, HITSTOP[kind] / 60);
        this.emit('hit', { x: e.x, y: e.y, bonk: false, kind, dir });
      }
      else if (this.stageNo===1 && !this.shieldHintShown) { this.shieldHintShown=true; this.banner('BLOCKED! DASH THROUGH THE GOLD SHIELD.'); }
      return;
    }
    if (result.accepted) {
      const kind = hitTier({ phase: !!result.phase, killed: !e.alive, bonk });
      this.hitStop = Math.max(this.hitStop, HITSTOP[kind] / 60);
      this.emit('hit', { x: e.x, y: e.y, bonk, kind, dir });
      if (bonk) this.speakRot('produce', ['bdb_produce'], 2.5);
    }
    if (result.phase) {
      this.checkpoint.phase=result.phase; this.stats.phases.push(`${this.stageNo}:${result.phase}`);
      const II=result.phase===2;
      if (e.type==='interventionist') { this.banner(II?'THE INTERVENTIONIST · PHASE II: HE MEANS IT NOW':'THE INTERVENTIONIST · PHASE III: FULL INTERVENTION'); this.emit('voice','lecturer_intervention'); }
      else if (e.type==='choirmaster') this.banner(II?'THE CHOIRMASTER · PHASE II: THE CHOIR SWELLS':'THE CHOIRMASTER · PHASE III: HALLELUJAH, HARD MODE');
      else this.banner(`${this.def.boss.name} · PHASE ${II?'II':'III'}`);
      this.hostile=[];
      if (II) this.dropTrio(this.bob.x+40);
    }
    if (!e.alive) this.recordKo(e);
  }
  usePapi() {
    const result=papacitoEffect(this.papi,this.enemies,{phase:this.wingmen?.phase||0,camX:this.camX,paused:this.paused,
      dead:!this.bob.alive,victory:this.victory,dadActive:!!this.dad,active:this.papiTime>0,hitTime:e=>papiHitTime(e.x-this.camX)});
    if (!result.allowed) {
      this.banner(result.reason==='weaken'?'WEAKEN BOTH WINGMEN FIRST':result.reason==='protein'?'NEED MORE PROTEIN.':'PAPI NEEDS A CROWD.');
      if (result.reason==='protein') this.speak('bob_papiwait_01', 2.5);
      else if (result.reason==='empty' || result.reason==='weaken') this.speak('bob_papi_01', 2.5);
      return false;
    }
    this.papiTime=2.5; this.stats.papi++;
    // Each body falls when the front runner reaches it. Score lands with the last one.
    this.papiPending={elapsed:0,schedule:result.schedule,score:result.score};
    this.banner(result.finisher?'PAPACITO! COUNCIL ADJOURNED.':'PAPI! PAPI!'); this.emit('papi',result.finisher); this.emit('voice', barkPapacito(this.barks)); this.armVoice('papi_chorus', 1.4); return true;
  }
  useDad() {
    if(this.stageNo===1 && !this.dadCall.unlocked){this.banner(refusalBanner(this.dadCall,'locked'));return false;}
    const visible=this.enemies.filter(e=>e.alive&&e.x>=this.camX&&e.x<=this.camX+1280);
    const phase=this.wingmen?.phase||visible.find(e=>e.boss)?.phase;
    const result=takeCall(this.dadCall,{paused:this.paused,victory:this.victory,dead:!this.bob.alive,papiActive:this.papiTime>0,
      hittable:visible.some(e=>e.canBeHit),bossPhase:phase?`${this.stageNo}:${phase}`:null,bossInvuln:visible.some(e=>e.boss&&!e.canBeHit)});
    if(!result.ok){
      this.banner(refusalBanner(this.dadCall, result.why));
      if (result.why==='spent' || result.why==='phase') this.speak('bob_dadwait_01', 2.5);
      return false;
    }
    this.stats.dad++; this.bob.inv=Math.max(this.bob.inv,DAD.inv);
    this.speakRot('dad_call', ['dad_call_01','dad_call_02','dad_call_03'], 0);
    this.emit('dad_callin'); return true;
  }
  /** After the call-in cutscene (or immediately if cutscenes are off). */
  finishDadCallin() {
    if (this.dad) return;
    this.dad = new Dad(this.camX, this.bob.y, this.bob.x + 150);
    this.emit('dad');
  }
  /** Lose a life, keep progress: zones resume at the wave reached; a mini-boss keeps the damage dealt. */
  respawn() {
    this.stats.deaths++;
    if (this.wingmen) {
      const wings=this.enemies.filter(e=>e.type==='wingman');
      if (wings.length) {
        this.checkpoint.wingHp=wings.map(e=>e.alive?e.hp:0);
        this.checkpoint.wingDead=wings.map(e=>!e.alive);
      }
    }
    const boss=this.bossActive&&!this.wingmen&&this.enemies.find(e=>e.boss&&e.alive);
    if(boss)this.checkpoint.bossHp=boss.hp;
    const cp={...this.checkpoint};
    this.bob=new Bob({x:cp.x,difficulty:this.difficultyKey});this.bob.inv=2;
    let mercy = null;
    if (this.difficultyKey === 'nightmare') {
      const n = this.zoneDeaths[cp.zone] = (this.zoneDeaths[cp.zone] || 0) + 1;
      if (n === ZONE_MERCY_DEATHS) mercy = grantZoneMercy(this.dadCall, cp.zone===this.bossZone?`${this.stageNo}:${cp.phase}`:null);
    }
    this.enemies=[];this.pending=[];this.projectiles=[];this.hostile=[];this.pickups=[];this.gun={};this.dad=null;this.dadCall.on=false;this.papiTime=0;this.papiPending=null;this.shieldHintShown=false;
    this.latchedDash = this.latchedFire = this.latchedPapi = this.latchedDad = false;
    this.zoneIndex=cp.zone;this.waveIndex=cp.wave??0;this.locked=false;this.bossActive=false;
    this.camX=clamp(cp.x-VW*CAM_LEAD,0,WORLD_W-VW);this.camMax=this.camX;
    updateCamera(this,0,{bobX:this.bob.x,facing:this.bob.facing,locked:false,snap:true});
    if(cp.zone===this.bossZone)this.startBoss(cp.phase);
    this.emit('voice','bob_respawn_01');
    if (mercy === 'dad') this.banner(`${STORY.checkpoint} · MERCY. DAD'S BACK ON THE LINE.`);
    else if (mercy === 'breath') { this.dropTrio(this.bob.x + 40); this.banner(`${STORY.checkpoint} · MERCY. CATCH YOUR BREATH.`); }
    else this.banner(STORY.checkpoint);
  }
  armVoice(id, delay = 0) { if (!id) return; (this.voiceAt ||= []).push({ id, at: this.elapsed + delay }); }
  flushVoice() {
    if (!this.voiceAt?.length) return;
    const due = this.voiceAt.filter(v => v.at <= this.elapsed);
    this.voiceAt = this.voiceAt.filter(v => v.at > this.elapsed);
    for (const v of due) this.emit('voice', v.id);
  }
  speak(id, cd = 0) {
    if (!id) return false;
    this.spoke ||= Object.create(null);
    if (cd > 0 && this.elapsed - (this.spoke[id] ?? -1e9) < cd) return false;
    this.spoke[id] = this.elapsed;
    this.emit('voice', id);
    return true;
  }
  speakRot(key, ids, cd = 0) {
    this.spoke ||= Object.create(null);
    this.rot ||= Object.create(null);
    if (cd > 0 && this.elapsed - (this.spoke[key] ?? -1e9) < cd) return false;
    const i = this.rot[key] || 0;
    this.rot[key] = i + 1;
    this.spoke[key] = this.elapsed;
    this.emit('voice', ids[i % ids.length]);
    return true;
  }
  latchInput(input) {
    if (!input) return;
    if (input.jump) this.bob.jumpBuffer = Math.max(this.bob.jumpBuffer || 0, this.difficulty.grace || 0);
    if (input.dash) this.latchedDash = true;
    if (input.fire) this.latchedFire = true;
    if (input.papi) this.latchedPapi = true;
    if (input.dad) this.latchedDad = true;
  }
  takeLatch(input = {}) {
    const out = { ...input };
    if (this.latchedDash) { out.dash = true; this.latchedDash = false; }
    if (this.latchedFire) { out.fire = true; this.latchedFire = false; }
    if (this.latchedPapi) { out.papi = true; this.latchedPapi = false; }
    if (this.latchedDad) { out.dad = true; this.latchedDad = false; }
    return out;
  }
  finishStage() {
    if(this.clearTimer)return;
    this.stats.stages.push(this.stageNo);this.stats.stageTimes.push(+(this.elapsed-this.stageStart).toFixed(1));this.save=clearStage(this.save,this.stageNo,this.score);this.onSave(this.save);
    this.clearTimer=2.5; this.hostile=[]; this.enemies.forEach(e=>{e.alive=false;});
    this.banner(this.stageNo===3?STORY.victory:'CHAPTER CLEAR · EGO STILL INTACT');this.emit('clear',this.stageNo);
  }
  update(dt,input={}) {
    if(this.paused||this.victory||!Number.isFinite(dt)||dt<=0)return;
    this.elapsed+=dt;this.messageTime=Math.max(0,this.messageTime-dt);this.flushVoice();
    if(this.clearTimer>0){this.clearTimer-=dt;if(this.clearTimer<=0){if(this.def.next)this.loadStage(this.def.next);else{this.victory=true;this.emit('victory');this.emit('voice','nar_victory');this.emit('voice','claudia_leave');}}return;}
    if(this.papiTime>0){
      this.papiTime=Math.max(0,this.papiTime-dt);
      if(this.papiPending){
        const pending=this.papiPending; pending.elapsed+=dt;
        for(const s of pending.schedule){
          if(s.done||s.at>pending.elapsed)continue;
          s.done=true; const e=s.e;
          if(e.alive){ e.hp=0; e.alive=false; e.state='dead'; }
          this.recordKo(e,'papi');
        }
        if(pending.schedule.every(s=>s.done)){ this.score+=pending.score; this.papiPending=null; }
      }
      return;
    }
    if(this.dad){this.dad.update(dt,()=>{this.emit('voice','dad_catchphrase');this.emit('dadhit',{x:this.dad.x,y:this.dad.y});for(const e of this.enemies)if(e.x>=this.camX&&e.x<=this.camX+1280){const r=callEffect(e);if(r?.killed)this.recordKo(e,'dad');}});if(this.dad.gone){this.dad=null;this.dadCall.on=false;this.speakRot('dad_done',['dad_done_01','dad_done_02'],0);}return;}
    if(this.hitStop>0){this.hitStop=Math.max(0,this.hitStop-dt);this.latchInput(input);return;}
    input=this.takeLatch(input);
    tickDadCall(this.dadCall,dt);
    if(this.bob.state==='grabbed' && input.presses){if(this.bob.mash(input.presses))this.banner(STORY.mash); input={};}
    this.bob.update(dt,input,moveBounds(this,this.bob.x));
    if(this.bob.grabPunish){const g=this.bob.grabPunish;this.bob.grabPunish=null;this.hurtBob(false,g?.x);}
    if(!this.bob.alive){if(this.bob.stateTime<=0)this.respawn();return;}
    if(input.papi&&this.usePapi())return;
    if(input.dad&&this.useDad())return;
    this.barkAcc += dt;
    if (this.barkAcc >= 1) {
      this.barkAcc -= 1;
      const cory=barkCory(this.barks,this.elapsed); if(cory)this.emit('voice',cory);
      const yt=barkYettiTaunt(this.barks,this.elapsed); if(yt)this.emit('voice',yt);
    }
    const fightZone=this.zoneIndex<this.bossZone?this.def.zones[this.zoneIndex]:null;
    const boss=this.bossActive?this.def.boss:null;
    updateCamera(this,dt,{bobX:this.bob.x,facing:this.bob.facing,locked:this.locked,zone:this.locked&&!this.bossActive?fightZone:null,boss});
    if(!this.locked){
      if(this.zoneIndex<this.bossZone&&this.bob.x>=this.def.zones[this.zoneIndex].at)this.enterZone();
      else if(this.zoneIndex===this.bossZone&&this.bob.x>=this.def.boss.at)this.startBoss();
    }
    if(this.bob.dashTime>0)for(const e of this.enemies)if(e.alive&&Math.abs(e.x-this.bob.x)<85&&Math.abs(e.y-this.bob.y)<GUN.band&&e.breakShield?.())this.banner(STORY.shield);
    const auto=this.save.autoFire && this.enemies.some(e=>e.alive&&(e.x-this.bob.x)*this.bob.facing>0&&Math.abs(e.y-this.bob.y)<GUN.band);
    const fired=fireGun(this.gun,dt,input.fire||auto,this.bob,this.enemies,this.difficulty.damage);
    if(fired){
      this.stats.shots++;
      this.emit('fire',{x:this.bob.x+this.bob.facing*58,y:this.bob.y-this.bob.z-150,dir:this.bob.facing||1});
      if(fired.bonk)this.hit(fired.bonk,fired.damage,this.bob.facing,true);else this.projectiles.push(fired.shot);
    }
    for(const p of this.projectiles)stepShot(p,dt,this.enemies,(...args)=>this.hit(...args),this.camX);
    keep(this.projectiles, p => p.alive);
    this.tickPending(dt);
    const stepping=this._stepEnemies||(this._stepEnemies=[]);
    stepping.length=0;
    for(let i=0;i<this.enemies.length;i++)stepping.push(this.enemies[i]);
    for(let i=0;i<stepping.length;i++)stepping[i].update(dt,this);
    for(const p of this.hostile){const oldX=p.x;p.x+=p.dir*p.speed*this.difficulty.pace*dt;
      if(this.bob.x>=Math.min(oldX,p.x)-30&&this.bob.x<=Math.max(oldX,p.x)+30&&Math.abs(this.bob.y-p.y)<25&&this.bob.z<65){this.hurtBob(false, null, p.dir);p.alive=false;}
      if(p.x<this.camX-100||p.x>this.camX+1380)p.alive=false;
    }
    keep(this.hostile, p => p.alive);
    for(const p of this.pickups)if(Math.abs(p.x-this.bob.x)<55&&Math.abs(p.y-this.bob.y)<48){
      const before=this.papi.charges;
      const collected=collectShake(this.papi.shakeRemainder,this.papi.charges,this.bob.hp,false);
      this.papi.charges=collected.charges;this.papi.shakeRemainder=collected.shakeRemainder;p.gone=true;this.emit('pickup');
      if(this.stageNo===1&&this.papi.charges>before&&!this.papiHintShown){this.papiHintShown=true;this.banner('PAPI READY! 3 SHAKES = 1 CHARGE. SAVE IT FOR A CROWD.');}
    }
    keep(this.pickups, p => !p.gone);
    if(this.wingmen){const before=this.wingmen.phase;this.wingmen.update(dt,this);if(before!==this.wingmen.phase)this.stats.phases.push(`3:${this.wingmen.phase}`);}
    if(this.bossActive){
      if(this.wingmen?.complete || (!this.wingmen&&!this.enemies.some(e=>e.boss&&e.alive)))this.finishStage();
    } else if(this.locked&&!this.enemies.some(e=>e.alive)&&!this.pending.length){
      const zone=this.def.zones[this.zoneIndex];this.waveIndex++;
      if(this.waveIndex<zone.waves.length)this.spawnWave();
      else{this.locked=false;this.zoneIndex++;this.waveIndex=0;this.checkpoint={zone:this.zoneIndex,x:zone.r-150,phase:1};this.healZoneClear();this.banner(STORY.checkpoint);this.emit('go',{plate:plateKeyForCam(this.def.zones[this.zoneIndex]?.l??this.def.boss.l,this.def)});updateCamera(this,0,{bobX:this.bob.x,facing:this.bob.facing,locked:false});}
    }
  }
}
