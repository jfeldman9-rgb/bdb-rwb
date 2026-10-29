import { actorId } from './actor-id.js';
import { LANE_TOP, LANE_BOT, clamp } from './config.js';
export const TYPES = Object.freeze({
  walker: { hp: 24, speed: 100, art: 'yetti_walker', tint: 0xffffff },
  guard: { hp: 48, speed: 65, art: 'yetti_guard', tint: 0xffe1a0, shield: true, heavy: true, ranged: true },
  hover: { hp: 36, speed: 115, art: 'yetti_hover', tint: 0xffffff, ranged: true },
  charger: { hp: 48, speed: 100, art: 'yetti_charger', tint: 0xffffff, heavy: true },
  choir: { hp: 36, speed: 0, art: 'yetti_choir', tint: 0xffffff, ranged: true },
  lecturer: { hp: 48, speed: 95, art: 'yetti_lecturer', tint: 0xffffff, heavy: true, grab: true },
  interventionist: { hp: 1200, speed: 95, art: 'interventionist', tint: 0xffffff, boss: true, grab: true,
    anims: { telegraph: 'grab', hold: 'hold', roar: 'slam', slam: 'slam', default: 'walk' } },
  choirmaster: { hp: 1140, speed: 0, art: 'choirmaster', tint: 0xffffff, boss: true, ranged: true,
    anims: { roar: 'ring', default: 'sing' } },
  // Wingmen still run through their unchanged controller; only rendering reads this metadata.
  wingman: { art: 'wingman', boss: true, anims: { split: 'split', telegraph: 'telegraph', recover: 'land', default: 'hover' } },
  salsero: { hp: 24, speed: 130, art: 'yetti_salsero', tint: 0xffffff,
    lunge: { reach: 260, tell: .55, over: 60, min: .3, max: .5 }, laneHop: 1.4,
    anims: { telegraph: 'spin', rush: 'lunge', hurt: 'hurt', dead: 'knockdown', wait: 'idle', recover: 'idle', default: 'walk' } },
  bouncer: { hp: 1240, speed: 80, art: 'bouncer', tint: 0xffffff, boss: true, shield: true, grab: true,
    scriptedBossVoices: true, rushPhase: 2, stompPhase: 3, reshield: 12,
    anims: { telegraph: 'grab', hold: 'hold', rush: 'rush', slam: 'stomp', roar: 'roar', hurt: 'hurt', dead: 'down', default: 'walk' } },
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
  bouncer: Object.freeze([[], ['salsero', 'walker'], ['guard', 'salsero', 'charger']]),
});
export const BOSS_COOL = Object.freeze({ interventionist: [1.3, 1.1, .9], choirmaster: [1.5, 1.2, .95], bouncer: [1.3, 1.1, .9] });
/** Ranged roles that stack snowballs when they share a lane. Boss choirmaster counts; melee does not. */
export const RANGED_TYPES = new Set(Object.keys(TYPES).filter(type => TYPES[type].ranged));
export const MAX_RANGED_PER_LANE = 2;
export const LANE_H = 59;
export function laneOf(y) { return clamp(Math.round((y - LANE_TOP) / LANE_H), 0, 2); }
export function laneY(i) { return clamp(LANE_TOP + i * LANE_H, LANE_TOP, LANE_BOT); }
export function rangedInLane(enemies, lane, except) {
  let n = 0;
  for (const e of enemies) if (e !== except && e.alive && RANGED_TYPES.has(e.type) && laneOf(e.y) === lane) n++;
  return n;
}
export function freestLane(enemies, except) {
  let best = 0, bestN = Infinity;
  for (let i = 0; i < 3; i++) {
    const n = rangedInLane(enemies, i, except);
    if (n < bestN) { best = i; bestN = n; }
  }
  return best;
}
function laneLoad(enemies, lane, except) {
  let n = 0;
  for (const e of enemies) {
    if (e === except || !e.alive || !RANGED_TYPES.has(e.type)) continue;
    if ((e._laneGoal ?? laneOf(e.y)) === lane) n++;
  }
  return n;
}
/** Keep a ranged Yetti from being the third body in a lane. Extras slide; the first two stay. Bosses hold their lane while their adds spread around them. */
export function stepRangedLane(self, enemies, dy, speed, dt) {
  if (self.boss) return;
  const mine = laneOf(self.y);
  if (self._laneGoal === mine) self._laneGoal = null;
  if (laneLoad(enemies, mine, self) >= MAX_RANGED_PER_LANE) {
    const pile = enemies.filter(e => e.alive && RANGED_TYPES.has(e.type) && (e._laneGoal ?? laneOf(e.y)) === mine);
    // Pinned bosses keep their lane; the stay slots go to the leftmost others.
    const rest = pile.filter(e => !e.boss).sort((a, b) => a.x - b.x || (a.id > b.id ? 1 : -1));
    const pinned = pile.length - rest.length;
    if (rest.slice(0, Math.max(0, MAX_RANGED_PER_LANE - pinned)).includes(self)) return;
    let best = -1, bestN = MAX_RANGED_PER_LANE;
    for (let i = 0; i < 3; i++) {
      if (i === mine) continue;
      const n = laneLoad(enemies, i, self);
      if (n < bestN) { best = i; bestN = n; }
    }
    if (best < 0) return;
    self._laneGoal = best;
    const target = laneY(best);
    self.y = clamp(self.y + Math.sign(target - self.y) * Math.max(speed, 160) * dt, LANE_TOP, LANE_BOT);
    return;
  }
  const next = clamp(self.y + clamp(dy, -Math.abs(speed) * 0.6 * dt, Math.abs(speed) * 0.6 * dt), LANE_TOP, LANE_BOT);
  const dest = laneOf(next);
  if (dest !== mine && laneLoad(enemies, dest, self) >= MAX_RANGED_PER_LANE) return;
  self.y = next;
}
const ROAR = 1.1;
/** Flinch window: a held eggplant stream staggers a Yetti at most this often, so packs still close in. Bonks always stagger. */
export const POISE = Object.freeze({ light: .45, heavy: .9 });
export function choirMultiplier(e, enemies) {
  for (let i = 0; i < enemies.length; i++) {
    const a = enemies[i];
    if (a === e || !a.alive) continue;
    if (a.type !== 'choir' && a.type !== 'choirmaster') continue;
    if (Math.hypot(a.x - e.x, a.y - e.y) <= 300) return 1.28;
  }
  return 1;
}
/** Dashed ring and note marks for a living choir. Radius matches the buff. The multiplier stays 1.28. */
const CHOIR_AURA = Object.freeze({ r: 300, notes: 3 });
export function choirAura(e) {
  if (!e?.alive || (e.type !== 'choir' && e.type !== 'choirmaster')) return null;
  return CHOIR_AURA;
}
/** Same-lane minions closer than this overlap into one sprite. Bosses stay put. */
export const SEPARATE_GAP = 46;
const SEPARATE_PUSH = 8;
const separateScratch = [];
/** Push same-lane non-bosses apart. actorId order keeps the step deterministic. At most 8px per body per pair.
 *  Hold, telegraph, rush, stun, and down stay put so a tell or a crossing is not shoved off its mark. */
