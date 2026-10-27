import { STAGE_CHARS } from './stages.js';
export const CHARS = STAGE_CHARS[1];
export const ALL_CHARS = [...new Set(Object.values(STAGE_CHARS).flat().concat(['yetti_hover','yetti_charger','yetti_choir','yetti_lecturer']))];
export function queueCharJson(scene){for(const key of ALL_CHARS)scene.load.json(key+'.A',`assets/chars/${key}.anims.json`);}
export function queueCharPages(scene,keys=CHARS){for(const key of keys){const m=scene.cache.json.get(key+'.A');for(const p of m.pages)if(!scene.textures.exists(p))scene.load.atlas(p,`assets/chars/${p}.webp`,`assets/chars/${p}.json`);}}
export function makeCharAnims(scene,keys=CHARS){const metas={};for(const key of keys){const m=scene.cache.json.get(key+'.A');metas[key]=m;
  for(const a of m.anims)if(!scene.anims.exists(a.name))scene.anims.create({key:a.name,frames:a.frames.map((frame,i)=>({key:m.pages[a.pages[i]],frame,duration:Math.max(0,a.holds[i]-1)})),frameRate:1000,repeat:a.loop?-1:0});
}return metas;}
export function releaseChars(scene,keys){for(const key of keys){const m=scene.cache.json.get(key+'.A');if(!m)continue;for(const a of m.anims)scene.anims.remove(a.name);for(const p of m.pages)if(scene.textures.exists(p))scene.textures.remove(p);}}
export function residencyDelta(from,to){return{release:from.filter(k=>!to.includes(k)),load:to.filter(k=>!from.includes(k))};}
