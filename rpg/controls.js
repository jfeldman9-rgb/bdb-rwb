import { movement } from './world.js';

const keys={ArrowLeft:[-1,0],KeyA:[-1,0],ArrowRight:[1,0],KeyD:[1,0],ArrowUp:[0,-1],KeyW:[0,-1],ArrowDown:[0,1],KeyS:[0,1]};
export function keyboardAxis(held){
  let x=0,z=0;
  for(const k of held){if(keys[k]){x+=keys[k][0];z+=keys[k][1];}}
  return movement(x,z);
}
export function installControls(stick, active, action, pause){
  const held=new Set(),knob=stick.firstElementChild;
  let pointer=null,axis=movement();
  const reset=()=>{held.clear();pointer=null;axis=movement();knob.style.transform='';};
  function drag(e){
    if(e.pointerId!==pointer)return;
    const r=stick.getBoundingClientRect(),radius=r.width*.36;
    axis=movement((e.clientX-r.left-r.width/2)/radius,(e.clientY-r.top-r.height/2)/radius);
    knob.style.transform=`translate(${axis.x*radius}px,${axis.z*radius}px)`;
  }
  stick.addEventListener('pointerdown',e=>{
    if(!active()||pointer!==null)return;
    e.preventDefault();pointer=e.pointerId;stick.setPointerCapture(pointer);drag(e);
  });
  stick.addEventListener('pointermove',drag);
  for(const event of ['pointerup','pointercancel','lostpointercapture'])stick.addEventListener(event,e=>{if(e.pointerId===pointer)reset();});
  window.addEventListener('keydown',e=>{
    if(!active()||e.defaultPrevented||e.metaKey||e.ctrlKey||e.altKey)return;
    if(keys[e.code]){e.preventDefault();held.add(e.code);}
    else if(!e.repeat){
      if(e.code==='KeyQ')action('papi');
      if(e.code==='KeyR')action('dad');
      if(e.code==='Escape'||e.code==='KeyP'){e.preventDefault();pause();}
    }
  });
  window.addEventListener('keyup',e=>held.delete(e.code));
  window.addEventListener('blur',reset);
  for(const btn of document.querySelectorAll('[data-power]'))btn.addEventListener('click',()=>{if(active())action(btn.dataset.power);});
  return {reset,read(){const k=keyboardAxis(held);return movement(k.x+axis.x,k.z+axis.z);}};
}
