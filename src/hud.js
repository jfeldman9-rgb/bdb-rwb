import { MASH_NEED } from './bob.js';
export { MASH_NEED } from './bob.js';
export const speakerColor = who => who==='Dad'?'#ffe3a3':who==='Narrator'?'#c8d4ee':'#ffc6df';
export const bossLabel = w => w.bossActive ? `${w.def.boss.name} · PHASE ${w.wingmen?.phase||w.enemies.find(e=>e.boss)?.phase||1}` : '';
/** Boss HP bars: one per Wingman when the pair is out, else the shared bar. Pure for tests. */
export function bossBars(w){
  const bosses=w.enemies.filter(e=>e.boss&&e.alive);
  const wings=bosses.filter(e=>e.type==='wingman');
  if(wings.length>1)return wings.map(e=>({label:e.role===2?'W2':'W1',ratio:e.hp/e.maxHp}));
  if(bosses.length)return [{label:'BOSS',ratio:bosses.reduce((n,e)=>n+e.hp,0)/bosses.reduce((n,e)=>n+e.maxHp,0)}];
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
  const g=this.g;g.clear();g.fillStyle(0x101421,.55);g.fillRect(0,0,1280,116);g.lineStyle(1,0xbfa875,.55);g.lineBetween(0,116,1280,116);
  for(const [i,b]of bossBars(w).entries()){const y=79+i*16;g.fillStyle(0x372947);g.fillRoundedRect(390,y,500,13,5);g.fillStyle(0xd6a2ff);g.fillRoundedRect(390,y,Math.max(3,500*b.ratio),13,5);}
  if(w.bob.state==='grabbed'){g.lineStyle(8,0xffdc8c);g.beginPath();g.arc(640,620,32,-Math.PI/2,-Math.PI/2+Math.PI*2*Math.min(1,w.bob.grabMash/6));g.strokePath();}
  for(const [id,label,count]of [['tbPapi','PAPI',w.papi.charges],['tbDad','DAD',w.dadCall.charges]]){const el=document.getElementById(id);if(el){el.textContent=`${label} ${count}`;el.classList.toggle('empty',!count);}}
 }
  flashGo(plate){
    this._goPlate = plate || '';
    this.prompt.setText('KEEP GOING  →');
  }

}
