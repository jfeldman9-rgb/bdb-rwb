import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { Adventure, chapters, distance, movement, nearestTarget, normalizeSave, readSave, writeSave, SAVE_KEY, vitality } from '../rpg/world.js';
import { keyboardAxis } from '../rpg/controls.js';
import { STAGES } from '../src/stages.js';
import { clipIdsFor } from '../src/cutscene.js';
import { LINES } from '../src/voice-lines.js';

test('the static entry loads local RPG modules and retains the classic game entry',async()=>{
  const html=await readFile('index.html','utf8');
  assert.match(html,/id="begin-rpg"/);assert.match(html,/href="index.html\?mode=classic"/);
  assert.match(html,/import\('\.\/rpg\/menu\.js'\)/);
  await import('../rpg/view.js');
  for(const p of ['lib/three.module.min.js','lib/phaser.min.js','rpg/menu.css','rpg/media/boulevard.webp'])await access(p);
  for(const c of chapters){
    const prefix='assets/chars/';
    await Promise.all([access(c.poster),access(`assets/bg/s${c.no}-mid0.webp`),...clipIdsFor(c.intro).map(id=>access('assets/cutscenes/'+id+'.mp4'))]);
    for(const kind of [c.boss.type,...c.enemies.map(e=>'yetti_'+e),'bob','dad','papi_stampede','claudia']){
      for(const suffix of ['-0.webp','-0.json','.anims.json'])await access(prefix+kind+suffix);
    }
  }
});

test('touch and keyboard move on the same bounded two-dimensional axis; no aim or fire input is needed',()=>{
  assert.deepEqual(keyboardAxis(new Set(['KeyW','ArrowLeft'])),movement(-1,-1));
  assert.deepEqual(movement(.35,-.4),{x:.35,z:-.4});
  assert.equal(Math.hypot(...Object.values(movement(5,5))).toFixed(3),'1.000');
  assert.deepEqual(keyboardAxis(new Set(['KeyA','ArrowRight'])),{x:0,z:0});
  const world=new Adventure(1,{}),b=world.bob;
  const targets=[{x:b.x+2,z:b.z,hp:0},{x:b.x+1,z:b.z-6,hp:8},{x:b.x-3,z:b.z,hp:1}];
  assert.equal(nearestTarget(b,targets),targets[2]);
  assert.equal(nearestTarget(b,targets,1),null);
  world.enemies=targets.filter(e=>e.hp);world.step(1/60);
  assert.equal(world.shots[0].target,targets[2]);assert.equal(b.face,-1);
  for(let i=0;i<20;i++)world.step(1/60);
  assert.equal(targets[2].hp,0);
});

test('RPG progress survives storage round trips, invalid saves and unavailable iPhone storage',()=>{
  const map=new Map(),storage={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)};
  const progress={...normalizeSave(),unlocked:4,chapter:4,xp:125,seals:[1,0],started:true};
  assert.equal(writeSave(storage,progress),true);
  assert.deepEqual(readSave(storage),progress);
  assert.deepEqual(new Adventure(4,progress).checkpoint,{...chapters[3].seals[0],clear:true});
  map.set(SAVE_KEY,'(corrupt)');assert.deepEqual(readSave(storage),normalizeSave());
  assert.equal(writeSave(null,progress),false);
  assert.deepEqual(readSave(null),normalizeSave());
  assert.equal(new Adventure(7,{unlocked:1}).def.no,1);
});

test('chapter, cutscene, character and locked voice identities come from the existing campaign',()=>{
  assert.equal(chapters.length,7);
  for(const c of chapters){
    assert.equal(c.boss,STAGES[c.no].boss);assert.equal(c.next,STAGES[c.no].next);
    assert.equal(c.title,STAGES[c.no].title);assert.ok(c.intro.includes('stage'+c.no));
  }
  assert.deepEqual(chapters.filter(c=>c.intro.includes('kidnap')).map(c=>c.no),[2,4]);
  for(const [id,quote] of Object.entries({
    bdb_open:'I brought the eggplant.',bdb_produce:'Die, Yetti, die!',
    yetti_porkchop_01:'Pork Chop Sandwiches!',yetti_colombian_room_01:'Stay away from the Colombians room.',
    yetti_purple_car_01:'Bob why is your car purple?',
    dad_catchphrase:'Son, sometimes you just need to use the fly swatter to keep the women away!',
    claudia_s7:'Took you long enough, Papacito.',
  }))assert.equal(LINES[id][1],quote);
});

function walk(g,to){
  for(let i=0;i<1200 && distance(g.bob,to)>.4 && !g.finished;i++){
    const d=distance(g.bob,to);g.step(1/30,{x:(to.x-g.bob.x)/d,z:(to.z-g.bob.z)/d});
  }
  assert.ok(distance(g.bob,to)<.6 || g.finished,'can reach '+to.name);
}
function battle(g){
  for(let i=0;i<2400 && g.encounter;i++){
    if(g.finisherReady)assert.ok(g.attack('papi'));
    else if(g.time>=g.dadAt)g.attack('dad');
    g.step(1/30);
  }
  assert.equal(g.encounter,null,'fight resolved');
}
test('all seven chapters can be traversed with movement, auto-fire and powers through Claudia’s rescue',()=>{
  let save=normalizeSave();
  for(const def of chapters){
    const g=new Adventure(def.no,save),first=def.no%2,second=1-first;
    walk(g,g.shrine);assert.ok(g.save.shrine);assert.equal(g.bob.hp,vitality(g.save.xp));
    // Travel around the central fountain, choosing the side districts in either order.
    walk(g,{x:g.sites[first].x,z:22});walk(g,g.sites[first]);battle(g);
    assert.deepEqual(g.save.seals,[first]);
    walk(g,{x:g.sites[first].x,z:16});walk(g,{x:g.sites[second].x,z:16});walk(g,g.sites[second]);battle(g);
    assert.ok(g.gateOpen);walk(g,{x:g.sites[second].x,z:-20});walk(g,g.gate);
    battle(g);assert.ok(g.bossDown);g.step(1/30);assert.ok(g.finished);
    assert.ok(g.events.some(e=>e.type==='complete' && e.value===def.no));
    assert.equal(g.save.chapter,def.next||7);assert.equal(g.save.complete,def.no===7);
    save=g.save;
  }
});

test('defeat restores the last secured checkpoint and allows the fight to be retried',()=>{
  const g=new Adventure(1,{seals:[0],chapter:1,started:true});
  g.startFight(g.sites[1]);g.bob.hp=0;g.step(.02);
  assert.equal(g.bob.hp,vitality(g.save.xp));assert.ok(g.sites[0].clear);assert.equal(distance(g.bob,g.sites[0]),0);
  assert.equal(g.encounter,null);assert.equal(g.enemies.length,0);assert.equal(g.shots.length,0);
});

test('both Wingmen and the tribunal judge hold for the Papacito finisher, even just after a stampede',()=>{
  for(const n of [3,7]){
    const g=new Adventure(n,{unlocked:n,chapter:n,seals:[0,1]});
    g.bob.x=g.gate.x;g.bob.z=g.gate.z;g.startFight(g.gate);
    assert.ok(g.attack('papi'));assert.ok(g.papiAt>g.time);
    for(const e of g.enemies)g.damage(e,200);
    assert.ok(g.finisherReady);assert.ok(g.enemies.every(e=>e.hp===1));
    assert.equal(g.papiAt,g.time);assert.ok(g.attack('papi'));
    g.step(1/60);assert.ok(g.bossDown);
  }
});
