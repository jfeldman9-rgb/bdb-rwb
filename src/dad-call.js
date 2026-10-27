// CALL7 charge/recharge semantics, with BDB target categories.
export const DAD = Object.freeze({ charges: 1, maxCharges: 1, kos: 10, recharge: 45, maxCalls: 3,
  perPhase: 1, bossFrac: .06, eliteFrac: .6, inv: 2, gates: Object.freeze([.66,.33]) });
export function createDadCall(unlocked = true) {
  return { unlocked, charges: unlocked ? 1 : 0, calls: 0, kos: 0, since: 45, phaseCalls: Object.create(null), on: false };
}
export function unlockDad(st) { if (!st.unlocked) { st.unlocked = true; st.charges = 1; } }
export function noteBobKo(st) { if (st?.unlocked && st.charges < 1 && st.calls < DAD.maxCalls) st.kos++; return st?.kos || 0; }
export function tickDadCall(st, dt) {
  if (!st || !Number.isFinite(dt) || dt <= 0) return st;
  st.since += dt;
  if (st.unlocked && st.charges < 1 && st.calls < DAD.maxCalls && st.kos >= DAD.kos && st.since >= DAD.recharge) { st.charges = 1; st.kos = 0; }
  return st;
}
export function refuseReason(st, c = {}) {
  if (!st) return 'nostate';
  if (c.paused || c.cutscene) return 'paused';
  if (c.victory || c.dead) return 'victory';
  if (st.on || c.strike) return 'busy';
  if (c.papiActive) return 'papi-active';
  if (!c.hittable) return 'empty';
  if (c.bossInvuln || c.bossBeat) return 'boss-invulnerable';
  if (!st.unlocked || st.charges < 1 || st.calls >= DAD.maxCalls) return 'spent';
  if (c.bossPhase && (st.phaseCalls[c.bossPhase] || 0) >= DAD.perPhase) return 'phase';
  return '';
}
export const canCall = (st, c) => refuseReason(st, c) === '';
export function takeCall(st, c) {
  const why = refuseReason(st, c); if (why) return { ok: false, why };
  st.charges = 0; st.calls++; st.since = 0; st.kos = 0; st.on = true;
  if (c.bossPhase) st.phaseCalls[c.bossPhase] = (st.phaseCalls[c.bossPhase] || 0) + 1;
  return { ok: true };
}
export function bossFloor(e) { return e.phase >= 3 ? 1 : Math.max(1, Math.floor(e.maxHp * DAD.gates[(e.phase || 1) - 1])); }
export function callEffect(e) {
  if (!e?.alive || e.canBeHit === false || e.invuln) return null;
  const before = e.hp;
  if (e.boss) e.hp = Math.max(Math.min(e.hp, bossFloor(e)), e.hp - e.maxHp * DAD.bossFrac);
  else if (['guard','charger','lecturer'].includes(e.type)) {
    e.hp = Math.max(1, e.hp * (1 - DAD.eliteFrac)); e.shield = false; e.state = 'down'; e.stun = 1.6;
  } else { e.hp = 0; e.alive = false; e.state = 'dead'; }
  return { damage: before - e.hp, killed: !e.alive };
}
