// In-engine call-in driven by the packed Dad atlas: jog in, one overhead BDB swat, jog out.
// Combat freezes while he is on screen. Timing comes from FPS.md (enter 6@12, swat 8@16, exit 6@12);
// the hit wipe resolves on the swat frame that shows the impact burst.
// The atlas packs a single swat; the stand mark stays on screen so the swat reads near the right wall.
import { VW } from './config.js';
export const DAD_ANIMS = Object.freeze({
  enter: Object.freeze({ frames: 6, fps: 12 }),
  swat: Object.freeze({ frames: 8, fps: 16, impact: 6 }),
  exit: Object.freeze({ frames: 6, fps: 12 }),
});
const ORDER = ['enter', 'swat', 'exit'];
const len = s => DAD_ANIMS[s].frames / DAD_ANIMS[s].fps;
export const DAD_TIMING = Object.freeze({
  enter: len('enter'), swat: len('swat'), exit: len('exit'),
  impact: len('enter') + DAD_ANIMS.swat.impact / DAD_ANIMS.swat.fps,
  total: ORDER.reduce((t, s) => t + len(s), 0),
});
const EXIT_SPEED = 420;

export class Dad {
  constructor(camX, y, standX = camX + 360) {
    this.x = this.startX = camX - 100; this.standX = Math.min(Math.max(standX, camX + 120), camX + VW - 200); this.y = y;
    this.age = 0; this.state = 'enter'; this.frame = 0; this.alpha = 1; this.resolved = false; this.gone = false;
  }
  update(dt, resolve) {
    this.age += dt;
    let t = Math.min(this.age, DAD_TIMING.total - 1e-9), i = 0;
    while (t >= len(ORDER[i]) && i < ORDER.length - 1) t -= len(ORDER[i++]);
    const a = DAD_ANIMS[this.state = ORDER[i]];
    this.frame = Math.min(a.frames - 1, Math.floor(t * a.fps + 1e-9));
    const k = t / len(this.state);
    this.x = this.state === 'enter' ? this.startX + (this.standX - this.startX) * k
      : this.state === 'swat' ? this.standX : this.standX + t * EXIT_SPEED;
    this.alpha = this.state === 'exit' ? Math.min(1, (1 - k) * 2.5) : 1;
    if (!this.resolved && this.age >= DAD_TIMING.impact) { this.resolved = true; resolve(); }
    this.gone = this.age >= DAD_TIMING.total;
  }
}
