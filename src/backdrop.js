// Multi-plate parallax entry: wraps parallax.js and exposes backdropPlan for tests.
import { buildParallax, destroyParallax, FAR_SCROLL, MID_SCROLL } from './parallax.js';
import { STREAMS, streamZones, plateRect, plateKeys, plateIndexForCam } from './zone-stream.js';

export const ART_GAPS = Object.freeze([
  'Per-chapter far sky plate ≥2172×724 (RWB bg-far); current s*-far.webp are 1600×720 derivatives',
  'Per-chapter mid street plates ≥2172×724 with unique zone art (current mids are 1280 crops/variants)',
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
    plates: plan.zones.map((z, i) => ({
      key: z.plate, index: i, ...plateRect(i, def), zoneL: zones[i].l, zoneR: zones[i].r,
    })),
    keys: plateKeys(def.no),
    parallax: { far: FAR_SCROLL, mid: MID_SCROLL, floor: 1 },
  };
}

export function buildBackdrop(scene, def) {
  const layers = buildParallax(scene, def);
  return {
    ...layers,
    activePlate(camX) {
      const i = plateIndexForCam(camX, def);
      return layers.mids?.[Math.min(i, (layers.mids?.length || 1) - 1)]?.plate || null;
    },
    destroy() { destroyParallax(layers); },
  };
}
