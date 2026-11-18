import * as T from '../lib/three.module.min.js';
import { fountain, MAP } from './world.js';

// The static district uses one instanced draw per shape and material, including the street furniture.
export function district(scene,def,loader){
  const batches=new Map(),materials=new Map(),dummy=new T.Object3D();
  const box=new T.BoxGeometry(),cylinder=new T.CylinderGeometry(1,1,1,14),cone=new T.ConeGeometry(1,1,6);
  const ball=new T.SphereGeometry(1,10,7),gem=new T.OctahedronGeometry(1);
  const archPath=new T.Shape();
  archPath.absarc(0,0,1,0,Math.PI,false);archPath.lineTo(-.74,0);archPath.absarc(0,0,.74,Math.PI,0,true);archPath.closePath();
  const arch=new T.ExtrudeGeometry(archPath,{depth:1,bevelEnabled:false,curveSegments:10});
  function mat(color,lit){
    const key=color+lit;
    if(!materials.has(key))materials.set(key,lit?new T.MeshBasicMaterial({color}):new T.MeshStandardMaterial({color,roughness:.8}));
    return materials.get(key);
  }
  function put(geo,color,x,y,z,w,h,d,rx=0,ry=0,rz=0,lit=false){
    const m=mat(color,lit),key=geo.id+'-'+m.id;
    if(!batches.has(key))batches.set(key,{geo,m,matrices:[]});
    dummy.position.set(x,y,z);dummy.scale.set(w,h,d);dummy.rotation.set(rx,ry,rz);dummy.updateMatrix();
    batches.get(key).matrices.push(dummy.matrix.clone());
  }
  const stone=def.stone, trim=def.no===2?'#e6ce91':'#ab9479', dark='#30283a', light=def.glow;
  // A repeatable stone mosaic with grout, worn edges and a thin brass inset.
  const tile=document.createElement('canvas');tile.width=tile.height=256;
  const ctx=tile.getContext('2d');ctx.fillStyle='#272336';ctx.fillRect(0,0,256,256);
  let seed=def.no*97;
  function random(){seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;}
  for(let row=0;row<4;row++)for(let col=-1;col<4;col++){
    const x=col*96+(row%2)*48,y=row*64;
    const paving=def.no===2?'#a0acb7':def.no===6?'#516476':'#555064';
    const grad=ctx.createLinearGradient(x,y,x+85,y+62);
    grad.addColorStop(0,new T.Color(paving).lerp(new T.Color('#746579'),random()*.4).getStyle());
    grad.addColorStop(1,new T.Color(paving).multiplyScalar(.6+random()*.12).getStyle());
    ctx.fillStyle=grad;ctx.fillRect(x+1,y+1,94,62);ctx.fillStyle='#fef3d733';ctx.fillRect(x+1,y+1,92,1);
  }
  for(let i=0;i<3000;i++){ctx.fillStyle=random()>.5?'#18121e0d':'#ffffff0c';ctx.fillRect(random()*256,random()*256,random()*4+1,1);}
  const texture=new T.CanvasTexture(tile);texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(18,20);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;
  const floor=new T.Mesh(new T.PlaneGeometry(91,100),new T.MeshStandardMaterial({map:texture,roughness:.68}));floor.rotation.x=-Math.PI/2;scene.add(floor);
  for(const x of [-6.5,-6.28,6.28,6.5])put(box,trim,x,.018,0,.065,.028,72);
  for(const z of [-13,12])put(box,trim,0,.02,z,51,.025,.12);
  function pillar(x,z,h,scale=1){
    put(box,stone,x,.24,z,2.4*scale,.48,2.4*scale);
    put(cylinder,trim,x,.63,z,1.04*scale,.3,1.04*scale);
    put(cylinder,stone,x,h*.5+.55,z,.72*scale,h-.7,.72*scale);
    put(cylinder,trim,x,h,z,1.04*scale,.48,1.04*scale);
  }
  function lantern(x,z){
    put(cylinder,dark,x,.18,z,.48,.36,.48);put(cylinder,dark,x,2.2,z,.11,4.3,.11);
    put(cylinder,trim,x,4.4,z,.39,.2,.39);put(ball,'#ffdc88',x,4.86,z,.32,.46,.32,0,0,0,true);
    put(cone,dark,x,5.42,z,.51,.6,.51);
  }
  function palm(x,z,h){
    put(cone,'#705346',x,h/2,z,.32,h,.32,0,0,.045);
    for(let j=0;j<9;j++){
      const a=j*2.399,c=Math.cos(a),s=Math.sin(a);
      put(ball,j%2?'#385c4a':'#597352',x+c*1.5,h+.15,z+s*1.5,2.05,.14,.47,0,-a,0);
      put(ball,'#365844',x+c*3.1,h-.45,z+s*3.1,1.38,.12,.32,0,-a,-.32);
    }
  }
  function spire(x,z,h){
    put(gem,light,x,h*.49,z,.9,h*.52,.8,0,.2,.13);
    put(gem,'#b69fe0',x+.9,h*.25,z+.3,.55,h*.28,.55,0,0,-.28);
  }
  const festive=[1,4,5].includes(def.no);
  // Crop an arcade from the original chapter painting for the shop fronts.
  const facade=loader.load('assets/bg/s'+def.no+'-mid0.webp');facade.colorSpace=T.SRGBColorSpace;
  facade.repeat.set(.28,.46);facade.offset.set(.005,.2);
  const windowMat=new T.MeshBasicMaterial({map:facade,color:0xb5aabb});
  const windowGeo=new T.PlaneGeometry(8.8,5.2);
  // Side streets face inward. Facades stay outside the traversal boundary.
  for(const side of [-1,1]){
    for(let j=0;j<7;j++){
      const z=-33+j*10,x=side*(MAP.x+5),h=6+random()*5;
      put(box,stone,x,h/2,z,5,h,9.6);put(box,trim,x,h+.12,z,5.6,.38,10);
      for(const dz of [-2.4,2.4]){
        put(box,dark,x-side*2.55,2.2,z+dz,.12,4.1,2.6);
        put(arch,trim,x-side*2.65,4.18,z+dz,1.62,1.7,.36,0,side*Math.PI/2);
        put(box,'#ffd18a',x-side*2.58,h-1.5,z+dz,.12,1.25,1.45,0,0,0,true);
      }
      if(festive){
        const front=new T.Mesh(windowGeo,windowMat);front.position.set(x-side*2.76,3.05,z);front.rotation.y=-side*Math.PI/2;scene.add(front);
        put(box,j%2?'#8b4561':'#47576d',x-side*3.35,4.1,z,2.1,.23,6,0,0,-side*.15);
        if(j%2===0)palm(side*25.3,z+3,6.5+random()*1.5);
      }else if(def.no===6)spire(side*25.4,z+2,3+random()*3);
      else{pillar(side*26,z-4,6);if(def.no===3)for(let k=0;k<4;k++)put(box,stone,x,h+.74,z-4+k*2.6,5.5,1.1,1.2);}
      if(j%2===1)lantern(side*24.85,z);
    }
  }
  // Far gate and framing towers lead back to the chapter's original painted skyline.
  for(const x of [-7,7]){
    pillar(x,-29,10,1.7);put(cone,def.no===3?'#384260':trim,x,12,-29,2.45,4,2.45);
    put(box,stone,x*2.65,2.05,-30,20,4,2.2);
  }
  for(const x of [-3.6,3.6])pillar(x,-26.5,5.7,.9);
  put(arch,stone,0,5.7,-27.2,4.38,4.35,1.45);
  put(arch,trim,0,5.7,-25.72,4.41,4.37,.1);
  for(const x of [-9,9])lantern(x,-23);
  // Central fountain and its four gilded spouts.
  for(const [r,y,h,c] of [[3.1,.17,.34,trim],[2.84,.42,.35,stone],[2.5,.61,.08,'#68999f'],[1.02,.95,.76,stone],[1.55,1.46,.24,trim],[.35,1.91,.8,stone]]){
    put(cylinder,c,fountain.x,y,fountain.z,r,h,r);
  }
  put(gem,light,0,2.8,fountain.z,.6,.85,.6);
  for(const site of [...def.seals,def.shrine]){
    put(cylinder,trim,site.x,.1,site.z,2.2,.2,2.2);
    put(cylinder,dark,site.x,.22,site.z,1.95,.09,1.95);
  }
  // Pools of colored lantern light keep the district landmarks legible at night.
  const glowCanvas=document.createElement('canvas');glowCanvas.width=glowCanvas.height=64;
  const brush=glowCanvas.getContext('2d');const bloom=brush.createRadialGradient(32,32,0,32,32,32);
  bloom.addColorStop(0,'rgba(255,255,255,.7)');bloom.addColorStop(.3,'rgba(255,255,255,.28)');bloom.addColorStop(1,'rgba(255,255,255,0)');
  brush.fillStyle=bloom;brush.fillRect(0,0,64,64);
  const glowMap=new T.CanvasTexture(glowCanvas),glowPlane=new T.PlaneGeometry(1,1);
  function glow(x,y,z,color,w,d){
    const mesh=new T.Mesh(glowPlane,new T.MeshBasicMaterial({map:glowMap,color,transparent:true,depthWrite:false,blending:T.AdditiveBlending}));
    mesh.rotation.x=-Math.PI/2;mesh.position.set(x,y,z);mesh.scale.set(w,d,1);scene.add(mesh);
  }
  for(const [i,s] of [...def.seals,def.shrine].entries())glow(s.x,.25,s.z,i<2?'#d064ff':'#adc65e',9,10);
  for(const side of [-1,1])for(const z of [-23,-4,16])glow(side*23,.07,z,light,11,14);
  function sign(words,x,y,z,w,tint){
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=96;
    const c=canvas.getContext('2d');c.fillStyle='#221c30';c.fillRect(0,0,512,96);c.strokeStyle=tint;c.lineWidth=3;c.strokeRect(6,6,500,84);
    c.textAlign='center';c.textBaseline='middle';c.font='600 47px Barlow, sans-serif';c.shadowColor=tint;c.shadowBlur=9;c.fillStyle=tint;c.fillText(words.toUpperCase(),256,50,480);
    const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;
    const panel=new T.Mesh(new T.PlaneGeometry(w,w*96/512),new T.MeshBasicMaterial({map,side:T.DoubleSide}));
    panel.position.set(x,y,z);scene.add(panel);
  }
  sign(def.gate.name,0,6.2,-25.4,7.2,'#ffdb95');
  for(const s of def.seals){
    const z=s.z-3.6;
    for(const dx of [-2.8,2.8]){
      put(cylinder,dark,s.x+dx,2.7,z,.12,5.4,.12);
      put(ball,'#f6d3ff',s.x+dx,5.55,z,.19,.21,.19,0,0,0,true);
    }
    sign(s.name,s.x,4.9,z,5.7,'#e1b2ff');
  }
  // Chapter-specific silhouettes above the square.
  if(def.no===2||def.no===7)for(const side of [-1,1]){
    for(let j=0;j<4;j++)pillar(side*(11+j*3),-29,7.6,1.05);
    put(box,trim,side*15.5,8.15,-29,12.7,.7,3);
    if(def.no===7)put(cone,stone,side*15.5,10.25,-29,6.8,3.8,2,0,Math.PI/6);
  }
  if(def.no===6)for(let i=0;i<12;i++)spire(-24+i*4.5,-30,5+4*random());
  for(const x of [-4.2,4.2])for(const z of [-16,16])put(box,trim,x,.027,z,1,.025,1,0,Math.PI/4);
  if(def.no===5){
    for(const x of [-11,11]){put(cylinder,dark,x,11,-12,.12,12,.12);put(box,trim,x,16,-12,1,.4,1);}
    put(box,dark,0,16,-12,28,.1,.1);put(box,'#944f78',4,12.7,-12,3.2,2.5,2.3);put(box,trim,4,14.9,-12,.18,2,.18);
  }
  for(const {geo,m,matrices} of batches.values()){
    const mesh=new T.InstancedMesh(geo,m,matrices.length);matrices.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));scene.add(mesh);
  }
  const panorama=loader.load(`assets/bg/s${def.no}-mid0.webp`);panorama.colorSpace=T.SRGBColorSpace;
  const horizon=new T.Mesh(new T.PlaneGeometry(161,80),new T.MeshBasicMaterial({map:panorama,fog:false,color:0xc8bdcf}));
  horizon.position.set(0,22,-54);scene.add(horizon);
}
