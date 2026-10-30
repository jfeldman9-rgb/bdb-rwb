import { STAGE_CHARS } from './stages.js';
export const CHARS = STAGE_CHARS[1];
export const ALL_CHARS = [...new Set(Object.values(STAGE_CHARS).flat().concat(['yetti_hover','yetti_charger','yetti_choir','yetti_lecturer']))];
export function queueCharJson(scene){for(const key of ALL_CHARS)scene.load.json(key+'.A',`assets/chars/${key}.anims.json`);}
// GPU-compressed pages (tools/compress-ktx.py): Phaser's load.texture takes the first format the
// renderer supports in key order, so iPhone gets ASTC, older GLES3 gets ETC2, everything else the webp.
export function charPageSources(m,p){const dir='assets/chars/',atlasURL=`${dir}${p}.json`,src={};
  // The stampede KTX pages still hold the hot-pink matte. The webp is keyed, so this page stays on IMG.
  const keyed=String(p).startsWith('papi_stampede');
  if(!keyed)for(const fmt of ['ASTC','ETC'])if(m.gpu?.[fmt])src[fmt]={type:'KTX',textureURL:`${dir}${p}.${m.gpu[fmt]}`,atlasURL};
  src.IMG={textureURL:`${dir}${p}.webp`,atlasURL};return src;}
export function queueCharPages(scene,keys=CHARS){for(const key of keys){const m=scene.cache?.json?.get?.(key+'.A');if(!m?.pages?.length)throw new Error(`Missing character metadata: ${key}`);for(const p of m.pages)if(!scene.textures.exists(p)){
  if(m.gpu)scene.load.texture(p,charPageSources(m,p));else scene.load.atlas(p,`assets/chars/${p}.webp`,`assets/chars/${p}.json`);}}}
export function makeCharAnims(scene,keys=CHARS){const metas={};for(const key of keys){const m=scene.cache?.json?.get?.(key+'.A');if(!m?.anims?.length||!m?.pages?.length)throw new Error(`Missing character metadata: ${key}`);
  if(scene.textures?.exists)for(const p of m.pages)if(!scene.textures.exists(p))throw new Error(`Missing character page: ${p}`);
  metas[key]=m;
  for(const a of m.anims)if(!scene.anims.exists(a.name))scene.anims.create({key:a.name,frames:a.frames.map((frame,i)=>({key:m.pages[a.pages[i]],frame,duration:Math.max(0,a.holds[i]-1)})),frameRate:1000,repeat:a.loop?-1:0});
}return metas;}
export function releaseChars(scene,keys){for(const key of keys){const m=scene.cache.json.get(key+'.A');if(!m)continue;for(const a of m.anims)scene.anims.remove(a.name);for(const p of m.pages)if(scene.textures.exists(p))scene.textures.remove(p);}}
export function residencyDelta(from,to){return{release:from.filter(k=>!to.includes(k)),load:to.filter(k=>!from.includes(k))};}

/** Sock projectile atlas (all stages). Packed by tools/pack-sock.py into assets/fx/. */
export function queueSockAtlas(scene){
  if(!scene.textures.exists('sock-0'))scene.load.atlas('sock-0','assets/fx/sock-0.webp','assets/fx/sock-0.json');
  if(!scene.cache.json.exists('sock.A'))scene.load.json('sock.A','assets/fx/sock.anims.json');
}
export function makeSockAnims(scene){
  const m=scene.cache.json.get('sock.A');
  if(!m?.anims?.length)throw new Error('Missing sock.anims.json');
  for(const a of m.anims){
    if(scene.anims.exists(a.name))continue;
    scene.anims.create({
      key:a.name,
      frames:a.frames.map((frame,i)=>({key:m.pages[a.pages[i]],frame,duration:Math.max(0,a.holds[i]-1)})),
      frameRate:1000,
      repeat:a.loop?-1:0,
    });
  }
  return m;
}
