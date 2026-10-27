import { resolveDifficulty } from './difficulty.js';
export const SAVE_KEY = 'bdb-rwb-save-v1';
export const DEFAULT_SAVE = Object.freeze({ version: 1, beaten: false, unlockedStage: 1, bestScore: 0, difficulty: 'adventure', autoFire: false });
export function normalizeSave(value, touch = false) {
  const s = value && typeof value === 'object' ? value : {};
  const number = (v, fallback) => typeof v === 'number' && Number.isFinite(v) ? Math.floor(v) : fallback;
  const beaten = s.beaten === true;
  return { version: 1, beaten, unlockedStage: beaten ? 3 : Math.max(1, Math.min(3, number(s.unlockedStage ?? s.unlockedChapter, 1))),
    bestScore: Math.max(0, number(s.bestScore, 0)), difficulty: resolveDifficulty(s.difficulty, beaten, touch), autoFire: s.autoFire === true };
}
export function loadSave(storage, touch = false) {
  try { return normalizeSave(JSON.parse((storage ?? globalThis.localStorage)?.getItem(SAVE_KEY) ?? 'null'), touch); }
  catch { return normalizeSave(null, touch); }
}
export function persistSave(save, storage) {
  try { (storage ?? globalThis.localStorage)?.setItem(SAVE_KEY, JSON.stringify(normalizeSave(save))); return true; } catch { return false; }
}
export function clearStage(save, stage, score) {
  return normalizeSave({ ...save, unlockedStage: Math.max(save.unlockedStage, Math.min(3, stage + 1)),
    beaten: save.beaten || stage === 3, bestScore: Math.max(save.bestScore, score) });
}
