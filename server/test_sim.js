'use strict';
// Headless sanity test: the real sim runs in Node, accepts two human inputs, and produces a full game.
const { createSim } = require('./sim_host');
const t0 = Date.now();
const sim = createSim();
const sum = sim.summary();
console.log('teams loaded:', sum.n, sum.teams.slice(0, 3).map(t => t.abbr).join(','));
sim.start({ home: 1, away: 2, plen: 120 });
sim.human(0); sim.human(1);
let ticks = 0, goals = 0, bytes = 0, maxBytes = 0, sfx = {};
while (!sim.over() && ticks < 40000) {
  // scripted human input: wiggle and shoot/pass sometimes
  const a = ticks / 30;
  sim.input(0, { x: Math.cos(a), y: Math.sin(a * 1.3), sh: ticks % 150 === 0 ? 1 : 0, pw: 0.7, ps: ticks % 90 === 0 ? 1 : 0, hit: ticks % 200 === 0 ? 1 : 0, sw: ticks % 300 === 0 ? 1 : 0 });
  sim.input(1, { x: -Math.cos(a), y: Math.sin(a), sh: ticks % 170 === 0 ? 1 : 0, pw: 0.6 });
  const out = sim.tick(); bytes += out.length; maxBytes = Math.max(maxBytes, out.length);
  const o = JSON.parse(out); for (const e of o.ev) { if (e.e === 'goal') goals++; if (e.e === 'sfx') sfx[e.n] = (sfx[e.n] || 0) + 1; }
  ticks++;
}
const ms = Date.now() - t0;
console.log(JSON.stringify(sim.score()), 'ticks', ticks, 'game-seconds', (ticks / 30).toFixed(0), 'goal events', goals);
console.log('avg snapshot bytes', Math.round(bytes / ticks), 'max', maxBytes, '=> ~' + Math.round(bytes / ticks * 30 / 1024) + ' KB/s at 30 Hz');
console.log('cpu ms per tick', (ms / ticks).toFixed(3), 'sfx', JSON.stringify(sfx));
