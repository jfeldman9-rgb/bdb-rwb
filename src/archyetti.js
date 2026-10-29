import { applyBossDamage, isBossFinisherReady } from './wingman.js';
import { Yetti, TYPES, BOSS_GATES, bossPhaseFor } from './yettis.js';

const ROAR = 1.1;

/** Single-bar tribunal judge. Phase III floors at 1 HP; only the Papacito finisher ends him. */
export class ArchYetti extends Yetti {
  constructor(x, y) {
    super('archyetti', x, y);
  }
  get canBeHit() {
    if (this.phase >= 3 && this.hp <= 1) return false;
    return super.canBeHit;
  }
  takeHit(damage, dir, bonk = false) {
    if (!this.canBeHit) return { accepted: false };
    const { hp } = applyBossDamage(this.phase, this.hp, damage);
    this.hp = hp;
    if (this.boss && this.hp > 0) {
      const phase = bossPhaseFor(this.hp, this.maxHp);
      if (phase > this.phase) {
        this.phase = phase; this.state = 'roar'; this.timer = ROAR; this.mode = null; this.stun = 0;
        return { accepted: true, phase };
      }
    }
    if (this.phase >= 3 && this.hp <= 1) {
      this.state = 'floored';
      return { accepted: true };
    }
    if (this.hp === 0) { this.alive = false; this.state = 'dead'; }
    return { accepted: true, killed: !this.alive };
  }
  update(dt, world) {
    if (this.phase >= 3 && this.hp <= 1) {
      this.state = 'floored';
      this.choirBuff = 1;
      return;
    }
    super.update(dt, world);
  }
}

/** Campaign / bot / HUD read phase, ready, complete through this.finisher. */
export class TribunalCourt {
  constructor() {
    this.boss = null;
    this.ready = false;
    this.complete = false;
    this.softlockTime = 0;
  }
  get phase() { return this.boss?.phase || 1; }
  spawn(x, y, phase = 1) {
    this.boss = new ArchYetti(x, y);
    this.boss.phase = phase;
    if (phase >= 3) this.boss.hp = Math.min(this.boss.hp, Math.floor(this.boss.maxHp * BOSS_GATES[2]));
    else if (phase >= 2) this.boss.hp = Math.min(this.boss.hp, Math.floor(this.boss.maxHp * BOSS_GATES[1]));
    return [this.boss];
  }
  update(dt, world) {
    const bosses = [];
    for (const e of world.enemies) if (e.type === 'archyetti' && e.alive) bosses.push(e);
    if (bosses[0]) this.boss = bosses[0];
    const ready = isBossFinisherReady(this.phase, bosses);
    if (ready && world.papi.charges === 0) {
      this.softlockTime += dt;
      if (this.softlockTime >= 8 - 1e-8) { world.dropTrio(world.bob.x); this.softlockTime = 0; }
    } else this.softlockTime = 0;
    if (ready && !this.ready) world.banner('PAPACITO FINISHER READY');
    this.ready = ready;
    let count = 0, alive = 0;
    for (const e of world.enemies) if (e.type === 'archyetti') { count++; if (e.alive) alive++; }
    this.complete = this.phase === 3 && count > 0 && alive === 0;
  }
}
