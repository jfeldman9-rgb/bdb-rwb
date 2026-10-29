// Ambient vs scripted voice rates for an Adventure bot run.
// node tools/voice-rate.mjs [hz] [--stage=N]
// Same loop as tools/bot-sim.mjs. Rates use combat time: frames spent in
// Papacito, Dad's swat, or a cutscene pause are left out of the denominator.
import { pathToFileURL } from 'node:url';
import { Campaign } from '../src/campaign.js';
import { Bot } from '../src/bot.js';
import { rollingVoiceStats } from '../src/voice-gate.js';

const AMBIENT_GROUP = [
  [/^bdb_produce$/, 'produce'],
  [/^yetti_(porkchop|colombian_room|purple_car)_/, 'yetti'],
  [/^bob_where_claudia_/, 'where'],
  [/^bdb_laugh$/, 'laugh'],
  [/^bob_hurt_/, 'hurt'],
  [/^yetti_turnback$/, 'turnback'],
  [/^choir_serious$/, 'choir'],
  [/^bob_cory_joke_/, 'cory'],
];

export function ambientGroup(id) {
  for (const [re, group] of AMBIENT_GROUP) if (re.test(id || '')) return group;
  return null;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function runVoiceRate({ hz = 60, difficulty = 'adventure', seed = 0xbd28, cap = 1800, stage } = {}) {
  const rng = mulberry32(seed);
  const w = new Campaign({ difficulty, rng, ...(stage == null ? {} : { stage }) });
  const bot = new Bot();
  const counts = Object.create(null);
  const allCounts = Object.create(null);
  const groups = Object.create(null);
  let ambient = 0;
  let scripted = 0;
  let combat = 0;
  let excluded = 0;
  const ambientAt = [];
  const voiceAt = [];
  const step = 1 / hz;
  const done = () => stage == null ? w.victory : w.stats.stages.includes(stage);
  const drain = (setPiece) => {
    for (const e of w.events) {
      if (e.type === 'dad_callin') w.finishDadCallin();
      if (e.type !== 'voice') continue;
      const id = e.data;
      const stamp = +w.elapsed.toFixed(4);
      allCounts[id] = (allCounts[id] || 0) + 1;
      if (!w.victory) voiceAt.push(stamp);
      const g = ambientGroup(id);
      if (g) ambientAt.push(stamp);
      if (setPiece) continue;
      counts[id] = (counts[id] || 0) + 1;
      if (g) {
        ambient++;
        groups[g] = (groups[g] || 0) + 1;
      } else scripted++;
    }
    w.events = [];
  };
  drain(false);
  for (let i = 0; i < hz * cap && !done(); i++) {
    const inPapi = w.papiTime > 0;
    const inDad = !!w.dad;
    w.update(step, bot.update(step, w));
    const setPiece = inPapi || w.papiTime > 0 || inDad || !!w.dad;
    if (setPiece) excluded += step;
    else combat += step;
    drain(setPiece);
  }
  const minutes = combat / 60;
  const perMin = (n) => minutes > 0 ? n / minutes : 0;
  let minGap = Infinity;
  for (let i = 1; i < ambientAt.length; i++) minGap = Math.min(minGap, ambientAt[i] - ambientAt[i - 1]);
  const rolling = rollingVoiceStats(voiceAt);
  return {
    hz,
    difficulty,
    ...(stage == null ? {} : { stage }),
    cleared: !!done(),
    elapsed: +w.elapsed.toFixed(1),
    combat: +combat.toFixed(1),
    excluded: +excluded.toFixed(1),
    minutes: +minutes.toFixed(3),
    ambient,
    scripted,
    total: ambient + scripted,
    ambientPerMin: +perMin(ambient).toFixed(2),
    scriptedPerMin: +perMin(scripted).toFixed(2),
    totalPerMin: +perMin(ambient + scripted).toFixed(2),
    minAmbientGap: ambientAt.length > 1 ? +minGap.toFixed(3) : null,
    minVoiceGap: rolling.minGap,
    maxIn60s: rolling.maxInWindow,
    rollingOk: rolling.ok,
    voiceAt,
    groups,
    counts,
    allCounts,
    stageTimes: w.stats.stageTimes,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const hzArg = process.argv.slice(2).find(arg => !arg.startsWith('--'));
  const stageArg = process.argv.slice(2).find(arg => arg.startsWith('--stage='));
  const stage = stageArg == null ? undefined : +stageArg.slice('--stage='.length);
  const rates = hzArg ? [+hzArg] : [30, 60, 120];
  const table = rates.map((hz) => runVoiceRate({ hz, stage }));
  console.log(JSON.stringify(table, null, 1));
}
