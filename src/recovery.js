// Freeze-guard recovery (restart fix). The Reload card reopens the stage the player was on instead of the title.
// In the Stage 1 pre-fight sum (main.js imports it) and capped again under restartHotfix.
import { installGraphicsNotice } from './graphics-notice.js';

/** The current URL with ?stage=N&autostart=1&resume=1; every other parameter is kept. */
export function resumeUrl(href, stage) {
  const u = new URL(href);
  u.searchParams.set('stage', String(stage));
  u.searchParams.set('autostart', '1');
  u.searchParams.set('resume', '1');
  return u.href;
}

/** Reload into the running stage. On the title (or with no stage to read) this is a plain reload. */
export function resumeGame(root = globalThis, game = root.__game) {
  const s = game?.scene?.getScene?.('gameplay'), loc = root.location;
  if (s?.started && s.stageNo >= 1 && loc?.href && typeof loc.replace === 'function') {
    try { loc.replace(resumeUrl(loc.href, s.stageNo)); return 'resume'; } catch (e) { }
  }
  loc?.reload?.();
  return 'reload';
}

/** The frame guard's card. Reload picks up at the stage the player was on. */
export function showStuck(root, error, game) {
  const by = id => root.document?.getElementById?.(id), set = (id, t) => { const el = by(id); if (el) el.textContent = t; };
  const card = by('startup-error'); if (!card) return false;
  set('startup-title', 'The game hit a snag');
  set('startup-description', 'This stage stopped running. Reload game picks up at the start of this stage.');
  set('startup-code', `Code: FRAME_ERROR ${error?.name || ''}`);
  by('startup-retry')?.addEventListener?.('click', () => resumeGame(root, game));
  card.hidden = false;
  return true;
}

/**
 * After a resumed boot has started its stage, drop the one-shot autostart/resume flags so a later return to
 * the title shows the title, and tidy the address bar. ?stage=N stays, so a manual reload preselects the stage.
 */
export function installResumeCleanup(game, q, root = globalThis) {
  if (!q?.has?.('resume') || !game?.events?.on) return false;
  const check = () => {
    if (!game.scene?.getScene?.('gameplay')?.started) return;
    game.events.off?.('step', check);
    q.delete('autostart'); q.delete('resume');
    try {
      const u = new URL(root.location.href);
      u.searchParams.delete('autostart'); u.searchParams.delete('resume');
      root.history?.replaceState?.(root.history.state, '', u.href);
    } catch (e) { }
  };
  game.events.on('step', check);
  return true;
}

/** How long a running, unpaused stage may go without a frame before the stuck card. */
export const FREEZE_MS = 8000;

/**
 * Notices a stalled gameplay loop. The timer sits outside Phaser, so it still
 * runs when the frame loop has died. GameScene.update calls `game.beat` each frame.
 * A paused stage (manual, cutscene, rotate) is not a stall.
 */
export function installFreezeGuard(game, root = globalThis, opts = {}) {
  const limit = opts.limit ?? FREEZE_MS;
  const clock = () => root.performance?.now?.() ?? Date.now();
  let last = clock();
  let shown = false;
  const scene = () => game?.scene?.getScene?.('gameplay');
  const note = () => { last = clock(); };
  const trip = (error) => {
    if (shown) return;
    if (!scene()?.started) return;
    shown = true;
    showStuck(root, error instanceof Error ? error : new Error(String(error || 'frame')), game);
  };
  if (game) game.beat = note;
  const timer = root.setInterval?.(() => {
    const s = scene();
    if (!s?.started || s.world?.paused || game?.isPaused) { note(); return; }
    if (clock() - last > limit) trip(new Error('freeze'));
  }, opts.interval ?? 1000);
  const onError = (event) => {
    if (!scene()?.started) return;
    const origin = root.location?.origin;
    if (origin && event?.filename && !event.filename.startsWith(origin + '/')) return;
    trip(event?.error || event?.message || 'error');
  };
  root.addEventListener?.('error', onError);
  return {
    note,
    destroy() {
      if (timer != null) root.clearInterval?.(timer);
      if (game?.beat === note) game.beat = null;
      root.removeEventListener?.('error', onError);
    },
  };
}

/** Freeze guard plus a graphics-retry that reopens the running stage. */
export function installStageRecovery(game, root = globalThis) {
  const freeze = installFreezeGuard(game, root);
  const notice = installGraphicsNotice(root, () => resumeGame(root, game));
  return { notice, destroy() { freeze.destroy(); notice.destroy(); } };
}
