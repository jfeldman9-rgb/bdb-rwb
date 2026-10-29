import { BARK } from './barks.js';

const EPS = 1e-6;
/**
 * Locked quotes and set-piece / scripted lines queue behind the rolling window
 * instead of dropping. Optional flavour (hurts, Papacito brags) still drops.
 * Movie-owned Dad calls are resolved before offering a fallback to this gate.
 */
export const RESERVED_VOICE = /^(?:nar_|claudia_|bdb_(?:open|produce)$|yetti_(?:porkchop|colombian_room|purple_car)_|bob_s\d+$|wingman_|lecturer_intervention$|choir_serious$|dad_(?:catchphrase$|call_|done_|s\d+$)|papi_crowd_|papi_chorus$|bouncer_|dj_|celestina_|archyetti_|interventionist_(?:intro|phase\d+|defeat)$|choirmaster_(?:intro|phase\d+|defeat)$)/;
export const PRIORITY_VOICE = RESERVED_VOICE;
export const BOSS_MOMENT_VOICE = /^(?:bouncer|interventionist|choirmaster|wingman|dj|celestina|archyetti)_(?:intro|phase\d+|defeat)$/;
export const ENDING_VOICE = /^(?:nar_victory|claudia_leave)$/;
export const DUBBED_DAD_CALL = /^dad_call_0/;

export function isReservedVoice(id) {
  return RESERVED_VOICE.test(id || '');
}
export function isPriorityVoice(id) {
  return isReservedVoice(id);
}
export function isBossMomentVoice(id) {
  return BOSS_MOMENT_VOICE.test(id || '');
}
export function isDubbedDadCall(id) {
  return DUBBED_DAD_CALL.test(id || '');
}
export function isEndingVoice(id) {
  return ENDING_VOICE.test(id || '');
}

function bossMomentType(id) {
  const m = String(id || '').match(/^(bouncer|interventionist|choirmaster|wingman|dj|celestina|archyetti)_/);
  return m ? m[1] : '';
}

function bossMomentRank(id) {
  const m = String(id || '').match(/^(?:bouncer|interventionist|choirmaster|wingman|dj|celestina|archyetti)_(intro|phase(\d+)|defeat)$/);
  if (!m) return -1;
  if (m[1] === 'intro') return 0;
  if (m[1] === 'defeat') return 99;
  return +m[2];
}

function splitEnding(queue) {
  const endings = [], rest = [];
  for (const q of queue) (isEndingVoice(q) ? endings : rest).push(q);
  return { endings, rest };
}

/** Keep only the latest same-boss moment; older phase/intro lines would play late. */
function enqueueReserved(gate, id) {
  if (isEndingVoice(id)) {
    if (gate.queue.includes(id)) return;
    const { endings, rest } = splitEnding(gate.queue);
    endings.push(id);
    gate.queue = [...endings, ...rest];
    return;
  }
  if (isBossMomentVoice(id)) {
    const type = bossMomentType(id);
    const rank = bossMomentRank(id);
    let best = id;
    let bestRank = rank;
    const rest = [];
    for (const q of gate.queue) {
      if (isBossMomentVoice(q) && bossMomentType(q) === type) {
        const r = bossMomentRank(q);
        if (r > bestRank) {
          best = q;
          bestRank = r;
        }
        continue;
      }
      rest.push(q);
    }
    const split = splitEnding(rest);
    gate.queue = [...split.endings, best, ...split.rest];
    return;
  }
  if (!gate.queue.includes(id)) gate.queue.push(id);
}

/** Optional flavour may expire; reserved/ending lines stay. */
export function expireOptionalVoice(gate) {
  if (!gate?.queue) return;
  gate.queue = gate.queue.filter(id => isReservedVoice(id));
}

export function createVoiceGate({ gap = BARK.gap, cap = BARK.cap, window = BARK.window } = {}) {
  return { stamps: [], queue: [], gap, cap, window };
}

export function resetVoiceGate(gate) {
  gate.stamps.length = 0;
  gate.queue.length = 0;
}

export function pruneVoiceGate(gate, now) {
  let w = 0;
  for (let i = 0; i < gate.stamps.length; i++) {
    if (now - gate.stamps[i] < gate.window - EPS) gate.stamps[w++] = gate.stamps[i];
  }
  gate.stamps.length = w;
}

export function canSpeakVoice(gate, now) {
  pruneVoiceGate(gate, now);
  if (gate.stamps.length >= gate.cap) return false;
  if (gate.stamps.length > 0 && now - gate.stamps[gate.stamps.length - 1] < gate.gap - EPS) return false;
  return true;
}

/** Earliest time the rolling window will accept another presented line. */
export function nextVoiceAt(gate, now) {
  pruneVoiceGate(gate, now);
  if (canSpeakVoice(gate, now)) return now;
  let t = now;
  if (gate.stamps.length > 0) t = Math.max(t, gate.stamps[gate.stamps.length - 1] + gate.gap);
  if (gate.stamps.length >= gate.cap) t = Math.max(t, gate.stamps[0] + gate.window);
  return t;
}

export function flushVoiceGate(gate, now, onSpeak) {
  while (gate.queue.length > 0 && canSpeakVoice(gate, now)) {
    const id = gate.queue.shift();
    gate.stamps.push(now);
    onSpeak(id);
  }
}

export function offerVoice(gate, id, now, onSpeak, { forceQueue = false } = {}) {
  if (!id) return false;
  flushVoiceGate(gate, now, onSpeak);
  if (gate.queue.length === 0 && canSpeakVoice(gate, now)) {
    gate.stamps.push(now);
    onSpeak(id);
    return true;
  }
  if (forceQueue || isReservedVoice(id)) enqueueReserved(gate, id);
  return false;
}

export function hasReservedQueued(gate) {
  return !!gate?.queue.some(id => isReservedVoice(id));
}

/** Verify a sorted timestamp array obeys <= 1 per gap and <= cap in any half-open [t, t + window) interval. */
export function rollingVoiceStats(stamps, { gap = BARK.gap, window = BARK.window } = {}) {
  let minGap = Infinity;
  let maxInWindow = 0;
  for (let i = 0; i < stamps.length; i++) {
    if (i > 0) minGap = Math.min(minGap, stamps[i] - stamps[i - 1]);
    let count = 0;
    for (let j = i; j < stamps.length && stamps[j] - stamps[i] < window - EPS; j++) count++;
    if (count > maxInWindow) maxInWindow = count;
  }
  return {
    count: stamps.length,
    minGap: stamps.length > 1 ? +minGap.toFixed(4) : null,
    maxInWindow,
    ok: (stamps.length <= 1 || minGap >= gap - 1e-3) && maxInWindow <= BARK.cap,
  };
}
