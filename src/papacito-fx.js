// Black-Friday stampede. Screen-space only: no camera, scroll, or shake.
import { PAPI_RUNNER_X0, PAPI_RUNNER_SPEED } from './papacito.js';

const COUNT = 16;
const ROWS = Object.freeze([
  { y: 575, scale: 0.30 },
  { y: 630, scale: 0.33 },
  { y: 690, scale: 0.36 },
]);

/** Deterministic pack: densest at the front, every trailer 40–880 px behind. */
export function stampedeLag(i) {
  if (i <= 0) return 0;
  const u = (i - 1) / (COUNT - 2);
  const base = 40 + u * u * 820;
  const jitter = ((i * 37) % 41) - 20;
  return Math.max(40, Math.min(880, base + jitter));
}

export class PapacitoFX {
  constructor(scene) { this.scene = scene; this.runners = []; this.age = 0; }
  start() {
    this.destroy();
    const m = this.scene.metas.papi_stampede;
    for (let i = 0; i < COUNT; i++) {
      const variant = (i % 6) + 1;
      const row = i % 3;
      const a = m.anims.find((anim) => anim.name === `papi_stampede_run${variant}`);
      const frame = i % a.frames.length;
      const sprite = this.scene.add.sprite(PAPI_RUNNER_X0, ROWS[row].y, m.pages[a.pages[frame]], a.frames[frame])
        .setOrigin(0.5, 0.95)
        .setScale(ROWS[row].scale)
        .setScrollFactor(0)
        .setDepth(18000 + row * 100 + i);
      sprite.play({ key: a.name, startFrame: frame });
      sprite._lag = stampedeLag(i);
      this.runners.push(sprite);
    }
    this.age = 0;
  }
  update(dt) {
    if (!this.runners.length) return;
    this.age += dt;
    const front = PAPI_RUNNER_X0 + this.age * PAPI_RUNNER_SPEED;
    for (let i = 0; i < this.runners.length; i++) {
      const sprite = this.runners[i];
      sprite.x = i === 0 ? front : front - sprite._lag;
    }
    if (this.age >= 2.5) this.destroy();
  }
  destroy() { for (const r of this.runners) r.destroy(); this.runners = []; }
}
