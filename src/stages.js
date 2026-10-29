import { plateKeys } from './zone-stream.js';
import { STAGE1 } from './stage1-def.js';
import { STAGE2 } from './stage2-def.js';
import { STAGE3 } from './stage3-def.js';
import { STAGE4 } from './stage4-def.js';
import { STAGE5 } from './stage5-def.js';
export const STAGES = Object.freeze({ 1: STAGE1, 2: STAGE2, 3: Object.freeze({ ...STAGE3, next: 4 }), 4: STAGE4, 5: STAGE5 });
export const maxStage = 5;
export const STAGE_VARIANTS = Object.freeze({ 1: [], 2: [], 3: [], 4: ['salsero'], 5: ['salsero', 'tagger'] });
export const CAGED = new Set([3]);
const shared = ['bob','dad','yetti_walker','yetti_guard','yetti_hover','yetti_charger','yetti_choir','yetti_lecturer','papi_stampede'];
export const STAGE_CHARS = Object.freeze({ 1: [...shared,'interventionist'], 2: [...shared,'choirmaster'], 3: [...shared,'wingman','claudia'], 4: [...shared,'yetti_salsero','bouncer'], 5: [...shared,'yetti_salsero','yetti_tagger','dj'] });

export const STAGE_TEXTURES = Object.freeze(Object.fromEntries(Object.values(STAGES).map(s=>[s.no,plateKeys(s.no)])));
export const VOLLEY_BANDS = [[572,611],[612,650],[651,690]];
export const resolveStage = n => STAGES[n] || STAGE1;
