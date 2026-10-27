import { isBossFinisherReady } from './wingman.js';
export { isBossFinisherReady } from './wingman.js';
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
  for (const e of killed) { e.hp = 0; e.alive = false; e.state = 'dead'; }
  return { ...result, killed, score: result.finisher ? 4000 : killed.length * 500 };
}
