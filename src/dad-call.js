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
/** Player-facing banner for a refused call-in. The spent banner keeps the charge/call numbers. */
export function refusalBanner(st, why) {
  switch (why) {
    case 'paused': return 'HOLD ON — FINISH THE CUTSCENE FIRST.';
    case 'victory': return 'THE RESCUE IS OVER — DAD STANDS DOWN.';
    case 'busy': return "DAD'S ALREADY MID-SWAT.";
    case 'papi-active': return "PAPI'S ON STAGE — ONE CALL-IN AT A TIME.";
    case 'empty': return 'NO TARGETS IN SIGHT.';
    case 'boss-invulnerable': return 'THE BOSS IS BRAGGING — WAIT FOR AN OPENING.';
    case 'spent': return `DAD'S OUT OF SWATS (${st?.charges | 0}/${DAD.maxCharges} · CALL ${Math.min(st?.calls | 0, DAD.maxCalls)}/${DAD.maxCalls}).`;
    case 'phase': return 'DAD ALREADY SWATTED THIS PHASE.';
    default: return "DAD'S ON HIS COFFEE BREAK.";
  }
}
export function takeCall(st, c) {
  const why = refuseReason(st, c); if (why) return { ok: false, why };
  st.charges = 0; st.calls++; st.since = 0; st.kos = 0; st.on = true;
  if (c.bossPhase) st.phaseCalls[c.bossPhase] = (st.phaseCalls[c.bossPhase] || 0) + 1;
  return { ok: true };
}
/** Third death in one zone. Nightmare only calls this. Restores a Dad charge, or a shake trio when he has not arrived yet. */
export const ZONE_MERCY_DEATHS = 3;
export function grantZoneMercy(dadCall, phaseKey = null) {
  if (!dadCall?.unlocked) return 'breath';
  dadCall.charges = Math.max(1, dadCall.charges | 0);
  if (dadCall.calls >= DAD.maxCalls) dadCall.calls = DAD.maxCalls - 1;
  dadCall.on = false;
  dadCall.since = Math.max(dadCall.since || 0, DAD.recharge);
  // The mercy charge has to be spendable. A spent phase used to refuse it immediately.
  if (phaseKey) delete dadCall.phaseCalls[phaseKey];
  return 'dad';
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
