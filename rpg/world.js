import { STAGES, STAGE_VARIANTS, maxStage } from '../src/stages.js';
import { STORY } from '../src/story.js';

export const SAVE_KEY = 'bdb-rpg-3d-v1';
export const MAP = { x: 24, z: 31 };
const regions = [
  ['Boulevard', 'Lantern Court', 'Palm Terrace', 'Boulevard Gate', '#433546', '#c49f89', '#ffa754'],
  ['Celestial', 'Cloud Gallery', 'Choir Garden', 'Heavenly Arch', '#8498ac', '#d6d8c9', '#ffda7a'],
  ['Moonlit Keep', 'Moon Court', 'West Rampart', 'Keep Entrance', '#313d58', '#84859b', '#90baff'],
  ['Afterparty', 'Velvet Lounge', 'Dance Terrace', 'The Velvet Rope', '#49203d', '#987888', '#ff5ca2'],
  ['Gondola', 'Cable Station', 'Lookout Plaza', 'Upper Terminal', '#503c48', '#ba957c', '#f38e51'],
  ['Salt Mine', 'Crystal Grotto', 'Salt Gallery', 'Mine Shaft', '#324556', '#7d94a0', '#62e3dc'],
  ['Tribunal', 'Witness Court', 'Verdict Hall', 'Tribunal Steps', '#50345b', '#af90a4', '#ffcc65'],
];
const positions = [
  [-14,7, 14,-8], [-15,-7, 13,9], [-13,3, 15,-12], [-15,10, 12,-6],
  [-14,-11, 15,6], [-15,5, 12,-13], [-13,-8, 15,9],
];
export const chapters = regions.map(([short, west, east, gate, sky, stone, glow], i) => {
  const [ax, az, bx, bz] = positions[i];
  const stage = STAGES[i+1];
  const enemies = [...new Set([...(STAGE_VARIANTS[i+1] || []), ...stage.zones.flatMap(z => z.waves[0].map(w => w[0]))])];
  return { ...stage, short, sky, stone, glow, enemies, poster:`assets/cutscenes/stage${i+1}_intro.jpg`,
    seals:[{name:west,x:ax,z:az},{name:east,x:bx,z:bz}], shrine:{x:i%2 ? -19 : 19,z:21,name:'Papacito shrine'},
    gate:{x:0,z:-23,name:gate}, intro:[`stage${i+1}`, ...([2,4].includes(i+1)?['kidnap']:[])],
    clearText:i===6?STORY.finalVictory:i===5?STORY.shaft:i===2?STORY.victory:'Chapter cleared' };
});

const bounded = (n, min, max) => Math.min(max, Math.max(min,n));
const integer = (v, fallback, max) => Number.isInteger(v) && v >= 0 ? Math.min(v,max) : fallback;
export function normalizeSave(raw={}) {
  raw = raw || {};
  const unlocked = Math.max(1,integer(raw.unlocked,1,maxStage));
  return { unlocked, complete:raw.complete === true && unlocked===maxStage, chapter:Math.max(1,integer(raw.chapter,unlocked,unlocked)),
    xp:integer(raw.xp,0,99999), seals:Array.isArray(raw.seals)?[...new Set(raw.seals.filter(i=>i===0||i===1))]:[], shrine:raw.shrine===true, lastShrine:raw.lastShrine===true, started:raw.started===true };
}
export function readSave(storage) {
  try { return normalizeSave(JSON.parse(storage.getItem(SAVE_KEY))); } catch { return normalizeSave(); }
}
export function writeSave(storage,save) {
  try { storage.setItem(SAVE_KEY,JSON.stringify(save)); return true; } catch { return false; }
}
export function movement(x=0,z=0) {
  const scale=Math.max(1,Math.hypot(x,z)); return {x:x/scale,z:z/scale};
}
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function nearestTarget(bob, enemies, range=11) {
  let target=null;
  for (const e of enemies) {
    const d=distance(bob,e);
    if(e.hp>0 && d<=range){target=e;range=d;}
  }
  return target;
}
export const rank=xp=>1+Math.min(14,Math.floor(xp/55));
export const vitality=xp=>90+rank(xp)*8;
export const fountain={x:0,z:1,r:3.4};
function moveActor(actor,dir,speed,dt){
  actor.x=bounded(actor.x+dir.x*speed*dt,-MAP.x,MAP.x);
  actor.z=bounded(actor.z+dir.z*speed*dt,-MAP.z,MAP.z);
  const d=distance(actor,fountain);
  if(d<fountain.r){const a=Math.atan2(actor.z-fountain.z,actor.x-fountain.x);actor.x=fountain.x+Math.cos(a)*fountain.r;actor.z=fountain.z+Math.sin(a)*fountain.r;}
}

