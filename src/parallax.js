// RWB-style scrolling parallax: slow far plate, zone mid plates, tiled floor.
import { VW, VH, WORLD_W, LANE_TOP } from './config.js';
import { STREAMS, MID_SCROLL, PLATE_H, plateRuns, plateRect, plateAlphas, plateRunForCam } from './zone-stream.js';

export const FAR_SCROLL = 0.12;
export { MID_SCROLL };

/**
 * Build layered backdrop for a stage. Each mid run is a tiled strip anchored to its zone's
 * fight camera (see zone-stream.js); syncParallax crossfades them as the camera advances.
 * Far lags with scrollFactor; floor tiles with the world.
 */
export function buildParallax(scene, def) {
  const plan = STREAMS[def.no];
  const far = scene.add.image(0, 0, plan.far).setOrigin(0, 0).setScrollFactor(FAR_SCROLL).setDepth(-100);
  const farW = VW + (WORLD_W - VW) * FAR_SCROLL + 80;
  far.setDisplaySize(farW, VH * 0.82).setTint(0xb8c4e0);

  const mids = plateRuns(def).map((run, k) => {
    const rect = plateRect(k, def);
    const src = scene.textures?.get?.(run.plate)?.getSourceImage?.() || {};
    const image = scene.add.tileSprite(rect.x, LANE_TOP - 8, rect.w, PLATE_H, run.plate)
      .setOrigin(0, 1)
      .setScrollFactor(MID_SCROLL, 1)
      .setDepth(-50 + k * 0.1)
      .setTileScale(rect.tileW / (src.width || 1280), PLATE_H / (src.height || 720));
    return { image, plate: run.plate, index: run.from, run: k, rect };
  });

  const floorH = VH - LANE_TOP + 80;
  const floor = scene.add.tileSprite(0, LANE_TOP - 40, WORLD_W + 200, floorH, plan.floor)
    .setOrigin(0, 0)
    .setDepth(-40)
    .setScrollFactor(1);

  const title = scene.add.text(32, 490, def.title, {
    fontFamily: 'Arial', fontSize: 18, color: '#ffe0a1', fontStyle: 'bold',
  }).setScrollFactor(0).setAlpha(0.55).setDepth(-30);

  const layers = { far, mids, floor, title, plan, stageNo: def.no, def };
  syncParallax(layers, 0);
  return layers;
}

/**
 * Crossfade mid runs for camX: the incoming run fades in on top of an opaque outgoing run
 * (so the far sky never bleeds through), and runs fully covered by a later one are hidden.
 */
export function syncParallax(backdrop, camX) {
  if (!backdrop?.mids?.length) return;
  const alphas = plateAlphas(camX, backdrop.def);
  let cover = 0;
  for (let k = 0; k < alphas.length; k++) if (alphas[k] >= 1) cover = k;
  for (const m of backdrop.mids) {
    const a = alphas[m.run] ?? 0;
    const on = m.run >= cover && a > 0;
    m.image.setVisible(on);
    if (on) m.image.setAlpha(a);
  }
}

/** The mid plate dominating the screen at camX (for tests / debug). */
export function activeMid(backdrop, camX, def) {
  if (!backdrop) return null;
  return backdrop.mids[plateRunForCam(camX, def)] || null;
}

export function destroyParallax(backdrop) {
  if (!backdrop) return;
  backdrop.far?.destroy();
  backdrop.floor?.destroy();
  backdrop.title?.destroy();
  for (const m of backdrop.mids || []) m.image?.destroy();
}
