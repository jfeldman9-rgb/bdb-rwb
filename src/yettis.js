import { actorId } from './actor-id.js';
import { LANE_TOP, LANE_BOT, clamp } from './config.js';
export const TYPES = Object.freeze({
  walker: { hp: 24, speed: 100, art: 'yetti_walker', tint: 0xffffff },
  guard: { hp: 48, speed: 65, art: 'yetti_guard', tint: 0xffe1a0 },
  hover: { hp: 36, speed: 115, art: 'yetti_hover', tint: 0xc3dbff },
  charger: { hp: 48, speed: 100, art: 'yetti_charger', tint: 0xffa6aa },
  choir: { hp: 36, speed: 0, art: 'yetti_choir', tint: 0xd6b0ff },
  lecturer: { hp: 48, speed: 95, art: 'yetti_lecturer', tint: 0x9bedd9 },
  interventionist: { hp: 1200, speed: 95, art: 'interventionist', tint: 0xffffff, boss: true },
  choirmaster: { hp: 1140, speed: 0, art: 'choirmaster', tint: 0xffffff, boss: true },
});
/** RWB boss gates: one long bar, phase 2 under 66%, phase 3 under 33%. */
export const BOSS_GATES = Object.freeze([1, .66, .33]);
export const bossPhaseFor = (hp, maxHp) => hp > maxHp * BOSS_GATES[1] ? 1 : hp > maxHp * BOSS_GATES[2] ? 2 : 3;
/** Top of a phase's slice of the bar (respawn into a reached phase). */
export const bossPhaseHp = (maxHp, phase) => Math.floor(maxHp * BOSS_GATES[clamp(phase, 1, 3) - 1]);
/** Adds a mini-boss calls in per phase (topped up to this list's length). */
export const BOSS_ADDS = Object.freeze({
  interventionist: Object.freeze([[], ['lecturer', 'walker'], ['charger', 'lecturer', 'walker']]),
  choirmaster: Object.freeze([['walker', 'walker'], ['walker', 'hover', 'walker'], ['charger', 'hover', 'guard']]),
});
const BOSS_COOL = Object.freeze({ interventionist: [1.3, 1.1, .9], choirmaster: [1.5, 1.2, .95] });
const ROAR = 1.1;
/** Flinch window: a held eggplant stream staggers a Yetti at most this often, so packs still close in. Bonks always stagger. */
export const POISE = Object.freeze({ light: .45, heavy: .9 });
const HEAVY = ['guard', 'charger', 'lecturer'];
export function choirMultiplier(e, enemies) {
  return enemies.some(a => a !== e && a.alive && ['choir','choirmaster'].includes(a.type) && Math.hypot(a.x-e.x,a.y-e.y) <= 300) ? 1.28 : 1;
}
export class Yetti {
  constructor(type, x, y, hpScale = 1) {
    const t = TYPES[type]; if (!t) throw new Error(`Unknown Yetti: ${type}`);
    const hp = Math.round(t.hp * (t.boss ? 1 : hpScale));
    Object.assign(this, { id: actorId(), type, x, y, z: type === 'hover' ? 65 : 0, hp, maxHp: hp, mode: null, rushCool: 3,
      alive: true, boss: !!t.boss, phase: t.boss ? 1 : 0, facing: -1, state: 'approach', clock: 0, cooldown: 1,
      stun: 0, shield: type === 'guard', timer: 0, poise: 0, rushDir: -1, attackY: y, attackX: x, volley: 0 });
  }
  get canBeHit() { return this.alive && this.state !== 'split' && this.state !== 'roar'; }
  takeHit(damage, dir, bonk = false) {
    if (!this.canBeHit) return { accepted: false };
    // Front shield blocks, but three eggplants shatter it so a phone player is never soft-locked.
    if (this.shield && dir === -this.facing) {
      this.shieldHits = (this.shieldHits || 0) + 1;
      if (this.shieldHits >= 3) {
        this.breakShield();
        return { accepted: false, blocked: true, shieldBroke: true };
      }
      return { accepted: false, blocked: true };
    }
    this.hp = Math.max(0, this.hp - damage);
    if (this.boss && this.hp > 0) {
      const phase = bossPhaseFor(this.hp, this.maxHp);
      // Crossing a gate: roar (untouchable beat, like RWB's Chieftain) and escalate.
      if (phase > this.phase) { this.phase = phase; this.state = 'roar'; this.timer = ROAR; this.mode = null; return { accepted: true, phase }; }
    }
    if (this.hp === 0) { this.alive = false; this.state = 'dead'; }
    else if (!this.boss && (bonk || this.poise <= 0)) {
      this.state = 'hurt'; this.stun = bonk ? .4 : .14; this.x += dir * (bonk ? 65 : 12);
      this.poise = HEAVY.includes(this.type) ? POISE.heavy : POISE.light;
    }
    return { accepted: true, killed: !this.alive };
  }
  breakShield() { if (!this.shield) return false; this.shield = false; this.shieldHits = 0; this.state = 'hurt'; this.stun = .5; return true; }
  update(dt, world) {
    if (!this.alive) return;
    const b = world.bob, pace = world.difficulty.pace, buff = choirMultiplier(this, world.enemies);
    this.clock += dt; this.cooldown -= dt * buff; this.poise -= dt;
    if (this.type === 'hover') this.z = 65 + Math.sin(this.clock * 3) * 10;
    if (this.stun > 0) { this.stun -= dt; if (this.stun <= 0) this.state = 'approach'; return; }
    // Phase II+ mini-bosses keep calling minions in while the arena thins out.
    if (this.boss && this.phase >= 2 && this.state !== 'roar' && (this.addTimer = (this.addTimer ?? 9) - dt) <= 0) {
      this.addTimer = 9; world.summonAdds?.(BOSS_ADDS[this.type]?.[this.phase - 1]);
    }
    if (this.state === 'roar') {
      this.timer -= dt;
      if (this.timer <= 0) { this.state = 'approach'; this.cooldown = .5; world.summonAdds?.(BOSS_ADDS[this.type]?.[this.phase - 1]); }
      return;
    }
    if (this.state === 'hold') { if (b.grabbedBy !== this) { this.state = 'approach'; this.cooldown = 2; } return; }
    if (this.state === 'telegraph') {
      this.timer -= dt;
      if (this.timer <= 0) {
        if (this.type === 'charger' || this.mode === 'rush') {
          this.state = 'rush'; this.mode = null;
          // Rush through Bob's telegraphed spot (plus overshoot) so the jump/step lesson is real.
          this.timer = clamp((Math.abs(this.attackX - this.x) + 140) / (430 * pace), .65, 1.2);
        }
        else {
          let slammed = false;
          if (['guard','hover'].includes(this.type)) world.snowball(this.x, this.attackY, this.rushDir);
          else if (['choir','choirmaster'].includes(this.type)) {
            const bands = this.type === 'choirmaster' ? [0,1,2].filter(i => i !== this.volley++ % 3) : [Math.round((this.attackY-LANE_TOP)/59)];
            for (const band of bands) world.snowball(this.x, LANE_TOP + band*59, this.rushDir, 'halo');
            if (this.type === 'choirmaster') world.summonAdds?.(BOSS_ADDS.choirmaster[this.phase - 1]);
          } else if (Math.abs(b.x-this.x) < 95 && Math.abs(b.y-this.attackY) < 35 && b.z < 65) {
            if (['lecturer','interventionist'].includes(this.type) && b.grab(this)) { this.state = 'hold'; world.emit('voice','lecturer_intervention'); return; }
            world.hurtBob();
          } else if (this.type === 'interventionist' && this.phase >= 2) {
            // Phase III slams both ways, so backing off behind him is no longer safe.
            for (const dir of this.phase >= 3 ? [this.rushDir, -this.rushDir] : [this.rushDir]) world.snowball(this.x, this.attackY, dir, 'shockwave');
            slammed = true;
          }
          this.state = slammed ? 'slam' : 'recover';
          this.timer = (slammed ? .45 : .6) * world.difficulty.recovery;
          this.cooldown = (BOSS_COOL[this.type]?.[this.phase - 1] ?? 1.3) / pace;
        }
      }
      return;
    }
    if (this.state === 'rush') {
      this.x += this.rushDir * 430 * pace * dt; this.timer -= dt;
      if (Math.abs(b.x-this.x)<70 && Math.abs(b.y-this.y)<34 && b.z<70) world.hurtBob(true);
      this.x = clamp(this.x, world.bounds.l+55, world.bounds.r-55);
      if (this.timer <= 0) { this.state = 'recover'; this.timer = 1.1 * world.difficulty.recovery; this.cooldown = this.boss ? 1 : 2; }
      return;
    }
    if (this.state === 'recover' || this.state === 'slam') { this.timer -= dt; if (this.timer <= 0) this.state = 'approach'; return; }
    const dx = b.x-this.x, dy=b.y-this.y; this.facing = Math.sign(dx) || this.facing;
    const ranged = ['guard','hover','choir','choirmaster'].includes(this.type), reach = ranged ? 580 : this.type === 'charger' ? 430 : 85;
    const boss = this.type === 'interventionist' ? this.phase : 0;
    this.rushCool -= dt;
    // Phase III Interventionist charges across the arena when Bob keeps his distance (Chieftain charge).
    if (boss >= 3 && this.rushCool <= 0 && Math.abs(dx) > 300 && Math.abs(dx) < 900 && Math.abs(dy) < 40 && this.cooldown <= 0) {
      this.state='telegraph'; this.mode='rush'; this.timer=.8/pace; this.rushCool=5;
      this.attackX=b.x; this.attackY=this.y; this.rushDir=this.facing; return;
    }
    if (Math.abs(dx)<reach && Math.abs(dy)< (ranged ? 110 : 30) && this.cooldown<=0) {
      this.state='telegraph'; this.timer=(this.type==='charger' ? .72 : boss>=3 ? .5 : boss===2 ? .58 : .65) / pace;
      this.attackX=b.x; this.attackY=this.y; this.rushDir=this.facing; return;
    }
    const pref=ranged?330:65, speed=TYPES[this.type].speed*pace*buff*(boss>=3?1.45:boss===2?1.3:1);
    const oldX=this.x;
    if (Math.abs(dx)>pref) this.x += Math.sign(dx)*speed*dt;
    this.y = clamp(this.y+clamp(dy,-speed*.6*dt,speed*.6*dt),LANE_TOP,LANE_BOT);
    this.x = clamp(this.x,world.bounds.l+55,world.bounds.r-55);
    this.state = Math.abs(this.x-oldX)>.01 ? 'approach' : 'wait';
  }
}
