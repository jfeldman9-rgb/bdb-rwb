/** RWB portrait block: a phone held upright, not a narrow desktop window. */
export const PORTRAIT_BLOCK = '(orientation:portrait) and (hover:none) and (pointer:coarse)';

export function portraitBlocksPlay(matchMedia = globalThis.matchMedia) {
  try { return !!matchMedia?.(PORTRAIT_BLOCK)?.matches; }
  catch (e) { return false; }
}

/**
 * Cover portrait play with the rotate overlay's pause.
 * setPauseReason clears the input buffer, so this fires only when the block flips.
 */
export function syncRotatePause(scene, matchMedia = globalThis.matchMedia) {
  if (!scene?.setPauseReason || !scene.pauseReasons) return;
  const block = portraitBlocksPlay(matchMedia);
  if (block === scene.pauseReasons.has('rotate')) return;
  scene.setPauseReason('rotate', block);
}

/** One MediaQueryList for the life of the scene. The change event replaces a per-frame query. */
export function bindRotatePause(scene, matchMedia = globalThis.matchMedia) {
  let query = null;
  try { query = matchMedia?.(PORTRAIT_BLOCK) ?? null; } catch (e) { query = null; }
  const cached = () => query;
  const apply = () => syncRotatePause(scene, cached);
  apply();
  query?.addEventListener?.('change', apply);
  return () => query?.removeEventListener?.('change', apply);
}
