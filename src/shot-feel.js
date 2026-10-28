/** Kick, then home before the next eggplant. Decay returns it inside one refire. */
export const RECOIL_KICK = 22;
export const RECOIL_DECAY = 320;
export function stepRecoil(recoil, dt) {
  return Math.max(0, (recoil || 0) - RECOIL_DECAY * dt);
}
/** Snowball stays an ice ellipse. Halo is a ring. Shockwave is a flat bar. */
export function hostileShape(kind) {
  if (kind === 'halo') return { shape: 'ring', color: 0xffdf89 };
  if (kind === 'shockwave') return { shape: 'bar', color: 0xffdf89 };
  return { shape: 'ellipse', color: 0xdaefff };
}
