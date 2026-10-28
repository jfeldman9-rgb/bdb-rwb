import { isBossFinisherReady } from './wingman.js';
export { isBossFinisherReady } from './wingman.js';

/** Front runner's screen start and speed. Shared with the silhouette sprites. */
export const PAPI_RUNNER_X0 = -180;
export const PAPI_RUNNER_SPEED = 980;
/** Seconds until the front runner reaches a screen-space x. */
export function papiHitTime(screenX) {
  return Math.max(0, (screenX - PAPI_RUNNER_X0) / PAPI_RUNNER_SPEED);
}
// Packet rules.ts: bodies unchanged; TypeScript annotations removed.
export function collectShake(
  shakeRemainder,
  charges,
  hearts,
  shakeHeal,
) {
  let nextRemainder = Math.max(0, Math.floor(shakeRemainder)) + 1;
  let nextCharges = Math.max(0, Math.floor(charges));
  if (nextRemainder >= 3) {
    nextRemainder = 0;
    nextCharges = Math.min(2, nextCharges + 1);
  }
  return {
    shakeRemainder: nextRemainder,
    charges: nextCharges,
    hearts: shakeHeal ? Math.min(3, Math.max(0, Math.floor(hearts)) + 2) : Math.max(0, Math.floor(hearts)),
  };
}

export function canActivatePapacito(
  phase,
  bosses,
  charges,
) {
  if (charges <= 0) return { allowed: false, finisher: false, charges };
  const finisher = isBossFinisherReady(phase, bosses);
  if (phase === 3 && bosses.some((boss) => boss.alive) && !finisher) {
    return { allowed: false, finisher: false, charges };
  }
  return { allowed: true, finisher, charges: charges - 1 };
}

export function papacitoEffect(state, enemies, context = {}) {
  const { phase = 0, camX = 0, width = 1280 } = context;
  const bosses = enemies.filter(e => e.boss);
  const visible = enemies.filter(e => e.alive && e.x >= camX && e.x <= camX + width);
  const refusal = context.paused || context.cutscene ? 'paused' : context.dadActive || context.active ? 'busy' :
    context.dead || context.victory ? 'ended' : !visible.length ? 'empty' : '';
  if (refusal) return { allowed: false, reason: refusal, finisher: false, killed: [], score: 0 };
  const result = canActivatePapacito(phase, bosses, state.charges);
  if (!result.allowed) return { ...result, reason: state.charges <= 0 ? 'protein' : 'weaken', killed: [], score: 0 };
  const killed = result.finisher ? bosses.filter(e => e.alive) : visible.filter(e => !e.boss);
  if (!killed.length) return { allowed: false, reason: 'empty', finisher: false, killed: [], score: 0 };
  state.charges = result.charges;
  // Delayed wipe: each body falls when the front runner reaches it.
  const hitTime = context.hitTime || (context.delay > 0 ? () => context.delay : null);
  if (hitTime) {
    const schedule = killed.map(e => ({ e, at: Math.max(0, hitTime(e)) }));
    for (const s of schedule) {
      s.e.stun = Math.max(s.e.stun || 0, s.at + 0.2);
      if (!s.e.boss) s.e.state = 'hurt';
    }
    return { ...result, killed, score: result.finisher ? 4000 : killed.length * 500, delayed: true, schedule };
  }
  for (const e of killed) { e.hp = 0; e.alive = false; e.state = 'dead'; }
  return { ...result, killed, score: result.finisher ? 4000 : killed.length * 500 };
}
