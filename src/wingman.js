// Packet rules.ts: bodies unchanged; TypeScript annotations removed.
export function applyBossDamage(phase, hp, amount) {
  const safeHp = Math.max(0, Number.isFinite(hp) ? hp : 0);
  const safeAmount = Math.max(0, Number.isFinite(amount) ? amount : 0);
  const floor = phase === 3 ? 1 : 0;
  const nextHp = Math.max(floor, safeHp - safeAmount);
  return { hp: nextHp, removed: Math.max(0, safeHp - nextHp) };
}

export function isBossFinisherReady(
  phase,
  bosses,
) {
  if (phase !== 3) return false;
  let live = 0;
  for (let i = 0; i < bosses.length; i++) {
    const boss = bosses[i];
    if (!boss?.alive) continue;
    if (boss.hp > 1) return false;
    live++;
  }
  return live >= 1;
}

/** Phase-3 floor is a soak so eggplants pass through. Split and roar still brag. */
export function isBossBragging(e) {
  if (!e?.boss || e.canBeHit !== false) return false;
  if (e.type === 'wingman' && e.phase === 3 && e.hp <= 1 && e.state !== 'split' && e.state !== 'roar') return false;
  return true;
}


import { actorId } from './actor-id.js';
import { choirMultiplier, laneY } from './yettis.js';
/** Per-Wingman HP by phase (phase III is the pair that the Papacito finisher ends). */
export const WINGMAN_HP = Object.freeze({ 1: 360, 2: 360, 3: 200 });
/** Minions the council calls in when a phase opens. */
export const WINGMAN_ADDS = Object.freeze({ 2: ['guard', 'hover'], 3: ['guard', 'lecturer'] });
export class Wingman {
  constructor(x, y, phase = 1, role = 1) {
    Object.assign(this, { id: actorId(), type: 'wingman', boss: true, x, y, z: 70, phase, role,
      hp: WINGMAN_HP[phase], maxHp: WINGMAN_HP[phase], alive: true,
      facing: -1, state: 'hover', timer: 1.5, attackX: x, attackY: y, volley: 0 });
  }
  get canBeHit() {
    // Phase III floors at 1 HP until Papacito. A floored Wingman that still
    // soaks eggplants hides the partner, and at a 30 Hz step the bot never
    // gets both of them to the finisher.
    return this.alive && this.state !== 'split' && !(this.phase === 3 && this.hp <= 1);
  }
  takeHit(amount) {
    if (!this.canBeHit) return { accepted: false };
    const result = applyBossDamage(this.phase, this.hp, amount); this.hp = result.hp;
    return { accepted: result.removed > 0, phaseEnd: this.hp === 0 };
  }
  update(dt, world) {
    if (!this.alive) return;
    this.choirBuff = choirMultiplier(this, world.enemies);
    this.timer -= dt; this.facing = Math.sign(world.bob.x-this.x) || -1;
    if (this.state === 'split') { if (this.timer <= 0) { this.state = 'hover'; this.timer = 1; } return; }
    if (this.timer > 0) return;
    if (this.state === 'hover') {
      this.state = 'telegraph'; this.timer = .7;
      this.attackX = world.bob.x; this.attackY = world.bob.y;
      this.safeBand = this.volley++ % 3;
    } else if (this.state === 'telegraph') {
      if (this.phase === 2) {
        this.x = this.attackX; this.y = this.attackY; this.z = 0;
        if (Math.abs(world.bob.x-this.x)<110 && Math.abs(world.bob.y-this.y)<32 && world.bob.z<90) world.hurtBob(true, this.x);
        for (const dir of [-1,1]) world.snowball(this.x,this.y,dir,'shockwave');
        world.banner('THE FLOOR LEFT THE CHAT.');
      } else for (let i=0;i<3;i++) if (i!==this.safeBand) world.snowball(this.x,laneY(i),this.facing,'halo');
      this.state = 'recover'; this.timer = 1.2 * world.difficulty.recovery;
    } else { this.state = 'hover'; this.z = 70; this.timer = 1.4 / world.difficulty.pace; }
  }
}
export class Wingmen {
  constructor() { this.phase = 1; this.softlockTime = 0; this.complete = false; }
  spawn(x, phase = 1) {
    this.phase = phase;
    return phase === 3 ? [new Wingman(x-120,595,3,1),new Wingman(x+120,670,3,2)] : [new Wingman(x,630,phase)];
  }
  update(dt, world) {
    const list = world.enemies;
    const bosses = this._live || (this._live = []);
    bosses.length = 0;
    let floored = false;
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (e.type !== 'wingman' || !e.alive) continue;
      bosses.push(e);
      if (e.hp === 0) floored = true;
    }
    if (this.phase < 3 && floored) {
      const x=world.bounds.l+890; this.phase++;
      let w = 0;
      for (let i = 0; i < list.length; i++) if (list[i].type !== 'wingman') list[w++] = list[i];
      list.length = w;
      const spawned = this.spawn(x, this.phase);
      for (let i = 0; i < spawned.length; i++) list.push(spawned[i]);
      bosses.length = 0;
      for (let i = 0; i < list.length; i++) {
        const e = list[i];
        if (e.type !== 'wingman') continue;
        e.state = 'split'; e.timer = this.phase === 3 ? 2 : 1;
        bosses.push(e);
      }
      world.banner(this.phase===2?'PHASE II: HEAVENLY HR VIOLATION':'PHASE III: TWO WINGMEN. ONE TERRIBLE PLAN.');
      world.emit('voice',this.phase===2?'wingman_phase2':'wingman_phase3');
      world.dropTrio(world.bob.x+50); world.checkpoint.phase=this.phase;
      // The new phase has new bodies. The previous phase's HP must not be applied to them.
      world.checkpoint.wingHp=undefined; world.checkpoint.wingDead=undefined;
      world.summonAdds?.(WINGMAN_ADDS[this.phase]);
    }
    const ready=isBossFinisherReady(this.phase,bosses);
    if (ready && world.papi.charges===0) {
      this.softlockTime+=dt;
      if (this.softlockTime>=8-1e-8) { world.dropTrio(world.bob.x); this.softlockTime=0; }
    } else this.softlockTime=0;
    if (ready && !this.ready) world.banner('PAPACITO FINISHER READY');
    this.ready=ready;
    let wingCount = 0, wingAlive = 0;
    for (let i = 0; i < list.length; i++) if (list[i].type === 'wingman') { wingCount++; if (list[i].alive) wingAlive++; }
    const defeated = this.phase===3 && wingCount > 0 && wingAlive === 0;
    if (defeated && !this.complete) world.emit('voice', 'wingman_defeat');
    this.complete = defeated;
  }
}
