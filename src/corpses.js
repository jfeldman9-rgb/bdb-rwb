/** How long a dead enemy stays on screen so knockdown can play, then fade. */
export const CORPSE_S = 0.5;
const FADE_S = 0.18;

export function beginCorpse() {
  return { t: CORPSE_S, anim: 'knockdown', alpha: 1, done: false };
}

/** Advance a corpse. Knockdown holds, then alpha falls through the last FADE_S. */
export function stepCorpse(corpse, dt) {
  const step = Number.isFinite(dt) && dt > 0 ? dt : 0;
  const t = (corpse?.t ?? CORPSE_S) - step;
  const alpha = t <= 0 ? 0 : t < FADE_S ? t / FADE_S : 1;
  return { t, anim: 'knockdown', alpha, done: t <= 0 };
}
