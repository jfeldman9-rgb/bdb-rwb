// Headless Adventure bot timings: node tools/bot-sim.mjs [difficulty] [hz]
// Prints per-stage clears (fresh stage start) and one full campaign run.
import { Campaign } from '../src/campaign.js';
import { Bot } from '../src/bot.js';
import { maxStage } from '../src/stages.js';

const difficulty = process.argv[2] || 'adventure';
const hz = +(process.argv[3] || 60);

function run(opts, done, cap = 1800) {
  const w = new Campaign({ difficulty, ...opts }), bot = new Bot();
  let hurts = 0;
  for (let i = 0; i < hz * cap && !done(w); i++) {
    w.update(1 / hz, bot.update(1 / hz, w));
    hurts += w.events.filter(e => e.type === 'hurt').length;
    // Same drain as the headless clear tests: a call-in that is only counted never swats.
    for (const e of w.events) if (e.type === 'dad_callin') w.finishDadCallin();
    w.events = [];
  }
  const { shots, papi, dad, kos, deaths, stages, phases, stageTimes } = w.stats;
  return { seconds: +w.elapsed.toFixed(1), cleared: done(w), hurts, deaths, papi, dad, kos, shots, stages, stageTimes, phases };
}

const out = {};
for (let stage = 1; stage <= maxStage; stage++) out[`stage${stage}`] = run({ stage }, w => w.stats.stages.includes(stage));
out.campaign = run({}, w => w.victory, 3000);
console.log(JSON.stringify(out, null, 1));
