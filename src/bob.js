import { LANE_TOP, LANE_BOT, WORLD_W, clamp } from './config.js';
import { DIFFICULTIES } from './difficulty.js';
export const MASH_NEED = 6;
export class Bob {
  constructor({ x = 180, y = 630, difficulty = 'adventure' } = {}) {
    Object.assign(this, { x, y, z: 0, vz: 0, facing: 1, state: 'idle', stateTime: 0, inv: 0,
      dashTime: 0, dashCooldown: 0, dashStocks: 1, dashDir: 1, jumpBuffer: 0, time: 0, hitTimes: [],
      grabbedBy: null, grabMash: 0, shootTime: 0, alive: true, difficulty, knockV: 0 });
    this.maxHp = this.hp = DIFFICULTIES[difficulty].hearts;
  }
  get busy() { return ['hurt','knockdown','getup','grabbed','dead'].includes(this.state); }
  setState(state, time = 0) { this.state = state; this.stateTime = time; }
  takeHit({ charger = false, damage = 1, dir = 0 } = {}) {
    if (this.inv > 0 || !this.alive) return false;
    this.hp = Math.max(0, this.hp - damage); this.grabbedBy = null;
    this.hitTimes = this.hitTimes.filter(t => this.time - t <= 2); this.hitTimes.push(this.time);
    this.dashTime = 0; this.inv = .55;
    // Visible knockback slide on top of the hearts model; the view shake comes from the hurt FX.
    this.knockV = dir * (charger ? 340 : 200);
    this.setState(charger || this.hitTimes.length >= 3 ? 'knockdown' : 'hurt', charger || this.hitTimes.length >= 3 ? .65 : .28);
    if (this.hp === 0) { this.alive = false; this.setState('dead', 1.1); }
    return true;
  }
  grab(enemy) {
    if (this.inv > 0 || this.z > 24 || this.busy) return false;
    this.grabbedBy = enemy; this.grabMash = 0; this.setState('grabbed', 3); return true;
  }
  mash(count = 1) {
    if (this.state !== 'grabbed') return false;
    this.grabMash += count;
    if (this.grabMash < MASH_NEED) return false;
    const e = this.grabbedBy; this.grabbedBy = null; this.inv = 1.5; this.setState('idle');
    if (e) { e.state = 'hurt'; e.stun = 1.2; }
    return true;
  }
  update(dt, input = {}, bounds = { l: 0, r: WORLD_W }) {
    this.time += dt; this.inv = Math.max(0, this.inv - dt); this.shootTime = Math.max(0, this.shootTime - dt);
    this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    if (this.dashCooldown <= 0) this.dashStocks = 1;
    if (input.jump) this.jumpBuffer = DIFFICULTIES[this.difficulty].grace;
    else this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
    if (this.state === 'grabbed') {
      this.stateTime -= dt;
      if (this.difficulty === 'story') this.mash(3.5 * dt);
      if (this.state === 'grabbed' && (!this.grabbedBy?.alive || this.stateTime <= 0)) {
        const grabber = this.grabbedBy;
        // A dead grabber just lets go. A timeout is punished by the campaign via hurtBob.
        this.grabPunish = this.stateTime <= 0 && grabber?.alive ? grabber : null;
        this.grabbedBy = null; this.setState('idle');
      }
    } else if (this.busy) {
      this.stateTime -= dt;
      if (this.stateTime <= 0 && this.alive) {
        if (this.state === 'knockdown') { this.setState('getup', .4); this.inv = 1.9; }
        else this.setState('idle');
      }
    }
    if (!this.busy && this.alive) {
      if (input.x) this.facing = Math.sign(input.x);
      if (this.jumpBuffer > 0 && this.z === 0) { this.vz = 515; this.z = .01; this.jumpBuffer = 0; }
      if (input.dash && this.dashStocks) {
        this.dashTime = .2; this.dashDir = this.facing; this.dashStocks = 0; this.dashCooldown = .6; this.inv = Math.max(this.inv, .28);
      }
      if (this.dashTime > 0) { this.x += this.dashDir * 520 * dt; this.dashTime = Math.max(0, this.dashTime - dt); this.state = 'dash'; }
      else {
        const length = Math.max(1, Math.hypot(input.x || 0, input.y || 0));
        this.x += (input.x || 0) / length * 270 * dt; this.y += (input.y || 0) / length * 270 * dt;
        this.state = input.x || input.y ? 'walk' : 'idle';
      }
    }
    if (this.z > 0 || this.vz > 0) {
      this.vz -= 1180 * dt; this.z += this.vz * dt;
      if (this.z <= 0) { this.z = this.vz = 0; this.dashStocks = 1; }
    }
    // Knockback slides even while hurt/knocked down, then settles.
    if (this.knockV) {
      this.x += this.knockV * dt;
      this.knockV -= this.knockV * Math.min(1, 9 * dt);
      if (Math.abs(this.knockV) < 8) this.knockV = 0;
    }
    this.x = clamp(this.x, bounds.l + 50, bounds.r - 50); this.y = clamp(this.y, LANE_TOP, LANE_BOT);
  }
}
