export const ACTIONS = Object.freeze(['fire','jump','dash','papi','dad']);
export const KEYS = Object.freeze({
  KeyW:'up',ArrowUp:'up',KeyS:'down',ArrowDown:'down',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right',
  KeyJ:'fire',KeyZ:'fire',KeyE:'fire',Space:'jump',KeyK:'jump',KeyX:'jump',ShiftLeft:'dash',ShiftRight:'dash',
  KeyQ:'papi',KeyC:'papi',KeyL:'papi',KeyR:'dad',KeyV:'dad',Escape:'pause',KeyP:'pause',Enter:'start',
});
export const PAD_MAP = Object.freeze({0:'jump',1:'dash',2:'fire',3:'papi',4:'dad',5:'dash',9:'pause'});
/** Title Start / Fire begins the chapter. Gamepad Start is pause while the pad button is held. Escape and P do not start a run. */
export function titleWantsBegin(input) {
  if (input.take('start') || input.take('fire')) return true;
  const fromPad = !!input.padHeld?.pause;
  const pause = input.take('pause');
  return fromPad && pause;
}
/** Gameplay Enter (start) and Escape/Start (pause) toggle the pause. */
export function gameplayWantsPause(input) {
  return !!(input.take('pause') || input.take('start'));
}
export const TOUCH_MAP = Object.freeze({tbFire:'fire',tbJump:'jump',tbDash:'dash',tbPapi:'papi',tbDad:'dad'});
export class Input {
  constructor(root = globalThis) {
    this.root=root;this.t=0;this.buf={};this.held={};this.keysDown=new Set();this.pointers=new Map();this.padHeld={};this.padPrev={};
    this.touchAxis={x:0,y:0};this.listeners={};this.cleanups=[];this.lastTap={left:-9,right:-9};this.x=this.y=0;
    const on=(el,event,fn,opts)=>{el?.addEventListener?.(event,fn,opts);this.cleanups.push(()=>el?.removeEventListener?.(event,fn,opts));};
    this.onDOM=on;
    on(root,'keydown',e=>{
      if(e.defaultPrevented||e.target?.closest?.('button,input,select,textarea,a'))return;
      const a=KEYS[e.code];if(!a||e.repeat)return;e.preventDefault();this.keysDown.add(e.code);this.held[a]=true;this.press(a);
    });
    on(root,'keyup',e=>{this.keysDown.delete(e.code);const a=KEYS[e.code];if(a)this.held[a]=[...this.keysDown].some(k=>KEYS[k]===a);});
    on(root,'blur',()=>this.clear());on(root.document,'visibilitychange',()=>{if(root.document.hidden)this.clear();});
    on(root,'pointerdown',e=>{if(e.pointerType==='touch')this.enableTouch();});
    if(root.matchMedia?.('(pointer: coarse)').matches)this.enableTouch();
    this.bindTouch();
  }
  on(event,fn){(this.listeners[event]??=[]).push(fn);return()=>{this.listeners[event]=this.listeners[event].filter(f=>f!==fn);};}
  emit(event,value){for(const fn of this.listeners[event]||[])fn(value);}
  enableTouch(){this.root.document?.body?.classList?.add('touch');this.isTouch=true;}
  press(a){this.buf[a]=this.t;this.emit('press',a);
    if(a==='left'||a==='right'){if(this.t-this.lastTap[a]<.26)this.buf.dash=this.t;this.lastTap[a]=this.t;}
  }
  take(a,win=.18){if(this.peek(a,win)){delete this.buf[a];return true;}return false;}
  peek(a,win=.18){return this.buf[a]!==undefined&&this.t-this.buf[a]<=win;}
  flushPresses(){this.buf={};}
  clear(){this.held={};this.keysDown.clear();this.buf={};this.padHeld={};this.padPrev={};this.pointers.clear();this.touchAxis={x:0,y:0};this.x=this.y=0;this.stickId=null;this.stickCenter=null;this.lastTap={left:-9,right:-9};
    const doc=this.root.document;const knob=doc?.getElementById('knob');if(knob)knob.style.transform='';doc?.querySelectorAll('.tb.on').forEach(el=>el.classList.remove('on'));
    this.hideStick();
  }
  down(a){return !!this.held[a]||!!this.padHeld[a]||[...this.pointers.values()].includes(a);}
  bindTouch(){
    const doc=this.root.document;if(!doc)return;
    for(const [id,a]of Object.entries(TOUCH_MAP)){
      const el=doc.getElementById(id);if(!el)continue;
      this.onDOM(el,'pointerdown',e=>{e.preventDefault();el.setPointerCapture?.(e.pointerId);this.pointers.set(e.pointerId,a);this.press(a);el.classList.add('on');});
      const end=e=>{this.pointers.delete(e.pointerId);el.classList.toggle('on',[...this.pointers.values()].includes(a));};
      for(const event of ['pointerup','pointercancel','lostpointercapture'])this.onDOM(el,event,end);
    }
    const stick=doc.getElementById('stick'),knob=doc.getElementById('knob');if(!stick)return;
    this.stickEl=stick;this.knobEl=knob;
    this.onDOM(stick,'pointerdown',e=>{if(this.stickId!=null)return;e.preventDefault();this.stickId=e.pointerId;this.stickCenter=null;stick.setPointerCapture?.(e.pointerId);this.moveStick(e);});
    this.onDOM(stick,'pointermove',e=>this.moveStick(e));
    for(const event of ['pointerup','pointercancel','lostpointercapture'])this.onDOM(stick,event,e=>this.endStick(e));
    this.onDOM(this.root,'pointerdown',e=>this.tryFloatStick(e));
    this.onDOM(this.root,'pointermove',e=>{if(e.pointerId===this.stickId)this.moveStick(e);});
    for(const event of ['pointerup','pointercancel'])this.onDOM(this.root,event,e=>this.endStick(e));
  }
  /** Left 40% of the playfield, under the top-button row. */
  inStickZone(e){
    const doc=this.root.document;
    const game=doc?.getElementById?.('game');
    const g=game?.getBoundingClientRect?.();
    const width=g?.width||this.root.innerWidth||doc?.documentElement?.clientWidth||0;
    const left=g?.left||0;
    if(!(width>0))return false;
    const x=(e.clientX??0)-left;
    if(x<0||x>width*0.4)return false;
    const top=doc?.getElementById?.('top-buttons');
    const tr=top?.getBoundingClientRect?.();
    const limit=tr&&(tr.height||tr.bottom)?(typeof tr.bottom==='number'?tr.bottom:tr.top+tr.height):0;
    return (e.clientY??0)>=limit;
  }
  tryFloatStick(e){
    if(this.stickId!=null||!this.stickEl)return;
    if(e.pointerType&&e.pointerType!=='touch'&&e.pointerType!=='pen')return;
    const body=this.root.document?.body;
    if(body?.classList?.contains?.('playing')===false)return;
    if(e.target?.closest?.('button,a,input,select,textarea'))return;
    if(!this.inStickZone(e))return;
    e.preventDefault?.();
    const stick=this.stickEl;
    const rect=stick.getBoundingClientRect?.()||{width:100};
    const half=(rect.width||100)/2;
    const host=stick.parentElement?.getBoundingClientRect?.()||{left:0,top:0};
    stick.style.left=`${(e.clientX??0)-(host.left||0)-half}px`;
    stick.style.top=`${(e.clientY??0)-(host.top||0)-half}px`;
    stick.style.bottom='auto';
    stick.style.visibility='visible';
    stick.classList?.add('live');
    this.stickCenter={x:e.clientX,y:e.clientY};
    this.stickId=e.pointerId;
    stick.setPointerCapture?.(e.pointerId);
    this.moveStick(e);
  }
  hideStick(){
    const stick=this.stickEl;if(!stick)return;
    stick.classList?.remove('live');
    stick.style.visibility='hidden';
  }
  moveStick(e){
    if(e.pointerId!==this.stickId)return;
    const stick=this.stickEl;if(!stick)return;
    const r=stick.getBoundingClientRect?.()||{left:0,top:0,width:100};
    const R=r.width/2||1;
    let dx,dy;
    if(this.stickCenter){dx=(e.clientX-this.stickCenter.x)/R;dy=(e.clientY-this.stickCenter.y)/R;}
    else{dx=(e.clientX-r.left-R)/R;dy=(e.clientY-r.top-R)/R;}
    const m=Math.max(1,Math.hypot(dx,dy));dx/=m;dy/=m;
    this.touchAxis={x:Math.abs(dx)>.23?dx:0,y:Math.abs(dy)>.23?dy:0};
    if(this.knobEl)this.knobEl.style.transform=`translate(${dx*R*.55}px,${dy*R*.55}px)`;
  }
  endStick(e){
    if(this.stickId==null||e?.pointerId!==this.stickId)return;
    this.stickId=null;this.stickCenter=null;this.touchAxis={x:0,y:0};
    if(this.knobEl)this.knobEl.style.transform='';
    this.hideStick();
  }
  pollPad(){
    const p=Array.from(this.root.navigator?.getGamepads?.()||[]).find(Boolean);this.padHeld={};
    if(!p){this.padPrev={};return{x:0,y:0};}
    const next={};for(const [i,a]of Object.entries(PAD_MAP)){const down=!!p.buttons[i]?.pressed;next[i]=down;if(down){this.padHeld[a]=true;if(!this.padPrev[i])this.press(a);}}this.padPrev=next;
    const axis=(i,neg,pos)=>p.buttons[neg]?.pressed?-1:p.buttons[pos]?.pressed?1:Math.abs(p.axes[i]||0)>.3?p.axes[i]:0;
    return{x:axis(0,14,15),y:axis(1,12,13)};
  }
  update(dt){this.t+=dt;const p=this.pollPad(),h=this.held;
    this.x=(h.right?1:0)-(h.left?1:0)||this.touchAxis.x||p.x;this.y=(h.down?1:0)-(h.up?1:0)||this.touchAxis.y||p.y;
  }
  snapshot(){
    const out={x:this.x,y:this.y,fire:this.down('fire'),presses:0};
    for(const a of ACTIONS){const pressed=this.take(a);if(pressed)out.presses++;if(a==='fire')out.fire||=pressed;else out[a]=pressed;}
    return out;
  }
  destroy(){for(const fn of this.cleanups)fn();this.clear();}
}
