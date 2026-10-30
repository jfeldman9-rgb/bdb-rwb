// Chapter select uses the same stage openers as campaign continuation.
import { INTRO_V2, STAGE_CLIPS } from './cutscene.js';

/** Clip key for a chapter start, or null when this chapter has no opening intro. */
export function chapterIntroKey(stage, query) {
  const no = Number(stage) || 1;
  // Legacy full alternate. The default chapter-1 opening is intro_v3.
  if (no === 1 && INTRO_V2.enabled(query)) return 'intro_v2';
  // A freeze-reload retry, or an explicit short cut, plays only the stage clip.
  if (no === 1 && (query?.get?.('intro') === 'short' || query?.get?.('resume') === '1')) return 'stage1';
  if (no === 1) return 'intro';
  const key = `stage${no}`;
  return STAGE_CLIPS[key] ? key : null;
}

/** The title already played this chapter's short opener, so gameplay must not repeat it.
 *  The full intro is not that opener: chapter 1 follows it with the stage1 clip. */
export function stageIntroAlreadyPlayed(introKey) {
  return typeof introKey === 'string' && /^stage\d+$/.test(introKey);
}

/**
 * Title start. Plays the chapter intro when there is one, then starts gameplay.
 * A null key starts immediately. `play` is story.play.
 */
export function beginChapter({ stage, query, play, start }) {
  const key = chapterIntroKey(stage, query);
  if (!key) { start(null); return null; }
  play(key, () => start(key));
  return key;
}
