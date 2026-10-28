import { MASH_NEED } from './bob.js';
export { MASH_NEED } from './bob.js';
export const speakerColor = who => who==='Dad'?'#ffe3a3':who==='Narrator'?'#c8d4ee':'#ffc6df';
export const HUD_BAND = Object.freeze({ color: 0x101421, alpha: 0.55, w: 1280, h: 116 });
export const bossLabel = w => w.bossActive ? `${w.def.boss.name} · PHASE ${w.wingmen?.phase||w.enemies.find(e=>e.boss)?.phase||1}` : '';
/** Boss HP bars: one per Wingman when the pair is out, else the shared bar. Pure for tests. */
export function bossBars(w){
  const wings=w.enemies.filter(e=>e.boss&&e.type==='wingman');
  if(wings.length>1)return wings.map(e=>({label:e.role===2?'W2':'W1',ratio:e.alive?e.hp/e.maxHp:0}));
  const bosses=w.enemies.filter(e=>e.boss&&e.alive);
  if(bosses.length)return [{label:'BOSS',ratio:bosses.reduce((n,e)=>n+e.hp,0)/bosses.reduce((n,e)=>n+e.maxHp,0)}];
  return [];
}
/** Side by side, above the boss name at y=106. W1/W2 match the wingman tints. */
export function bossBarLayout(bars){
  if(bars.length>1){
    const w=240;
    return bars.map((b,i)=>({...b,x:i?650:390,y:79,w,h:13,color:b.label==='W2'?0xffb1d6:0xd0beff}));
  }
  if(bars.length)return [{...bars[0],x:390,y:79,w:500,h:13,color:0xd6a2ff}];
  return [];
}
export const mashRing = b => ({visible:b.state==='grabbed',progress:Math.min(1,b.grabMash/MASH_NEED)});
export function stagePrompt(w){
  if(w.bob.state==='grabbed')return `MASH ANY BUTTON  ${Math.min(6,Math.floor(w.bob.grabMash))}/6`;
  if(w.wingmen?.ready)return 'PRESS PAPI TO FINISH THE RESCUE';
  if(w.stageNo===1&&w.locked){
    const foes=w.enemies.filter(e=>e.alive);
    if(foes.some(e=>e.shield))return 'DASH THROUGH THE GOLD SHIELD';
    if(foes.some(e=>e.type==='charger'&&(e.state==='telegraph'||e.state==='rush')))return 'JUMP THE RUSH!';
    if(foes.length>1&&foes.some(e=>e.type==='choir'))return 'DROP THE CHOIR FIRST';
  }
  return !w.locked?'KEEP GOING  →':'';
}
export class HUD {
 constructor(scene){this.scene=scene;const text=(x,y,size,color='#f7f1e4')=>scene.add.text(x,y,'',{fontFamily:'Arial, sans-serif',fontSize:size,color,fontStyle:'bold'}).setScrollFactor(0).setDepth(20001);
  this.g=scene.add.graphics().setScrollFactor(0).setDepth(20000);this.chapter=text(30,22,14,'#dcc08a');this.health=text(30,48,27);this.meter=text(30,85,15);
  this.score=text(1245,26,17).setOrigin(1,0);this.zone=text(1245,53,13,'#a6bbcd').setOrigin(1,0);
  this.banner=text(640,148,25).setOrigin(.5).setAlign('center').setWordWrapWidth(1020);
  this.boss=text(640,106,14).setOrigin(.5);this.prompt=text(640,684,16,'#fff0bf').setOrigin(.5);
  this.w1=text(390,60,12,'#d0beff');this.w2=text(650,60,12,'#ffb1d6');
  this.caption=text(640,225,20).setOrigin(.5).setAlign('center').setWordWrapWidth(1000);this.captionUntil=0;
 }
 say(who,line){this.caption.setText(`${who.toUpperCase()}  /  ${line}`).setColor(speakerColor(who));this.captionUntil=performance.now()+Math.max(2800,line.length*65);}
 update(w){
  this.chapter.setText(`THE LEGEND OF CLAUDIA  /  ${String(w.stageNo).padStart(2,'0')}`);
  this.health.setText('♥ '.repeat(Math.ceil(w.bob.hp))+'♡ '.repeat(Math.max(0,w.bob.maxHp-Math.ceil(w.bob.hp))));
  this.meter.setText(`SHAKES ${'▰'.repeat(w.papi.shakeRemainder)}${'▱'.repeat(3-w.papi.shakeRemainder)}   PAPI ${w.papi.charges}/2   DAD ${w.dadCall.charges? 'READY':w.dadCall.unlocked? `${w.dadCall.kos}/10 · ${Math.max(0,Math.ceil(45-w.dadCall.since))}s`:'ZONE 3'}`);
  this.score.setText(`${String(Math.floor(w.score)).padStart(6,'0')}  PTS`);this.zone.setText(`${w.difficultyKey.toUpperCase()}  ·  ${w.bossActive?'BOSS':`ZONE ${Math.min(w.def.zones.length,w.zoneIndex+1)}/${w.def.zones.length}`}`);
  this.banner.setText(w.paused?'PAUSED':w.victory?'CLAUDIA RESCUED.':w.messageTime>0?w.message:'');
  this.boss.setText(bossLabel(w));
  this.prompt.setText(stagePrompt(w));
  if(performance.now()>this.captionUntil)this.caption.setText('');
  const g=this.g;g.clear();g.fillStyle(HUD_BAND.color,HUD_BAND.alpha);g.fillRect(0,0,HUD_BAND.w,HUD_BAND.h);g.lineStyle(1,0xbfa875,.55);g.lineBetween(0,116,1280,116);
  const bars=bossBarLayout(bossBars(w));
  this.w1.setVisible(bars.length>1);this.w2.setVisible(bars.length>1);
  if(bars.length>1){this.w1.setText(bars[0].label);this.w2.setText(bars[1].label);}
  for(const b of bars){g.fillStyle(0x372947);g.fillRoundedRect(b.x,b.y,b.w,b.h,5);if(b.ratio>0){g.fillStyle(b.color);g.fillRoundedRect(b.x,b.y,Math.max(3,b.w*b.ratio),b.h,5);}}
  if(w.bob.state==='grabbed'){g.lineStyle(8,0xffdc8c);g.beginPath();g.arc(640,620,32,-Math.PI/2,-Math.PI/2+Math.PI*2*Math.min(1,w.bob.grabMash/6));g.strokePath();}
  this.paintTouch(w);
 }
  touchButtons(){
    if(this.touchReady)return;
    this.touchReady=true;
    const by=id=>globalThis.document?.getElementById?.(id)||null;
    this.tbPapi=by('tbPapi');this.tbDad=by('tbDad');
    this.touchText={};this.touchEmpty={};
  }
  paintTouch(w){
    this.touchButtons();
    const paint=(el,key,label,count)=>{
      if(!el)return;
      const text=`${label} ${count}`;
      if(this.touchText[key]!==text){el.textContent=text;this.touchText[key]=text;}
      const empty=!count;
      if(this.touchEmpty[key]!==empty){el.classList.toggle('empty',empty);this.touchEmpty[key]=empty;}
    };
    paint(this.tbPapi,'papi','PAPI',w.papi.charges);
    paint(this.tbDad,'dad','DAD',w.dadCall.charges);
  }
  flashGo(plate){
    this._goPlate = plate || '';
    this.prompt.setText('KEEP GOING  →');
  }

}
