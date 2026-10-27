import test from 'node:test';import assert from 'node:assert/strict';import{EventEmitter}from'node:events';
import{installGraphicsLifecycle}from'../src/graphics-lifecycle.js';import{createPerf}from'../src/perf.js';
test('graphics loss pauses combat and restoration preserves an existing manual pause',()=>{
 const renderer=new EventEmitter(),events=new EventEmitter(),reasons=new Set(['manual']);let clears=0;
 const stage={events:new EventEmitter(),pauseReasons:reasons,setPauseReason(r,on){if(on)reasons.add(r);else reasons.delete(r);}};
 const game={renderer,events,inp:{clear(){clears++;}},isPaused:false,pause(){this.isPaused=true;},resume(){this.isPaused=false;}};
 let shown=0,hidden=0;const life=installGraphicsLifecycle({game,getStage:()=>stage,meter:createPerf(),onLost:()=>shown++,onRestored:()=>hidden++});
 renderer.emit('losewebgl');assert.equal(game.isPaused,true);assert.ok(reasons.has('graphics-context'));assert.equal(shown,1);
 renderer.emit('restorewebgl');assert.equal(game.isPaused,false);assert.deepEqual([...reasons],['manual']);assert.equal(hidden,1);assert.equal(clears,2);
 life.destroy();assert.equal(renderer.listenerCount('losewebgl'),0);
});
test('performance capture excludes pause gaps and samples active fight cadence',()=>{
 let at=0;const meter=createPerf({now:()=>at,metadata:()=>({})});meter.tick(0,{inFight:true});meter.tick(16,{inFight:true});at=16;meter.setSuspended('pause',true);meter.tick(1000);at=1000;meter.setSuspended('pause',false);meter.tick(1000,{inFight:true});meter.tick(1016,{inFight:true});assert.deepEqual(meter.fightFrames,[16,16]);assert.equal(meter.report().fight.p95,16);
});
