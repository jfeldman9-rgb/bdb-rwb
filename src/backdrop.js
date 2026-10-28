// Multi-plate parallax entry: wraps parallax.js and exposes backdropPlan for tests.
import { buildParallax, destroyParallax, syncParallax, FAR_SCROLL, MID_SCROLL } from './parallax.js';
import { STREAMS, streamZones, plateRuns, plateRect, plateKeys, plateKeyForCam } from './zone-stream.js';

export const ART_GAPS = Object.freeze([
  'Per-chapter far sky plate ≥2172×724 (RWB bg-far); current s*-far.webp are 1600×720 derivatives',
  'Stages 2 and 3 ship 3 mid plates; zone 3 and the boss arena share mid2 (stage 1 has 4)',
  'Per-chapter floor strips matching RWB bg-floor / bg-floor2 widths',
  'Optional world-space props (lamps, signs, cars) with normals for lit stages',
]);

export { FAR_SCROLL, MID_SCROLL, buildParallax, destroyParallax };

export function backdropPlan(def) {
  const plan = STREAMS[def.no];
  const zones = streamZones(def);
  return {
    stageNo: def.no,
    far: plan.far,
    floor: plan.floor,
    plates: plateRuns(def).map((run, k) => ({
      key: run.plate, index: run.from, run: k, anchor: run.anchor, ...plateRect(k, def),
      zoneL: zones[run.from].l, zoneR: zones[run.to].r,
    })),
    keys: plateKeys(def.no),
    parallax: { far: FAR_SCROLL, mid: MID_SCROLL, floor: 1 },
  };
}

export function buildBackdrop(scene, def) {
  const layers = buildParallax(scene, def);
  return {
    ...layers,
    update(camX) { syncParallax(layers, camX); },
    activePlate(camX) { return plateKeyForCam(camX, def); },
    destroy() { destroyParallax(layers); },
  };
}
