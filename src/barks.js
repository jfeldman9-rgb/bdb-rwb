// Combat bark rotation with cooldowns. Pure enough for unit tests.
export const BARK = Object.freeze({
  whereCd: 18,
  coryCd: 55,
  coryChance: 0.08,
  yettiCd: 7,
});

const BOB_WHERE = Object.freeze(['bob_where_claudia_01', 'bob_where_claudia_02']);
const BOB_CORY = Object.freeze(['bob_cory_joke_01', 'bob_cory_joke_02']);
const YETTI_CYCLE = Object.freeze([
  'yetti_porkchop_01', 'yetti_porkchop_02',
  'yetti_colombian_room_01', 'yetti_colombian_room_02',
  'yetti_purple_car_01', 'yetti_purple_car_02',
]);
const YETTI_ATTACK = Object.freeze(['yetti_porkchop_01', 'yetti_porkchop_02']);
const YETTI_WAVE = Object.freeze(['yetti_colombian_room_01', 'yetti_colombian_room_02']);
const YETTI_TAUNT = Object.freeze(['yetti_purple_car_01', 'yetti_purple_car_02']);

export function createBarks(rng = Math.random) {
  return { whereAt: -1e9, coryAt: -1e9, yettiAt: -1e9, i: 0, rng };
}

function pick(list, st) {
  const id = list[st.i % list.length];
  st.i++;
  return id;
}

export function barkWhere(st, now) {
  if (!st || now - st.whereAt < BARK.whereCd) return null;
  st.whereAt = now;
  return pick(BOB_WHERE, st);
}

export function barkCory(st, now) {
  if (!st || now - st.coryAt < BARK.coryCd) return null;
  if ((st.rng?.() ?? Math.random()) > BARK.coryChance) return null;
  st.coryAt = now;
  return pick(BOB_CORY, st);
}

export function barkYettiAttack(st, now) {
  if (!st || now - st.yettiAt < BARK.yettiCd) return null;
  st.yettiAt = now;
  return pick(YETTI_ATTACK, st);
}

export function barkYettiWave(st, now) {
  if (!st || now - st.yettiAt < BARK.yettiCd) return null;
  st.yettiAt = now;
  return pick(YETTI_WAVE, st);
}

export function barkYettiTaunt(st, now) {
  if (!st || now - st.yettiAt < BARK.yettiCd) return null;
  if ((st.rng?.() ?? Math.random()) > 0.12) return null;
  st.yettiAt = now;
  return pick(YETTI_TAUNT, st);
}

export function barkPapacito(st) {
  return pick(['bob_papacito_01', 'bob_papacito_02'], st || { i: 0 });
}

export { BOB_WHERE, BOB_CORY, YETTI_CYCLE, YETTI_ATTACK, YETTI_WAVE, YETTI_TAUNT };
