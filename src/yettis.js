import { actorId } from './actor-id.js';
import { LANE_TOP, LANE_BOT, clamp } from './config.js';
export const TYPES = Object.freeze({
  walker: { hp: 24, speed: 100, art: 'yetti_walker', tint: 0xffffff },
  guard: { hp: 48, speed: 65, art: 'yetti_guard', tint: 0xffe1a0 },
  hover: { hp: 36, speed: 115, art: 'yetti_hover', tint: 0xc3dbff },
  charger: { hp: 48, speed: 100, art: 'yetti_charger', tint: 0xffa6aa },
  choir: { hp: 36, speed: 0, art: 'yetti_choir', tint: 0xd6b0ff },
  lecturer: { hp: 48, speed: 95, art: 'yetti_lecturer', tint: 0x9bedd9 },
  interventionist: { hp: 216, speed: 95, art: 'interventionist', tint: 0xffffff, boss: true },
  choirmaster: { hp: 216, speed: 0, art: 'choirmaster', tint: 0xffffff, boss: true },
});
export function choirMultiplier(e, enemies) {
  return enemies.some(a => a !== e && a.alive && ['choir','choirmaster'].includes(a.type) && Math.hypot(a.x-e.x,a.y-e.y) <= 300) ? 1.28 : 1;
}
export class Yetti {
  constructor(type, x, y) {
    const t = TYPES[type]; if (!t) throw new Error(`Unknown Yetti: ${type}`);
    Object.assign(this, { id: actorId(), type, x, y, z: type === 'hover' ? 65 : 0, hp: t.hp, maxHp: t.hp,
      alive: true, boss: !!t.boss, phase: t.boss ? 1 : 0, facing: -1, state: 'approach', clock: 0, cooldown: 1,
      stun: 0, shield: type === 'guard', timer: 0, rushDir: -1, attackY: y, attackX: x, volley: 0 });
  }
  get canBeHit() { return this.alive && this.state !== 'split'; }
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
    if (this.hp === 0 && this.boss && this.phase === 1) { this.phase = 2; this.hp = this.maxHp; return { accepted: true, phase: 2 }; }
    if (this.hp === 0) { this.alive = false; this.state = 'dead'; }
    else if (!this.boss) { this.state = 'hurt'; this.stun = bonk ? .4 : .14; this.x += dir * (bonk ? 65 : 12); }
    return { accepted: true, killed: !this.alive };
  }
  breakShield() { if (!this.shield) return false; this.shield = false; this.shieldHits = 0; this.state = 'hurt'; this.stun = .5; return true; }
  update(dt, world) {
    if (!this.alive) return;
    const b = world.bob, pace = world.difficulty.pace, buff = choirMultiplier(this, world.enemies);
    this.clock += dt; this.cooldown -= dt * buff;
    if (this.type === 'hover') this.z = 65 + Math.sin(this.clock * 3) * 10;
    if (this.stun > 0) { this.stun -= dt; if (this.stun <= 0) this.state = 'approach'; return; }
    if (this.state === 'hold') { if (b.grabbedBy !== this) { this.state = 'approach'; this.cooldown = 2; } return; }
    if (this.state === 'telegraph') {
      this.timer -= dt;
      if (this.timer <= 0) {
        if (this.type === 'charger') {
          this.state = 'rush';
          // Rush through Bob's telegraphed spot (plus overshoot) so the jump/step lesson is real.
          this.timer = clamp((Math.abs(this.attackX - this.x) + 140) / (430 * pace), .65, 1.2);
        }
        else {
          let slammed = false;
          if (['guard','hover'].includes(this.type)) world.snowball(this.x, this.attackY, this.rushDir);
          else if (['choir','choirmaster'].includes(this.type)) {
            const bands = this.type === 'choirmaster' ? [0,1,2].filter(i => i !== this.volley++ % 3) : [Math.round((this.attackY-LANE_TOP)/59)];
            for (const band of bands) world.snowball(this.x, LANE_TOP + band*59, this.rushDir, 'halo');
            if (this.type === 'choirmaster') world.summonWalkers();
          } else if (Math.abs(b.x-this.x) < 95 && Math.abs(b.y-this.attackY) < 35 && b.z < 65) {
            if (['lecturer','interventionist'].includes(this.type) && b.grab(this)) { this.state = 'hold'; world.emit('voice','lecturer_intervention'); return; }
            world.hurtBob();
          } else if (this.type === 'interventionist' && this.phase >= 2) {
            world.snowball(this.x, this.attackY, this.rushDir, 'shockwave'); slammed = true;
          }
          this.state = slammed ? 'slam' : 'recover';
          this.timer = (slammed ? .45 : .6) * world.difficulty.recovery;
          this.cooldown = ((this.type === 'interventionist' && this.phase >= 2) ? 1.1 : 1.3) / pace;
        }
      }
      return;
    }
    if (this.state === 'rush') {
      this.x += this.rushDir * 430 * pace * dt; this.timer -= dt;
      if (Math.abs(b.x-this.x)<70 && Math.abs(b.y-this.y)<34 && b.z<70) world.hurtBob(true);
      this.x = clamp(this.x, world.bounds.l+55, world.bounds.r-55);
      if (this.timer <= 0) { this.state = 'recover'; this.timer = 1.1 * world.difficulty.recovery; this.cooldown = 2; }
      return;
    }
    if (this.state === 'recover' || this.state === 'slam') { this.timer -= dt; if (this.timer <= 0) this.state = 'approach'; return; }
    const dx = b.x-this.x, dy=b.y-this.y; this.facing = Math.sign(dx) || this.facing;
    const ranged = ['guard','hover','choir','choirmaster'].includes(this.type), reach = ranged ? 580 : this.type === 'charger' ? 430 : 85;
    if (Math.abs(dx)<reach && Math.abs(dy)< (ranged ? 110 : 30) && this.cooldown<=0) {
      this.state='telegraph'; this.timer=(this.type==='charger' ? .72 : this.type==='interventionist' && this.phase>=2 ? .58 : .65) / pace;
      this.attackX=b.x; this.attackY=this.y; this.rushDir=this.facing; return;
    }
    const pref=ranged?330:65, speed=TYPES[this.type].speed*pace*buff*(this.type==='interventionist'&&this.phase>=2?1.3:1);
    const oldX=this.x;
    if (Math.abs(dx)>pref) this.x += Math.sign(dx)*speed*dt;
    this.y = clamp(this.y+clamp(dy,-speed*.6*dt,speed*.6*dt),LANE_TOP,LANE_BOT);
    this.x = clamp(this.x,world.bounds.l+55,world.bounds.r-55);
    this.state = Math.abs(this.x-oldX)>.01 ? 'approach' : 'wait';
  }
}
