// Chapter select uses the same stage openers as campaign continuation.
import { INTRO_V2, STAGE_CLIPS } from './cutscene.js';

/** Clip key for a chapter start, or null when this chapter has no opening intro. */
export function chapterIntroKey(stage, query) {
  const no = Number(stage) || 1;
  // Keep both full-length openings available through an explicit selection.
  if (no === 1 && INTRO_V2.enabled(query)) return 'intro_v2';
  if (no === 1 && query?.get?.('intro') === 'v3') return 'intro';
  const key = `stage${no}`;
  return STAGE_CLIPS[key] ? key : null;
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
