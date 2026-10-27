import { isBossFinisherReady } from './wingman.js';
// The demo issues ordinary controls only. No damage, health, position or resource edits.
export class Bot {
  constructor() { this.time=0;this.nextMash=0; }
  update(dt,w) {
    this.time+=dt;const b=w.bob, out={x:0,y:0,fire:false};
    if(b.state==='grabbed'){if(this.time>=this.nextMash){out.presses=1;this.nextMash=this.time+.09;}return out;}
    const foes=w.enemies.filter(e=>e.alive&&!(e.type==='wingman'&&e.phase===3&&e.hp<=1));
    const all=w.enemies.filter(e=>e.alive);
    if(isBossFinisherReady(w.wingmen?.phase,all.filter(e=>e.boss))&&w.papi.charges){out.papi=true;return out;}
    if(w.dadCall.charges&&all.length>=2){out.dad=true;return out;}
    if(w.papi.charges&&all.filter(e=>!e.boss).length>=2&&w.wingmen?.phase!==3){out.papi=true;return out;}
    const pickup=w.pickups.filter(p=>p.x>w.bounds.l+50&&p.x<w.bounds.r-50).sort((a,c)=>Math.abs(a.x-b.x)-Math.abs(c.x-b.x))[0];
    if(pickup && (w.papi.charges<1 || !foes.length)){
      out.x=Math.abs(pickup.x-b.x)>15?Math.sign(pickup.x-b.x):0;out.y=Math.abs(pickup.y-b.y)>12?Math.sign(pickup.y-b.y):0;return out;
    }
    if(!foes.length){out.x=w.locked?0:1;return out;}
    const e=foes.sort((a,c)=>(a.type==='choir'?-200:0)+Math.abs(a.x-b.x)-(c.type==='choir'?-200:0)-Math.abs(c.x-b.x))[0];
    const dx=e.x-b.x,dy=e.y-b.y,side=Math.sign(dx)||1;
    out.y=Math.abs(dy)>10?Math.sign(dy):0;
    out.x=Math.abs(dx)>(e.shield?65:290)?side:0;
    if(b.facing!==side)out.x=side;
    out.fire=Math.abs(dy)<35&&b.facing===side;
    if(e.shield&&Math.abs(dx)<160&&Math.abs(dy)<35)out.dash=true;
    if((e.state==='telegraph'||e.state==='rush')&&Math.abs(dx)<200)out.jump=true;
    if(w.hostile.some(p=>Math.abs(p.x-b.x)<180&&Math.abs(p.y-b.y)<28))out.jump=true;
    return out;
  }
}
