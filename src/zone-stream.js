// Backdrop streams: one far plate + one mid plate per fight zone (incl. boss), shared floor.
// Mirrors RWB zone-stream STREAMS shape, simplified for BDB's three stages.
//
// Mid plates scroll at MID_SCROLL, so a zone's plate cannot sit at the zone's world X
// (at 0.4 the boss plate would need camX ≈ 2.5 × zone.l to come on screen). Instead each
// run of identical plates is anchored to the camera X of its first zone: when the camera
// reaches the anchor the plate fills the screen, and it fades in over the PLATE_FADE world
// px of walking before that. Each plate is a horizontal strip of the painted 1280×720
// scene at PLATE_W × PLATE_H, wide enough to cover the screen for its whole camera range.
import { VW, WORLD_W, clamp } from './config.js';

export const MID_SCROLL = 0.4;
export const PLATE_FADE = 480;
export const PLATE_W = 1400, PLATE_H = 540;

export const STREAMS = Object.freeze({
  1: Object.freeze({
    far: 's1-far', floor: 's1-floor',
    zones: Object.freeze([
      Object.freeze({ plate: 's1-mid0' }),
      Object.freeze({ plate: 's1-mid1' }),
      Object.freeze({ plate: 's1-mid2' }),
      Object.freeze({ plate: 's1-mid3' }),
    ]),
  }),
  2: Object.freeze({
    far: 's2-far', floor: 's2-floor',
    zones: Object.freeze([
      Object.freeze({ plate: 's2-mid0' }),
      Object.freeze({ plate: 's2-mid1' }),
      Object.freeze({ plate: 's2-mid2' }),
      Object.freeze({ plate: 's2-mid2' }),
    ]),
  }),
  3: Object.freeze({
    far: 's3-far', floor: 's3-floor',
    zones: Object.freeze([
      Object.freeze({ plate: 's3-mid0' }),
      Object.freeze({ plate: 's3-mid1' }),
      Object.freeze({ plate: 's3-mid2' }),
      Object.freeze({ plate: 's3-mid2' }),
    ]),
  }),
});

/** Zone list including the boss arena as the final plate slot. */
export function streamZones(def) {
  return [...def.zones, def.boss];
}

/** Camera X at which zone i's plate fills the screen (its locked fight camera). */
export function plateAnchor(i, def, vw = VW) {
  return clamp(streamZones(def)[i].l, 0, WORLD_W - vw);
}

/** Consecutive zones that share a plate key merge into one run (one image, no fade). */
export function plateRuns(def, stageNo = def.no) {
  const plan = STREAMS[stageNo];
  const n = Math.min(plan.zones.length, streamZones(def).length);
  const runs = [];
  for (let i = 0; i < n; i++) {
    const key = plan.zones[i].plate;
    const last = runs[runs.length - 1];
    if (last && last.plate === key) last.to = i;
    else runs.push({ plate: key, from: i, to: i, anchor: plateAnchor(i, def) });
  }
  return runs;
}

/** Fade-in progress of every run at camX: run 0 is always 1, run k ramps 0→1 over PLATE_FADE before its anchor. */
export function plateAlphas(camX, def, fade = PLATE_FADE) {
  return plateRuns(def).map((run, k) => (k ? clamp((camX - (run.anchor - fade)) / fade, 0, 1) : 1));
}

/** Index of the run that dominates the screen at camX (topmost run at ≥ 50% opacity). */
export function plateRunForCam(camX, def) {
  const a = plateAlphas(camX, def);
  let k = 0;
  for (let i = 0; i < a.length; i++) if (a[i] >= 0.5) k = i;
  return k;
}

/** Which stream zone index's plate dominates the screen at camX. */
export function plateIndexForCam(camX, def) {
  return plateRuns(def)[plateRunForCam(camX, def)].from;
}

export function plateKeyForCam(camX, def, stageNo = def.no) {
  return plateRuns(def, stageNo)[plateRunForCam(camX, def)].plate;
}

export function plateKeys(stageNo) {
  const plan = STREAMS[stageNo];
  const keys = [plan.far, plan.floor];
  for (const z of plan.zones) if (!keys.includes(z.plate)) keys.push(z.plate);
  return keys;
}

/**
 * Parallax-space rect of run k. A tile seam lands on screen x 0 when the camera is at
 * the anchor, so the fight sees the painted plate from its left edge. The strip covers
 * the screen from fade-in start until the next run is fully opaque.
 */
export function plateRect(k, def, { vw = VW, scroll = MID_SCROLL, fade = PLATE_FADE, tileW = PLATE_W } = {}) {
  const runs = plateRuns(def);
  const run = runs[k];
  const maxCam = WORLD_W - vw;
  const c0 = k ? Math.max(0, run.anchor - fade) : 0;
  const c1 = k + 1 < runs.length ? runs[k + 1].anchor : maxCam;
  const lead = Math.ceil((run.anchor - c0) * scroll / tileW);
  const x = run.anchor * scroll - lead * tileW;
  const w = Math.ceil(c1 * scroll + vw - x) + 8;
  return { x, w, c0, c1, tileW };
}
