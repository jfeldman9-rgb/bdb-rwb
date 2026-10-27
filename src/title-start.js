/** Title-screen start wiring for phone + desktop.
 *  Big "TAP TO START", tap-anywhere on the title (skipping form controls),
 *  and the portrait rotate overlay CTA all call the same begin().
 */

export const START_LABEL = 'TAP TO START';
export const START_LABEL_DESKTOP = 'BEGIN THE RESCUE →';

export function isTitleControl(target) {
  return !!target?.closest?.('select,input,textarea,a,label');
}

/** True when a pointer event on the title should start the game. */
export function shouldStartFromTitleEvent(target, startEl) {
  if (!target) return false;
  if (isTitleControl(target)) return false;
  // The dedicated start button has its own listener; allow it through so a
  // single shared handler can own begin(), or skip if callers wire both.
  if (startEl && (target === startEl || startEl.contains?.(target))) return true;
  return true;
}

/**
 * Wire start CTAs. Returns a dispose function.
 * @param {{ doc?: Document, begin: () => void, coarse?: boolean }} opts
 */
export function wireTitleStart({ doc = globalThis.document, begin, coarse = false } = {}) {
  if (!doc || typeof begin !== 'function') return () => {};
  const start = doc.getElementById('start');
  const title = doc.getElementById('title');
  const rotateStart = doc.getElementById('rotate-start');
  const label = coarse ? START_LABEL : START_LABEL_DESKTOP;
  if (start) {
    start.textContent = label;
    start.setAttribute('aria-label', START_LABEL);
  }
  if (rotateStart) {
    rotateStart.textContent = START_LABEL;
    rotateStart.setAttribute('aria-label', START_LABEL);
  }

  const onStart = (e) => {
    e?.preventDefault?.();
    begin();
  };
  const onTitlePointer = (e) => {
    if (e.pointerType === 'mouse' && e.button != null && e.button !== 0) return;
    if (!shouldStartFromTitleEvent(e.target, start)) return;
    // Don't steal the native select/checkbox UI.
    if (isTitleControl(e.target)) return;
    e.preventDefault?.();
    begin();
  };

  start?.addEventListener('click', onStart);
  start?.addEventListener('pointerup', onStart);
  rotateStart?.addEventListener('click', onStart);
  rotateStart?.addEventListener('pointerup', onStart);
  title?.addEventListener('pointerup', onTitlePointer);

  return () => {
    start?.removeEventListener('click', onStart);
    start?.removeEventListener('pointerup', onStart);
    rotateStart?.removeEventListener('click', onStart);
    rotateStart?.removeEventListener('pointerup', onStart);
    title?.removeEventListener('pointerup', onTitlePointer);
  };
}
