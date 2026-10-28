// RWB-style camera: Bob sits in the left third; the world scrolls instead.
import { VW, WORLD_W, clamp, CAM_LEAD as CONFIG_LEAD } from './config.js';

export const CAM_LEAD = CONFIG_LEAD;
export const CAM_FACE = 40;
export const CAM_LERP = 5;
export const FOLLOW_SCREEN_X = VW * CAM_LEAD;
export const FOLLOW_FACE_BIAS = CAM_FACE;
export const FOLLOW_LERP = CAM_LERP;
/** Free-roam cap on Bob's screen X: he never advances past the left third; the world scrolls. */
export const BOB_MAX_SCREEN = 1 / 3;
/** Bob.update clamps to bounds ± this inset. */
export const BOB_INSET = 50;

export function cameraTarget(bobX, facing = 1, vw = VW) {
  return bobX - vw * CAM_LEAD + Math.sign(facing || 1) * CAM_FACE;
}
export const followTarget = cameraTarget;

export function lockRect(locked, zone, boss) {
  if (!locked) return null;
  return boss || zone || null;
}

export function stepCamera(state, dt, {
  bobX, facing = 1, locked = false, zone = null, boss = null,
  camMax = state.camMax ?? 0, worldW = WORLD_W, vw = VW, snap = false,
} = {}) {
  const rect = lockRect(locked, zone, boss);
  let lo = camMax;
  let hi = worldW - vw;
  if (rect) {
    lo = Math.max(lo, rect.l);
    hi = Math.min(hi, Math.max(rect.l, rect.r - vw));
  }
  const floor = Math.max(0, Math.min(lo, hi));
  const ceiling = Math.max(floor, hi);
  let target = clamp(cameraTarget(bobX, facing, vw), floor, ceiling);
  // Lock/unlock ease like RWB instead of jumping; dt 0 without snap only re-clamps.
  const from = Number.isFinite(state.camX) ? state.camX : target;
  let camX = snap ? target : dt > 0 ? from + (target - from) * Math.min(1, dt * CAM_LERP) : from;
  camX = clamp(camX, Math.min(floor, from), ceiling);
  const nextMax = locked ? Math.max(camMax, rect ? rect.l : camMax) : Math.max(camMax, camX);
  const bounds = rect
    ? { l: Math.max(camX, rect.l), r: Math.min(camX + vw, rect.r) }
    : { l: camX, r: Math.min(worldW, camX + vw) };
  return { camX, camMax: nextMax, bounds };
}

export function updateCamera(state, dt, opts = {}) {
  const next = stepCamera(state, dt, { ...opts, camMax: state.camMax ?? 0 });
  state.camX = next.camX;
  state.camMax = next.camMax;
  state.bounds = next.bounds;
  return state;
}

/**
 * Bob's walk bounds. Fight arenas use the whole screen; free roam keeps Bob in the left
 * third so the world scrolls instead. A Bob already past it (zone just cleared) is held
 * where he is until the camera catches up — never pushed back.
 */
export function moveBounds({ camX, bounds, locked }, bobX, vw = VW) {
  if (locked) return bounds;
  return { l: bounds.l, r: Math.min(bounds.r, Math.max(camX + vw * BOB_MAX_SCREEN, bobX) + BOB_INSET) };
}

/** Lock-in eases like RWB; only snap when the arena is mostly off screen (respawn, teleport). */
export function lockSnaps(camX, rect, vw = VW) {
  return !Number.isFinite(camX) || Math.abs(camX - rect.l) > vw / 2;
}

export function screenX(worldX, camX) { return worldX - camX; }
export function freeRoam(locked) { return !locked; }
