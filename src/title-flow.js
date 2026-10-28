// Chapter select. The 61s intro is the opening of chapter 1. Later chapters
// start on their own stage clips instead of replaying it.
import { INTRO_V2 } from './cutscene.js';

/** Clip key for a chapter start, or null when this chapter has no opening intro. */
export function chapterIntroKey(stage, query) {
  if ((Number(stage) || 1) > 1) return null;
  return INTRO_V2.enabled(query) ? 'intro_v2' : 'intro';
}

/**
 * Title start. Plays the chapter intro when there is one, then starts gameplay.
 * A null key starts immediately. `play` is story.play.
 */
export function beginChapter({ stage, query, play, start }) {
  const key = chapterIntroKey(stage, query);
  if (!key) { start(); return null; }
  play(key, () => start());
  return key;
}