export class Adventure {
  constructor(chapter,save){
    this.save=normalizeSave(save);
    const n=bounded(integer(chapter,1,maxStage),1,this.save.unlocked);
    this.def=chapters[n-1];
    if(n!==this.save.chapter) Object.assign(this.save,{chapter:n,seals:[],shrine:false});
    this.save.started=true;
    this.bob={x:0,z:24,hp:vitality(this.save.xp),face:1,moving:false};
    this.sites=this.def.seals.map((s,i)=>({...s,clear:this.save.seals.includes(i)}));
    this.shrine={...this.def.shrine,clear:this.save.shrine};
    this.gate={...this.def.gate};
    this.checkpoint=this.shrine.clear && this.save.lastShrine ? this.shrine : this.save.seals.length ? this.sites[this.save.seals[this.save.seals.length-1]] : {...this.bob};
    this.bob.x=this.checkpoint.x;this.bob.z=this.checkpoint.z;
    this.enemies=[];this.shots=[];this.warnings=[];this.events=[];this.serial=0;this.time=0;this.fireAt=0;this.openingBark=false;
    this.encounter=null;this.bossDown=false;this.finished=false;this.papiAt=0;this.dadAt=0;this.invulnerable=0;this.effect=null;
  }
  emit(type,value){this.events.push({type,value});}
  voice(id){this.emit('voice',id);}
  get gateOpen(){return this.sites.every(s=>s.clear);}
  get needsFinisher(){return this.encounter===this.gate && [3,7].includes(this.def.no);}
  get finisherReady(){return this.needsFinisher && this.enemies.length>0 && this.enemies.every(e=>e.hp<=1);}
  get objective(){
    if(this.finisherReady)return 'Use Papacito to finish the rescue';
    if(this.bossDown)return this.def.no===7?'Reach Claudia at the tribunal':'Enter '+this.gate.name;
    if(this.encounter===this.gate)return 'Defeat '+this.def.boss.name.toLowerCase();
    if(this.encounter)return 'Defeat the Yetti guard';
    if(this.gateOpen)return 'Reach '+this.gate.name;
    return `Break the two halo seals · ${this.sites.filter(s=>s.clear).length}/2`;
  }
  startFight(site){
    this.encounter=site;
    const boss=site===this.gate, n=this.def.no;
    const count=boss?(n===3?2:1):2+(n>=4?1:0);
    for(let i=0;i<count;i++){
      const role=this.def.enemies[(i+Math.max(0,this.sites.indexOf(site)))%this.def.enemies.length];
      const hp=boss?40+7*n:10+n*2+(role==='guard'?4:0);
      this.enemies.push({id:++this.serial,kind:boss?this.def.boss.type:'yetti_'+role,boss,
        x:site.x+(i-(count-1)/2)*3,z:site.z-1.7,hp,maxHp:hp,face:1,nextHit:this.time+1,
        castAt:this.time+1.8+i*.8,hitAt:-10});
    }
    if(boss){
      this.emit('boss',this.def.no===3?'rescue_pre_boss':null);
      this.voice(n===3?'wingman_council':this.def.boss.type+'_intro');
    }else{
      this.voice(this.sites.indexOf(site)===0?'yetti_turnback':['yetti_porkchop_01','yetti_colombian_room_01','yetti_purple_car_01'][(n-1)%3]);
      this.emit('notice',site.name);
    }
  }
  damage(enemy, amount){
    const floor=enemy.boss && this.needsFinisher?1:0;
    enemy.hp=Math.max(floor,enemy.hp-amount);enemy.hitAt=this.time;
    if(this.finisherReady&&!this.finisherAnnounced){
      this.finisherAnnounced=true;this.papiAt=this.time;this.emit('notice',STORY.finisher);
    }
  }
  attack(power){
    if(this.finished||!this.encounter||!this.enemies.length)return false;
    if(power!=='dad' && power!=='papi')return false;
    const timer=power+'At';
    if(this.time<this[timer])return false;
    const finisher=power==='papi' && this.finisherReady;
    this[timer]=this.time+(power==='dad'?38:19);
    this.effect={kind:power,t:this.time, x:this.bob.x,z:this.bob.z};
    this.emit('power',power);
    for(const e of this.enemies){
      if(finisher)e.hp=0;
      else if(distance(e,this.bob)<18)this.damage(e,power==='dad'?28:20);
    }
    return true;
  }
  hurt(amount){
    if(this.invulnerable>this.time)return;
    this.bob.hp=Math.max(0,this.bob.hp-amount);this.invulnerable=this.time+.85;this.emit('hurt');
  }
  respawn(){
    this.bob.x=this.checkpoint.x;this.bob.z=this.checkpoint.z;this.bob.hp=vitality(this.save.xp);this.effect=null;this.target=null;
    this.enemies=[];this.shots=[];this.warnings=[];this.encounter=null;this.finisherAnnounced=false;this.papiAt=this.dadAt=this.time;this.invulnerable=this.time+2;
    this.voice('bob_respawn_01');this.emit('notice',STORY.checkpoint);
  }
  reward(xp){
    const old=rank(this.save.xp);this.save.xp+=xp;
    this.bob.hp=Math.min(vitality(this.save.xp),this.bob.hp+25);
    if(rank(this.save.xp)>old)this.emit('notice','Level '+rank(this.save.xp)+' · Vitality and damage increased');
  }
  step(dt,input={}){
    if(this.finished || !(dt>0))return;
    dt=Math.min(dt,.05);this.time+=dt;
    const b=this.bob, dir=movement(input.x,input.z);
    b.moving=Math.hypot(dir.x,dir.z)>.02;
    if(b.moving){moveActor(b,dir,8.2,dt);if(Math.abs(dir.x)>.1)b.face=Math.sign(dir.x);}
    if(!this.shrine.clear && distance(b,this.shrine)<2.6){
      this.shrine.clear=this.save.shrine=this.save.lastShrine=true;this.checkpoint=this.shrine;
      this.reward(24);b.hp=vitality(this.save.xp);this.papiAt=this.dadAt=this.time;
      this.emit('notice','Shrine found · Powers restored');this.emit('save');this.emit('chime');
    }
    if(!this.openingBark && this.time>4 && !this.encounter){
      this.openingBark=true;this.voice((['bdb_open','bob_where_claudia_01','claudia_question','claudia_s4','claudia_s5','claudia_s6','bob_s7'])[this.def.no-1]);
    }
    if(!this.encounter){
      const site=this.sites.find(s=>!s.clear && distance(b,s)<8.5);
      if(site)this.startFight(site);
      else if(this.gateOpen && distance(b,this.gate)<8.5 && !this.bossDown)this.startFight(this.gate);
      else if(this.bossDown && distance(b,this.gate)<2.8){
        this.finished=true;const next=this.def.next;
        this.save.unlocked=Math.max(this.save.unlocked,next||maxStage);
        this.save.chapter=next||maxStage;this.save.seals=[];this.save.shrine=false;
        if(!next)this.save.complete=true;
        this.emit('save');this.emit('complete',this.def.no);return;
      }
    }
    const target=nearestTarget(b,this.enemies.filter(e=>!this.needsFinisher||e.hp>1));
    this.target=target;
    if(target && this.time>=this.fireAt){
      this.fireAt=this.time+.46;b.face=target.x>=b.x?1:-1;b.lastShot=this.time;
      this.shots.push({id:++this.serial,x:b.x,z:b.z,target,life:.9});this.emit('fire');
    }
    for(const s of this.shots){
      s.life-=dt;if(s.target.hp<=0){s.life=0;continue;}
      const d=distance(s,s.target),step=dt*29;
      if(d<=step+.45){this.damage(s.target,3+rank(this.save.xp));s.life=0;this.emit('hit');}
      else {s.x+=(s.target.x-s.x)*step/d;s.z+=(s.target.z-s.z)*step/d;}
    }
    this.shots=this.shots.filter(s=>s.life>0);
    for(const e of this.enemies){
      if(e.hp<=0 || (this.needsFinisher && e.hp===1))continue;
      const d=distance(e,b);e.face=b.x>=e.x?1:-1;
      if(d>1.65)moveActor(e,movement((b.x-e.x)/d,(b.z-e.z)/d),e.boss?2.25:2.7,dt);
      else if(this.time>e.nextHit){this.hurt(e.boss?12:7);e.nextHit=this.time+1.55;}
      if((e.boss||/hover|choir|tagger/.test(e.kind)) && this.time>=e.castAt){
        e.castAt=this.time+(e.boss?3.7:5);
        const zones=[{x:b.x,z:b.z}];
        if(e.boss && ['dj','choirmaster','archyetti'].includes(e.kind)){
          zones.push({x:b.x-4,z:b.z-2},{x:b.x+4,z:b.z-2});
        }
        for(const zone of zones)this.warnings.push({...zone,id:++this.serial,r:e.boss?3.8:2.2,at:this.time+1.2,boss:e.boss});
      }
    }
    for(const w of this.warnings)if(this.time>=w.at && distance(b,w)<w.r)this.hurt(w.boss?19:9);
    this.warnings=this.warnings.filter(w=>w.at>this.time);
    if(!b.hp){this.respawn();return;}
    this.enemies=this.enemies.filter(e=>e.hp>0);
    if(this.encounter&&!this.enemies.length){
      const site=this.encounter;this.encounter=null;this.warnings=[];
      if(site===this.gate){this.bossDown=true;this.reward(35);this.emit('notice','Gate open');this.voice(({3:'wingman_defeat',4:'bouncer_defeat',5:'dj_defeat',6:'celestina_defeat',7:'archyetti_defeat'})[this.def.no]||'bdb_laugh');}
      else{
        site.clear=true;this.save.lastShrine=false;this.save.seals.push(this.sites.indexOf(site));this.checkpoint=site;
        this.emit('notice',this.gateOpen?'Halo seals broken · Gate open':'Halo seal broken');
        this.reward(26);this.emit('save');
      }
      this.emit('chime');
    }
  }
}
