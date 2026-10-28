import { CutscenePlayer, STAGE_CLIPS, SKIP_ACTIONS, cutscenesEnabled, STORY_MAX_MS } from './cutscene.js';
import { KEYS } from './input.js';
import { consumePress } from './press-ownership.js';
/**
 * Pause the Phaser loop behind a full-screen clip (battery/draw on iPhone).
 * Returns the matching resume; safe when the game is already paused or gone.
 */
export function pauseForClip(game) {
  const owns = !!game && !game.isPaused && typeof game.pause === 'function';
  if (owns) game.pause();
  return () => { if (owns && game.isPaused && !game.pendingDestroy) game.resume?.(); };
}
export function createStoryPlayer(query, root=globalThis, input=null){
 const player=new CutscenePlayer(root,{maxMs:STORY_MAX_MS});let handle=null;
 const key=e=>{const action=KEYS[e.code];if(handle&&SKIP_ACTIONS.has(action)){if(input)consumePress(input,action);else e.preventDefault();handle.skip('key',action==='start'||action==='pause');}};
 root.addEventListener?.('keydown',key);
 return { player, bless:()=>player.bless(), play(key,done){
   if(!cutscenesEnabled(query,root.navigator)||!STAGE_CLIPS[key]){done();return;}
   handle=player.play(STAGE_CLIPS[key],{done:()=>{handle=null;done();},touch:root.matchMedia?.('(pointer: coarse)').matches});
 },destroy(){handle?.abort();handle=null;root.removeEventListener?.('keydown',key);} };
}
