import * as T from '../lib/three.module.min.js';
import { district } from './scenery.js';
import { MAP } from './world.js';

async function json(url){
  const r=await fetch(url);if(!r.ok)throw Error('Could not load '+url);return r.json();
}
async function atlas(kind,loader){
  const base='assets/chars/'+kind;
  const [sheet,anim,texture]=await Promise.all([json(base+'-0.json'),json(base+'.anims.json'),loader.loadAsync(base+'-0.webp')]);
  texture.colorSpace=T.SRGBColorSpace;texture.minFilter=T.LinearFilter;texture.generateMipmaps=false;
  return {sheet,texture,animations:new Map(anim.anims.map(a=>[a.name.slice(kind.length+1),a])),baseline:anim.baseline*anim.scale};
}
const palette={seal:0xe5a6ff, gate:0xf9d385, shrine:0xcafb81, danger:0xff696e};

export class WorldView {
  constructor(canvas){
    this.canvas=canvas;
    this.renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'low-power'});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.45));
    this.camera=new T.PerspectiveCamera(45,1,.15,160);
    this.loader=new T.TextureLoader();this.atlases=new Map();this.actors=new Map();this.dynamic=new Map();
    this.width=0;this.height=0;this.destination=new T.Vector3();
  }
  async load(game){
    this.clear();this.scene=new T.Scene();const def=game.def;
    this.scene.background=new T.Color(def.sky);this.scene.fog=new T.FogExp2(def.sky,.011);
    this.scene.add(new T.HemisphereLight(0xd6ddff,0x79648a,1.27));
    const sun=new T.DirectionalLight(0xffdfc6,1.65);sun.position.set(-15,26,-8);this.scene.add(sun);
    district(this.scene,def,this.loader);
    this.actorPlane=new T.PlaneGeometry(1,1);
    this.shadowGeo=new T.CircleGeometry(1,24);this.shadowMat=new T.MeshBasicMaterial({color:0x23162b,transparent:true,opacity:.36,depthWrite:false});
    this.shotGeo=new T.SphereGeometry(1,10,7);this.shotMat=new T.MeshStandardMaterial({color:0x8229af,emissive:0x56216b});
    this.tipGeo=new T.ConeGeometry(.13,.33,6);this.tipMat=new T.MeshBasicMaterial({color:0xa0c467});
    this.ringGeo=new T.RingGeometry(.86,1,48);this.dangerMat=new T.MeshBasicMaterial({color:palette.danger,side:T.DoubleSide,transparent:true,opacity:.84,depthWrite:false});
    this.targetRing=new T.Mesh(new T.RingGeometry(.92,1,32),new T.MeshBasicMaterial({color:0xe7fc95,transparent:true,opacity:.79,side:T.DoubleSide,depthWrite:false}));
    this.targetRing.rotation.x=-Math.PI/2;this.scene.add(this.targetRing);
    this.markers=[...game.sites.map(site=>this.marker(site,'seal')),this.marker(game.shrine,'shrine'),this.marker(game.gate,'gate')];
    const kinds=new Set(['bob','dad','papi_stampede',def.boss.type,...def.enemies.slice(0,def.no>=4?4:3).map(k=>'yetti_'+k)]);
    if([3,6,7].includes(def.no))kinds.add('claudia');
    // Settle all requests before the caller can dispose a failed chapter load.
    const results=await Promise.allSettled([...kinds].map(async k=>{this.atlases.set(k,await atlas(k,this.loader));}));
    const failed=results.find(r=>r.status==='rejected');if(failed)throw failed.reason;
    this.follow=new T.Vector3(game.bob.x,0,game.bob.z);
    this.draw(game,1);
  }
  marker(site,kind){
    const color=palette[kind],group=new T.Group(),mat=new T.MeshBasicMaterial({color});
    const crystal=new T.Mesh(new T.OctahedronGeometry(.52),mat);
    crystal.scale.y=1.5;crystal.position.y=2.9;group.add(crystal);
    const halo=new T.Mesh(new T.TorusGeometry(.83,.05,6,40),mat);
    halo.rotation.x=Math.PI/2;halo.position.y=2.86;group.add(halo);
    const floor=new T.Mesh(new T.RingGeometry(1.8,1.93,48),new T.MeshBasicMaterial({color,side:T.DoubleSide}));
    floor.rotation.x=-Math.PI/2;floor.position.y=.29;group.add(floor);
    group.position.set(site.x,0,site.z);this.scene.add(group);return {site,kind,group,crystal,halo,mat};
  }
  actor(id,kind,x,z,action,face,time,height,flash=false){
    const a=this.atlases.get(kind);if(!a)return;
    let actor=this.actors.get(id);
    if(!actor){
      const body=new T.Mesh(this.actorPlane.clone(),new T.MeshBasicMaterial({map:a.texture,side:T.DoubleSide,alphaTest:.28}));
      const shadow=new T.Mesh(this.shadowGeo,this.shadowMat);shadow.rotation.x=-Math.PI/2;
      this.scene.add(body,shadow);actor={body,shadow};this.actors.set(id,actor);
    }
    actor.seen=true;
    const anim=a.animations.get(action)||a.animations.get('walk')||a.animations.values().next().value;
    const key=anim.frames[Math.floor(time*(anim.fps||10))%anim.frames.length],f=a.sheet.frames[key];
    const p=f.frame,sz=a.sheet.meta.size,unit=height/190;
    const {body,shadow}=actor;
    if(key!==actor.frame){
      actor.frame=key;const u=p.x/sz.w,v=1-p.y/sz.h,du=p.w/sz.w,dv=p.h/sz.h;
      const uv=body.geometry.attributes.uv;
      uv.setXY(0,u,v);uv.setXY(1,u+du,v);uv.setXY(2,u,v-dv);uv.setXY(3,u+du,v-dv);uv.needsUpdate=true;
    }
    body.position.set(x+face*(f.spriteSourceSize.x+p.w/2-f.sourceSize.w/2)*unit,
      .08+(a.baseline-f.spriteSourceSize.y-p.h/2)*unit,z);
    body.scale.set(face*p.w*unit,p.h*unit,1);body.material.color.setHex(flash?0xff9eaa:0xffffff);
    shadow.position.set(x,.045,z);shadow.scale.set(height*.31,height*.19,1);
  }
  draw(game,dt){
    const w=this.canvas.clientWidth,h=this.canvas.clientHeight;
    if(w!==this.width||h!==this.height){
      this.width=w;this.height=h;this.renderer.setSize(w,h,false);this.camera.aspect=w/Math.max(1,h);this.camera.updateProjectionMatrix();
    }
    const b=game.bob,t=game.time;this.follow.lerp(this.destination.set(b.x,0,b.z),Math.min(1,dt*7));
    const zoom=w/h<.85?1.14:1;
    this.camera.position.set(this.follow.x,5.8*zoom,this.follow.z+11.4*zoom);
    this.camera.lookAt(this.follow.x,2.1,this.follow.z-8.3);
    for(const a of this.actors.values())a.seen=false;
    const target=game.target;
    this.targetRing.visible=Boolean(target && target.hp>0);
    if(this.targetRing.visible){
      this.targetRing.position.set(target.x,.32,target.z);
      this.targetRing.scale.setScalar(target.boss?1.45:1);
    }
    for(const m of this.markers){
      m.group.visible=!m.site.clear;m.crystal.rotation.y=t*1.5;m.crystal.position.y=2.95+.16*Math.sin(t*2);
      m.halo.rotation.z=.2*Math.cos(t);m.mat.color.setHex(m.kind==='gate'&&!game.gateOpen?0x8d8495:palette[m.kind]);
    }
    this.actor('bob','bob',b.x,b.z,t-(b.lastShot??-2)<.24?'shoot':b.moving?'walk':'idle',b.face,t,3.1,game.invulnerable>t && Math.sin(t*30)>0);
    if(this.atlases.has('claudia'))this.actor('claudia','claudia',1.5,game.gate.z,game.bossDown?'freed':'idle-caged',1,t,3);
    for(const e of game.enemies){
      this.actor(e.id,e.kind,e.x,e.z,t-e.hitAt<.15?'hurt':'walk',e.face,t+e.id,e.boss?4.7:3.4,t-e.hitAt<.13);
    }
    const effect=game.effect;
    if(effect && t-effect.t<1.6){
      const age=t-effect.t;
      if(effect.kind==='dad')this.actor('dad','dad',effect.x+1.3,effect.z-.2,'swat',b.face,age,3.4);
      else for(let i=0;i<6;i++)this.actor('papi'+i,'papi_stampede',effect.x-10+age*15-i%2,effect.z-3+i*1.15,'run'+(i+1),1,age,3);
    }
    for(const [id,a] of this.actors)if(!a.seen){
      this.scene.remove(a.body,a.shadow);a.body.geometry.dispose();a.body.material.dispose();this.actors.delete(id);
    }
    const visible=new Set();
    for(const s of game.shots){
      let mesh=this.dynamic.get(s.id);
      if(!mesh){
        mesh=new T.Group();const fruit=new T.Mesh(this.shotGeo,this.shotMat);fruit.scale.set(.19,.19,.47);
        const tip=new T.Mesh(this.tipGeo,this.tipMat);tip.rotation.x=Math.PI/2;tip.position.z=.44;mesh.add(fruit,tip);this.dynamic.set(s.id,mesh);this.scene.add(mesh);
      }
      visible.add(s.id);mesh.position.set(s.x,1.65,s.z);mesh.rotation.y=Math.atan2(s.target.x-s.x,s.target.z-s.z);
    }
    for(const warn of game.warnings){
      let mesh=this.dynamic.get(warn.id);
      if(!mesh){mesh=new T.Mesh(this.ringGeo,this.dangerMat);mesh.rotation.x=-Math.PI/2;this.dynamic.set(warn.id,mesh);this.scene.add(mesh);}
      visible.add(warn.id);mesh.position.set(warn.x,.31,warn.z);mesh.scale.setScalar(warn.r*(.96+.04*Math.sin(t*26)));
    }
    for(const [id,mesh] of this.dynamic)if(!visible.has(id)){this.scene.remove(mesh);this.dynamic.delete(id);}
    this.renderer.render(this.scene,this.camera);
  }
  clear(){
    if(!this.scene)return;
    const resources=new Set([this.actorPlane,this.shadowGeo,this.shadowMat,this.shotGeo,this.shotMat,this.tipGeo,this.tipMat,this.ringGeo,this.dangerMat]);
    for(const a of this.atlases.values())resources.add(a.texture);
    this.scene.traverse(o=>{resources.add(o.geometry);for(const m of [].concat(o.material||[])){resources.add(m);resources.add(m.map);}if(o.isInstancedMesh)o.dispose();});
    for(const resource of resources)resource?.dispose();
    this.atlases.clear();this.actors.clear();this.dynamic.clear();this.scene=null;this.renderer.renderLists.dispose();
  }
  dispose(){this.clear();this.renderer.dispose();}
}

