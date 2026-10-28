// Dad call-in cutscene: pause → play rotating clip → then() runs the swatter wipe.
// Port of rwb-s8 rand-call-cutscene.js playCall/bag, pointed at assets/cutscenes/dad/.
import { CutscenePlayer, cutscenesEnabled } from './cutscene.js';
import { q } from './config.js';

export const DAD_CLIP_BASE = 'assets/cutscenes/dad/';
export const DAD_CLIPS = Object.freeze(['D1']); // grow as /workspace/bdb-art/cutscenes/dad-callin/*.mp4 land
export const BAG_KEY = 'bdb-dad-call-bag';
const START = 1500, STALL = 1500, MAX = 11000, GUARD = 900;

let bag = null, player = null, handle = null, unpauseGame = null, offShutdown = null;

function shuffle(list, rng) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

export function createDadBag(storage, rng = Math.random, ids = DAD_CLIPS) {
  const pool = ids.slice();
  let saved = {};
  try { saved = JSON.parse(storage?.getItem?.(BAG_KEY) || '{}') || {}; } catch { saved = {}; }
  let last = pool.includes(saved.last) ? saved.last : '';
  let rest = Array.isArray(saved.rest) ? saved.rest.filter(id => pool.includes(id)) : [];
  const save = () => { try { storage?.setItem?.(BAG_KEY, JSON.stringify({ last, rest })); } catch { /* private */ } };
  const refill = () => {
    rest = shuffle(pool, rng);
    if (rest.length > 1 && rest[0] === last) { const j = 1 + Math.floor(rng() * (rest.length - 1)); [rest[0], rest[j]] = [rest[j], rest[0]]; }
  };
  return {
    next() { if (!rest.length) refill(); const id = rest.shift(); last = id; save(); return id; },
  };
}

function bagOf(root) {
  if (!bag) {
    let storage;
    try { storage = root.sessionStorage; } catch { storage = undefined; }
    bag = createDadBag(storage, Math.random, DAD_CLIPS);
  }
  return bag;
}

export function abortDadCall(scene) {
  const h = handle; handle = null;
  try { h?.abort?.(); } catch { /* gone */ }
  offShutdown?.(); offShutdown = null;
  unpauseGame?.(); unpauseGame = null;
  try { player?.video?.pause(); } catch { /* detached */ }
  player = null;
  if (scene) { scene.cutscene = null; scene.setPauseReason?.('cutscene', false); }
}

/** false when cutscenes off — caller runs the wipe immediately. */
export function playDadCall(scene, then) {
  const root = scene?.cutRoot || globalThis;
  if (!cutscenesEnabled(q, root.navigator) || handle?.active || scene.cutscene) return false;
  const id = bagOf(root).next();
  let once = false;
  const finish = how => {
    if (once) return;
    once = true;
    handle = null;
    offShutdown?.(); offShutdown = null;
    unpauseGame?.(); unpauseGame = null;
    scene.cutscene = null;
    scene.setPauseReason?.('cutscene', false);
    try { then?.(how || 'end'); } catch (e) { root.console?.error?.(e); }
  };
  scene.setPauseReason?.('cutscene', true);
  const game = scene.game, ownsPause = !!game && !game.isPaused && typeof game.pause === 'function';
  unpauseGame = () => { if (ownsPause && game.isPaused && !game.pendingDestroy) game.resume?.(); };
  if (ownsPause) game.pause();
  scene.cutscene = { dad: true, press(a) { handle?.skip?.(a || 'press', a === 'pause' || a === 'start'); } };
  try {
    if (!player || player.root !== root) {
      player = new CutscenePlayer(root, { base: DAD_CLIP_BASE, startMs: START, stallMs: STALL, maxMs: MAX, guardMs: GUARD });
    }
    const off = () => abortDadCall(scene);
    scene.events?.once?.('shutdown', off);
    offShutdown = () => scene.events?.off?.('shutdown', off);
    const nextHandle = player.play([id], {
      done: how => finish(how),
      touch: !!root.matchMedia?.('(pointer: coarse)')?.matches,
    });
    if (!once) handle = nextHandle;
    return true;
  } catch {
    abortDadCall(scene);
    return false;
  }
}