export function separateEnemies(enemies) {
  separateScratch.length = 0;
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    if (!e?.alive || e.boss) continue;
    if (e.state === 'hold' || e.state === 'telegraph' || e.state === 'rush' || e.state === 'stun' || e.state === 'down' || e.stun > 0) continue;
    separateScratch.push(e);
  }
  separateScratch.sort((a, b) => (a.id | 0) - (b.id | 0));
  for (let i = 0; i < separateScratch.length; i++) {
    for (let j = i + 1; j < separateScratch.length; j++) {
      const a = separateScratch[i], b = separateScratch[j];
      if (laneOf(a.y) !== laneOf(b.y)) continue;
      const dx = b.x - a.x;
      const dist = Math.abs(dx);
      if (dist >= SEPARATE_GAP) continue;
      const push = Math.min(SEPARATE_PUSH, (SEPARATE_GAP - dist) / 2);
      const sign = dx > 0 || (dx === 0 && (a.id | 0) <= (b.id | 0)) ? 1 : -1;
      a.x -= sign * push;
      b.x += sign * push;
    }
  }
}
export class Yetti {
  constructor(type, x, y, hpScale = 1) {
    const t = TYPES[type]; if (!t) throw new Error(`Unknown Yetti: ${type}`);
    const hp = Math.round(t.hp * (t.boss ? 1 : hpScale));
    Object.assign(this, { id: actorId(), type, x, y, z: type === 'hover' ? 65 : 0, hp, maxHp: hp, mode: null, rushCool: 3,
      alive: true, boss: !!t.boss, phase: t.boss ? 1 : 0, facing: -1, state: 'approach', clock: 0, cooldown: 1,
      stun: 0, shield: !!t.shield, timer: 0, poise: 0, rushDir: -1, attackY: y, attackX: x, volley: 0 });
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
      if (phase > this.phase) {
        this.phase = phase; this.state = 'roar'; this.timer = ROAR; this.mode = null;
        // A clipboard-break/mash stun can still be running when a shot crosses the gate.
        // It must not replace the roar with approach or swallow the phase's adds.
        if (TYPES[this.type].shield) { this.stun = 0; this.shield = true; this.shieldHits = 0; this.reshieldTimer = TYPES[this.type].reshield; }
        return { accepted: true, phase };
      }
    }
    if (this.hp === 0) { this.alive = false; this.state = 'dead'; }
    else if (!this.boss && (bonk || this.poise <= 0)) {
      this.state = 'hurt'; this.stun = bonk ? .4 : .14; this.x += dir * (bonk ? 65 : 12);
      this.poise = TYPES[this.type].heavy ? POISE.heavy : POISE.light;
    }
    return { accepted: true, killed: !this.alive };
  }
  breakShield() { if (!this.shield || (this.boss && !this.canBeHit)) return false; this.shield = false; this.shieldHits = 0; this.state = 'hurt'; this.stun = .5; return true; }
  update(dt, world) {
    if (!this.alive) { this.choirBuff = 1; return; }
    const b = world.bob, pace = world.difficulty.pace, buff = choirMultiplier(this, world.enemies), t = TYPES[this.type];
    this.choirBuff = buff;
    this.clock += dt; this.cooldown -= dt * buff; this.poise -= dt;
    if (t.laneHop) this.hopCool = (this.hopCool ?? t.laneHop) - dt;
    if (t.reshield && this.phase >= 3 && (this.reshieldTimer = (this.reshieldTimer ?? t.reshield) - dt) <= 0) {
      this.shield = true; this.shieldHits = 0; this.reshieldTimer = t.reshield;
    }
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
        if (this.type === 'charger' || t.lunge || this.mode === 'rush') {
          this.state = 'rush'; this.mode = null;
          // Rush through Bob's telegraphed spot (plus overshoot) so the jump/step lesson is real.
          this.timer = t.lunge
            ? clamp((Math.abs(this.attackX - this.x) + t.lunge.over) / (430 * pace), t.lunge.min, t.lunge.max)
            : clamp((Math.abs(this.attackX - this.x) + 140) / (430 * pace), .65, 1.2);
        }
        else {
          let slammed = false;
          if (t.ranged && this.type !== 'choir' && this.type !== 'choirmaster') world.snowball(this.x, this.attackY, this.rushDir);
          else if (['choir','choirmaster'].includes(this.type)) {
            const skip = this.volley++ % 3;
            const bands = this.type === 'choirmaster' ? [0,1,2].filter(i => i !== skip) : [laneOf(this.attackY)];
            for (const band of bands) world.snowball(this.x, laneY(band), this.rushDir, 'halo');
            // Adds come from the roar and the phase timer only; the per-attack
            // telegraph no longer summons or the arena double-fills.
          } else if (Math.abs(b.x-this.x) < 95 && Math.abs(b.y-this.attackY) < 35 && b.z < 65) {
            if (t.grab && b.grab(this)) { this.state = 'hold'; world.emit('voice','lecturer_intervention'); return; }
            world.hurtBob(false, this.x);
          } else if ((this.type === 'interventionist' && this.phase >= 2) || (t.stompPhase && this.phase >= t.stompPhase)) {
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
      if (Math.abs(b.x-this.x)<70 && Math.abs(b.y-this.y)<34 && b.z<70) world.hurtBob(true, this.x);
      this.x = clamp(this.x, world.bounds.l+55, world.bounds.r-55);
      if (this.timer <= 0) { this.state = 'recover'; this.timer = 1.1 * world.difficulty.recovery; this.cooldown = this.boss ? 1 : 2; }
      return;
    }
    if (this.state === 'recover' || this.state === 'slam') { this.timer -= dt; if (this.timer <= 0) this.state = 'approach'; return; }
    const dx = b.x-this.x, dy=b.y-this.y; const face = Math.sign(dx) || this.facing;
    if (face !== this.facing) world.speak?.('yetti_turnback', 30);
    this.facing = face;
    const ranged = !!t.ranged, reach = ranged ? 580 : t.lunge?.reach ?? (this.type === 'charger' ? 430 : 85);
    const boss = this.type === 'interventionist' ? this.phase : 0;
    this.rushCool -= dt;
    // Phase III Interventionist charges across the arena when Bob keeps his distance (Chieftain charge).
    if ((boss >= 3 || (t.rushPhase && this.phase >= t.rushPhase)) && this.rushCool <= 0 && Math.abs(dx) > 300 && Math.abs(dx) < 900 && Math.abs(dy) < 40 && this.cooldown <= 0) {
      this.state='telegraph'; this.mode='rush'; this.timer=.8/pace; this.rushCool=5;
      this.attackX=b.x; this.attackY=this.y; this.rushDir=this.facing; return;
    }
    if (Math.abs(dx)<reach && Math.abs(dy)< (ranged ? 110 : 30) && this.cooldown<=0) {
      this.state='telegraph'; this.timer=(t.lunge?.tell ?? (this.type==='charger' ? .72 : boss>=3 ? .5 : boss===2 ? .58 : .65)) / pace;
      this.attackX=b.x; this.attackY=this.y; this.rushDir=this.facing; world.yellYettiAttack?.(); return;
    }
    const pref=ranged?330:65, speed=TYPES[this.type].speed*pace*buff*(boss>=3?1.45:boss===2?1.3:1);
    const oldX=this.x;
    if (Math.abs(dx)>pref) this.x += Math.sign(dx)*speed*dt;
    if (ranged) stepRangedLane(this, world.enemies, dy, speed, dt);
    else if (t.laneHop) {
      if (this.hopCool <= 0) {
        const lane = laneOf(this.y), step = Math.sign(laneOf(b.y) - lane);
        this.hopY = step ? laneY(lane + step) : this.y; this.hopCool = t.laneHop;
      }
      if (this.hopY != null) this.y += clamp(this.hopY - this.y, -220 * dt, 220 * dt);
    }
    else this.y = clamp(this.y+clamp(dy,-speed*.6*dt,speed*.6*dt),LANE_TOP,LANE_BOT);
    this.x = clamp(this.x,world.bounds.l+55,world.bounds.r-55);
    this.state = Math.abs(this.x-oldX)>.01 ? 'approach' : 'wait';
  }
}