export function drawRadar(canvas,game){
  const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
  const tx=x=>(x/MAP.x*.44+.5)*w,tz=z=>(z/MAP.z*.44+.5)*h;
  c.clearRect(0,0,w,h);
  c.strokeStyle='#57475d';c.lineWidth=1;c.strokeRect(7,8,w-14,h-16);
  c.fillStyle='#463a4b';c.fillRect(w*.43,8,w*.14,h-16);c.fillRect(7,h*.45,w-14,8);
  c.fillStyle='#9a8b99';c.beginPath();c.arc(tx(0),tz(1),4.5,0,Math.PI*2);c.fill();
  function mark(p,col,size,diamond=false){
    c.save();c.translate(tx(p.x),tz(p.z));if(diamond)c.rotate(Math.PI/4);c.fillStyle=col;c.fillRect(-size/2,-size/2,size,size);c.restore();
  }
  for(const s of game.sites)mark(s,s.clear?'#706579':'#d79cfd',7,true);
  mark(game.gate,game.gateOpen?'#f6c267':'#8e8396',8,true);
  if(!game.shrine.clear)mark(game.shrine,'#c8f881',6,true);
  for(const e of game.enemies)mark(e,'#ff6d81',4);
  c.fillStyle='white';c.beginPath();c.arc(tx(game.bob.x),tz(game.bob.z),4,0,Math.PI*2);c.fill();
}
