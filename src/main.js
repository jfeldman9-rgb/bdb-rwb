import { VW,VH,RS0,q,coarsePointer } from './config.js';
import { Input } from './input.js';
import { installViewportFit } from './viewport.js';
import { queueCharJson,queueCharPages,makeCharAnims } from './assets.js';
import { GameScene } from './game-scene.js';
import { loadSave,persistSave } from './save.js';
import { resolveDifficulty } from './difficulty.js';
import { createStoryPlayer } from './cutscene-hooks.js';
import { registerVoiceLines } from './voice-lines.js';
import { installAudioLifecycle,unlock,toggleMute,isMuted } from './audio.js';
import { installGraphicsLifecycle } from './graphics-lifecycle.js';
import { installGraphicsNotice } from './graphics-notice.js';
import { perf, bindPerfLifecycle } from './perf.js';

class Boot extends Phaser.Scene {
 constructor(){super('boot');}
 preload(){window.__bdbStartup?.watchLoader(this.load);queueCharJson(this);this.load.image('chapter1-boulevard','assets/bg/chapter1-boulevard.webp');}
 create(){this.scene.start('title');}
}
class Title extends Phaser.Scene {
 constructor(){super('title');}
 preload(){window.__bdbStartup?.watchLoader(this.load);queueCharPages(this,['bob']);}
 create(){
  const metas=makeCharAnims(this,['bob']);this.game.residentChars=['bob'];this.game.residentTextures=['chapter1-boulevard'];
  this.add.image(640,360,'chapter1-boulevard').setDisplaySize(1280,720).setTint(0x78849f);
  const m=metas.bob,a=m.anims[0];this.add.sprite(990,690,m.pages[a.pages[0]],a.frames[0]).setOrigin(.5,.95).setScale(1.04).play('bob_idle');
  const doc=document;doc.getElementById('title').hidden=false;doc.getElementById('boot').hidden=true;window.__bdbStartup?.ready();
  this.save=loadSave(undefined,coarsePointer());const difficulty=doc.getElementById('difficulty'),chapter=doc.getElementById('chapter');
  difficulty.querySelector('[value="nightmare"]').disabled=!this.save.beaten;difficulty.value=this.save.difficulty;
  for(const o of chapter.options)o.disabled=Number(o.value)>this.save.unlockedStage;
  chapter.value=String(Math.min(this.save.unlockedStage,Math.max(1,Number(q.get('stage'))||1)));
  doc.getElementById('auto-fire').checked=this.save.autoFire;
  this.begin=()=>{if(this.starting)return;this.starting=true;unlock();this.game.story.bless();
   this.save={...this.save,difficulty:resolveDifficulty(difficulty.value,this.save.beaten,coarsePointer()),autoFire:doc.getElementById('auto-fire').checked};persistSave(this.save);
   doc.getElementById('title').hidden=true;this.game.inp.clear();
   this.game.story.play('intro',()=>this.scene.start('gameplay',{stage:Number(chapter.value),difficulty:this.save.difficulty,save:this.save}));
  };
  doc.getElementById('start').addEventListener('click',this.begin);
  this.events.once('shutdown',()=>doc.getElementById('start').removeEventListener('click',this.begin));
  if(q.get('demo')==='1'||q.get('autostart')==='1'){
   // Demo can exercise any chapter without changing saved unlocks.
   if(q.get('demo')==='1'){chapter.value=String(Math.max(1,Math.min(3,Number(q.get('stage'))||1)));difficulty.value='adventure';}
   this.begin();
  }
 }
 update(t,delta){this.game.inp.update(delta/1000);if(this.game.inp.take('start')||this.game.inp.take('fire'))this.begin();}
}
export function bootGame(){
 registerVoiceLines();const game=new Phaser.Game({type:Phaser.WEBGL,parent:'game',width:VW,height:VH,backgroundColor:'#101421',resolution:RS0,
  scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},render:{antialias:true,roundPixels:false},scene:[Boot,Title,GameScene],
  callbacks:{preBoot:g=>{g.inp=new Input();g.story=createStoryPlayer(q);}},audio:{noAudio:true}});
 window.__game=game;installViewportFit(game);game.rs=RS0;window.__bdbPerf=perf;bindPerfLifecycle(perf);installAudioLifecycle(game);
 const notice=installGraphicsNotice();installGraphicsLifecycle({game,getStage:()=>game.scene.getScene('gameplay'),onLost:()=>notice.lost(),onRestored:()=>notice.restored()});
 const pause=()=>{const scene=game.scene.getScene('gameplay');if(scene?.world)scene.setPauseReason('manual',!scene.pauseReasons.has('manual'));};
 document.getElementById('pause').onclick=pause;document.getElementById('mute').onclick=()=>{toggleMute();document.getElementById('mute').textContent=isMuted()?'Sound off':'Sound on';};
 document.getElementById('replay').onclick=()=>location.assign(location.pathname);
 const background=()=>{const scene=game.scene.getScene('gameplay');if(scene?.world)scene.setPauseReason('background',document.hidden);};document.addEventListener('visibilitychange',background);
 game.events.once('ready',()=>{const gl=game.renderer.gl;const ext=gl?.getExtension('WEBGL_debug_renderer_info');const renderer=ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'WebGL';window.__perf={renderer,software:/swiftshader|llvmpipe/i.test(renderer)};});
 return game;
}
