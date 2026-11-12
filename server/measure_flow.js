'use strict';
// Game-flow regression: pass completion, interceptions, steals per minute, goals. Targets: completion 0.70-0.92, steals under 14/min.
const { createSim } = require('./sim_host'); const n = createSim().summary().n; const games = +process.argv[2] || 4;
let passes = 0, picked = 0, pokes = 0, secs = 0, goals = 0;
for (let k = 0; k < games; k++) {
  const s = createSim(); s.start({ home: (k * 5) % n, away: (k * 5 + 9) % n, plen: 180 }); let lp = null;
  const vm = require('vm'); for (let i = 0; i < 30 * 600 && !s.over(); i++) {
    const o = JSON.parse(s.tick()); secs += 1 / 30; if (s.over() || i === 30 * 600 - 1) { }
    for (const e of o.ev) {
      if (e.e === 'ae' && e.k === 'pass') { passes++; lp = { team: e.p < 100 ? 0 : 1, t: i }; }
      else if (e.e === 'ae' && e.k === 'poke') pokes++;
      else if (e.e === 'ae' && e.k === 'gain' && lp && i - lp.t < 60 && (e.p < 100 ? 0 : 1) !== lp.team) { picked++; lp = null; }
      else if (e.e === 'goal') goals++;
    }
  }
  global.__ic = (global.__ic || 0) + (+require('vm').runInContext('G.icpt||0', s.ctx));
}
const out = { games, lane: global.__ic || 0, minutes: +(secs / 60).toFixed(1), passes, interceptedPct: +(picked / Math.max(1, passes)).toFixed(3), stealsPerMin: +(pokes / (secs / 60)).toFixed(1), goalsPerGame: +(goals / games).toFixed(1) };
console.log(JSON.stringify(out));
if (process.argv.includes('--assert') && (out.interceptedPct > 0.3 || out.stealsPerMin > 20)) { console.error('FAIL flow targets'); process.exit(1); }
process.exit(0);
