// Backdrop streams: one far plate + one mid plate per fight zone (incl. boss), shared floor.
// Mirrors RWB zone-stream STREAMS shape, simplified for BDB's three stages.
import { WORLD_W } from './config.js';

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

/** Which stream zone index the camera center sits in. */
export function plateIndexForCam(camX, def, vw = 1280) {
  const zones = streamZones(def);
  let i = 0;
  const probe = camX + vw * 0.5;
  for (let z = 0; z < zones.length; z++) {
    if (probe >= zones[z].l) i = z;
  }
  return i;
}

export function plateKeyForCam(camX, def, stageNo = def.no) {
  const plan = STREAMS[stageNo];
  const i = plateIndexForCam(camX, def);
  return plan.zones[Math.min(i, plan.zones.length - 1)].plate;
}

export function plateKeys(stageNo) {
  const plan = STREAMS[stageNo];
  const keys = [plan.far, plan.floor];
  for (const z of plan.zones) if (!keys.includes(z.plate)) keys.push(z.plate);
  return keys;
}

export function plateRect(i, def, bleed = 48) {
  const zones = streamZones(def);
  const l = zones[i].l;
  const last = i + 1 >= zones.length;
  const r = last ? WORLD_W : zones[i + 1].l;
  return { x: Math.max(0, l - (i ? bleed : 0)), w: r + bleed - Math.max(0, l - (i ? bleed : 0)) };
}
