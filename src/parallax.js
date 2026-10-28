// RWB-style scrolling parallax: slow far plate, zone mid plates, tiled floor.
import { VW, VH, WORLD_W, LANE_TOP } from './config.js';
import { STREAMS, streamZones, plateRect, plateIndexForCam } from './zone-stream.js';

export const FAR_SCROLL = 0.12;
export const MID_SCROLL = 0.4;

/**
 * Build layered backdrop for a stage. Mid plates sit on zone world X so advancing
 * through zones reveals distinct art; far lags with scrollFactor; floor tiles with the world.
 */
export function buildParallax(scene, def) {
  const plan = STREAMS[def.no];
  const far = scene.add.image(0, 0, plan.far).setOrigin(0, 0).setScrollFactor(FAR_SCROLL).setDepth(-100);
  const farW = VW + (WORLD_W - VW) * FAR_SCROLL + 80;
  far.setDisplaySize(farW, VH * 0.82).setTint(0xb8c4e0);

  const mids = [];
  const zones = streamZones(def);
  for (let i = 0; i < plan.zones.length; i++) {
    const slot = plan.zones[i];
    const rect = plateRect(i, def);
    const mid = scene.add.image(rect.x, LANE_TOP - 8, slot.plate)
      .setOrigin(0, 1)
      .setScrollFactor(MID_SCROLL, 1)
      .setDepth(-50)
      .setDisplaySize(rect.w / MID_SCROLL * 0.55 + rect.w * 0.45, 520);
    // Keep a readable width covering the zone under mid parallax.
    mid.setDisplaySize(Math.max(rect.w + 120, 1400), 540);
    mids.push({ image: mid, plate: slot.plate, index: i, zoneL: zones[i].l });
  }

  const floorH = VH - LANE_TOP + 80;
  const floor = scene.add.tileSprite(0, LANE_TOP - 40, WORLD_W + 200, floorH, plan.floor)
    .setOrigin(0, 0)
    .setDepth(-40)
    .setScrollFactor(1);

  const title = scene.add.text(32, 490, def.title, {
    fontFamily: 'Arial', fontSize: 18, color: '#ffe0a1', fontStyle: 'bold',
  }).setScrollFactor(0).setAlpha(0.55).setDepth(-30);

  return { far, mids, floor, title, plan, stageNo: def.no };
}

/** Highlight which mid plate the camera is over (for tests / debug). */
export function activeMid(backdrop, camX, def) {
  if (!backdrop) return null;
  const i = plateIndexForCam(camX, def);
  return backdrop.mids[Math.min(i, backdrop.mids.length - 1)] || null;
}

export function destroyParallax(backdrop) {
  if (!backdrop) return;
  backdrop.far?.destroy();
  backdrop.floor?.destroy();
  backdrop.title?.destroy();
  for (const m of backdrop.mids || []) m.image?.destroy();
}
