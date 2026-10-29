import { BARK } from './barks.js';

const EPS = 1e-6;
/** Story, chapter opens, and boss phase/defeat lines queue behind the rolling window instead of dropping. */
export const PRIORITY_VOICE = /^(?:nar_|claudia_|bdb_open$|bob_s\d+$|wingman_|(?:bouncer|interventionist|choirmaster)_(?:intro|phase\d+|defeat)$)/;

export function isPriorityVoice(id) {
  return PRIORITY_VOICE.test(id || '');
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
  if ((forceQueue || isPriorityVoice(id)) && !gate.queue.includes(id)) {
    gate.queue.push(id);
  }
  return false;
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
