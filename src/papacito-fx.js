// Fully clothed adult silhouette runners, crossing at normal speed.
import { PAPI_RUNNER_X0, PAPI_RUNNER_SPEED } from './papacito.js';
export class PapacitoFX {
 constructor(scene){this.scene=scene;this.runners=[];this.age=0;}
 start(){this.destroy();const m=this.scene.metas.papi_runners;
  for(let i=0;i<10;i++){const variant=i%4+1,a=m.anims.find(a=>a.name===`papi_runners_run${variant}`);
   const sprite=this.scene.add.sprite(-180-i*90,510+(i%2)*125,m.pages[a.pages[0]],a.frames[0]).setOrigin(.5,.95).setScale(.32).setScrollFactor(0).setDepth(18000+i).setTint([0xffd18f,0xb2dcef,0xeeaaca,0xb7dfbb][i%4]);sprite.play(a.name);this.runners.push(sprite);
  }this.age=0;
 }
 update(dt){this.age+=dt;for(let i=0;i<this.runners.length;i++)this.runners[i].x=PAPI_RUNNER_X0-i*90+this.age*PAPI_RUNNER_SPEED;if(this.age>=2.5)this.destroy();}
 destroy(){for(const r of this.runners)r.destroy();this.runners=[];}
}
