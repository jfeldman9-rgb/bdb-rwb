/** Kick, then home before the next eggplant. Decay returns it inside one refire. */
export const RECOIL_KICK = 22;
export const RECOIL_DECAY = 320;
export function stepRecoil(recoil, dt) {
  return Math.max(0, (recoil || 0) - RECOIL_DECAY * dt);
}
/** Bob's killing eggplant emits hit and then ko. Splat the hit once. Ko splats only for Papi and Dad. */
export function killImpact(type, data) {
  if (type === 'hit') return { heavy: data?.kind === 'heavy' || data?.kind === 'finisher', splat: true, kick: true };
  if (type === 'ko' && data?.source !== 'bob') return { heavy: true, splat: true, kick: false };
  return null;
}
/** Snowball stays an ice ellipse. Halo is a ring. Shockwave is a flat bar. */
export function hostileShape(kind) {
  if (kind === 'halo') return { shape: 'ring', color: 0xffdf89 };
  if (kind === 'shockwave') return { shape: 'bar', color: 0xffdf89 };
  return { shape: 'ellipse', color: 0xdaefff };
}
