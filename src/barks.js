// Combat bark rotation with cooldowns. Pure enough for unit tests.
// Ambient lines share one gate: 8s apart, and at most BARK.cap in any rolling 60s.
import {
  BOB_IDLE, YETTI_COMBAT, YETTI_IDLE,
} from './bark-packs.js';
export const BARK = Object.freeze({
  whereCd: 60,
  coryCd: 120,
  coryChance: 0.05,
  idleCd: 45,
  idleChance: 0.06,
  yettiCd: 20,
  tauntChance: 0.04,
  gap: 8,
  // 3, not 4: the audible minute leaves out Papacito and Dad, so a rolling
  // 4-per-60s on the sim clock prints above 4 lines per combat minute.
  cap: 3,
  window: 60,
});

const BOB_WHERE = Object.freeze(['bob_where_claudia_01', 'bob_where_claudia_02']);
const BOB_CORY = Object.freeze(['bob_cory_joke_01', 'bob_cory_joke_02']);
const YETTI_CYCLE = Object.freeze([
  'yetti_porkchop_01', 'yetti_porkchop_02',
  'yetti_colombian_room_01', 'yetti_colombian_room_02',
  'yetti_purple_car_01', 'yetti_purple_car_02',
]);
const YETTI_ATTACK = Object.freeze(['yetti_porkchop_01', 'yetti_porkchop_02', ...YETTI_COMBAT]);
const YETTI_WAVE = Object.freeze(['yetti_colombian_room_01', 'yetti_colombian_room_02', ...YETTI_COMBAT]);
const YETTI_TAUNT = Object.freeze(['yetti_purple_car_01', 'yetti_purple_car_02', ...YETTI_IDLE]);

/** Highest priority speaks when several ambient lines are due together. */
const AMBIENT_ORDER = Object.freeze(['produce', 'yetti', 'where', 'laugh', 'hurt', 'turnback', 'choir', 'cory', 'idle', 'boss', 'death']);

export function createBarks(rng = Math.random) {
  return {
    whereAt: -1e9, coryAt: -1e9, idleAt: -1e9, yettiAt: -1e9, ambientAt: -1e9,
    ambientLog: [], held: Object.create(null), offers: [], open: false,
    i: 0, attackN: 0, rng,
  };
}

function pick(list, st) {
  const id = list[st.i % list.length];
  st.i++;
  return id;
}

function canSpeak(st, now) {
  if (now - st.ambientAt < BARK.gap - 1e-3) return false;
  const cut = now - BARK.window;
  let n = 0;
  for (let i = 0; i < st.ambientLog.length; i++) if (st.ambientLog[i] > cut) n++;
  return n < BARK.cap;
}

function mark(st, now) {
  st.ambientAt = now;
  st.ambientLog.push(now);
  const cut = now - BARK.window;
  if (st.ambientLog.length > 12) st.ambientLog = st.ambientLog.filter((t) => t > cut);
}

function waiting(st, group) {
  return !!(st.held?.[group] || st.offers?.some((o) => o.group === group));
}

/**
 * Ask the ambient gate for `id`. While a campaign step is open the line waits
 * with the others and one flush picks by priority. Outside a step it speaks now
 * or holds until the gate opens.
 */
export function requestAmbient(st, now, group, id, opts = {}) {
  if (!st || !id) return null;
  const offer = { group, id, commit: opts.commit || null };
  if (waiting(st, group)) return null;
  if (st.open) {
    st.offers.push(offer);
    return null;
  }
  if (!canSpeak(st, now)) {
    st.held[group] = offer;
    return null;
  }
  mark(st, now);
  offer.commit?.(now);
  return id;
}

/** Speak the highest-priority held line, if the gate is open. */
export function flushAmbient(st, now) {
  if (!st) return null;
  const offers = st.offers || [];
  st.offers = [];
  for (let i = 0; i < offers.length; i++) {
    const o = offers[i];
    if (!st.held[o.group]) st.held[o.group] = o;
  }
  if (!canSpeak(st, now)) return null;
  for (let i = 0; i < AMBIENT_ORDER.length; i++) {
    const group = AMBIENT_ORDER[i];
    const o = st.held[group];
    if (!o) continue;
    delete st.held[group];
    mark(st, now);
    o.commit?.(now);
    return o;
  }
  return null;
}

