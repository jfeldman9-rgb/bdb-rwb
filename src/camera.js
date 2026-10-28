// RWB-style camera: Bob sits in the left third; the world scrolls instead.
import { VW, WORLD_W, clamp, CAM_LEAD as CONFIG_LEAD } from './config.js';

export const CAM_LEAD = CONFIG_LEAD;
export const CAM_FACE = 40;
export const CAM_LERP = 5;
export const FOLLOW_SCREEN_X = VW * CAM_LEAD;
export const FOLLOW_FACE_BIAS = CAM_FACE;
export const FOLLOW_LERP = CAM_LERP;

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
  let camX = snap || !(dt > 0)
    ? target
    : state.camX + (target - state.camX) * Math.min(1, (dt || 0) * CAM_LERP);
  camX = clamp(camX, floor, ceiling);
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

export function screenX(worldX, camX) { return worldX - camX; }
export function freeRoam(locked) { return !locked; }