export function barkWhere(st, now) {
  if (!st || now - st.whereAt < BARK.whereCd) return null;
  if (waiting(st, 'where')) return null;
  const id = pick(BOB_WHERE, st);
  return requestAmbient(st, now, 'where', id, { commit: (t) => { st.whereAt = t; } });
}

export function barkCory(st, now) {
  if (!st || now - st.coryAt < BARK.coryCd) return null;
  if (waiting(st, 'cory')) return null;
  if ((st.rng?.() ?? Math.random()) > BARK.coryChance) return null;
  const id = pick(BOB_CORY, st);
  return requestAmbient(st, now, 'cory', id, { commit: (t) => { st.coryAt = t; } });
}

function yettiLine(st, now, list) {
  if (!st || now - st.yettiAt < BARK.yettiCd) return null;
  if (waiting(st, 'yetti')) return null;
  const id = pick(list, st);
  return requestAmbient(st, now, 'yetti', id, { commit: (t) => { st.yettiAt = t; } });
}

/** Pork Chop Sandwiches on every 3rd attack telegraph. A blocked 3rd stays due. */
export function barkYettiAttack(st, now) {
  if (!st) return null;
  st.attackN = (st.attackN || 0) + 1;
  if (st.attackN % 3 !== 0 && !st.porkDue) return null;
  if (now - st.yettiAt < BARK.yettiCd || waiting(st, 'yetti')) {
    st.porkDue = true;
    return null;
  }
  // Purple car is waiting and Porkchop just spoke: give it this opening.
  if (st.tauntId && st.lastYetti === 'pork') return null;
  st.porkDue = false;
  const id = pick(YETTI_ATTACK, st);
  return requestAmbient(st, now, 'yetti', id, { commit: (t) => { st.yettiAt = t; st.lastYetti = 'pork'; } });
}

/** Colombians room. Callers only ask on wave 1 of a zone. */
export function barkYettiWave(st, now) {
  return yettiLine(st, now, YETTI_WAVE);
}

export function barkYettiTaunt(st, now) {
  if (!st) return null;
  // 0.04 roll every second. A hit sticks until the shared Yetti slot is free,
  // so Porkchop's cooldown cannot erase the purple-car line.
  if (!st.tauntId) {
    if ((st.rng?.() ?? Math.random()) > BARK.tauntChance) return null;
    st.tauntId = pick(YETTI_TAUNT, st);
  }
  if (now - st.yettiAt < BARK.yettiCd || waiting(st, 'yetti')) return null;
  // Porkchop is owed the next opening unless it was the last Yetti line.
  if (st.porkDue && st.lastYetti !== 'pork') return null;
  const id = st.tauntId;
  st.tauntId = null;
  return requestAmbient(st, now, 'yetti', id, { commit: (t) => { st.yettiAt = t; st.lastYetti = 'taunt'; } });
}

/** Rare Bob idle chatter while free-roaming / between waves. */
export function barkIdle(st, now) {
  if (!st || now - st.idleAt < BARK.idleCd) return null;
  if (waiting(st, 'idle')) return null;
  if ((st.rng?.() ?? Math.random()) > BARK.idleChance) return null;
  const id = pick(BOB_IDLE, st);
  return requestAmbient(st, now, 'idle', id, { commit: (t) => { st.idleAt = t; } });
}

export function barkPapacito(st) {
  return pick(['bob_papacito_01', 'bob_papacito_02'], st || { i: 0 });
}

export { BOB_WHERE, BOB_CORY, YETTI_CYCLE, YETTI_ATTACK, YETTI_WAVE, YETTI_TAUNT, AMBIENT_ORDER, BOB_IDLE };
